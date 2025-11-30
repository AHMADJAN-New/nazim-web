-- ============================================================================
-- Seed Staff-Specific Permissions
-- ============================================================================
-- Creates permissions for staff operations that will be assigned to individual
-- staff users via user_permissions table (not role_permissions, since different
-- staff have different permissions).
-- ============================================================================

-- ============================================================================
-- Staff Operation Permissions
-- ============================================================================

INSERT INTO public.permissions (name, resource, action, description, organization_id)
VALUES
    -- Attendance permissions (for clerks)
    ('attendance.read', 'attendance', 'read', 'View attendance records', NULL),
    ('attendance.create', 'attendance', 'create', 'Create attendance records', NULL),
    ('attendance.update', 'attendance', 'update', 'Update attendance records', NULL),
    ('attendance.delete', 'attendance', 'delete', 'Delete attendance records', NULL),
    
    -- Student admissions permissions (for front desk, registrar)
    ('student_admissions.read', 'student_admissions', 'read', 'View student admissions', NULL),
    ('student_admissions.create', 'student_admissions', 'create', 'Create student admissions', NULL),
    ('student_admissions.update', 'student_admissions', 'update', 'Update student admissions', NULL),
    ('student_admissions.delete', 'student_admissions', 'delete', 'Delete student admissions', NULL),
    
    -- Library permissions (for librarian, librarian assistant)
    ('library.read', 'library', 'read', 'View library books and records', NULL),
    ('library.create', 'library', 'create', 'Add library books', NULL),
    ('library.update', 'library', 'update', 'Update library books', NULL),
    ('library.delete', 'library', 'delete', 'Delete library books', NULL),
    
    -- Hostel permissions (for hostel warden)
    ('hostel.read', 'hostel', 'read', 'View hostel records', NULL),
    ('hostel.create', 'hostel', 'create', 'Create hostel records', NULL),
    ('hostel.update', 'hostel', 'update', 'Update hostel records', NULL),
    ('hostel.delete', 'hostel', 'delete', 'Delete hostel records', NULL),
    
    -- Students permissions (for staff who need to see students)
    ('students.read', 'students', 'read', 'View students', NULL),
    ('students.create', 'students', 'create', 'Create students', NULL),
    ('students.update', 'students', 'update', 'Update students', NULL),
    ('students.delete', 'students', 'delete', 'Delete students', NULL),
    
    -- Additional resource permissions that may be needed
    ('class_subjects.read', 'class_subjects', 'read', 'View class subjects', NULL),
    ('class_subjects.create', 'class_subjects', 'create', 'Create class subjects', NULL),
    ('class_subjects.update', 'class_subjects', 'update', 'Update class subjects', NULL),
    ('class_subjects.delete', 'class_subjects', 'delete', 'Delete class subjects', NULL),
    
    ('class_academic_years.read', 'class_academic_years', 'read', 'View class academic years', NULL),
    ('class_academic_years.create', 'class_academic_years', 'create', 'Create class academic years', NULL),
    ('class_academic_years.update', 'class_academic_years', 'update', 'Update class academic years', NULL),
    ('class_academic_years.delete', 'class_academic_years', 'delete', 'Delete class academic years', NULL),
    
    ('teacher_subject_assignments.read', 'teacher_subject_assignments', 'read', 'View teacher subject assignments', NULL),
    ('teacher_subject_assignments.create', 'teacher_subject_assignments', 'create', 'Create teacher subject assignments', NULL),
    ('teacher_subject_assignments.update', 'teacher_subject_assignments', 'update', 'Update teacher subject assignments', NULL),
    ('teacher_subject_assignments.delete', 'teacher_subject_assignments', 'delete', 'Delete teacher subject assignments', NULL),
    
    ('schedule_slots.read', 'schedule_slots', 'read', 'View schedule slots', NULL),
    ('schedule_slots.create', 'schedule_slots', 'create', 'Create schedule slots', NULL),
    ('schedule_slots.update', 'schedule_slots', 'update', 'Update schedule slots', NULL),
    ('schedule_slots.delete', 'schedule_slots', 'delete', 'Delete schedule slots', NULL),
    
    ('timetables.read', 'timetables', 'read', 'View timetables', NULL),
    ('timetables.create', 'timetables', 'create', 'Create timetables', NULL),
    ('timetables.update', 'timetables', 'update', 'Update timetables', NULL),
    ('timetables.delete', 'timetables', 'delete', 'Delete timetables', NULL),
    
    ('student_documents.read', 'student_documents', 'read', 'View student documents', NULL),
    ('student_documents.create', 'student_documents', 'create', 'Create student documents', NULL),
    ('student_documents.update', 'student_documents', 'update', 'Update student documents', NULL),
    ('student_documents.delete', 'student_documents', 'delete', 'Delete student documents', NULL),
    
    ('student_educational_history.read', 'student_educational_history', 'read', 'View student educational history', NULL),
    ('student_educational_history.create', 'student_educational_history', 'create', 'Create student educational history', NULL),
    ('student_educational_history.update', 'student_educational_history', 'update', 'Update student educational history', NULL),
    ('student_educational_history.delete', 'student_educational_history', 'delete', 'Delete student educational history', NULL),
    
    ('student_discipline_records.read', 'student_discipline_records', 'read', 'View student discipline records', NULL),
    ('student_discipline_records.create', 'student_discipline_records', 'create', 'Create student discipline records', NULL),
    ('student_discipline_records.update', 'student_discipline_records', 'update', 'Update student discipline records', NULL),
    ('student_discipline_records.delete', 'student_discipline_records', 'delete', 'Delete student discipline records', NULL),
    
    ('residency_types.read', 'residency_types', 'read', 'View residency types', NULL),
    ('residency_types.create', 'residency_types', 'create', 'Create residency types', NULL),
    ('residency_types.update', 'residency_types', 'update', 'Update residency types', NULL),
    ('residency_types.delete', 'residency_types', 'delete', 'Delete residency types', NULL),
    
    ('subjects.read', 'subjects', 'read', 'View subjects', NULL),
    ('subjects.create', 'subjects', 'create', 'Create subjects', NULL),
    ('subjects.update', 'subjects', 'update', 'Update subjects', NULL),
    ('subjects.delete', 'subjects', 'delete', 'Delete subjects', NULL),
    
    ('classes.read', 'classes', 'read', 'View classes', NULL),
    ('classes.create', 'classes', 'create', 'Create classes', NULL),
    ('classes.update', 'classes', 'update', 'Update classes', NULL),
    ('classes.delete', 'classes', 'delete', 'Delete classes', NULL),
    
    ('academic_years.read', 'academic_years', 'read', 'View academic years', NULL),
    ('academic_years.create', 'academic_years', 'create', 'Create academic years', NULL),
    ('academic_years.update', 'academic_years', 'update', 'Update academic years', NULL),
    ('academic_years.delete', 'academic_years', 'delete', 'Delete academic years', NULL),
    
    ('staff.read', 'staff', 'read', 'View staff', NULL),
    ('staff.create', 'staff', 'create', 'Create staff', NULL),
    ('staff.update', 'staff', 'update', 'Update staff', NULL),
    ('staff.delete', 'staff', 'delete', 'Delete staff', NULL)
ON CONFLICT (name, organization_id) DO NOTHING;

-- ============================================================================
-- Assign Staff Permissions to Super Admin (for testing/management)
-- ============================================================================

INSERT INTO public.role_permissions (role, permission_id, organization_id)
SELECT 'super_admin', id, NULL
FROM public.permissions
WHERE organization_id IS NULL
  AND resource IN (
      'attendance', 'student_admissions', 'library', 'hostel', 
      'students', 'class_subjects', 'class_academic_years', 
      'teacher_subject_assignments', 'schedule_slots', 'timetables',
      'student_documents', 'student_educational_history', 
      'student_discipline_records', 'residency_types', 'subjects',
      'classes', 'academic_years', 'staff'
  )
ON CONFLICT (role, permission_id, organization_id) DO NOTHING;

COMMENT ON TABLE public.user_permissions IS 'Use this table to assign specific permissions to individual staff users. Example: Assign attendance.create and attendance.update to a clerk staff user, or library.create and library.update (but not library.delete) to a librarian assistant.';

