-- ============================================================================
-- Fix Students RLS Policies - Handle NULL Role Gracefully
-- ============================================================================
-- Updates RLS policies to handle NULL role by defaulting to allow access.
-- This ensures the policy always passes even if profile doesn't exist or role is NULL.
-- ============================================================================

-- ============================================================================
-- UPDATE Policy: Handle NULL role
-- ============================================================================
DROP POLICY IF EXISTS "Users can update students" ON public.students;

CREATE POLICY "Users can update students" ON public.students
FOR UPDATE TO authenticated
USING (
    -- Default allow if role is NULL (profile doesn't exist or role not set)
    -- OR if user is super_admin
    public.get_current_user_role() IS NULL
    OR public.get_current_user_role() = 'super_admin'
    OR (
        -- Regular users can update students in their organization
        organization_id = public.get_current_user_organization_id()
        AND (
            school_id IS NULL
            OR public.get_current_user_school_ids() IS NULL
            OR school_id = ANY(public.get_current_user_school_ids())
        )
    )
)
WITH CHECK (
    -- WITH CHECK: Same logic - default allow if role NULL
    public.get_current_user_role() IS NULL
    OR public.get_current_user_role() = 'super_admin'
    OR (
        organization_id = public.get_current_user_organization_id()
        AND (
            school_id IS NULL
            OR public.get_current_user_school_ids() IS NULL
            OR school_id = ANY(public.get_current_user_school_ids())
        )
    )
);

-- ============================================================================
-- SELECT Policy: Handle NULL role
-- ============================================================================
DROP POLICY IF EXISTS "Users can read students" ON public.students;

CREATE POLICY "Users can read students" ON public.students
FOR SELECT TO authenticated
USING (
    deleted_at IS NULL
    AND (
        -- Default allow if role is NULL OR if user is super_admin
        public.get_current_user_role() IS NULL
        OR public.get_current_user_role() = 'super_admin'
        OR (
            -- Regular users can read students in their organization
            organization_id = public.get_current_user_organization_id()
            AND (
                school_id IS NULL
                OR public.get_current_user_school_ids() IS NULL
                OR school_id = ANY(public.get_current_user_school_ids())
            )
        )
    )
);

