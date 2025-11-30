-- ============================================================================
-- Fix Student Admissions RLS Policies - Handle NULL Role and Super Admin
-- ============================================================================
-- Updates RLS policies to handle NULL role gracefully and properly support
-- super admin access. This fixes 409 Conflict errors on SELECT queries.
-- ============================================================================

-- ============================================================================
-- SELECT Policy: Handle NULL role and super admin
-- ============================================================================
DROP POLICY IF EXISTS "Users can read student_admissions" ON public.student_admissions;

CREATE POLICY "Users can read student_admissions" ON public.student_admissions
    FOR SELECT TO authenticated
    USING (
        deleted_at IS NULL
        AND (
            -- Default allow if role is NULL OR if user is super_admin
            public.get_current_user_role() IS NULL
            OR public.get_current_user_role() = 'super_admin'
            OR (
                -- Regular users can read admissions in their organization
                organization_id = public.get_current_user_organization_id()
                AND (
                    school_id IS NULL
                    OR public.get_current_user_school_ids() IS NULL
                    OR school_id = ANY(public.get_current_user_school_ids())
                )
            )
        )
    );

-- ============================================================================
-- INSERT Policy: Handle NULL role and super admin
-- ============================================================================
DROP POLICY IF EXISTS "Users can insert student_admissions" ON public.student_admissions;

CREATE POLICY "Users can insert student_admissions" ON public.student_admissions
    FOR INSERT TO authenticated
    WITH CHECK (
        -- Allow insert if:
        -- 1. User is super_admin (can insert anywhere)
        -- 2. OR user's organization_id matches the row's organization_id
        --    AND (school_id is NULL OR user has access to that school)
        (
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
        )
    );

-- ============================================================================
-- UPDATE Policy: Handle NULL role and super admin
-- ============================================================================
DROP POLICY IF EXISTS "Users can update student_admissions" ON public.student_admissions;

CREATE POLICY "Users can update student_admissions" ON public.student_admissions
    FOR UPDATE TO authenticated
    USING (
        -- USING: Check OLD row - can only update non-deleted records
        deleted_at IS NULL
        AND (
            -- Default allow if role is NULL OR if user is super_admin
            public.get_current_user_role() IS NULL
            OR public.get_current_user_role() = 'super_admin'
            OR (
                -- Regular users can update admissions in their organization
                organization_id = public.get_current_user_organization_id()
                AND (
                    school_id IS NULL
                    OR public.get_current_user_school_ids() IS NULL
                    OR school_id = ANY(public.get_current_user_school_ids())
                )
            )
        )
    )
    WITH CHECK (
        -- WITH CHECK: Check NEW row - allow setting deleted_at for soft deletes
        -- Note: We don't check deleted_at here to allow soft deletes
        -- Default allow if role is NULL OR if user is super_admin
        public.get_current_user_role() IS NULL
        OR public.get_current_user_role() = 'super_admin'
        OR (
            -- Regular users can update admissions in their organization
            -- Check organization_id from the NEW row (after update)
            organization_id = public.get_current_user_organization_id()
            AND (
                school_id IS NULL
                OR public.get_current_user_school_ids() IS NULL
                OR school_id = ANY(public.get_current_user_school_ids())
            )
        )
    );

-- ============================================================================
-- DELETE Policy: Handle NULL role and super admin
-- ============================================================================
DROP POLICY IF EXISTS "Users can delete student_admissions" ON public.student_admissions;

CREATE POLICY "Users can delete student_admissions" ON public.student_admissions
    FOR DELETE TO authenticated
    USING (
        deleted_at IS NULL
        AND (
            -- Default allow if role is NULL OR if user is super_admin
            public.get_current_user_role() IS NULL
            OR public.get_current_user_role() = 'super_admin'
            OR (
                -- Regular users can delete admissions in their organization
                organization_id = public.get_current_user_organization_id()
                AND (
                    school_id IS NULL
                    OR public.get_current_user_school_ids() IS NULL
                    OR school_id = ANY(public.get_current_user_school_ids())
                )
            )
        )
    );

