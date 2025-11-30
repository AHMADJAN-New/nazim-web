-- ============================================================================
-- Update Academic Tables RLS Policies to Use Permission-Based Checks
-- ============================================================================
-- Updates students, student_admissions, classes, subjects, and academic_years
-- to use permission-based checks with role-specific scoping.
-- ============================================================================

-- ============================================================================
-- Students
-- ============================================================================

DROP POLICY IF EXISTS "Users can read students" ON public.students;
DROP POLICY IF EXISTS "Users can update students" ON public.students;

CREATE POLICY "Users can read students" ON public.students
    FOR SELECT TO authenticated
USING (
    deleted_at IS NULL
    AND (
        -- Super admin, admin, or staff with students.read permission (organization scope)
        (
            organization_id = public.get_current_user_organization_id()
            AND public.has_permission_for_resource('students', 'read')
        )
        OR
        -- Teacher: Only students in their classes (to be implemented when class_students exists)
        -- For now, teachers with students.read permission can see all students in their org
        (
            public.get_current_user_role() = 'teacher'
            AND organization_id = public.get_current_user_organization_id()
            AND public.has_permission_for_resource('students', 'read')
        )
        OR
        -- Student: Only own record
        (
            public.get_current_user_role() = 'student'
            AND id = (SELECT auth.uid())
        )
        OR
        -- Parent: Only their children (to be implemented when parent relationship exists)
        -- For now, parents with students.read permission can see all students in their org
        (
            public.get_current_user_role() = 'parent'
            AND organization_id = public.get_current_user_organization_id()
            AND public.has_permission_for_resource('students', 'read')
        )
    )
);

-- Note: INSERT policy should be checked separately - keeping existing or creating new
-- Let's check if there's an existing INSERT policy
DROP POLICY IF EXISTS "Users can insert students" ON public.students;

CREATE POLICY "Users can insert students" ON public.students
    FOR INSERT TO authenticated
WITH CHECK (
    deleted_at IS NULL
    AND organization_id = public.get_current_user_organization_id()
    AND (
        school_id IS NULL
        OR public.get_current_user_school_ids() IS NULL
        OR school_id = ANY(public.get_current_user_school_ids())
    )
    AND public.has_permission_for_resource('students', 'create')
);

CREATE POLICY "Users can update students" ON public.students
    FOR UPDATE TO authenticated
USING (
    deleted_at IS NULL
    AND (
        -- Super admin, admin, or staff with students.update permission
        (
            organization_id = public.get_current_user_organization_id()
            AND (
                school_id IS NULL
                OR public.get_current_user_school_ids() IS NULL
                OR school_id = ANY(public.get_current_user_school_ids())
            )
            AND public.has_permission_for_resource('students', 'update')
        )
        OR
        -- Student: Only own record (limited fields)
        (
            public.get_current_user_role() = 'student'
            AND id = (SELECT auth.uid())
        )
    )
)
WITH CHECK (
    deleted_at IS NULL
    AND (
        organization_id = public.get_current_user_organization_id()
        AND (
            school_id IS NULL
            OR public.get_current_user_school_ids() IS NULL
            OR school_id = ANY(public.get_current_user_school_ids())
        )
        AND public.has_permission_for_resource('students', 'update')
    )
    OR (
        public.get_current_user_role() = 'student'
        AND id = (SELECT auth.uid())
    )
);

DROP POLICY IF EXISTS "Users can delete students" ON public.students;

CREATE POLICY "Users can delete students" ON public.students
    FOR DELETE TO authenticated
USING (
    deleted_at IS NULL
    AND organization_id = public.get_current_user_organization_id()
    AND (
        school_id IS NULL
        OR public.get_current_user_school_ids() IS NULL
        OR school_id = ANY(public.get_current_user_school_ids())
    )
    AND public.has_permission_for_resource('students', 'delete')
);

-- ============================================================================
-- Student Admissions
-- ============================================================================

DROP POLICY IF EXISTS "Users can read student_admissions" ON public.student_admissions;
DROP POLICY IF EXISTS "Users can insert student_admissions" ON public.student_admissions;
DROP POLICY IF EXISTS "Users can update student_admissions" ON public.student_admissions;
DROP POLICY IF EXISTS "Users can delete student_admissions" ON public.student_admissions;

