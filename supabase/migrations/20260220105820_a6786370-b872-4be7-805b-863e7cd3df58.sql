
-- Add link_code column to profiles
ALTER TABLE public.profiles ADD COLUMN link_code TEXT UNIQUE;

-- Function to generate a random 6-char alphanumeric code
CREATE OR REPLACE FUNCTION public.generate_link_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    SELECT EXISTS (SELECT 1 FROM public.profiles WHERE link_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  NEW.link_code := new_code;
  RETURN NEW;
END;
$$;

-- Trigger to auto-generate link_code on insert
CREATE TRIGGER set_link_code
BEFORE INSERT ON public.profiles
FOR EACH ROW
WHEN (NEW.link_code IS NULL)
EXECUTE FUNCTION public.generate_link_code();

-- Backfill existing profiles with codes
DO $$
DECLARE
  r RECORD;
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  FOR r IN SELECT id FROM public.profiles WHERE link_code IS NULL LOOP
    LOOP
      new_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
      SELECT EXISTS (SELECT 1 FROM public.profiles WHERE link_code = new_code) INTO code_exists;
      EXIT WHEN NOT code_exists;
    END LOOP;
    UPDATE public.profiles SET link_code = new_code WHERE id = r.id;
  END LOOP;
END;
$$;

-- Allow caregivers to find elders by link_code (SELECT policy already exists for own profile)
-- Add a function to look up elder by code (security definer to bypass RLS)
CREATE OR REPLACE FUNCTION public.lookup_elder_by_code(_code TEXT)
RETURNS TABLE(user_id UUID, full_name TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.full_name
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.user_id
  WHERE p.link_code = upper(_code)
    AND ur.role = 'elder'
  LIMIT 1;
$$;

-- Enable realtime for tables needed on elder detail page
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.health_conditions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.elder_notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.data_preferences;
