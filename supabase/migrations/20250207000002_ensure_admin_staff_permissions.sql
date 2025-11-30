-- ============================================================================
-- Ensure Admin Has Staff Permissions
-- ============================================================================
-- Assigns all staff-related permissions to admin role for all existing
-- organizations. This ensures admin users can see and manage staff.
-- ============================================================================

-- Ensure staff permissions exist (in case they weren't created)
INSERT INTO public.permissions (name, resource, action, description, organization_id)
VALUES
    ('staff.read', 'staff', 'read', 'View staff', NULL),
    ('staff.create', 'staff', 'create', 'Create staff', NULL),
    ('staff.update', 'staff', 'update', 'Update staff', NULL),
    ('staff.delete', 'staff', 'delete', 'Delete staff', NULL),
    ('staff_types.read', 'staff_types', 'read', 'View staff types', NULL),
    ('staff_types.create', 'staff_types', 'create', 'Create staff types', NULL),
    ('staff_types.update', 'staff_types', 'update', 'Update staff types', NULL),
    ('staff_types.delete', 'staff_types', 'delete', 'Delete staff types', NULL),
    ('staff_documents.read', 'staff_documents', 'read', 'View staff documents', NULL),
    ('staff_documents.create', 'staff_documents', 'create', 'Create staff documents', NULL),
    ('staff_documents.update', 'staff_documents', 'update', 'Update staff documents', NULL),
    ('staff_documents.delete', 'staff_documents', 'delete', 'Delete staff documents', NULL)
ON CONFLICT (name, organization_id) DO NOTHING;

-- Assign staff permissions to admin role for all existing organizations
INSERT INTO public.role_permissions (role, permission_id, organization_id)
SELECT 
    'admin',
    p.id,
    o.id
FROM public.permissions p
CROSS JOIN public.organizations o
WHERE p.organization_id IS NULL
  AND p.name IN (
      'staff.read',
      'staff.create',
      'staff.update',
      'staff.delete',
      'staff_types.read',
      'staff_types.create',
      'staff_types.update',
      'staff_types.delete',
      'staff_documents.read',
      'staff_documents.create',
      'staff_documents.update',
      'staff_documents.delete'
  )
  AND o.deleted_at IS NULL
ON CONFLICT (role, permission_id, organization_id) DO NOTHING;

-- Also ensure admin has all other essential permissions for existing organizations
-- This catches any permissions that might have been missed
INSERT INTO public.role_permissions (role, permission_id, organization_id)
SELECT 
    'admin',
    p.id,
    o.id
FROM public.permissions p
CROSS JOIN public.organizations o
WHERE p.organization_id IS NULL
  AND p.name IN (
      -- Core settings
      'settings.read',
      'buildings.read', 'buildings.create', 'buildings.update', 'buildings.delete',
      'rooms.read', 'rooms.create', 'rooms.update', 'rooms.delete',
      'profiles.read', 'profiles.update',
      'users.read', 'users.create', 'users.update', 'users.delete',
      'organizations.read', -- Admin can view organizations (but not create/delete)
      'branding.read', 'branding.create', 'branding.update', 'branding.delete',
      'reports.read', 'reports.export',
      'auth_monitoring.read', 'security_monitoring.read',
      'permissions.read', 'permissions.update',
      'backup.read',
      -- Academic
      'students.read', 'students.create', 'students.update', 'students.delete',
      'student_admissions.read', 'student_admissions.create', 'student_admissions.update', 'student_admissions.delete',
      'classes.read', 'classes.create', 'classes.update', 'classes.delete',
      'subjects.read', 'subjects.create', 'subjects.update', 'subjects.delete',
      'academic_years.read', 'academic_years.create', 'academic_years.update', 'academic_years.delete',
      'residency_types.read', 'residency_types.create', 'residency_types.update', 'residency_types.delete',
      'class_subjects.read', 'class_subjects.create', 'class_subjects.update', 'class_subjects.delete',
      'class_academic_years.read', 'class_academic_years.create', 'class_academic_years.update', 'class_academic_years.delete',
      'class_subject_templates.read', 'class_subject_templates.create', 'class_subject_templates.update', 'class_subject_templates.delete',
      'teacher_subject_assignments.read', 'teacher_subject_assignments.create', 'teacher_subject_assignments.update', 'teacher_subject_assignments.delete',
      'schedule_slots.read', 'schedule_slots.create', 'schedule_slots.update', 'schedule_slots.delete',
      'timetables.read', 'timetables.create', 'timetables.update', 'timetables.delete',
      'student_documents.read', 'student_documents.create', 'student_documents.update', 'student_documents.delete',
      'student_educational_history.read', 'student_educational_history.create', 'student_educational_history.update', 'student_educational_history.delete',
      'student_discipline_records.read', 'student_discipline_records.create', 'student_discipline_records.update', 'student_discipline_records.delete',
      -- Specialized
      'attendance.read', 'attendance.create', 'attendance.update', 'attendance.delete',
      'library.read', 'library.create', 'library.update', 'library.delete',
      'hostel.read', 'hostel.create', 'hostel.update', 'hostel.delete'
  )
  AND o.deleted_at IS NULL
ON CONFLICT (role, permission_id, organization_id) DO NOTHING;

-- Verify: Count admin permissions per organization
DO $$
DECLARE
    org_record RECORD;
    perm_count INTEGER;
BEGIN
    FOR org_record IN 
        SELECT id, name FROM public.organizations WHERE deleted_at IS NULL
    LOOP
        SELECT COUNT(*) INTO perm_count
        FROM public.role_permissions rp
        INNER JOIN public.permissions p ON rp.permission_id = p.id
        WHERE rp.role = 'admin'
          AND rp.organization_id = org_record.id
          AND p.organization_id IS NULL;
        
        RAISE NOTICE 'Organization % (%) has % admin permissions', 
            org_record.name, org_record.id, perm_count;
    END LOOP;
END $$;

COMMENT ON TABLE public.role_permissions IS 'Role-based permissions. Admin role should have all permissions except organization management. Staff permissions are assigned per-user via user_permissions table.';

