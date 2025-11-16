-- Create staff table for comprehensive staff management
-- This table stores all staff information including teachers, administrators, and other staff members
-- Linked to profiles (user accounts) and organizations for multi-tenancy

CREATE TABLE IF NOT EXISTS public.staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User Account Link (optional - staff can have user accounts)
    profile_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    
    -- Organization Link (required for multi-tenancy)
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    -- Employee Information
    employee_id VARCHAR(50) NOT NULL, -- Unique employee ID within organization
    staff_type VARCHAR(50) NOT NULL DEFAULT 'teacher', -- teacher, admin, accountant, librarian, etc.
    
    -- Personal Information
    first_name VARCHAR(100) NOT NULL,
    father_name VARCHAR(100) NOT NULL,
    grandfather_name VARCHAR(100) NULL,
    full_name VARCHAR(300) GENERATED ALWAYS AS (
        first_name || ' ' || father_name || 
        CASE WHEN grandfather_name IS NOT NULL THEN ' ' || grandfather_name ELSE '' END
    ) STORED,
    
    -- Identification
    tazkira_number VARCHAR(50) NULL,
    birth_year VARCHAR(10) NULL,
    birth_date DATE NULL,
    
    -- Contact Information
    phone_number VARCHAR(20) NULL,
    email VARCHAR(255) NULL,
    home_address VARCHAR(255) NULL,
    
    -- Location Information
    origin_province VARCHAR(50) NULL,
    origin_district VARCHAR(50) NULL,
    origin_village VARCHAR(50) NULL,
    current_province VARCHAR(50) NULL,
    current_district VARCHAR(50) NULL,
    current_village VARCHAR(50) NULL,
    
    -- Education - Religious
    religious_education VARCHAR(50) NULL, -- e.g., "Yes", "No"
    religious_university VARCHAR(100) NULL,
    religious_graduation_year VARCHAR(10) NULL,
    religious_department VARCHAR(100) NULL,
    
    -- Education - Modern
    modern_education VARCHAR(50) NULL, -- e.g., "High School", "Bachelor", "Master"
    modern_school_university VARCHAR(100) NULL,
    modern_graduation_year VARCHAR(10) NULL,
    modern_department VARCHAR(100) NULL,
    
    -- Professional Information
    teaching_section VARCHAR(50) NULL, -- Subject/section they teach
    position VARCHAR(50) NULL, -- Job position/title
    duty VARCHAR(50) NULL, -- Job duties/responsibilities
    salary VARCHAR(50) NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, inactive, on_leave, terminated
    
    -- Files and Documents
    picture_url TEXT NULL, -- Path to profile picture in storage
    document_urls JSONB DEFAULT '[]'::jsonb, -- Array of document file paths
    
    -- Additional Information
    notes TEXT NULL,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    
    -- Constraints
    CONSTRAINT staff_employee_id_org_unique UNIQUE (employee_id, organization_id),
    CONSTRAINT staff_profile_org_unique UNIQUE (profile_id, organization_id),
    CONSTRAINT check_staff_type CHECK (staff_type IN ('teacher', 'admin', 'accountant', 'librarian', 'hostel_manager', 'asset_manager', 'security', 'maintenance', 'other')),
    CONSTRAINT check_status CHECK (status IN ('active', 'inactive', 'on_leave', 'terminated', 'suspended'))
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_staff_organization_id ON public.staff(organization_id);
CREATE INDEX IF NOT EXISTS idx_staff_profile_id ON public.staff(profile_id);
CREATE INDEX IF NOT EXISTS idx_staff_employee_id ON public.staff(employee_id);
CREATE INDEX IF NOT EXISTS idx_staff_staff_type ON public.staff(staff_type);
CREATE INDEX IF NOT EXISTS idx_staff_status ON public.staff(status);
CREATE INDEX IF NOT EXISTS idx_staff_full_name ON public.staff USING gin(to_tsvector('english', full_name));

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_staff_updated_at
    BEFORE UPDATE ON public.staff
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- Create RLS policies with organization isolation

