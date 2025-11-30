-- ============================================================================
-- Permissive UPDATE Policy for Student Admissions - No WITH CHECK Rules
-- ============================================================================
-- Makes the UPDATE policy permissive: USING checks access, WITH CHECK allows all updates
-- This allows soft deletes without additional checks once access is verified
-- ============================================================================

-- Drop ALL existing UPDATE policies
DROP POLICY IF EXISTS "Users can update student_admissions" ON public.student_admissions;
DROP POLICY IF EXISTS "Users can update their organization's student_admissions" ON public.student_admissions;
DROP POLICY IF EXISTS "Authenticated users can update student_admissions" ON public.student_admissions;

-- Create permissive UPDATE policy matching students table pattern
-- USING: Checks if user can access the record (no deleted_at check - matches students)
-- WITH CHECK: Always allows the update (no additional checks)
CREATE POLICY "Users can update student_admissions" ON public.student_admissions
    FOR UPDATE TO authenticated
    USING (
        -- USING: Check access only (no deleted_at check - matches students table pattern)
        -- Allow if role is NULL OR super_admin OR organization matches
        public.get_current_user_role() IS NULL
        OR public.get_current_user_role() = 'super_admin'
        OR (
            -- Regular users can update records in their organization
            organization_id = public.get_current_user_organization_id()
            AND (
                school_id IS NULL
                OR public.get_current_user_school_ids() IS NULL
                OR school_id = ANY(public.get_current_user_school_ids())
            )
        )
    )
    WITH CHECK (
        -- WITH CHECK: Always allow updates for authenticated users (no additional checks)
        -- This allows soft deletes and any other updates without re-checking rules
        -- Use explicit TRUE or 1=1 to ensure it always passes
        1 = 1
    );

COMMENT ON POLICY "Users can update student_admissions" ON public.student_admissions IS 
    'Permissive UPDATE policy: USING checks access to the record, WITH CHECK allows all updates (including soft deletes) without additional checks.';

