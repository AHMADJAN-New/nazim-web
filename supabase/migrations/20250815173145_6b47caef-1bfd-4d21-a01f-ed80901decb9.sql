-- Fix critical security issue: Restrict access to admission_applications table
-- This prevents unauthorized access to sensitive student application data

-- Drop the overly permissive policy that allows all authenticated users to view applications
DROP POLICY IF EXISTS "All authenticated users can view admission applications" ON public.admission_applications;

-- Create secure RLS policies for admission_applications table
-- Policy 1: Only admins and staff can view admission applications
CREATE POLICY "Authorized staff can view admission applications" 
ON public.admission_applications 
FOR SELECT 
USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role, 'staff'::user_role]));

-- Policy 2: Only admins and staff can insert admission applications
CREATE POLICY "Authorized staff can create admission applications" 
ON public.admission_applications 
FOR INSERT 
WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role, 'staff'::user_role]));

-- Policy 3: Only admins and staff can update admission applications
CREATE POLICY "Authorized staff can update admission applications" 
ON public.admission_applications 
FOR UPDATE 
USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role, 'staff'::user_role]))
WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role, 'staff'::user_role]));

-- Policy 4: Only super admins can delete admission applications
CREATE POLICY "Super admins can delete admission applications" 
ON public.admission_applications 
FOR DELETE 
USING (get_user_role(auth.uid()) = 'super_admin'::user_role);

-- Ensure RLS is enabled on admission_applications table
ALTER TABLE public.admission_applications ENABLE ROW LEVEL SECURITY;