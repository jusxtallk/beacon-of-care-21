
-- Update handle_new_user to auto-assign role from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE _role app_role;
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''));

  INSERT INTO public.data_preferences (user_id)
  VALUES (NEW.id);

  -- Auto-assign role from signup metadata if provided
  IF NEW.raw_user_meta_data ->> 'role' IS NOT NULL THEN
    BEGIN
      _role := (NEW.raw_user_meta_data ->> 'role')::app_role;
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, _role)
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      NULL; -- ignore invalid role values
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
