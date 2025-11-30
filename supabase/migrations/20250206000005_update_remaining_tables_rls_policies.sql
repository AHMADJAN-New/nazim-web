-- ============================================================================
-- Update Remaining Tables RLS Policies to Use Permission-Based Checks
-- ============================================================================
-- Updates residency_types, class_subjects, class_academic_years, 
-- teacher_subject_assignments, schedule_slots, timetables, and other tables
-- to use permission-based checks.
-- ============================================================================

-- ============================================================================
-- Residency Types
-- ============================================================================

DROP POLICY IF EXISTS "Users can read residency_types" ON public.residency_types;
DROP POLICY IF EXISTS "Users can insert residency_types" ON public.residency_types;
DROP POLICY IF EXISTS "Users can update residency_types" ON public.residency_types;
DROP POLICY IF EXISTS "Users can delete residency_types" ON public.residency_types;

CREATE POLICY "Users can read residency_types" ON public.residency_types
    FOR SELECT TO authenticated
USING (
    deleted_at IS NULL
    AND (
        organization_id IS NULL
        OR organization_id = public.get_current_user_organization_id()
    )
    AND public.has_permission_for_resource('residency_types', 'read')
);

CREATE POLICY "Users can insert residency_types" ON public.residency_types
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
    AND public.has_permission_for_resource('residency_types', 'create')
);

CREATE POLICY "Users can update residency_types" ON public.residency_types
    FOR UPDATE TO authenticated
USING (
    deleted_at IS NULL
    AND (
        organization_id IS NULL
        OR organization_id = public.get_current_user_organization_id()
    )
    AND public.has_permission_for_resource('residency_types', 'update')
)
WITH CHECK (
    deleted_at IS NULL
    AND (
        organization_id IS NULL
        OR organization_id = public.get_current_user_organization_id()
    )
    AND public.has_permission_for_resource('residency_types', 'update')
);

CREATE POLICY "Users can delete residency_types" ON public.residency_types
    FOR DELETE TO authenticated
USING (
    deleted_at IS NULL
    AND (
        organization_id IS NULL
        OR organization_id = public.get_current_user_organization_id()
    )
    AND public.has_permission_for_resource('residency_types', 'delete')
);

-- ============================================================================
-- Class Subjects
-- ============================================================================

DROP POLICY IF EXISTS "Users can read class_subjects" ON public.class_subjects;
DROP POLICY IF EXISTS "Users can insert class_subjects" ON public.class_subjects;
DROP POLICY IF EXISTS "Users can update class_subjects" ON public.class_subjects;
DROP POLICY IF EXISTS "Users can delete class_subjects" ON public.class_subjects;

CREATE POLICY "Users can read class_subjects" ON public.class_subjects
    FOR SELECT TO authenticated
USING (
    deleted_at IS NULL
    AND (
        organization_id IS NULL
        OR organization_id = public.get_current_user_organization_id()
    )
    AND public.has_permission_for_resource('class_subjects', 'read')
);

CREATE POLICY "Users can insert class_subjects" ON public.class_subjects
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
    AND public.has_permission_for_resource('class_subjects', 'create')
);

CREATE POLICY "Users can update class_subjects" ON public.class_subjects
    FOR UPDATE TO authenticated
USING (
    deleted_at IS NULL
    AND (
        organization_id IS NULL
        OR organization_id = public.get_current_user_organization_id()
    )
    AND public.has_permission_for_resource('class_subjects', 'update')
)
WITH CHECK (
    deleted_at IS NULL
    AND (
        organization_id IS NULL
        OR organization_id = public.get_current_user_organization_id()
    )
    AND public.has_permission_for_resource('class_subjects', 'update')
);

CREATE POLICY "Users can delete class_subjects" ON public.class_subjects
    FOR DELETE TO authenticated
USING (
    deleted_at IS NULL
    AND (
        organization_id IS NULL
        OR organization_id = public.get_current_user_organization_id()
    )
    AND public.has_permission_for_resource('class_subjects', 'delete')
);

-- ============================================================================
-- Class Academic Years
-- ============================================================================

DROP POLICY IF EXISTS "Users can read class_academic_years" ON public.class_academic_years;
DROP POLICY IF EXISTS "Users can insert class_academic_years" ON public.class_academic_years;
DROP POLICY IF EXISTS "Users can update class_academic_years" ON public.class_academic_years;
DROP POLICY IF EXISTS "Users can delete class_academic_years" ON public.class_academic_years;

