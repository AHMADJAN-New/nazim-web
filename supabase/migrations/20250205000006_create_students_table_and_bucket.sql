-- =============================================================================
-- Students Table, Permissions, and Storage Bucket
-- =============================================================================
-- Adds core student registration table tailored for Afghan school workflows,
-- multi-tenant RLS, and a private storage bucket for student documents/photos.
-- Also provisions RBAC permissions for student management and updates defaults.
-- =============================================================================

-- Create students table
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
    school_id UUID NULL REFERENCES public.school_branding (id) ON DELETE SET NULL,
    card_number VARCHAR(50) NULL,
    admission_no VARCHAR(100) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    father_name VARCHAR(150) NOT NULL,
    grandfather_name VARCHAR(150) NULL,
    mother_name VARCHAR(150) NULL,
    gender VARCHAR(10) NOT NULL CHECK (gender IN ('male', 'female')),
    birth_year VARCHAR(10) NULL,
    birth_date DATE NULL,
    age INTEGER NULL,
    admission_year VARCHAR(10) NULL,
    orig_province VARCHAR(100) NULL,
    orig_district VARCHAR(100) NULL,
    orig_village VARCHAR(150) NULL,
    curr_province VARCHAR(100) NULL,
    curr_district VARCHAR(100) NULL,
    curr_village VARCHAR(150) NULL,
    nationality VARCHAR(100) NULL,
    preferred_language VARCHAR(100) NULL,
    previous_school VARCHAR(150) NULL,
    guardian_name VARCHAR(150) NULL,
    guardian_relation VARCHAR(100) NULL,
    guardian_phone VARCHAR(25) NULL,
    guardian_tazkira VARCHAR(100) NULL,
    guardian_picture_path VARCHAR(255) NULL,
    home_address TEXT NULL,
    zamin_name VARCHAR(150) NULL,
    zamin_phone VARCHAR(25) NULL,
    zamin_tazkira VARCHAR(100) NULL,
    zamin_address TEXT NULL,
    applying_grade VARCHAR(50) NULL,
    is_orphan BOOLEAN NOT NULL DEFAULT FALSE,
    admission_fee_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (admission_fee_status IN ('paid', 'pending', 'waived', 'partial')),
    student_status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (student_status IN ('applied', 'admitted', 'active', 'withdrawn')),
    disability_status VARCHAR(150) NULL,
    emergency_contact_name VARCHAR(150) NULL,
    emergency_contact_phone VARCHAR(25) NULL,
    family_income VARCHAR(100) NULL,
    picture_path VARCHAR(255) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

-- Uniqueness: admission number per organization
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_unique_admission_per_org
    ON public.students (admission_no, organization_id)
    WHERE deleted_at IS NULL;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_students_org ON public.students (organization_id);