-- Policy: Users can read staff in their organization or all if super admin
CREATE POLICY "Users can read their organization's staff"
    ON public.staff
    FOR SELECT
    TO authenticated
    USING (
        organization_id = (
            SELECT organization_id 
            FROM public.profiles 
            WHERE id = auth.uid()
        )
        OR (
            SELECT organization_id 
            FROM public.profiles 
            WHERE id = auth.uid()
        ) IS NULL  -- Super admin
    );

-- Policy: Users can insert staff in their organization
CREATE POLICY "Users can insert staff in their organization"
    ON public.staff
    FOR INSERT
    TO authenticated
    WITH CHECK (
        organization_id = (
            SELECT organization_id 
            FROM public.profiles 
            WHERE id = auth.uid()
        )
        OR (
            SELECT organization_id 
            FROM public.profiles 
            WHERE id = auth.uid()
        ) IS NULL  -- Super admin
    );

-- Policy: Users can update staff in their organization
CREATE POLICY "Users can update their organization's staff"
    ON public.staff
    FOR UPDATE
    TO authenticated
    USING (
        organization_id = (
            SELECT organization_id 
            FROM public.profiles 
            WHERE id = auth.uid()
        )
        OR (
            SELECT organization_id 
            FROM public.profiles 
            WHERE id = auth.uid()
        ) IS NULL  -- Super admin
    )
    WITH CHECK (
        organization_id = (
            SELECT organization_id 
            FROM public.profiles 
            WHERE id = auth.uid()
        )
        OR (
            SELECT organization_id 
            FROM public.profiles 
            WHERE id = auth.uid()
        ) IS NULL  -- Super admin
    );

-- Policy: Users can delete staff in their organization
CREATE POLICY "Users can delete their organization's staff"
    ON public.staff
    FOR DELETE
    TO authenticated
    USING (
        organization_id = (
            SELECT organization_id 
            FROM public.profiles 
            WHERE id = auth.uid()
        )
        OR (
            SELECT organization_id 
            FROM public.profiles 
            WHERE id = auth.uid()
        ) IS NULL  -- Super admin
    );

-- Policy: Service role has full access
CREATE POLICY "Service role full access to staff"
    ON public.staff
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Create function to generate file path for staff files
CREATE OR REPLACE FUNCTION get_staff_file_path(
    org_id UUID,
    staff_id UUID,
    file_type VARCHAR,
    file_name VARCHAR
)
RETURNS TEXT AS $$
BEGIN
    -- Path format: {organization_id}/{staff_id}/{file_type}/{file_name}
    RETURN org_id::text || '/' || staff_id::text || '/' || file_type || '/' || file_name;
END;
$$ LANGUAGE plpgsql;

-- Create function to get staff picture URL
CREATE OR REPLACE FUNCTION get_staff_picture_url(staff_record public.staff)
RETURNS TEXT AS $$
BEGIN
    IF staff_record.picture_url IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Return full storage URL
    RETURN 'staff-files/' || staff_record.organization_id::text || '/' || staff_record.id::text || '/picture/' || staff_record.picture_url;
END;
$$ LANGUAGE plpgsql;

-- Add comment to table
COMMENT ON TABLE public.staff IS 'Comprehensive staff management table with user account linking and organization isolation';
COMMENT ON COLUMN public.staff.profile_id IS 'Optional link to user profile (for staff with user accounts)';
COMMENT ON COLUMN public.staff.employee_id IS 'Unique employee ID within the organization';
COMMENT ON COLUMN public.staff.staff_type IS 'Type of staff: teacher, admin, accountant, librarian, etc.';
COMMENT ON COLUMN public.staff.picture_url IS 'Filename of profile picture stored in staff-files bucket';
COMMENT ON COLUMN public.staff.document_urls IS 'JSONB array of document file paths: [{"type": "cv", "url": "filename.pdf"}, ...]';