CREATE POLICY "Users can read student_admissions" ON public.student_admissions
    FOR SELECT TO authenticated
USING (
    deleted_at IS NULL
    AND organization_id = public.get_current_user_organization_id()
    AND (
        school_id IS NULL
        OR public.get_current_user_school_ids() IS NULL
        OR school_id = ANY(public.get_current_user_school_ids())
    )
    AND public.has_permission_for_resource('student_admissions', 'read')
);

CREATE POLICY "Users can insert student_admissions" ON public.student_admissions
    FOR INSERT TO authenticated
WITH CHECK (
    deleted_at IS NULL
    AND organization_id = public.get_current_user_organization_id()
    AND (
        school_id IS NULL
        OR public.get_current_user_school_ids() IS NULL
        OR school_id = ANY(public.get_current_user_school_ids())
    )
    AND public.has_permission_for_resource('student_admissions', 'create')
);

CREATE POLICY "Users can update student_admissions" ON public.student_admissions
    FOR UPDATE TO authenticated
USING (
    deleted_at IS NULL
    AND organization_id = public.get_current_user_organization_id()
    AND (
        school_id IS NULL
        OR public.get_current_user_school_ids() IS NULL
        OR school_id = ANY(public.get_current_user_school_ids())
    )
    AND public.has_permission_for_resource('student_admissions', 'update')
)
WITH CHECK (
    -- Allow setting deleted_at for soft deletes
    organization_id = public.get_current_user_organization_id()
    AND (
        school_id IS NULL
        OR public.get_current_user_school_ids() IS NULL
        OR school_id = ANY(public.get_current_user_school_ids())
    )
    AND public.has_permission_for_resource('student_admissions', 'update')
);

CREATE POLICY "Users can delete student_admissions" ON public.student_admissions
    FOR DELETE TO authenticated
USING (
    deleted_at IS NULL
    AND organization_id = public.get_current_user_organization_id()
    AND (
        school_id IS NULL
        OR public.get_current_user_school_ids() IS NULL
        OR school_id = ANY(public.get_current_user_school_ids())
    )
    AND public.has_permission_for_resource('student_admissions', 'delete')
);

-- ============================================================================
-- Classes
-- ============================================================================

DROP POLICY IF EXISTS "Users can read classes" ON public.classes;
DROP POLICY IF EXISTS "Users can insert classes" ON public.classes;
DROP POLICY IF EXISTS "Users can update classes" ON public.classes;
DROP POLICY IF EXISTS "Users can delete classes" ON public.classes;

CREATE POLICY "Users can read classes" ON public.classes
    FOR SELECT TO authenticated
USING (
    deleted_at IS NULL
    AND (
        organization_id IS NULL
        OR organization_id = public.get_current_user_organization_id()
    )
    AND public.has_permission_for_resource('classes', 'read')
    -- TODO: Add teacher scoping when class_teachers table exists
);

CREATE POLICY "Users can insert classes" ON public.classes
    FOR INSERT TO authenticated
WITH CHECK (
    deleted_at IS NULL
    AND (
        organization_id = public.get_current_user_organization_id()
        OR (
            organization_id IS NULL
            AND public.get_current_user_role() = 'super_admin'
        )
    )
    AND public.has_permission_for_resource('classes', 'create')
);

CREATE POLICY "Users can update classes" ON public.classes
    FOR UPDATE TO authenticated
USING (
    deleted_at IS NULL
    AND (
        organization_id IS NULL
        OR organization_id = public.get_current_user_organization_id()
    )
    AND public.has_permission_for_resource('classes', 'update')
)
WITH CHECK (
    deleted_at IS NULL
    AND (
        organization_id IS NULL
        OR organization_id = public.get_current_user_organization_id()
    )
    AND public.has_permission_for_resource('classes', 'update')
);

CREATE POLICY "Users can delete classes" ON public.classes
    FOR DELETE TO authenticated