CREATE INDEX IF NOT EXISTS idx_students_school ON public.students (school_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_students_status ON public.students (student_status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_students_fee_status ON public.students (admission_fee_status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_students_gender ON public.students (gender) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_students_is_orphan ON public.students (is_orphan) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_students_deleted_at ON public.students (deleted_at) WHERE deleted_at IS NULL;

-- Auto-update updated_at timestamp
CREATE TRIGGER update_students_updated_at
    BEFORE UPDATE ON public.students
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.students IS 'Student registrations with Afghan-specific identity and guardian details, scoped per organization and school.';

-- =============================================================================
-- Row Level Security Policies
-- =============================================================================

-- Service role full access
CREATE POLICY "Service role full access to students" ON public.students
    FOR ALL TO service_role
    USING (TRUE) WITH CHECK (TRUE);

-- Users can read their organization students (or any if super admin) within allowed schools
CREATE POLICY "Users can read students" ON public.students
    FOR SELECT TO authenticated
    USING (
        deleted_at IS NULL
        AND (
            public.get_current_user_role() = 'super_admin'
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

-- Users can insert students for their organization (super admin can insert anywhere)
CREATE POLICY "Users can insert students" ON public.students
    FOR INSERT TO authenticated
    WITH CHECK (
        deleted_at IS NULL
        AND (
            public.get_current_user_role() = 'super_admin'
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

-- Users can update students in their organization/schools (super admin can update all)
CREATE POLICY "Users can update students" ON public.students
    FOR UPDATE TO authenticated
    USING (
        deleted_at IS NULL
        AND (
            public.get_current_user_role() = 'super_admin'
            OR (
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
        deleted_at IS NULL
        AND (
            public.get_current_user_role() = 'super_admin'
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

-- Users can soft delete students in their organization/schools (super admin can delete all)
CREATE POLICY "Users can delete students" ON public.students
    FOR DELETE TO authenticated
    USING (
        deleted_at IS NULL
        AND (
            public.get_current_user_role() = 'super_admin'
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

-- =============================================================================
-- Storage Bucket for Student Files
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'student-files',
    'student-files',
    false, -- Private bucket
    10485760, -- 10 MB
    ARRAY[
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf'
    ]
)
ON CONFLICT (id) DO NOTHING;

-- Service role full access
CREATE POLICY "Service role full access to student-files" ON storage.objects
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- Users can read files in their organization/school folders
-- Path format: {organization_id}/{school_id}/{student_id}/...
CREATE POLICY "Users can read their org student-files" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'student-files'
        AND (
            (storage.foldername(name))[1] = (SELECT organization_id::text FROM public.profiles WHERE id = auth.uid())
            OR (
                (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL
                AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
            )
        )
    );

-- Users can upload files to their organization/school folders
CREATE POLICY "Users can upload to their org student-files" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'student-files'
        AND (
            (storage.foldername(name))[1] = (SELECT organization_id::text FROM public.profiles WHERE id = auth.uid())
            OR (
                (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL
                AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
            )
        )
    );

-- Users can update files within their organization/school folders
CREATE POLICY "Users can update their org student-files" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'student-files'
        AND (
            (storage.foldername(name))[1] = (SELECT organization_id::text FROM public.profiles WHERE id = auth.uid())
            OR (
                (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL
                AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
            )
        )
    )
    WITH CHECK (
        bucket_id = 'student-files'
        AND (
            (storage.foldername(name))[1] = (SELECT organization_id::text FROM public.profiles WHERE id = auth.uid())
            OR (
                (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL
                AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
            )
        )
    );

-- Users can delete files within their organization/school folders
CREATE POLICY "Users can delete their org student-files" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'student-files'
        AND (
            (storage.foldername(name))[1] = (SELECT organization_id::text FROM public.profiles WHERE id = auth.uid())
            OR (
                (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL
                AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
            )
        )
    );

-- =============================================================================
-- Permissions for Student Management
-- =============================================================================

INSERT INTO public.permissions (name, resource, action, description, organization_id)
VALUES
    ('students.read', 'students', 'read', 'View student records', NULL),
    ('students.create', 'students', 'create', 'Create student records', NULL),
    ('students.update', 'students', 'update', 'Update student records', NULL),
    ('students.delete', 'students', 'delete', 'Delete student records', NULL),
    ('students.manage_documents', 'students', 'manage', 'Manage student documents', NULL)
ON CONFLICT (name, organization_id) DO NOTHING;

-- Give super_admin global access to student permissions
INSERT INTO public.role_permissions (role, permission_id, organization_id)
SELECT 'super_admin', id, NULL
FROM public.permissions
WHERE name LIKE 'students.%' AND organization_id IS NULL
ON CONFLICT (role, permission_id, organization_id) DO NOTHING;

-- Update assign_default_role_permissions to include student permissions
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
        'academic.residency_types.read','academic.residency_types.create',
        'academic.residency_types.update','academic.residency_types.delete',
        'academic.academic_years.read','academic.academic_years.create',
        'academic.academic_years.update','academic.academic_years.delete',
        'academic.classes.read','academic.classes.create',
        'academic.classes.update','academic.classes.delete',
        'academic.classes.assign','academic.classes.copy',
        'academic.subjects.read','academic.subjects.create',
        'academic.subjects.update','academic.subjects.delete',
        'academic.subjects.assign','academic.subjects.copy',
        'students.read','students.create','students.update','students.delete',
        'students.manage_documents'
      )
    ON CONFLICT DO NOTHING;

    -- Teacher-like roles get read-only access plus settings visibility
    INSERT INTO public.role_permissions (role, permission_id, organization_id)
    SELECT role_name, p.id, target_org
    FROM public.permissions p
    CROSS JOIN (VALUES
        ('teacher'),('staff'),('accountant'),('librarian'),
        ('parent'),('student'),('hostel_manager'),('asset_manager')
    ) AS roles(role_name)
    WHERE p.organization_id IS NULL
      AND p.name IN (
        'settings.read',
        'buildings.read','rooms.read','profiles.read','reports.read',
        'academic.residency_types.read',
        'academic.academic_years.read',
        'academic.classes.read',
        'academic.subjects.read',
        'students.read'
      )
    ON CONFLICT DO NOTHING;
END;
$$;

-- Assign student permissions to existing organizations
DO $$
DECLARE
    org_record RECORD;
BEGIN
    FOR org_record IN SELECT id FROM public.organizations WHERE deleted_at IS NULL LOOP
        -- Admin permissions
        INSERT INTO public.role_permissions (role, permission_id, organization_id)
        SELECT 'admin', p.id, org_record.id
        FROM public.permissions p
        WHERE p.organization_id IS NULL
          AND p.name IN ('students.read','students.create','students.update','students.delete','students.manage_documents')
        ON CONFLICT DO NOTHING;

        -- Read permission to teacher-like roles
        INSERT INTO public.role_permissions (role, permission_id, organization_id)
        SELECT role_name, p.id, org_record.id
        FROM public.permissions p
        CROSS JOIN (VALUES
            ('teacher'),('staff'),('accountant'),('librarian'),
            ('parent'),('student'),('hostel_manager'),('asset_manager')
        ) AS roles(role_name)
        WHERE p.organization_id IS NULL
          AND p.name = 'students.read'
        ON CONFLICT DO NOTHING;
    END LOOP;
END;
$$;
