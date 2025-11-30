-- ============================================================================
-- Update Core Tables RLS Policies to Use Permission-Based Checks
-- ============================================================================
-- Replaces role-based checks with permission-based checks using
-- has_permission_for_resource() function.
-- ============================================================================

-- ============================================================================
-- Buildings
-- ============================================================================

DROP POLICY IF EXISTS "Users can read buildings for their organization schools" ON public.buildings;
DROP POLICY IF EXISTS "Users can insert buildings for their organization schools" ON public.buildings;
DROP POLICY IF EXISTS "Users can update buildings for their organization schools" ON public.buildings;
DROP POLICY IF EXISTS "Users can delete buildings for their organization schools" ON public.buildings;

CREATE POLICY "Users can read buildings" ON public.buildings
    FOR SELECT TO authenticated
USING (
    deleted_at IS NULL
    AND (
        public.get_current_user_school_ids() IS NULL
        OR (
            public.get_current_user_school_ids() IS NOT NULL
            AND school_id = ANY(public.get_current_user_school_ids())
        )
    )
    AND public.has_permission_for_resource('buildings', 'read')
);

CREATE POLICY "Users can insert buildings" ON public.buildings
    FOR INSERT TO authenticated
WITH CHECK (
    deleted_at IS NULL
    AND (
        public.get_current_user_school_ids() IS NULL
        OR (
            public.get_current_user_school_ids() IS NOT NULL
            AND school_id = ANY(public.get_current_user_school_ids())
        )
    )
    AND public.has_permission_for_resource('buildings', 'create')
);

CREATE POLICY "Users can update buildings" ON public.buildings
    FOR UPDATE TO authenticated
USING (
    deleted_at IS NULL
    AND (
        public.get_current_user_school_ids() IS NULL
        OR (
            public.get_current_user_school_ids() IS NOT NULL
            AND school_id = ANY(public.get_current_user_school_ids())
        )
    )
    AND public.has_permission_for_resource('buildings', 'update')
)
WITH CHECK (
    deleted_at IS NULL
    AND (
        public.get_current_user_school_ids() IS NULL
        OR (
            public.get_current_user_school_ids() IS NOT NULL
            AND school_id = ANY(public.get_current_user_school_ids())
        )
    )
    AND public.has_permission_for_resource('buildings', 'update')
);

CREATE POLICY "Users can delete buildings" ON public.buildings
    FOR DELETE TO authenticated
USING (
    deleted_at IS NULL
    AND (
        public.get_current_user_school_ids() IS NULL
        OR (
            public.get_current_user_school_ids() IS NOT NULL
            AND school_id = ANY(public.get_current_user_school_ids())
        )
    )
    AND public.has_permission_for_resource('buildings', 'delete')
);

-- ============================================================================
-- Rooms
-- ============================================================================

DROP POLICY IF EXISTS "Users can read rooms for their organization schools" ON public.rooms;
DROP POLICY IF EXISTS "Users can insert rooms for their organization schools" ON public.rooms;
DROP POLICY IF EXISTS "Users can update rooms for their organization schools" ON public.rooms;
DROP POLICY IF EXISTS "Users can delete rooms for their organization schools" ON public.rooms;

CREATE POLICY "Users can read rooms" ON public.rooms
    FOR SELECT TO authenticated
USING (
    deleted_at IS NULL
    AND (
        public.get_current_user_school_ids() IS NULL
        OR (
            public.get_current_user_school_ids() IS NOT NULL
            AND school_id = ANY(public.get_current_user_school_ids())
        )
    )
    AND public.has_permission_for_resource('rooms', 'read')
);

CREATE POLICY "Users can insert rooms" ON public.rooms
    FOR INSERT TO authenticated
WITH CHECK (
    deleted_at IS NULL
    AND (
        public.get_current_user_school_ids() IS NULL
        OR (
            public.get_current_user_school_ids() IS NOT NULL
            AND school_id = ANY(public.get_current_user_school_ids())
        )
    )
    AND public.has_permission_for_resource('rooms', 'create')
);

CREATE POLICY "Users can update rooms" ON public.rooms
    FOR UPDATE TO authenticated
