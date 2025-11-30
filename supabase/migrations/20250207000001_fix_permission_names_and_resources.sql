-- ============================================================================
-- Fix Permission Names and Resources
-- ============================================================================
-- Updates permission names from 'academic.*' format to direct resource names
-- (e.g., 'academic.classes.read' → 'classes.read')
-- Updates resource values from 'academic' to actual resource names
-- (e.g., resource='academic' → resource='classes')
-- Also updates assign_default_role_permissions() function to use new names.
-- ============================================================================

-- ============================================================================
-- Step 1: Update Permission Names and Resources
-- ============================================================================
-- Update permissions that have 'academic.' prefix in name and 'academic' as resource
-- to use direct resource names
-- Note: We need to check the original name in the CASE statement before updating

UPDATE public.permissions
SET 
    resource = CASE 
        WHEN name LIKE 'academic.residency_types.%' THEN 'residency_types'
        WHEN name LIKE 'academic.academic_years.%' THEN 'academic_years'
        WHEN name LIKE 'academic.classes.%' THEN 'classes'
        WHEN name LIKE 'academic.subjects.%' THEN 'subjects'
        WHEN name LIKE 'academic.timetables.%' THEN 'timetables'
        WHEN name LIKE 'academic.schedule_slots.%' THEN 'schedule_slots'
        WHEN name LIKE 'academic.teacher_subject_assignments.%' THEN 'teacher_subject_assignments'
        ELSE resource
    END,
    name = REPLACE(name, 'academic.', '')
WHERE name LIKE 'academic.%';

-- ============================================================================
-- Step 2: Update assign_default_role_permissions Function
-- ============================================================================
-- Update the function to use new permission names (without 'academic.' prefix)

CREATE OR REPLACE FUNCTION public.assign_default_role_permissions(target_org UUID)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    -- Super admin role permissions scoped to organization (read-only mirror)
    INSERT INTO public.role_permissions (role, permission_id, organization_id)
    SELECT 'super_admin', p.id, target_org
    FROM public.permissions p
    WHERE p.organization_id IS NULL
    ON CONFLICT DO NOTHING;

    -- Admin: full control except destructive org-level settings
    INSERT INTO public.role_permissions (role, permission_id, organization_id)
    SELECT 'admin', p.id, target_org
    FROM public.permissions p
    WHERE p.organization_id IS NULL
      AND p.name IN (
        'settings.read',
        'users.read','users.create','users.update','users.delete',
        'buildings.read','buildings.create','buildings.update','buildings.delete',
        'rooms.read','rooms.create','rooms.update','rooms.delete',
        'profiles.read','profiles.update',
        'branding.read','branding.create','branding.update','branding.delete',
        'reports.read','reports.export',
        'auth_monitoring.read','security_monitoring.read',
        'permissions.read','permissions.update',
        'backup.read',
        -- Academic permissions (updated names - no 'academic.' prefix)
        'students.read','students.create','students.update','students.delete',
        'student_admissions.read','student_admissions.create','student_admissions.update','student_admissions.delete',
        'classes.read','classes.create','classes.update','classes.delete',
        'classes.assign','classes.copy', -- Include assign and copy permissions
        'subjects.read','subjects.create','subjects.update','subjects.delete',
        'subjects.assign','subjects.copy', -- Include assign and copy permissions
        'academic_years.read','academic_years.create','academic_years.update','academic_years.delete',
        'class_subjects.read','class_subjects.create','class_subjects.update','class_subjects.delete',
        'class_academic_years.read','class_academic_years.create','class_academic_years.update','class_academic_years.delete',
        'teacher_subject_assignments.read','teacher_subject_assignments.create','teacher_subject_assignments.update','teacher_subject_assignments.delete',
        'schedule_slots.read','schedule_slots.create','schedule_slots.update','schedule_slots.delete',
        'timetables.read','timetables.create','timetables.update','timetables.delete',
        'timetables.export', -- Include export permission
        'student_documents.read','student_documents.create','student_documents.update','student_documents.delete',
        'student_educational_history.read','student_educational_history.create','student_educational_history.update','student_educational_history.delete',
        'student_discipline_records.read','student_discipline_records.create','student_discipline_records.update','student_discipline_records.delete',
        'residency_types.read','residency_types.create','residency_types.update','residency_types.delete',
        'staff.read','staff.create','staff.update','staff.delete',
        -- Specialized permissions (admin can manage these)
        'attendance.read','attendance.create','attendance.update','attendance.delete',
        'library.read','library.create','library.update','library.delete',
        'hostel.read','hostel.create','hostel.update','hostel.delete',
        -- Additional table permissions
        'staff_types.read','staff_types.create','staff_types.update','staff_types.delete',
        'staff_documents.read','staff_documents.create','staff_documents.update','staff_documents.delete',
        'class_subject_templates.read','class_subject_templates.create','class_subject_templates.update','class_subject_templates.delete'
      )
    ON CONFLICT DO NOTHING;

    -- Teacher: read access to students, classes, subjects, and can manage attendance/exams
    INSERT INTO public.role_permissions (role, permission_id, organization_id)
    SELECT 'teacher', p.id, target_org
    FROM public.permissions p
    WHERE p.organization_id IS NULL
      AND p.name IN (
        'settings.read',
        'buildings.read','rooms.read','profiles.read','reports.read',
        'students.read',
        'classes.read',
        'subjects.read',
        'academic_years.read',
        'class_subjects.read',
        'class_academic_years.read',
        'class_subject_templates.read',
        'teacher_subject_assignments.read',
        'schedule_slots.read',
        'timetables.read',
        'timetables.export', -- Teachers can export timetables
        'attendance.read','attendance.create','attendance.update',
        'staff_types.read',
        'staff_documents.read'
        -- Note: Add exam permissions when exams table is created
      )
    ON CONFLICT DO NOTHING;

    -- Staff: Minimal default permissions (individual staff get specific permissions via user_permissions)
    -- Staff role gets basic read access, but specific operations are assigned per-user
    INSERT INTO public.role_permissions (role, permission_id, organization_id)
    SELECT 'staff', p.id, target_org
    FROM public.permissions p
    WHERE p.organization_id IS NULL
      AND p.name IN (
        'settings.read',
        'buildings.read','rooms.read','profiles.read','reports.read',
        'staff_types.read',
        'staff_documents.read'
        -- Individual staff users get specific permissions via user_permissions table
        -- Example: Clerk gets attendance.create, attendance.update via user_permissions
        -- Example: Librarian gets library.* permissions via user_permissions
      )
    ON CONFLICT DO NOTHING;

    -- Student: Read-only access to own data
    INSERT INTO public.role_permissions (role, permission_id, organization_id)
    SELECT 'student', p.id, target_org
    FROM public.permissions p
    WHERE p.organization_id IS NULL
      AND p.name IN (
        'settings.read',
        'profiles.read','profiles.update' -- Can read/update own profile
        -- Students can read their own data via RLS policies (is_own_record check)
      )
    ON CONFLICT DO NOTHING;

    -- Parent: Read-only access to children's data
    INSERT INTO public.role_permissions (role, permission_id, organization_id)
    SELECT 'parent', p.id, target_org
    FROM public.permissions p
    WHERE p.organization_id IS NULL
      AND p.name IN (
        'settings.read',
        'profiles.read','profiles.update', -- Can read/update own profile
        'students.read', -- Can read children's data (filtered by is_parent_of_student in RLS)
        'attendance.read', -- Can read children's attendance
        'reports.read' -- Can read reports related to children
      )
    ON CONFLICT DO NOTHING;

    -- Other roles get read-only access plus settings visibility
    INSERT INTO public.role_permissions (role, permission_id, organization_id)
    SELECT role_name, p.id, target_org
    FROM public.permissions p
    CROSS JOIN (VALUES
        ('accountant'),('librarian'),('hostel_manager'),('asset_manager')
    ) AS roles(role_name)
    WHERE p.organization_id IS NULL
      AND p.name IN (
        'settings.read',
        'buildings.read','rooms.read','profiles.read','reports.read'
      )
    ON CONFLICT DO NOTHING;
