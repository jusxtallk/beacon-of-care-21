
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('elder', 'family', 'care_staff');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Care relationships (links elders to family/staff)
CREATE TABLE public.care_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elder_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  caregiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  relationship_type TEXT NOT NULL DEFAULT 'family', -- 'family' or 'care_staff'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (elder_id, caregiver_id)
);

ALTER TABLE public.care_relationships ENABLE ROW LEVEL SECURITY;

-- Check-in schedules (set by family/staff for elders)
CREATE TABLE public.check_in_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elder_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  schedule_times TEXT[] NOT NULL DEFAULT '{"09:00","18:00"}', -- times of day
  days_of_week INT[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}', -- 0=Sun, 6=Sat
  grace_period_minutes INT NOT NULL DEFAULT 60,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.check_in_schedules ENABLE ROW LEVEL SECURITY;

-- Check-ins
CREATE TABLE public.check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  battery_level INT,
  is_charging BOOLEAN,
  last_app_usage_at TIMESTAMPTZ
);

ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;

-- Data sharing preferences
CREATE TABLE public.data_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  share_battery BOOLEAN NOT NULL DEFAULT false,
  share_app_usage BOOLEAN NOT NULL DEFAULT false,
  share_location BOOLEAN NOT NULL DEFAULT false,
  daily_reminder BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.data_preferences ENABLE ROW LEVEL SECURITY;

-- Alerts for missed check-ins
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elder_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  alert_type TEXT NOT NULL DEFAULT 'missed_checkin',
  message TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Enable realtime for check_ins and alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.check_ins;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_schedules_updated_at BEFORE UPDATE ON public.check_in_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_prefs_updated_at BEFORE UPDATE ON public.data_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''));
  
  -- Auto-create data preferences with defaults
  INSERT INTO public.data_preferences (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies

-- Profiles: users see own profile, caregivers see their elders' profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Caregivers can view elder profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.care_relationships
      WHERE caregiver_id = auth.uid() AND elder_id = profiles.user_id
    )
  );

-- User roles: users can see own roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Care relationships: participants can view
CREATE POLICY "Participants can view relationships"
  ON public.care_relationships FOR SELECT
  USING (auth.uid() = elder_id OR auth.uid() = caregiver_id);

CREATE POLICY "Care staff can create relationships"
  ON public.care_relationships FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'care_staff'));

CREATE POLICY "Care staff can delete relationships"
  ON public.care_relationships FOR DELETE
  USING (public.has_role(auth.uid(), 'care_staff'));

-- Check-in schedules: elders see own, caregivers see their elders'
CREATE POLICY "Elders can view own schedules"
  ON public.check_in_schedules FOR SELECT
  USING (auth.uid() = elder_id);

CREATE POLICY "Caregivers can view elder schedules"
  ON public.check_in_schedules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.care_relationships
      WHERE caregiver_id = auth.uid() AND elder_id = check_in_schedules.elder_id
    )
  );

CREATE POLICY "Caregivers can manage schedules"
  ON public.check_in_schedules FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'family') OR public.has_role(auth.uid(), 'care_staff')
  );

CREATE POLICY "Caregivers can update schedules"
  ON public.check_in_schedules FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.care_relationships
      WHERE caregiver_id = auth.uid() AND elder_id = check_in_schedules.elder_id
    )
  );

-- Check-ins: elders insert own, caregivers view their elders'
CREATE POLICY "Elders can insert own check-ins"
  ON public.check_ins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Elders can view own check-ins"
  ON public.check_ins FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Caregivers can view elder check-ins"
  ON public.check_ins FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.care_relationships
      WHERE caregiver_id = auth.uid() AND elder_id = check_ins.user_id
    )
  );

-- Data preferences: only the user
CREATE POLICY "Users can view own preferences"
  ON public.data_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON public.data_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- Alerts: caregivers see alerts for their elders
CREATE POLICY "Caregivers can view elder alerts"
  ON public.alerts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.care_relationships
      WHERE caregiver_id = auth.uid() AND elder_id = alerts.elder_id
    )
  );

CREATE POLICY "Elders can view own alerts"
  ON public.alerts FOR SELECT
  USING (auth.uid() = elder_id);

CREATE POLICY "Caregivers can update alerts"
  ON public.alerts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.care_relationships
      WHERE caregiver_id = auth.uid() AND elder_id = alerts.elder_id
    )
  );