USING (
    deleted_at IS NULL
    AND (
        public.get_current_user_school_ids() IS NULL
        OR (
            public.get_current_user_school_ids() IS NOT NULL
            AND school_id = ANY(public.get_current_user_school_ids())
        )
    )
    AND public.has_permission_for_resource('rooms', 'update')
)
WITH CHECK (
    deleted_at IS NULL
    AND (
        public.get_current_user_school_ids() IS NULL
        OR (
            public.get_current_user_school_ids() IS NOT NULL
            AND school_id = ANY(public.get_current_user_school_ids())
        )
    )
    AND public.has_permission_for_resource('rooms', 'update')
);

CREATE POLICY "Users can delete rooms" ON public.rooms
    FOR DELETE TO authenticated
USING (
    deleted_at IS NULL
    AND (
        public.get_current_user_school_ids() IS NULL
        OR (
            public.get_current_user_school_ids() IS NOT NULL
            AND school_id = ANY(public.get_current_user_school_ids())
        )
    )
    AND public.has_permission_for_resource('rooms', 'delete')
);

-- ============================================================================
-- Staff
-- ============================================================================

DROP POLICY IF EXISTS "Users can read their organization's staff" ON public.staff;
DROP POLICY IF EXISTS "Users can insert staff in their organization" ON public.staff;
DROP POLICY IF EXISTS "Users can update their organization's staff" ON public.staff;
DROP POLICY IF EXISTS "Users can delete their organization's staff" ON public.staff;

CREATE POLICY "Users can read staff" ON public.staff
    FOR SELECT TO authenticated
USING (
    deleted_at IS NULL
    AND organization_id = public.get_current_user_organization_id()
    AND public.has_permission_for_resource('staff', 'read')
);

CREATE POLICY "Users can insert staff" ON public.staff
    FOR INSERT TO authenticated
WITH CHECK (
    deleted_at IS NULL
    AND organization_id = public.get_current_user_organization_id()
    AND public.has_permission_for_resource('staff', 'create')
);

CREATE POLICY "Users can update staff" ON public.staff
    FOR UPDATE TO authenticated
USING (
    deleted_at IS NULL
    AND organization_id = public.get_current_user_organization_id()
    AND public.has_permission_for_resource('staff', 'update')
)
WITH CHECK (
    deleted_at IS NULL
    AND organization_id = public.get_current_user_organization_id()
    AND public.has_permission_for_resource('staff', 'update')
);

CREATE POLICY "Users can delete staff" ON public.staff
    FOR DELETE TO authenticated
USING (
    deleted_at IS NULL
    AND organization_id = public.get_current_user_organization_id()
    AND public.has_permission_for_resource('staff', 'delete')
);

-- ============================================================================
-- Profiles
-- ============================================================================

DROP POLICY IF EXISTS "Users can read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update profiles" ON public.profiles;

CREATE POLICY "Users can read profiles" ON public.profiles
    FOR SELECT TO authenticated
USING (
    deleted_at IS NULL
    AND (
        -- Users can always read their own profile
        id = (SELECT auth.uid())
        OR (
            -- Users with profiles.read permission can read profiles in their organization
            organization_id = public.get_current_user_organization_id()
            AND public.has_permission_for_resource('profiles', 'read')
        )
    )
);

CREATE POLICY "Users can update profiles" ON public.profiles
    FOR UPDATE TO authenticated
USING (
    deleted_at IS NULL
    AND (
        -- Users can always update their own profile (limited fields)
        id = (SELECT auth.uid())
        OR (
            -- Users with profiles.update permission can update profiles in their organization
            organization_id = public.get_current_user_organization_id()
            AND public.has_permission_for_resource('profiles', 'update')
        )
    )
)
WITH CHECK (
    deleted_at IS NULL
    AND (
        id = (SELECT auth.uid())
        OR (
            organization_id = public.get_current_user_organization_id()
            AND public.has_permission_for_resource('profiles', 'update')
        )
    )
);

-- Note: DELETE policy for profiles should remain restricted to admins/super_admin
-- (keeping existing policy or creating new one with permission check)

