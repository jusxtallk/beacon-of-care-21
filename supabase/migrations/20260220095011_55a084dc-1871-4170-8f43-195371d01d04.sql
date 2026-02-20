
-- Add preferred language to profiles
ALTER TABLE public.profiles ADD COLUMN preferred_language TEXT NOT NULL DEFAULT 'en';

-- Health conditions table
CREATE TABLE public.health_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elder_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  condition_name TEXT NOT NULL,
  severity TEXT DEFAULT 'moderate',
  notes TEXT,
  diagnosed_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.health_conditions ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_health_conditions_updated_at BEFORE UPDATE ON public.health_conditions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Elder notes table
CREATE TABLE public.elder_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elder_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.elder_notes ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_elder_notes_updated_at BEFORE UPDATE ON public.elder_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS for health_conditions: caregivers of the elder can CRUD
CREATE POLICY "Caregivers can view elder health conditions"
  ON public.health_conditions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.care_relationships
      WHERE caregiver_id = auth.uid() AND elder_id = health_conditions.elder_id
    )
    OR public.has_role(auth.uid(), 'care_staff')
  );

CREATE POLICY "Care staff can insert health conditions"
  ON public.health_conditions FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'care_staff')
    OR EXISTS (
      SELECT 1 FROM public.care_relationships
      WHERE caregiver_id = auth.uid() AND elder_id = health_conditions.elder_id
    )
  );

CREATE POLICY "Care staff can update health conditions"
  ON public.health_conditions FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'care_staff')
    OR EXISTS (
      SELECT 1 FROM public.care_relationships
      WHERE caregiver_id = auth.uid() AND elder_id = health_conditions.elder_id
    )
  );

CREATE POLICY "Care staff can delete health conditions"
  ON public.health_conditions FOR DELETE
  USING (
    public.has_role(auth.uid(), 'care_staff')
    OR EXISTS (
      SELECT 1 FROM public.care_relationships
      WHERE caregiver_id = auth.uid() AND elder_id = health_conditions.elder_id
    )
  );

-- RLS for elder_notes
CREATE POLICY "Caregivers can view elder notes"
  ON public.elder_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.care_relationships
      WHERE caregiver_id = auth.uid() AND elder_id = elder_notes.elder_id
    )
    OR public.has_role(auth.uid(), 'care_staff')
  );

CREATE POLICY "Caregivers can insert elder notes"
  ON public.elder_notes FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'care_staff')
    OR EXISTS (
      SELECT 1 FROM public.care_relationships
      WHERE caregiver_id = auth.uid() AND elder_id = elder_notes.elder_id
    )
  );

CREATE POLICY "Caregivers can update own elder notes"
  ON public.elder_notes FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "Caregivers can delete own elder notes"
  ON public.elder_notes FOR DELETE
  USING (auth.uid() = author_id);

-- Storage bucket for profile avatars
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Storage policies
CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow care staff to upload avatars for elders they manage
CREATE POLICY "Care staff can upload elder avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND public.has_role(auth.uid(), 'care_staff')
  );

-- Add personal data fields to profiles
ALTER TABLE public.profiles ADD COLUMN date_of_birth DATE;
ALTER TABLE public.profiles ADD COLUMN address TEXT;
ALTER TABLE public.profiles ADD COLUMN emergency_contact_name TEXT;
ALTER TABLE public.profiles ADD COLUMN emergency_contact_phone TEXT;
ALTER TABLE public.profiles ADD COLUMN nric_last4 TEXT;