CREATE POLICY "Users can read class_academic_years" ON public.class_academic_years
    FOR SELECT TO authenticated
USING (
    deleted_at IS NULL
    AND (
        organization_id IS NULL
        OR organization_id = public.get_current_user_organization_id()
    )
    AND public.has_permission_for_resource('class_academic_years', 'read')
);

CREATE POLICY "Users can insert class_academic_years" ON public.class_academic_years
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
    AND public.has_permission_for_resource('class_academic_years', 'create')
);

CREATE POLICY "Users can update class_academic_years" ON public.class_academic_years
    FOR UPDATE TO authenticated
USING (
    deleted_at IS NULL
    AND (
        organization_id IS NULL
        OR organization_id = public.get_current_user_organization_id()
    )
    AND public.has_permission_for_resource('class_academic_years', 'update')
)
WITH CHECK (
    deleted_at IS NULL
    AND (
        organization_id IS NULL
        OR organization_id = public.get_current_user_organization_id()
    )
    AND public.has_permission_for_resource('class_academic_years', 'update')
);

CREATE POLICY "Users can delete class_academic_years" ON public.class_academic_years
    FOR DELETE TO authenticated
USING (
    deleted_at IS NULL
    AND (
        organization_id IS NULL
        OR organization_id = public.get_current_user_organization_id()
    )
    AND public.has_permission_for_resource('class_academic_years', 'delete')
);

-- ============================================================================
-- Teacher Subject Assignments
-- ============================================================================

DROP POLICY IF EXISTS "Users can read teacher_subject_assignments" ON public.teacher_subject_assignments;
DROP POLICY IF EXISTS "Users can insert teacher_subject_assignments" ON public.teacher_subject_assignments;
DROP POLICY IF EXISTS "Users can update teacher_subject_assignments" ON public.teacher_subject_assignments;
DROP POLICY IF EXISTS "Users can delete teacher_subject_assignments" ON public.teacher_subject_assignments;

CREATE POLICY "Users can read teacher_subject_assignments" ON public.teacher_subject_assignments
    FOR SELECT TO authenticated
USING (
    deleted_at IS NULL
    AND (
        organization_id IS NULL
        OR organization_id = public.get_current_user_organization_id()
    )
    AND public.has_permission_for_resource('teacher_subject_assignments', 'read')
);

CREATE POLICY "Users can insert teacher_subject_assignments" ON public.teacher_subject_assignments
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
    AND public.has_permission_for_resource('teacher_subject_assignments', 'create')
);

CREATE POLICY "Users can update teacher_subject_assignments" ON public.teacher_subject_assignments
    FOR UPDATE TO authenticated
USING (
    deleted_at IS NULL
    AND (
        organization_id IS NULL
        OR organization_id = public.get_current_user_organization_id()
    )
    AND public.has_permission_for_resource('teacher_subject_assignments', 'update')
)
WITH CHECK (
    deleted_at IS NULL
    AND (
        organization_id IS NULL
        OR organization_id = public.get_current_user_organization_id()
    )
    AND public.has_permission_for_resource('teacher_subject_assignments', 'update')
);

CREATE POLICY "Users can delete teacher_subject_assignments" ON public.teacher_subject_assignments
    FOR DELETE TO authenticated
USING (
    deleted_at IS NULL
    AND (
        organization_id IS NULL
        OR organization_id = public.get_current_user_organization_id()
    )
    AND public.has_permission_for_resource('teacher_subject_assignments', 'delete')
);

-- ============================================================================
-- Schedule Slots
-- ============================================================================

DROP POLICY IF EXISTS "Users can read schedule_slots" ON public.schedule_slots;
DROP POLICY IF EXISTS "Users can insert schedule_slots" ON public.schedule_slots;
DROP POLICY IF EXISTS "Users can update schedule_slots" ON public.schedule_slots;
DROP POLICY IF EXISTS "Users can delete schedule_slots" ON public.schedule_slots;

CREATE POLICY "Users can read schedule_slots" ON public.schedule_slots
    FOR SELECT TO authenticated
USING (
    deleted_at IS NULL
    AND (
        organization_id IS NULL
        OR organization_id = public.get_current_user_organization_id()
    )
    AND public.has_permission_for_resource('schedule_slots', 'read')
);

CREATE POLICY "Users can insert schedule_slots" ON public.schedule_slots
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
    AND public.has_permission_for_resource('schedule_slots', 'create')
);

