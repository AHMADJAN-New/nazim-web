-- Remove the overly broad policy that still exists
DROP POLICY IF EXISTS "Admins and staff can manage admission applications" ON public.admission_applications;

-- Verify that only the restrictive policies remain:
-- 1. "Authorized staff can view admission applications" (SELECT only)
-- 2. "Authorized staff can create admission applications" (INSERT only) 
-- 3. "Authorized staff can update admission applications" (UPDATE only)
-- 4. "Super admins can delete admission applications" (DELETE only)

-- These policies ensure that:
-- - Only super_admin, admin, and staff roles can access admission applications
-- - Each operation is explicitly controlled
-- - No overly broad "ALL" permissions exist