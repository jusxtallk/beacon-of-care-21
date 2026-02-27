

## Fix: Auto-assign care_staff role and remove 35353@gmail.com

### Problem
- `justustohjunyi20@gmail.com` signed up but has **no role** in `user_roles` — the client-side insert fails because the user isn't fully authenticated until email confirmation.
- `35353@gmail.com` is an unverified test account that needs to be removed.
- No mechanism exists to automatically assign roles on signup.

### Plan

**1. Database migration — update `handle_new_user()` trigger to auto-assign role from signup metadata**

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE _role app_role;
BEGIN
  INSERT INTO public.profiles (user_id, full_name) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''));
  INSERT INTO public.data_preferences (user_id) VALUES (NEW.id);
  
  IF NEW.raw_user_meta_data ->> 'role' IS NOT NULL THEN
    BEGIN
      _role := (NEW.raw_user_meta_data ->> 'role')::app_role;
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role) ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

**2. Data fix — assign `care_staff` to existing email user and delete 35353**

- Insert `care_staff` role for `justustohjunyi20@gmail.com` (`4b64becc-...`)
- Delete auth user `35353@gmail.com` (`d782035a-...`) and any related profile/preferences rows

**3. Update `AuthPage.tsx`**

- Remove manual `user_roles.insert()` calls after signup (trigger handles it now)
- Pass `role` in signup metadata: `options: { data: { full_name, role: 'care_staff' } }`
- Keep elder anonymous flow unchanged (already inserts role client-side, which works for anonymous users since they're immediately authenticated)