CREATE POLICY "Users can update schedule_slots" ON public.schedule_slots
    FOR UPDATE TO authenticated
USING (
    deleted_at IS NULL
    AND (
        organization_id IS NULL
        OR organization_id = public.get_current_user_organization_id()
    )
    AND public.has_permission_for_resource('schedule_slots', 'update')
)
WITH CHECK (
    deleted_at IS NULL
    AND (
        organization_id IS NULL
        OR organization_id = public.get_current_user_organization_id()
    )
    AND public.has_permission_for_resource('schedule_slots', 'update')
);

CREATE POLICY "Users can delete schedule_slots" ON public.schedule_slots
    FOR DELETE TO authenticated
USING (
    deleted_at IS NULL
    AND (
        organization_id IS NULL
        OR organization_id = public.get_current_user_organization_id()
    )
    AND public.has_permission_for_resource('schedule_slots', 'delete')
);

-- ============================================================================
-- Note: Timetables policies are already created in 20250205000010_create_timetable_tables.sql
-- The table is called 'generated_timetables', not 'timetables'
-- If permission-based RLS is needed for generated_timetables, create a separate migration
-- ============================================================================

-- ============================================================================
-- Student Documents
-- ============================================================================

DROP POLICY IF EXISTS "Users can read student_documents" ON public.student_documents;
DROP POLICY IF EXISTS "Users can insert student_documents" ON public.student_documents;
DROP POLICY IF EXISTS "Users can update student_documents" ON public.student_documents;
DROP POLICY IF EXISTS "Users can delete student_documents" ON public.student_documents;

CREATE POLICY "Users can read student_documents" ON public.student_documents
    FOR SELECT TO authenticated
USING (
    deleted_at IS NULL
    AND organization_id = public.get_current_user_organization_id()
    AND (
        school_id IS NULL
        OR public.get_current_user_school_ids() IS NULL
        OR school_id = ANY(public.get_current_user_school_ids())
    )
    AND public.has_permission_for_resource('student_documents', 'read')
);

CREATE POLICY "Users can insert student_documents" ON public.student_documents
    FOR INSERT TO authenticated
WITH CHECK (
    deleted_at IS NULL
    AND organization_id = public.get_current_user_organization_id()
    AND (
        school_id IS NULL
        OR public.get_current_user_school_ids() IS NULL
        OR school_id = ANY(public.get_current_user_school_ids())
    )
    AND public.has_permission_for_resource('student_documents', 'create')
);

CREATE POLICY "Users can update student_documents" ON public.student_documents
    FOR UPDATE TO authenticated
USING (
    deleted_at IS NULL
    AND organization_id = public.get_current_user_organization_id()
    AND (
        school_id IS NULL
        OR public.get_current_user_school_ids() IS NULL
        OR school_id = ANY(public.get_current_user_school_ids())
    )
    AND public.has_permission_for_resource('student_documents', 'update')
)
WITH CHECK (
    deleted_at IS NULL
    AND organization_id = public.get_current_user_organization_id()
    AND (
        school_id IS NULL
        OR public.get_current_user_school_ids() IS NULL
        OR school_id = ANY(public.get_current_user_school_ids())
    )
    AND public.has_permission_for_resource('student_documents', 'update')
);

CREATE POLICY "Users can delete student_documents" ON public.student_documents
    FOR DELETE TO authenticated
USING (
    deleted_at IS NULL
    AND organization_id = public.get_current_user_organization_id()
    AND (
        school_id IS NULL
        OR public.get_current_user_school_ids() IS NULL
        OR school_id = ANY(public.get_current_user_school_ids())
    )
    AND public.has_permission_for_resource('student_documents', 'delete')
);

-- ============================================================================
-- Student Educational History
-- ============================================================================

DROP POLICY IF EXISTS "Users can read student_educational_history" ON public.student_educational_history;
DROP POLICY IF EXISTS "Users can insert student_educational_history" ON public.student_educational_history;
DROP POLICY IF EXISTS "Users can update student_educational_history" ON public.student_educational_history;
DROP POLICY IF EXISTS "Users can delete student_educational_history" ON public.student_educational_history;

CREATE POLICY "Users can read student_educational_history" ON public.student_educational_history
    FOR SELECT TO authenticated
USING (
    deleted_at IS NULL
    AND organization_id = public.get_current_user_organization_id()
    AND (
        school_id IS NULL
        OR public.get_current_user_school_ids() IS NULL
        OR school_id = ANY(public.get_current_user_school_ids())
    )
    AND public.has_permission_for_resource('student_educational_history', 'read')
);

