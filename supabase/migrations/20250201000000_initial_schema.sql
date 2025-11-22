-- Consolidated schema migration for Nazim School Manager Pro
-- Sets up core tables, helper functions, triggers, and row level security policies

SET statement_timeout = 0;

SET lock_timeout = 0;

-- Ensure crypto extension is available for gen_random_uuid and password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- Shared utility functions
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;
-- ============================================================================
-- Organizations
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    name VARCHAR(255) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    settings JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_organizations_name ON public.organizations (name);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations (slug);

CREATE INDEX IF NOT EXISTS idx_organizations_deleted_at ON public.organizations (deleted_at)
WHERE
    deleted_at IS NULL;

CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

COMMENT ON
TABLE public.organizations IS 'Multi-tenant organizations for Nazim SaaS.';

-- Allow service role full access up-front

CREATE POLICY "Service role full access to organizations" ON public.organizations FOR ALL TO service_role USING (TRUE)
WITH
    CHECK (TRUE);
-- ============================================================================
-- School branding (schools) per organization
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.school_branding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
    school_name VARCHAR(255) NOT NULL,
    school_name_arabic VARCHAR(255),
    school_name_pashto VARCHAR(255),
    school_address TEXT,
    school_phone VARCHAR(50),
    school_email VARCHAR(100),
    school_website VARCHAR(200),
    logo_path TEXT,
    header_image_path TEXT,
    footer_text TEXT,
    primary_color VARCHAR(7) DEFAULT '#0b0b56',
    secondary_color VARCHAR(7) DEFAULT '#0056b3',
    accent_color VARCHAR(7) DEFAULT '#ff6b35',
    font_family VARCHAR(100) DEFAULT 'Bahij Nassim',
    report_font_size VARCHAR(10) DEFAULT '12px',
    primary_logo_binary BYTEA,
    primary_logo_mime_type VARCHAR(100),
    primary_logo_filename VARCHAR(255),
    primary_logo_size INTEGER,
    secondary_logo_binary BYTEA,
    secondary_logo_mime_type VARCHAR(100),
    secondary_logo_filename VARCHAR(255),
    secondary_logo_size INTEGER,
    ministry_logo_binary BYTEA,
    ministry_logo_mime_type VARCHAR(100),
    ministry_logo_filename VARCHAR(255),
    ministry_logo_size INTEGER,
    primary_logo_usage VARCHAR(100) DEFAULT 'reports',
    secondary_logo_usage VARCHAR(100) DEFAULT 'certificates',
    ministry_logo_usage VARCHAR(100) DEFAULT 'official_documents',
    header_text TEXT,
    table_alternating_colors BOOLEAN DEFAULT TRUE,
    show_page_numbers BOOLEAN DEFAULT TRUE,
    show_generation_date BOOLEAN DEFAULT TRUE,
    report_logo_selection VARCHAR(50) DEFAULT 'primary,secondary',
    calendar_preference VARCHAR(20) DEFAULT 'jalali',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_school_branding_org_id ON public.school_branding (organization_id);

CREATE INDEX IF NOT EXISTS idx_school_branding_is_active ON public.school_branding (is_active);

CREATE INDEX IF NOT EXISTS idx_school_branding_deleted_at ON public.school_branding (deleted_at)
WHERE
    deleted_at IS NULL;

CREATE TRIGGER update_school_branding_updated_at
    BEFORE UPDATE ON public.school_branding
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.school_branding ENABLE ROW LEVEL SECURITY;

COMMENT ON
TABLE public.school_branding IS 'Branding + school metadata per organization.';
-- ============================================================================
-- Profiles linked to auth.users
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
    organization_id UUID NULL REFERENCES public.organizations (id) ON DELETE SET NULL,
    default_school_id UUID NULL REFERENCES public.school_branding (id) ON DELETE SET NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'student',
    full_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_org_id ON public.profiles (organization_id);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);

CREATE INDEX IF NOT EXISTS idx_profiles_default_school_id ON public.profiles (default_school_id);

CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON public.profiles (deleted_at)
WHERE
    deleted_at IS NULL;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

COMMENT ON
TABLE public.profiles IS 'Extended auth user profiles with multi-tenant context.';
-- ============================================================================
-- Super admin to organization assignments
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.super_admin_organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    super_admin_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,
    CONSTRAINT super_admin_org_unique UNIQUE (
        super_admin_id,
        organization_id
    )
);

CREATE INDEX IF NOT EXISTS idx_super_admin_org_super_admin_id ON public.super_admin_organizations (super_admin_id);

CREATE INDEX IF NOT EXISTS idx_super_admin_org_org_id ON public.super_admin_organizations (organization_id);

CREATE INDEX IF NOT EXISTS idx_super_admin_org_is_primary ON public.super_admin_organizations (is_primary);

CREATE INDEX IF NOT EXISTS idx_super_admin_org_deleted_at ON public.super_admin_organizations (deleted_at)
WHERE
    deleted_at IS NULL;

