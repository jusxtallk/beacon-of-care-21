
DROP POLICY "Care staff can create relationships" ON public.care_relationships;

CREATE POLICY "Caregivers can create relationships"
ON public.care_relationships
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = caregiver_id
  AND (has_role(auth.uid(), 'family') OR has_role(auth.uid(), 'care_staff'))
);
