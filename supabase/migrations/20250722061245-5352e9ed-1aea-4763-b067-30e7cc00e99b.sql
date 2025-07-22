-- Create user_role enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'teacher', 'student', 'parent', 'staff');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create schools table
CREATE TABLE public.schools (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    address TEXT,
    phone TEXT,
    email TEXT,
    principal_name TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    subscription_plan TEXT DEFAULT 'basic',
    max_students INTEGER DEFAULT 500,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create school_admins table
CREATE TABLE public.school_admins (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES auth.users(id),
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    is_active BOOLEAN NOT NULL DEFAULT true,
    permissions JSONB DEFAULT '[]'::jsonb,
    UNIQUE(school_id, user_id)
);

-- Create pending_registrations table
CREATE TABLE public.pending_registrations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    requested_role user_role NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    additional_info JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES auth.users(id),
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add school_id to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id);

-- Add school_id to branches table  
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id);

-- Enable RLS on new tables
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_registrations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for schools
CREATE POLICY "Super admins can manage all schools" ON public.schools
FOR ALL USING (get_user_role(auth.uid()) = 'super_admin');

CREATE POLICY "School admins can view their school" ON public.schools
FOR SELECT USING (
    id IN (SELECT school_id FROM public.school_admins WHERE user_id = auth.uid() AND is_active = true)
    OR get_user_role(auth.uid()) = 'super_admin'
);

CREATE POLICY "All authenticated users can view schools for registration" ON public.schools
FOR SELECT USING (is_active = true);

-- Create RLS policies for school_admins
CREATE POLICY "Super admins can manage school admins" ON public.school_admins
FOR ALL USING (get_user_role(auth.uid()) = 'super_admin');

CREATE POLICY "School admins can view their assignments" ON public.school_admins
FOR SELECT USING (user_id = auth.uid() OR get_user_role(auth.uid()) = 'super_admin');

-- Create RLS policies for pending_registrations
CREATE POLICY "Super admins can manage all pending registrations" ON public.pending_registrations
FOR ALL USING (get_user_role(auth.uid()) = 'super_admin');

CREATE POLICY "School admins can manage their school's pending registrations" ON public.pending_registrations
FOR ALL USING (
    school_id IN (SELECT school_id FROM public.school_admins WHERE user_id = auth.uid() AND is_active = true)
    OR get_user_role(auth.uid()) = 'super_admin'
);

CREATE POLICY "Users can view their own pending registration" ON public.pending_registrations
FOR SELECT USING (user_id = auth.uid());

-- Update handle_new_user function for approval workflow
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    selected_school_id UUID;
    requested_role user_role;
    user_full_name TEXT;
BEGIN
    -- Extract data from user metadata
    selected_school_id := (NEW.raw_user_meta_data->>'school_id')::UUID;
    requested_role := COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'student');
    user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);

    -- If it's a super admin, create profile directly
    IF requested_role = 'super_admin' THEN
        INSERT INTO public.profiles (id, email, full_name, role)
        VALUES (NEW.id, NEW.email, user_full_name, requested_role);
    ELSE
        -- For other roles, create pending registration
        INSERT INTO public.pending_registrations (
            user_id, 
            school_id, 
            requested_role, 
            full_name, 
            email,
            phone,
            additional_info
        ) VALUES (
            NEW.id,
            selected_school_id,
            requested_role,
            user_full_name,
            NEW.email,
            NEW.raw_user_meta_data->>'phone',
            NEW.raw_user_meta_data
        );
    END IF;

    RETURN NEW;
END;
$function$;