USING (
    deleted_at IS NULL
    AND (
        organization_id IS NULL
        OR organization_id = public.get_current_user_organization_id()
    )
    AND public.has_permission_for_resource('classes', 'delete')
);

-- ============================================================================
-- Subjects
-- ============================================================================

-- Check existing policies first
DROP POLICY IF EXISTS "Users can read subjects" ON public.subjects;
DROP POLICY IF EXISTS "Users can insert subjects" ON public.subjects;
DROP POLICY IF EXISTS "Users can update subjects" ON public.subjects;
DROP POLICY IF EXISTS "Users can delete subjects" ON public.subjects;

CREATE POLICY "Users can read subjects" ON public.subjects
    FOR SELECT TO authenticated
USING (
    deleted_at IS NULL
    AND (
        organization_id IS NULL
        OR organization_id = public.get_current_user_organization_id()
    )
    AND public.has_permission_for_resource('subjects', 'read')
);

CREATE POLICY "Users can insert subjects" ON public.subjects
    FOR INSERT TO authenticated
WITH CHECK (
    deleted_at IS NULL
    AND (
        organization_id = public.get_current_user_organization_id()
        OR (
            organization_id IS NULL
            AND public.get_current_user_role() = 'super_admin'
        )
    )
    AND public.has_permission_for_resource('subjects', 'create')
);

CREATE POLICY "Users can update subjects" ON public.subjects
    FOR UPDATE TO authenticated
USING (
    deleted_at IS NULL
    AND (
        organization_id IS NULL
        OR organization_id = public.get_current_user_organization_id()
    )
    AND public.has_permission_for_resource('subjects', 'update')
)
WITH CHECK (
    deleted_at IS NULL
    AND (
        organization_id IS NULL
        OR organization_id = public.get_current_user_organization_id()
    )
    AND public.has_permission_for_resource('subjects', 'update')
);

CREATE POLICY "Users can delete subjects" ON public.subjects
    FOR DELETE TO authenticated
USING (
    deleted_at IS NULL
    AND (
        organization_id IS NULL
        OR organization_id = public.get_current_user_organization_id()
    )
    AND public.has_permission_for_resource('subjects', 'delete')
);

-- ============================================================================
-- Academic Years
-- ============================================================================

DROP POLICY IF EXISTS "Users can read academic_years" ON public.academic_years;
DROP POLICY IF EXISTS "Users can insert academic_years" ON public.academic_years;
DROP POLICY IF EXISTS "Users can update academic_years" ON public.academic_years;
DROP POLICY IF EXISTS "Users can delete academic_years" ON public.academic_years;

CREATE POLICY "Users can read academic_years" ON public.academic_years
    FOR SELECT TO authenticated
USING (
    deleted_at IS NULL
    AND (
        organization_id IS NULL
        OR organization_id = public.get_current_user_organization_id()
    )
    AND public.has_permission_for_resource('academic_years', 'read')
);

CREATE POLICY "Users can insert academic_years" ON public.academic_years
    FOR INSERT TO authenticated
WITH CHECK (
    deleted_at IS NULL
    AND (
        organization_id = public.get_current_user_organization_id()
        OR (
            organization_id IS NULL
            AND public.get_current_user_role() = 'super_admin'
        )
    )
    AND public.has_permission_for_resource('academic_years', 'create')
);

CREATE POLICY "Users can update academic_years" ON public.academic_years
    FOR UPDATE TO authenticated
USING (
    deleted_at IS NULL
    AND (
        organization_id IS NULL
        OR organization_id = public.get_current_user_organization_id()
    )
    AND public.has_permission_for_resource('academic_years', 'update')
)
WITH CHECK (
    deleted_at IS NULL
    AND (
        organization_id IS NULL
        OR organization_id = public.get_current_user_organization_id()
    )
    AND public.has_permission_for_resource('academic_years', 'update')
);

CREATE POLICY "Users can delete academic_years" ON public.academic_years
    FOR DELETE TO authenticated
USING (
    deleted_at IS NULL
    AND (
        organization_id IS NULL
        OR organization_id = public.get_current_user_organization_id()
    )
    AND public.has_permission_for_resource('academic_years', 'delete')
);

