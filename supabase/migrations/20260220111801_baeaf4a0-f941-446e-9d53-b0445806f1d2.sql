-- Allow care staff to update elder profiles (for editing address, emergency contact, etc.)
CREATE POLICY "Care staff can update elder profiles"
ON public.profiles
FOR UPDATE
USING (
  has_role(auth.uid(), 'care_staff'::app_role)
  OR EXISTS (
    SELECT 1 FROM care_relationships
    WHERE care_relationships.caregiver_id = auth.uid()
    AND care_relationships.elder_id = profiles.user_id
  )
);