ALTER TABLE public.super_admin_organizations ENABLE ROW LEVEL SECURITY;

COMMENT ON
TABLE public.super_admin_organizations IS 'Allows super admins to manage multiple organizations.';
-- ============================================================================
-- Permissions catalog (supporting org specific overrides)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    name VARCHAR(100) NOT NULL,
    resource VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT,
    organization_id UUID NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT permissions_name_org_unique UNIQUE (name, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_permissions_resource ON public.permissions (resource);

CREATE INDEX IF NOT EXISTS idx_permissions_action ON public.permissions (action);

CREATE INDEX IF NOT EXISTS idx_permissions_org_id ON public.permissions (organization_id);

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

COMMENT ON
TABLE public.permissions IS 'Fine grained permission catalog (global when organization_id IS NULL).';
-- ============================================================================
-- Role permission assignments
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    role VARCHAR(50) NOT NULL,
    permission_id UUID NOT NULL REFERENCES public.permissions (id) ON DELETE CASCADE,
    organization_id UUID NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT role_permissions_unique UNIQUE (
        role,
        permission_id,
        organization_id
    )
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON public.role_permissions (role);

CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON public.role_permissions (permission_id);

CREATE INDEX IF NOT EXISTS idx_role_permissions_org_id ON public.role_permissions (organization_id);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

COMMENT ON
TABLE public.role_permissions IS 'Maps roles to permissions, optionally scoped per organization.';
-- ============================================================================
-- Staff
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id VARCHAR(50) NOT NULL,
    staff_type VARCHAR(50) NOT NULL DEFAULT 'teacher',
    first_name VARCHAR(100) NOT NULL,
    father_name VARCHAR(100) NOT NULL,
    grandfather_name VARCHAR(100),
    full_name VARCHAR(300) GENERATED ALWAYS AS (
        first_name || ' ' || father_name ||
        CASE WHEN grandfather_name IS NOT NULL THEN ' ' || grandfather_name ELSE '' END
    ) STORED,
    tazkira_number VARCHAR(50),
    birth_year VARCHAR(10),
    birth_date DATE,
    phone_number VARCHAR(20),
    email VARCHAR(255),
    home_address VARCHAR(255),
    origin_province VARCHAR(50),
    origin_district VARCHAR(50),
    origin_village VARCHAR(50),
    current_province VARCHAR(50),
    current_district VARCHAR(50),
    current_village VARCHAR(50),
    religious_education VARCHAR(50),
    religious_university VARCHAR(100),
    religious_graduation_year VARCHAR(10),
    religious_department VARCHAR(100),
    modern_education VARCHAR(50),
    modern_school_university VARCHAR(100),
    modern_graduation_year VARCHAR(10),
    modern_department VARCHAR(100),
    teaching_section VARCHAR(50),
    position VARCHAR(50),
    duty VARCHAR(50),
    salary VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    picture_url TEXT,
    document_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    deleted_at TIMESTAMPTZ NULL,
    CONSTRAINT staff_employee_org_unique UNIQUE (employee_id, organization_id),
    CONSTRAINT staff_profile_org_unique UNIQUE (profile_id, organization_id),
    CONSTRAINT staff_type_valid CHECK (staff_type IN ('teacher','admin','accountant','librarian','hostel_manager','asset_manager','security','maintenance','other')),
    CONSTRAINT staff_status_valid CHECK (status IN ('active','inactive','on_leave','terminated','suspended'))
);

CREATE INDEX IF NOT EXISTS idx_staff_org_id ON public.staff (organization_id);

CREATE INDEX IF NOT EXISTS idx_staff_profile_id ON public.staff (profile_id);

CREATE INDEX IF NOT EXISTS idx_staff_employee_id ON public.staff (employee_id);

CREATE INDEX IF NOT EXISTS idx_staff_staff_type ON public.staff (staff_type);

CREATE INDEX IF NOT EXISTS idx_staff_status ON public.staff (status);

CREATE INDEX IF NOT EXISTS idx_staff_full_name ON public.staff USING GIN (
    to_tsvector ('english', full_name)
);

CREATE INDEX IF NOT EXISTS idx_staff_deleted_at ON public.staff (deleted_at)
WHERE
    deleted_at IS NULL;

CREATE TRIGGER update_staff_updated_at
    BEFORE UPDATE ON public.staff
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

