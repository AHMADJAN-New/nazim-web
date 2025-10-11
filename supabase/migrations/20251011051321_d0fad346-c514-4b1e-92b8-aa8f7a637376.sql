-- Drop the overly broad policy that allows ALL authenticated users to view all schools
DROP POLICY IF EXISTS "All authenticated users can view schools for registration" ON public.schools;

-- Allow PUBLIC (unauthenticated) users to view active schools during registration
-- This is needed for the registration form
CREATE POLICY "Public can view active schools for registration" 
ON public.schools
FOR SELECT 
TO anon
USING (is_active = true);

-- Authenticated users can only view schools they are associated with
CREATE POLICY "Authenticated users view associated schools" 
ON public.schools
FOR SELECT 
TO authenticated
USING (
  is_active = true 
  AND (
    -- Super admins can see all schools
    get_user_role(auth.uid()) = 'super_admin'::user_role
    -- School admins can see their school
    OR id IN (
      SELECT school_id 
      FROM school_admins 
      WHERE user_id = auth.uid() AND is_active = true
    )
    -- Staff/teachers/students can see their school
    OR id IN (
      SELECT school_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  )
);