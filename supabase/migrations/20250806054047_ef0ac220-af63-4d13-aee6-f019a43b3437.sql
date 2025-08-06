-- CRITICAL SECURITY FIXES
-- Phase 1: Fix Role Escalation and Access Control Issues

-- 1. Create proper role management system
CREATE TYPE user_role_request_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE public.user_role_requests (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    current_role user_role,
    requested_role user_role NOT NULL,
    justification TEXT,
    status user_role_request_status NOT NULL DEFAULT 'pending',
    requested_by UUID NOT NULL REFERENCES auth.users(id),
    reviewed_by UUID REFERENCES auth.users(id),
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on user role requests
ALTER TABLE public.user_role_requests ENABLE ROW LEVEL SECURITY;

-- 2. Update profiles table RLS policies - REMOVE dangerous policy that allows users to update their own roles
DROP POLICY IF EXISTS "Users can view and update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create new secure policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Only allow users to update non-sensitive fields (NOT role)
CREATE POLICY "Users can update their own profile data" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (
    auth.uid() = id AND 
    -- Prevent role changes by regular users
    role = (SELECT role FROM public.profiles WHERE id = auth.uid())
);

-- Only admins can manage roles and create profiles
CREATE POLICY "Admins can manage all profiles" 
ON public.profiles 
FOR ALL 
USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]));

-- 3. Create policies for user role requests
CREATE POLICY "Users can view their own role requests" 
ON public.user_role_requests 
FOR SELECT 
USING (user_id = auth.uid() OR requested_by = auth.uid());

CREATE POLICY "Users can create role requests" 
ON public.user_role_requests 
FOR INSERT 
WITH CHECK (requested_by = auth.uid());

CREATE POLICY "Admins can manage role requests" 
ON public.user_role_requests 
FOR ALL 
USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]));

-- 4. Fix overly permissive policies - Replace "All authenticated users can view" with role-based access

-- Students table - students and parents should only see relevant data
DROP POLICY IF EXISTS "All authenticated users can view students" ON public.students;
CREATE POLICY "Role-based student access" 
ON public.students 
FOR SELECT 
USING (
    get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role, 'teacher'::user_role, 'staff'::user_role])
    OR 
    user_id = auth.uid()  -- Students can see their own data
);

-- Attendance - restrict to relevant parties
DROP POLICY IF EXISTS "All authenticated users can view attendance" ON public.attendance;
CREATE POLICY "Role-based attendance access" 
ON public.attendance 
FOR SELECT 
USING (
    get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role, 'teacher'::user_role, 'staff'::user_role])
    OR 
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
);

-- Exam results - restrict to relevant parties
DROP POLICY IF EXISTS "All authenticated users can view exam results" ON public.exam_results;
CREATE POLICY "Role-based exam results access" 
ON public.exam_results 
FOR SELECT 
USING (
    get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role, 'teacher'::user_role])
    OR 
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
);

-- Classes - restrict to relevant parties  
DROP POLICY IF EXISTS "All authenticated users can view classes" ON public.classes;
CREATE POLICY "Role-based class access" 
ON public.classes 
FOR SELECT 
USING (
    get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role, 'teacher'::user_role, 'staff'::user_role])
    OR 
    id IN (SELECT class_id FROM public.students WHERE user_id = auth.uid() AND class_id IS NOT NULL)
);

-- 5. Create secure role change approval function
CREATE OR REPLACE FUNCTION public.approve_role_change(request_id UUID, approver_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    request_record RECORD;
    target_user_id UUID;
BEGIN
    -- Verify approver has admin privileges
    IF NOT (SELECT get_user_role(approver_id) = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role])) THEN
        RAISE EXCEPTION 'Insufficient privileges to approve role changes';
    END IF;
    
    -- Get the request record
    SELECT * INTO request_record 
    FROM public.user_role_requests 
    WHERE id = request_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    target_user_id := request_record.user_id;
    
    -- Update the user's role in profiles
    UPDATE public.profiles 
    SET role = request_record.requested_role,
        updated_at = now()
    WHERE id = target_user_id;
    
    -- Mark request as approved
    UPDATE public.user_role_requests 
    SET 
        status = 'approved',
        reviewed_by = approver_id,
        reviewed_at = now(),
        updated_at = now()
    WHERE id = request_id;
    
    -- Log the role change
    PERFORM public.log_auth_event(
        'role_change_approved',
        jsonb_build_object(
            'user_id', target_user_id,
            'old_role', request_record.current_role,
            'new_role', request_record.requested_role,
            'approved_by', approver_id,
            'request_id', request_id
        ),
        NULL,
        (SELECT email FROM public.profiles WHERE id = target_user_id)
    );
    
    RETURN TRUE;
END;
$$;

-- 6. Create function to reject role changes
CREATE OR REPLACE FUNCTION public.reject_role_change(request_id UUID, approver_id UUID, reason TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    request_record RECORD;
BEGIN
    -- Verify approver has admin privileges
    IF NOT (SELECT get_user_role(approver_id) = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role])) THEN
        RAISE EXCEPTION 'Insufficient privileges to reject role changes';
    END IF;
    
    -- Get the request record
    SELECT * INTO request_record 
    FROM public.user_role_requests 
    WHERE id = request_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Mark request as rejected
    UPDATE public.user_role_requests 
    SET 
        status = 'rejected',
        reviewed_by = approver_id,
        reviewed_at = now(),
        rejection_reason = reason,
        updated_at = now()
    WHERE id = request_id;
    
    RETURN TRUE;
END;
$$;

-- 7. Add trigger for automatic timestamps on user_role_requests
CREATE TRIGGER update_user_role_requests_updated_at
BEFORE UPDATE ON public.user_role_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Enhance security definer functions with proper search_path
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS user_role
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN (SELECT role FROM public.profiles WHERE id = user_id);
END;
$$;