-- Create function to approve registration
CREATE OR REPLACE FUNCTION public.approve_registration(
    registration_id UUID,
    approver_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    registration_record RECORD;
BEGIN
    -- Get the registration record
    SELECT * INTO registration_record 
    FROM public.pending_registrations 
    WHERE id = registration_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Create the user profile
    INSERT INTO public.profiles (
        id, 
        email, 
        full_name, 
        role, 
        school_id,
        phone
    ) VALUES (
        registration_record.user_id,
        registration_record.email,
        registration_record.full_name,
        registration_record.requested_role,
        registration_record.school_id,
        registration_record.additional_info->>'phone'
    );
    
    -- Update registration status
    UPDATE public.pending_registrations 
    SET 
        status = 'approved',
        reviewed_at = now(),
        reviewed_by = approver_id,
        updated_at = now()
    WHERE id = registration_id;
    
    RETURN TRUE;
END;
$function$;

-- Create function to reject registration
CREATE OR REPLACE FUNCTION public.reject_registration(
    registration_id UUID,
    approver_id UUID,
    reason TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    UPDATE public.pending_registrations 
    SET 
        status = 'rejected',
        reviewed_at = now(),
        reviewed_by = approver_id,
        rejection_reason = reason,
        updated_at = now()
    WHERE id = registration_id AND status = 'pending';
    
    RETURN FOUND;
END;
$function$;

-- Create triggers for updated_at
CREATE TRIGGER update_schools_updated_at
    BEFORE UPDATE ON public.schools
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pending_registrations_updated_at
    BEFORE UPDATE ON public.pending_registrations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_schools_code ON public.schools(code);
CREATE INDEX idx_schools_active ON public.schools(is_active);
CREATE INDEX idx_school_admins_school_user ON public.school_admins(school_id, user_id);
CREATE INDEX idx_school_admins_active ON public.school_admins(is_active);
CREATE INDEX idx_pending_registrations_school ON public.pending_registrations(school_id);
CREATE INDEX idx_pending_registrations_status ON public.pending_registrations(status);
CREATE INDEX idx_pending_registrations_user ON public.pending_registrations(user_id);
CREATE INDEX idx_profiles_school ON public.profiles(school_id);

-- Insert development data
INSERT INTO public.schools (id, name, code, address, phone, email, principal_name) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Green Valley Islamic School', 'GVIS', '123 Main Street, City, State', '+1-555-0101', 'admin@greenvalley.edu', 'Dr. Ahmed Hassan'),
('550e8400-e29b-41d4-a716-446655440002', 'Sunrise Academy', 'SA', '456 Oak Avenue, City, State', '+1-555-0102', 'admin@sunrise.edu', 'Mrs. Fatima Ali'),
('550e8400-e29b-41d4-a716-446655440003', 'Al-Noor Educational Institute', 'ANEI', '789 Pine Road, City, State', '+1-555-0103', 'admin@alnoor.edu', 'Mr. Omar Khan');

-- Insert development user profiles (these will be pre-approved)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data) VALUES
('550e8400-e29b-41d4-a716-446655440100', 'superadmin@test.com', '$2a$10$example', now(), now(), now(), '{"full_name": "Super Administrator", "role": "super_admin"}'),
('550e8400-e29b-41d4-a716-446655440101', 'admin@greenvalley.edu', '$2a$10$example', now(), now(), now(), '{"full_name": "School Administrator", "role": "admin", "school_id": "550e8400-e29b-41d4-a716-446655440001"}'),
('550e8400-e29b-41d4-a716-446655440102', 'teacher@greenvalley.edu', '$2a$10$example', now(), now(), now(), '{"full_name": "John Teacher", "role": "teacher", "school_id": "550e8400-e29b-41d4-a716-446655440001"}'),
('550e8400-e29b-41d4-a716-446655440103', 'student@greenvalley.edu', '$2a$10$example', now(), now(), now(), '{"full_name": "Sarah Student", "role": "student", "school_id": "550e8400-e29b-41d4-a716-446655440001"}'),
('550e8400-e29b-41d4-a716-446655440104', 'parent@greenvalley.edu', '$2a$10$example', now(), now(), now(), '{"full_name": "Parent User", "role": "parent", "school_id": "550e8400-e29b-41d4-a716-446655440001"}'),
('550e8400-e29b-41d4-a716-446655440105', 'staff@greenvalley.edu', '$2a$10$example', now(), now(), now(), '{"full_name": "Staff Member", "role": "staff", "school_id": "550e8400-e29b-41d4-a716-446655440001"}'),
('550e8400-e29b-41d4-a716-446655440106', 'pending@test.com', '$2a$10$example', now(), now(), now(), '{"full_name": "Pending User", "role": "teacher", "school_id": "550e8400-e29b-41d4-a716-446655440001"}')
ON CONFLICT (id) DO NOTHING;

-- Insert pre-approved profiles
INSERT INTO public.profiles (id, email, full_name, role, school_id) VALUES
('550e8400-e29b-41d4-a716-446655440100', 'superadmin@test.com', 'Super Administrator', 'super_admin', NULL),
('550e8400-e29b-41d4-a716-446655440101', 'admin@greenvalley.edu', 'School Administrator', 'admin', '550e8400-e29b-41d4-a716-446655440001'),
('550e8400-e29b-41d4-a716-446655440102', 'teacher@greenvalley.edu', 'John Teacher', 'teacher', '550e8400-e29b-41d4-a716-446655440001'),
('550e8400-e29b-41d4-a716-446655440103', 'student@greenvalley.edu', 'Sarah Student', 'student', '550e8400-e29b-41d4-a716-446655440001'),
('550e8400-e29b-41d4-a716-446655440104', 'parent@greenvalley.edu', 'Parent User', 'parent', '550e8400-e29b-41d4-a716-446655440001'),
('550e8400-e29b-41d4-a716-446655440105', 'staff@greenvalley.edu', 'Staff Member', 'staff', '550e8400-e29b-41d4-a716-446655440001')
ON CONFLICT (id) DO NOTHING;

-- Insert school admin assignment
INSERT INTO public.school_admins (school_id, user_id, assigned_by) VALUES
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440100')
ON CONFLICT (school_id, user_id) DO NOTHING;

-- Insert pending registration for testing
INSERT INTO public.pending_registrations (user_id, school_id, requested_role, full_name, email) VALUES
('550e8400-e29b-41d4-a716-446655440106', '550e8400-e29b-41d4-a716-446655440001', 'teacher', 'Pending User', 'pending@test.com')
ON CONFLICT DO NOTHING;