END;
$$;

COMMENT ON FUNCTION public.assign_default_role_permissions(UUID) IS 'Assigns default permissions to roles for a new organization. Note: Staff permissions should be assigned to individual staff users via user_permissions table, not role_permissions.';

-- ============================================================================
-- Step 3: Verify Migration
-- ============================================================================
-- Check that all permissions were updated correctly
DO $$
DECLARE
    old_count INTEGER;
    new_count INTEGER;
BEGIN
    -- Count permissions with old format
    SELECT COUNT(*) INTO old_count
    FROM public.permissions
    WHERE name LIKE 'academic.%';
    
    -- Count permissions with new format
    SELECT COUNT(*) INTO new_count
    FROM public.permissions
    WHERE name IN (
        'residency_types.read', 'residency_types.create', 'residency_types.update', 'residency_types.delete',
        'academic_years.read', 'academic_years.create', 'academic_years.update', 'academic_years.delete',
        'classes.read', 'classes.create', 'classes.update', 'classes.delete', 'classes.assign', 'classes.copy',
        'subjects.read', 'subjects.create', 'subjects.update', 'subjects.delete', 'subjects.assign', 'subjects.copy',
        'timetables.read', 'timetables.create', 'timetables.update', 'timetables.delete', 'timetables.export',
        'schedule_slots.read', 'schedule_slots.create', 'schedule_slots.update', 'schedule_slots.delete',
        'teacher_subject_assignments.read', 'teacher_subject_assignments.create', 'teacher_subject_assignments.update', 'teacher_subject_assignments.delete'
    );
    
    IF old_count > 0 THEN
        RAISE WARNING 'Migration may have failed: % permissions still have academic.* prefix', old_count;
    END IF;
    
    IF new_count = 0 THEN
        RAISE WARNING 'Migration may have failed: No permissions found with new format';
    END IF;
END;
$$;

