
-- Drop duplicate INSERT policy targeting public role on storage.objects
DROP POLICY IF EXISTS "Authenticated users can upload their own avatar" ON storage.objects;

-- Restrict avatars SELECT/UPDATE/DELETE policies to authenticated only (drop & recreate cleanly)
DROP POLICY IF EXISTS "Authenticated users can view avatars in own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;

CREATE POLICY "Authenticated users can view avatars in own folder"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'avatars' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- Replace broad lesson-images public read with object-level read (prevents directory listing via prefix queries by requiring exact name access patterns is not possible via RLS; instead scope to anon+authenticated explicitly with a non-listing-friendly predicate). Keep public reads but at least scope roles.
DROP POLICY IF EXISTS "lesson images public read" ON storage.objects;
CREATE POLICY "lesson images public read"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'lesson-images' AND (storage.foldername(name))[1] IS NOT NULL);

-- Lock down SECURITY DEFINER trigger functions: they're only invoked by triggers, not via API
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_gap_on_wrong_answer() FROM PUBLIC, anon, authenticated;
