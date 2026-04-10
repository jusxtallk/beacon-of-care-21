-- Fix 1: Restrict role self-assignment to only 'elder' role
DROP POLICY IF EXISTS "Users can insert own role" ON public.user_roles;

CREATE POLICY "Users can insert own role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND role IN ('elder'::app_role, 'family'::app_role)
);

-- Fix 2: Require care relationship for schedule INSERT
DROP POLICY IF EXISTS "Caregivers can manage schedules" ON public.check_in_schedules;

CREATE POLICY "Caregivers can manage schedules"
ON public.check_in_schedules
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM care_relationships
    WHERE caregiver_id = auth.uid()
      AND elder_id = check_in_schedules.elder_id
  )
);