CREATE POLICY "Users can insert student_educational_history" ON public.student_educational_history
    FOR INSERT TO authenticated
WITH CHECK (
    deleted_at IS NULL
    AND organization_id = public.get_current_user_organization_id()
    AND (
        school_id IS NULL
        OR public.get_current_user_school_ids() IS NULL
        OR school_id = ANY(public.get_current_user_school_ids())
    )
    AND public.has_permission_for_resource('student_educational_history', 'create')
);

CREATE POLICY "Users can update student_educational_history" ON public.student_educational_history
    FOR UPDATE TO authenticated
USING (
    deleted_at IS NULL
    AND organization_id = public.get_current_user_organization_id()
    AND (
        school_id IS NULL
        OR public.get_current_user_school_ids() IS NULL
        OR school_id = ANY(public.get_current_user_school_ids())
    )
    AND public.has_permission_for_resource('student_educational_history', 'update')
)
WITH CHECK (
    deleted_at IS NULL
    AND organization_id = public.get_current_user_organization_id()
    AND (
        school_id IS NULL
        OR public.get_current_user_school_ids() IS NULL
        OR school_id = ANY(public.get_current_user_school_ids())
    )
    AND public.has_permission_for_resource('student_educational_history', 'update')
);

CREATE POLICY "Users can delete student_educational_history" ON public.student_educational_history
    FOR DELETE TO authenticated
USING (
    deleted_at IS NULL
    AND organization_id = public.get_current_user_organization_id()
    AND (
        school_id IS NULL
        OR public.get_current_user_school_ids() IS NULL
        OR school_id = ANY(public.get_current_user_school_ids())
    )
    AND public.has_permission_for_resource('student_educational_history', 'delete')
);

-- ============================================================================
-- Student Discipline Records
-- ============================================================================

DROP POLICY IF EXISTS "Users can read student_discipline_records" ON public.student_discipline_records;
DROP POLICY IF EXISTS "Users can insert student_discipline_records" ON public.student_discipline_records;
DROP POLICY IF EXISTS "Users can update student_discipline_records" ON public.student_discipline_records;
DROP POLICY IF EXISTS "Users can delete student_discipline_records" ON public.student_discipline_records;

CREATE POLICY "Users can read student_discipline_records" ON public.student_discipline_records
    FOR SELECT TO authenticated
USING (
    deleted_at IS NULL
    AND organization_id = public.get_current_user_organization_id()
    AND (
        school_id IS NULL
        OR public.get_current_user_school_ids() IS NULL
        OR school_id = ANY(public.get_current_user_school_ids())
    )
    AND public.has_permission_for_resource('student_discipline_records', 'read')
);

CREATE POLICY "Users can insert student_discipline_records" ON public.student_discipline_records
    FOR INSERT TO authenticated
WITH CHECK (
    deleted_at IS NULL
    AND organization_id = public.get_current_user_organization_id()
    AND (
        school_id IS NULL
        OR public.get_current_user_school_ids() IS NULL
        OR school_id = ANY(public.get_current_user_school_ids())
    )
    AND public.has_permission_for_resource('student_discipline_records', 'create')
);

CREATE POLICY "Users can update student_discipline_records" ON public.student_discipline_records
    FOR UPDATE TO authenticated
USING (
    deleted_at IS NULL
    AND organization_id = public.get_current_user_organization_id()
    AND (
        school_id IS NULL
        OR public.get_current_user_school_ids() IS NULL
        OR school_id = ANY(public.get_current_user_school_ids())
    )
    AND public.has_permission_for_resource('student_discipline_records', 'update')
)
WITH CHECK (
    deleted_at IS NULL
    AND organization_id = public.get_current_user_organization_id()
    AND (
        school_id IS NULL
        OR public.get_current_user_school_ids() IS NULL
        OR school_id = ANY(public.get_current_user_school_ids())
    )
    AND public.has_permission_for_resource('student_discipline_records', 'update')
);

CREATE POLICY "Users can delete student_discipline_records" ON public.student_discipline_records
    FOR DELETE TO authenticated
USING (
    deleted_at IS NULL
    AND organization_id = public.get_current_user_organization_id()
    AND (
        school_id IS NULL
        OR public.get_current_user_school_ids() IS NULL
        OR school_id = ANY(public.get_current_user_school_ids())
    )
    AND public.has_permission_for_resource('student_discipline_records', 'delete')
);