COMMENT ON
TABLE public.staff IS 'Comprehensive staff directory with organization isolation.';
-- ============================================================================
-- Buildings belong to schools
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.buildings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    building_name VARCHAR(100) NOT NULL,
    school_id UUID NOT NULL REFERENCES public.school_branding (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_buildings_unique_name_per_school ON public.buildings (building_name, school_id)
WHERE
    deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_buildings_school_id ON public.buildings (school_id);

CREATE INDEX IF NOT EXISTS idx_buildings_deleted_at ON public.buildings (deleted_at)
WHERE
    deleted_at IS NULL;

CREATE TRIGGER update_buildings_updated_at
    BEFORE UPDATE ON public.buildings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;

COMMENT ON
TABLE public.buildings IS 'Buildings grouped under schools (school_branding records).';
-- ============================================================================
-- Rooms
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    room_number VARCHAR(100) NOT NULL,
    building_id UUID NOT NULL REFERENCES public.buildings (id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES public.school_branding (id) ON DELETE CASCADE,
    staff_id UUID NULL REFERENCES public.staff (id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,
    CONSTRAINT rooms_unique_room_per_building UNIQUE (room_number, building_id)
);

CREATE INDEX IF NOT EXISTS idx_rooms_building_id ON public.rooms (building_id);

CREATE INDEX IF NOT EXISTS idx_rooms_school_id ON public.rooms (school_id);

CREATE INDEX IF NOT EXISTS idx_rooms_staff_id ON public.rooms (staff_id);

CREATE INDEX IF NOT EXISTS idx_rooms_deleted_at ON public.rooms (deleted_at)
WHERE
    deleted_at IS NULL;

CREATE TRIGGER update_rooms_updated_at
    BEFORE UPDATE ON public.rooms
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

COMMENT ON
TABLE public.rooms IS 'Rooms linked to buildings and indirectly to organizations via schools.';
-- ============================================================================
-- Notifications
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    recipient_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    type VARCHAR(50) DEFAULT 'info',
    action_url TEXT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON public.notifications (recipient_id);

CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications (is_read);

CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_read ON public.notifications (recipient_id, is_read);

CREATE INDEX IF NOT EXISTS idx_notifications_deleted_at ON public.notifications (deleted_at)
WHERE
    deleted_at IS NULL;

CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

COMMENT ON
TABLE public.notifications IS 'End-user notifications for alerts and announcements.';
-- ============================================================================
-- Report templates
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.report_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES public.school_branding (id) ON DELETE CASCADE,
    template_name VARCHAR(255) NOT NULL,
    template_type VARCHAR(100) NOT NULL,
    header_text TEXT,
    footer_text TEXT,
    header_html TEXT,
    footer_html TEXT,
    report_logo_selection VARCHAR(50),
    show_page_numbers BOOLEAN DEFAULT TRUE,
    show_generation_date BOOLEAN DEFAULT TRUE,
    table_alternating_colors BOOLEAN DEFAULT TRUE,
    report_font_size VARCHAR(10),
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,
    CONSTRAINT unique_template_per_school UNIQUE (
        school_id,
        template_name,
        deleted_at
    )
);

CREATE INDEX IF NOT EXISTS idx_report_templates_org_id ON public.report_templates (organization_id);

CREATE INDEX IF NOT EXISTS idx_report_templates_school_id ON public.report_templates (school_id);

CREATE INDEX IF NOT EXISTS idx_report_templates_type ON public.report_templates (template_type);

CREATE INDEX IF NOT EXISTS idx_report_templates_is_active ON public.report_templates (is_active);

CREATE INDEX IF NOT EXISTS idx_report_templates_is_default ON public.report_templates (is_default);

CREATE INDEX IF NOT EXISTS idx_report_templates_deleted_at ON public.report_templates (deleted_at)
WHERE
    deleted_at IS NULL;

CREATE TRIGGER update_report_templates_updated_at
    BEFORE UPDATE ON public.report_templates
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;

COMMENT ON
TABLE public.report_templates IS 'Customizable report templates per school.';
-- ============================================================================
-- Functions and triggers dependent on tables
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role VARCHAR := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
    user_org_id UUID := NULL;
    user_school_id UUID := NULL;
BEGIN
    IF NEW.raw_user_meta_data ? 'organization_id' THEN
        user_org_id := (NEW.raw_user_meta_data->>'organization_id')::UUID;
    END IF;

    IF NEW.raw_user_meta_data ? 'default_school_id' THEN
        user_school_id := (NEW.raw_user_meta_data->>'default_school_id')::UUID;
    END IF;

    IF user_role = 'super_admin' THEN
        user_org_id := NULL;
        user_school_id := NULL;
    END IF;

    INSERT INTO public.profiles (id, email, full_name, role, organization_id, default_school_id)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        user_role,
        user_org_id,
        user_school_id
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        organization_id = EXCLUDED.organization_id,
        default_school_id = EXCLUDED.default_school_id,
        deleted_at = NULL;

    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
-- Helper to capture auth.uid() once per statement for performance
CREATE OR REPLACE FUNCTION public.get_current_user_organization_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
    current_uid UUID := (SELECT auth.uid());
    user_org_id UUID;
BEGIN
    IF current_uid IS NULL THEN
        RETURN NULL;
    END IF;

    -- SECURITY DEFINER allows bypassing RLS, but we need to be explicit
    -- Query profiles table directly (RLS is bypassed due to SECURITY DEFINER)
    SELECT organization_id INTO user_org_id
    FROM public.profiles
    WHERE id = current_uid
      AND deleted_at IS NULL;

    RETURN user_org_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
    current_uid UUID := (SELECT auth.uid());
    user_role TEXT;
BEGIN
    IF current_uid IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT role INTO user_role
    FROM public.profiles
    WHERE id = current_uid
      AND deleted_at IS NULL;

    RETURN user_role;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_school_ids()
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
    user_org_id UUID := public.get_current_user_organization_id();
    school_ids UUID[];
BEGIN
    IF user_org_id IS NULL THEN
        RETURN NULL; -- super admin, access all
    END IF;

    SELECT COALESCE(ARRAY_AGG(id), ARRAY[]::UUID[])
      INTO school_ids
    FROM public.school_branding
    WHERE organization_id = user_org_id
      AND deleted_at IS NULL
      AND (is_active IS TRUE OR is_active IS NULL);

    RETURN school_ids;
END;
$$;

-- Helper function to get user profile (bypasses PostgREST schema validation issues)
CREATE OR REPLACE FUNCTION public.get_user_profile(user_id UUID)
RETURNS TABLE (
    id UUID,
    organization_id UUID,
    role TEXT,
    full_name TEXT,
    email TEXT,
    phone TEXT,
    avatar_url TEXT,
    is_active BOOLEAN,
    default_school_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.organization_id,
        p.role::TEXT,
        p.full_name,
        p.email,
        p.phone,
        p.avatar_url,
        p.is_active,
        p.default_school_id
    FROM public.profiles p
    WHERE p.id = user_id
      AND p.deleted_at IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.handle_new_user () TO authenticated;

GRANT
EXECUTE ON FUNCTION public.get_current_user_organization_id () TO authenticated;

GRANT
EXECUTE ON FUNCTION public.get_current_user_role () TO authenticated;

GRANT
EXECUTE ON FUNCTION public.get_current_user_school_ids () TO authenticated;

GRANT
EXECUTE ON FUNCTION public.get_user_profile (UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_staff_file_path(org_id UUID, staff_id UUID, file_type VARCHAR, file_name VARCHAR)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    RETURN org_id::TEXT || '/' || staff_id::TEXT || '/' || file_type || '/' || file_name;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_staff_picture_url(staff_record public.staff)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF staff_record.picture_url IS NULL THEN
        RETURN NULL;
    END IF;

    RETURN 'staff-files/' || staff_record.organization_id::TEXT || '/' || staff_record.id::TEXT || '/picture/' || staff_record.picture_url;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_set_school_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_uid UUID := (SELECT auth.uid());
    current_role TEXT;
    current_org UUID;
    default_school_id UUID;
    primary_org UUID;
BEGIN
    IF NEW.school_id IS NOT NULL THEN
        RETURN NEW;
    END IF;

    SELECT role, organization_id INTO current_role, current_org
    FROM public.profiles
    WHERE id = current_uid
      AND deleted_at IS NULL;

    IF current_role = 'super_admin' THEN
        SELECT organization_id INTO primary_org
        FROM public.super_admin_organizations
        WHERE super_admin_id = current_uid
          AND is_primary = TRUE
          AND deleted_at IS NULL
        LIMIT 1;

        IF primary_org IS NULL THEN
            SELECT organization_id INTO primary_org
            FROM public.super_admin_organizations
            WHERE super_admin_id = current_uid
              AND deleted_at IS NULL
            ORDER BY created_at ASC
            LIMIT 1;
        END IF;

        IF primary_org IS NULL THEN
            primary_org := current_org;
        END IF;

        IF primary_org IS NOT NULL THEN
            SELECT id INTO default_school_id
            FROM public.school_branding
            WHERE organization_id = primary_org
              AND deleted_at IS NULL
              AND (is_active IS TRUE OR is_active IS NULL)
            ORDER BY created_at ASC
            LIMIT 1;
            IF default_school_id IS NOT NULL THEN
                NEW.school_id := default_school_id;
            END IF;
        END IF;
        RETURN NEW;
    END IF;

    IF current_org IS NOT NULL THEN
        SELECT id INTO default_school_id
        FROM public.school_branding
        WHERE organization_id = current_org
          AND deleted_at IS NULL
          AND (is_active IS TRUE OR is_active IS NULL)
        ORDER BY created_at ASC
        LIMIT 1;

        IF default_school_id IS NOT NULL THEN
            NEW.school_id := default_school_id;
        ELSIF NEW.school_id IS NULL THEN
            NEW.school_id := (SELECT default_school_id FROM public.profiles WHERE id = current_uid);
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_room_school_matches_building()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF NEW.building_id IS NOT NULL THEN
        SELECT school_id INTO NEW.school_id
        FROM public.buildings
        WHERE id = NEW.building_id;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_notification_read_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF NEW.is_read AND (OLD.is_read IS FALSE OR OLD.is_read IS NULL) THEN
        NEW.read_at := NOW();
    ELSIF NOT NEW.is_read THEN
        NEW.read_at := NULL;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER auto_set_buildings_school_id
    BEFORE INSERT ON public.buildings
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_set_school_id();

CREATE TRIGGER auto_set_rooms_school_id
    BEFORE INSERT ON public.rooms
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_set_school_id();

CREATE TRIGGER ensure_room_school_matches_building_trigger
    BEFORE INSERT OR UPDATE ON public.rooms
    FOR EACH ROW
    EXECUTE FUNCTION public.ensure_room_school_matches_building();

CREATE TRIGGER set_notification_read_at_trigger
    BEFORE UPDATE ON public.notifications
    FOR EACH ROW
    WHEN (OLD.is_read IS DISTINCT FROM NEW.is_read)
    EXECUTE FUNCTION public.set_notification_read_at();

-- Assign default role permissions per organization
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
        'backup.read'
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
        'buildings.read','rooms.read','profiles.read','reports.read'
      )
    ON CONFLICT DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_default_role_permissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    PERFORM public.assign_default_role_permissions(NEW.id);
    RETURN NEW;
END;
$$;

CREATE TRIGGER auto_assign_role_permissions
    AFTER INSERT ON public.organizations
    FOR EACH ROW
    EXECUTE FUNCTION public.apply_default_role_permissions();
-- ============================================================================
-- Row Level Security policies
-- ============================================================================
-- Organizations

CREATE POLICY "Authenticated users can read their organization" ON public.organizations FOR
SELECT TO authenticated USING (
        deleted_at IS NULL
        AND (
            id = public.get_current_user_organization_id ()
            OR public.get_current_user_organization_id () IS NULL
        )
    );

CREATE POLICY "Anonymous users can read organizations for signup" ON public.organizations FOR
SELECT TO anon USING (deleted_at IS NULL);

-- Profiles
-- Consolidated SELECT policy: users can read their own profile OR profiles in their organization
-- CRITICAL: First condition (id = auth.uid()) works immediately and avoids any circular dependencies.
-- Second condition uses helper function which has SECURITY DEFINER to bypass RLS when querying profiles.

CREATE POLICY "Users can read profiles" ON public.profiles FOR
SELECT TO authenticated USING (
        deleted_at IS NULL
        AND (
            -- Primary: Users can read their own profile (no dependencies, works immediately)
            id = (
                SELECT auth.uid ()
            )
            OR (
                -- Secondary: Users can read profiles in their organization
                -- Helper function uses SECURITY DEFINER so it bypasses RLS (no circular dependency)
                organization_id = public.get_current_user_organization_id ()
                OR public.get_current_user_organization_id () IS NULL
            )
        )
    );

-- Consolidated UPDATE policy: users can update their own profile OR admins can update profiles in their organization

CREATE POLICY "Users can update profiles" ON public.profiles FOR
UPDATE TO authenticated USING (
    deleted_at IS NULL
    AND (
        id = (
            SELECT auth.uid ()
        )
        OR (
            public.get_current_user_role () IN ('admin', 'super_admin')
            AND (
                organization_id = public.get_current_user_organization_id ()
                OR public.get_current_user_organization_id () IS NULL
            )
        )
    )
)
WITH
    CHECK (
        deleted_at IS NULL
        AND (
            id = (
                SELECT auth.uid ()
            )
            OR public.get_current_user_role () IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Service role full access to profiles" ON public.profiles FOR ALL TO service_role USING (TRUE)
WITH
    CHECK (TRUE);

-- Super admin organization assignments

CREATE POLICY "Super admins manage their organizations" ON public.super_admin_organizations FOR ALL TO authenticated USING (
    deleted_at IS NULL
    AND public.get_current_user_role () = 'super_admin'
    AND super_admin_id = (
        SELECT auth.uid ()
    )
)
WITH
    CHECK (
        deleted_at IS NULL
        AND public.get_current_user_role () = 'super_admin'
        AND super_admin_id = (
            SELECT auth.uid ()
        )
    );

CREATE POLICY "Service role full access to super_admin_organizations" ON public.super_admin_organizations FOR ALL TO service_role USING (TRUE)
WITH
    CHECK (TRUE);

-- Permissions

CREATE POLICY "Service role full access to permissions" ON public.permissions FOR ALL TO service_role USING (TRUE)
WITH
    CHECK (TRUE);

CREATE POLICY "Authenticated users can read permissions" ON public.permissions FOR
SELECT TO authenticated USING (
        organization_id IS NULL
        OR organization_id = public.get_current_user_organization_id ()
        OR public.get_current_user_role () = 'super_admin'
    );

CREATE POLICY "Authenticated users can insert their organization's permissions" ON public.permissions FOR
INSERT
    TO authenticated
WITH
    CHECK (
        organization_id = public.get_current_user_organization_id ()
        OR (
            public.get_current_user_role () = 'super_admin'
            AND organization_id IS NULL
        )
    );

CREATE POLICY "Authenticated users can update their organization's permissions" ON public.permissions FOR
UPDATE TO authenticated USING (
    organization_id = public.get_current_user_organization_id ()
    OR public.get_current_user_role () = 'super_admin'
)
WITH
    CHECK (
        organization_id = public.get_current_user_organization_id ()
        OR public.get_current_user_role () = 'super_admin'
    );

CREATE POLICY "Authenticated users can delete their organization's permissions" ON public.permissions FOR DELETE TO authenticated USING (
    organization_id = public.get_current_user_organization_id ()
    OR public.get_current_user_role () = 'super_admin'
);

-- Role permissions

CREATE POLICY "Service role full access to role_permissions" ON public.role_permissions FOR ALL TO service_role USING (TRUE)
WITH
    CHECK (TRUE);

CREATE POLICY "Users can read role_permissions" ON public.role_permissions FOR
SELECT TO authenticated USING (
        organization_id IS NULL
        OR organization_id = public.get_current_user_organization_id ()
        OR public.get_current_user_role () = 'super_admin'
    );

CREATE POLICY "Users can insert org role_permissions" ON public.role_permissions FOR
INSERT
    TO authenticated
WITH
    CHECK (
        organization_id = public.get_current_user_organization_id ()
        OR (
            public.get_current_user_role () = 'super_admin'
            AND organization_id IS NULL
        )
    );

CREATE POLICY "Users can update org role_permissions" ON public.role_permissions FOR
UPDATE TO authenticated USING (
    organization_id = public.get_current_user_organization_id ()
    OR public.get_current_user_role () = 'super_admin'
)
WITH
    CHECK (
        organization_id = public.get_current_user_organization_id ()
        OR public.get_current_user_role () = 'super_admin'
    );

CREATE POLICY "Users can delete org role_permissions" ON public.role_permissions FOR DELETE TO authenticated USING (
    organization_id = public.get_current_user_organization_id ()
    OR public.get_current_user_role () = 'super_admin'
);
-- School branding

CREATE POLICY "Users can read branding for their organization" ON public.school_branding FOR
SELECT TO authenticated USING (
        deleted_at IS NULL
        AND (
            organization_id = public.get_current_user_organization_id ()
            OR public.get_current_user_role () = 'super_admin'
        )
    );

CREATE POLICY "Admins can insert branding for their organization" ON public.school_branding FOR
INSERT
    TO authenticated
WITH
    CHECK (
        deleted_at IS NULL
        AND public.get_current_user_role () IN ('admin', 'super_admin')
        AND (
            organization_id = public.get_current_user_organization_id ()
            OR public.get_current_user_role () = 'super_admin'
        )
    );

CREATE POLICY "Admins can update branding for their organization" ON public.school_branding FOR
UPDATE TO authenticated USING (
    deleted_at IS NULL
    AND public.get_current_user_role () IN ('admin', 'super_admin')
    AND (
        organization_id = public.get_current_user_organization_id ()
        OR public.get_current_user_role () = 'super_admin'
    )
)
WITH
    CHECK (
        deleted_at IS NULL
        AND public.get_current_user_role () IN ('admin', 'super_admin')
    );

CREATE POLICY "Admins can delete branding for their organization" ON public.school_branding FOR DELETE TO authenticated USING (
    deleted_at IS NULL
    AND public.get_current_user_role () IN ('admin', 'super_admin')
    AND (
        organization_id = public.get_current_user_organization_id ()
        OR public.get_current_user_role () = 'super_admin'
    )
);

CREATE POLICY "Service role full access to school_branding" ON public.school_branding FOR ALL TO service_role USING (TRUE)
WITH
    CHECK (TRUE);

-- Staff

CREATE POLICY "Users can read their organization's staff" ON public.staff FOR
SELECT TO authenticated USING (
        deleted_at IS NULL
        AND (
            organization_id = public.get_current_user_organization_id ()
            OR public.get_current_user_role () = 'super_admin'
        )
    );

CREATE POLICY "Users can insert staff in their organization" ON public.staff FOR
INSERT
    TO authenticated
WITH
    CHECK (
        deleted_at IS NULL
        AND (
            organization_id = public.get_current_user_organization_id ()
            OR public.get_current_user_role () = 'super_admin'
        )
    );

CREATE POLICY "Users can update their organization's staff" ON public.staff FOR
UPDATE TO authenticated USING (
    deleted_at IS NULL
    AND (
        organization_id = public.get_current_user_organization_id ()
        OR public.get_current_user_role () = 'super_admin'
    )
)
WITH
    CHECK (
        deleted_at IS NULL
        AND (
            organization_id = public.get_current_user_organization_id ()
            OR public.get_current_user_role () = 'super_admin'
        )
    );

CREATE POLICY "Users can delete their organization's staff" ON public.staff FOR DELETE TO authenticated USING (
    deleted_at IS NULL
    AND (
        organization_id = public.get_current_user_organization_id ()
        OR public.get_current_user_role () = 'super_admin'
    )
);

CREATE POLICY "Service role full access to staff" ON public.staff FOR ALL TO service_role USING (TRUE)
WITH
    CHECK (TRUE);

-- Buildings

CREATE POLICY "Users can read buildings for their organization schools" ON public.buildings FOR
SELECT TO authenticated USING (
        deleted_at IS NULL
        AND (
            public.get_current_user_school_ids () IS NULL
            OR (
                public.get_current_user_school_ids () IS NOT NULL
                AND school_id = ANY (
                    public.get_current_user_school_ids ()
                )
            )
        )
    );

CREATE POLICY "Users can insert buildings for their organization schools" ON public.buildings FOR
INSERT
    TO authenticated
WITH
    CHECK (
        deleted_at IS NULL
        AND (
            public.get_current_user_school_ids () IS NULL
            OR (
                public.get_current_user_school_ids () IS NOT NULL
                AND school_id = ANY (
                    public.get_current_user_school_ids ()
                )
            )
        )
    );

CREATE POLICY "Users can update buildings for their organization schools" ON public.buildings FOR
UPDATE TO authenticated USING (
    deleted_at IS NULL
    AND (
        public.get_current_user_school_ids () IS NULL
        OR (
            public.get_current_user_school_ids () IS NOT NULL
            AND school_id = ANY (
                public.get_current_user_school_ids ()
            )
        )
    )
)
WITH
    CHECK (
        deleted_at IS NULL
        AND (
            public.get_current_user_school_ids () IS NULL
            OR (
                public.get_current_user_school_ids () IS NOT NULL
                AND school_id = ANY (
                    public.get_current_user_school_ids ()
                )
            )
        )
    );

CREATE POLICY "Users can delete buildings for their organization schools" ON public.buildings FOR DELETE TO authenticated USING (
    deleted_at IS NULL
    AND (
        public.get_current_user_school_ids () IS NULL
        OR (
            public.get_current_user_school_ids () IS NOT NULL
            AND school_id = ANY (
                public.get_current_user_school_ids ()
            )
        )
    )
);

CREATE POLICY "Service role full access to buildings" ON public.buildings FOR ALL TO service_role USING (TRUE)
WITH
    CHECK (TRUE);

-- Rooms

CREATE POLICY "Users can read rooms for their organization schools" ON public.rooms FOR
SELECT TO authenticated USING (
        deleted_at IS NULL
        AND (
            public.get_current_user_school_ids () IS NULL
            OR (
                public.get_current_user_school_ids () IS NOT NULL
                AND school_id = ANY (
                    public.get_current_user_school_ids ()
                )
            )
        )
    );

CREATE POLICY "Users can insert rooms for their organization schools" ON public.rooms FOR
INSERT
    TO authenticated
WITH
    CHECK (
        deleted_at IS NULL
        AND (
            public.get_current_user_school_ids () IS NULL
            OR (
                public.get_current_user_school_ids () IS NOT NULL
                AND school_id = ANY (
                    public.get_current_user_school_ids ()
                )
            )
        )
    );

CREATE POLICY "Users can update rooms for their organization schools" ON public.rooms FOR
UPDATE TO authenticated USING (
    deleted_at IS NULL
    AND (
        public.get_current_user_school_ids () IS NULL
        OR (
            public.get_current_user_school_ids () IS NOT NULL
            AND school_id = ANY (
                public.get_current_user_school_ids ()
            )
        )
    )
)
WITH
    CHECK (
        deleted_at IS NULL
        AND (
            public.get_current_user_school_ids () IS NULL
            OR (
                public.get_current_user_school_ids () IS NOT NULL
                AND school_id = ANY (
                    public.get_current_user_school_ids ()
                )
            )
        )
    );

CREATE POLICY "Users can delete rooms for their organization schools" ON public.rooms FOR DELETE TO authenticated USING (
    deleted_at IS NULL
    AND (
        public.get_current_user_school_ids () IS NULL
        OR (
            public.get_current_user_school_ids () IS NOT NULL
            AND school_id = ANY (
                public.get_current_user_school_ids ()
            )
        )
    )
);

CREATE POLICY "Service role full access to rooms" ON public.rooms FOR ALL TO service_role USING (TRUE)
WITH
    CHECK (TRUE);
-- Notifications

CREATE POLICY "Users can read their own notifications" ON public.notifications FOR
SELECT TO authenticated USING (
        deleted_at IS NULL
        AND recipient_id = (
            SELECT auth.uid ()
        )
    );

CREATE POLICY "Users can update their own notifications" ON public.notifications FOR
UPDATE TO authenticated USING (
    deleted_at IS NULL
    AND recipient_id = (
        SELECT auth.uid ()
    )
)
WITH
    CHECK (
        deleted_at IS NULL
        AND recipient_id = (
            SELECT auth.uid ()
        )
    );

CREATE POLICY "Admins can create notifications" ON public.notifications FOR
INSERT
    TO authenticated
WITH
    CHECK (
        deleted_at IS NULL
        AND (
            recipient_id = (
                SELECT auth.uid ()
            )
            OR (
                public.get_current_user_role () IN ('admin', 'super_admin')
                AND (
                    public.get_current_user_role () = 'super_admin'
                    OR EXISTS (
                        SELECT 1
                        FROM public.profiles target
                        WHERE
                            target.id = recipient_id
                            AND target.deleted_at IS NULL
                            AND target.organization_id = public.get_current_user_organization_id ()
                    )
                )
            )
        )
    );

CREATE POLICY "Service role full access to notifications" ON public.notifications FOR ALL TO service_role USING (TRUE)
WITH
    CHECK (TRUE);

-- Report templates

CREATE POLICY "Service role full access to report_templates" ON public.report_templates FOR ALL TO service_role USING (TRUE)
WITH
    CHECK (TRUE);

CREATE POLICY "Users can read their organization's report_templates" ON public.report_templates FOR
SELECT TO authenticated USING (
        deleted_at IS NULL
        AND (
            organization_id = public.get_current_user_organization_id ()
            OR public.get_current_user_role () = 'super_admin'
        )
    );

CREATE POLICY "Users can insert report_templates in their organization" ON public.report_templates FOR
INSERT
    TO authenticated
WITH
    CHECK (
        deleted_at IS NULL
        AND (
            organization_id = public.get_current_user_organization_id ()
            OR public.get_current_user_role () = 'super_admin'
        )
    );

CREATE POLICY "Users can update their organization's report_templates" ON public.report_templates FOR
UPDATE TO authenticated USING (
    deleted_at IS NULL
    AND (
        organization_id = public.get_current_user_organization_id ()
        OR public.get_current_user_role () = 'super_admin'
    )
)
WITH
    CHECK (
        deleted_at IS NULL
        AND (
            organization_id = public.get_current_user_organization_id ()
            OR public.get_current_user_role () = 'super_admin'
        )
    );

CREATE POLICY "Users can delete their organization's report_templates" ON public.report_templates FOR DELETE TO authenticated USING (
    deleted_at IS NULL
    AND (
        organization_id = public.get_current_user_organization_id ()
        OR public.get_current_user_role () = 'super_admin'
    )
);
-- Storage bucket policies (staff-files)

CREATE POLICY "Users can upload staff files in their organization"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'staff-files'
        AND (
            public.get_current_user_role() = 'super_admin'
            OR (
                public.get_current_user_organization_id() IS NOT NULL
                AND (storage.foldername(name))[1] = public.get_current_user_organization_id()::TEXT
            )
        )
    );

CREATE POLICY "Users can read staff files in their organization"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'staff-files'
        AND (
            public.get_current_user_role() = 'super_admin'
            OR (
                public.get_current_user_organization_id() IS NOT NULL
                AND (storage.foldername(name))[1] = public.get_current_user_organization_id()::TEXT
            )
        )
    );

CREATE POLICY "Users can update staff files in their organization"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'staff-files'
        AND (
            public.get_current_user_role() = 'super_admin'
            OR (
                public.get_current_user_organization_id() IS NOT NULL
                AND (storage.foldername(name))[1] = public.get_current_user_organization_id()::TEXT
            )
        )
    )
    WITH CHECK (
        bucket_id = 'staff-files'
        AND (
            public.get_current_user_role() = 'super_admin'
            OR (
                public.get_current_user_organization_id() IS NOT NULL
                AND (storage.foldername(name))[1] = public.get_current_user_organization_id()::TEXT
            )
        )
    );

CREATE POLICY "Users can delete staff files in their organization"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'staff-files'
        AND (
            public.get_current_user_role() = 'super_admin'
            OR (
                public.get_current_user_organization_id() IS NOT NULL
                AND (storage.foldername(name))[1] = public.get_current_user_organization_id()::TEXT
            )
        )
    );

CREATE POLICY "Service role full access to staff files" ON storage.objects FOR ALL TO service_role USING (bucket_id = 'staff-files')
WITH
    CHECK (bucket_id = 'staff-files');

-- ============================================================================
-- Policy Verification Summary
-- ============================================================================
-- This migration creates 52 RLS policies across the following tables:
--
-- organizations: 3 policies (service role, authenticated read, anonymous read)
-- profiles: 3 policies (read, update, service role)
-- super_admin_organizations: 2 policies (authenticated, service role)
-- permissions: 5 policies (service role, read, insert, update, delete)
-- role_permissions: 5 policies (service role, read, insert, update, delete)
-- school_branding: 5 policies (read, insert, update, delete, service role)
-- staff: 5 policies (read, insert, update, delete, service role)
-- buildings: 5 policies (read, insert, update, delete, service role)
-- rooms: 5 policies (read, insert, update, delete, service role)
-- notifications: 4 policies (read own, update own, create, service role)
-- report_templates: 5 policies (read, insert, update, delete, service role)
-- storage.objects: 5 policies (upload, read, update, delete, service role)
--
-- Total: 52 policies
-- All functions have SET search_path = public for security
-- All policies use proper organization isolation patterns