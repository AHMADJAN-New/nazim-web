-- Continue with security fixes - Part 2
-- Fix overly permissive policies and add secure functions

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
SET search_path TO 'public'
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
            'old_role', request_record.existing_role,
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
SET search_path TO 'public'
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