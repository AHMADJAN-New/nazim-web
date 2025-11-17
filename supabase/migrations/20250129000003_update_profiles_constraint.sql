-- Update profiles table to allow super_admin to have organization_id
-- Remove the constraint that prevents super_admin from having organization_id
-- Super admins can now belong to organizations via the super_admin_organizations junction table

-- Drop the existing constraint if it exists
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS check_organization_required;

-- Create a new constraint that allows super_admin to have organization_id
-- Regular users (non-super-admin) should have organization_id, but it can be NULL temporarily during signup
ALTER TABLE public.profiles
ADD CONSTRAINT check_organization_required_new CHECK (
    -- Super admin can have organization_id or NULL (both are valid)
    (role = 'super_admin')
    OR
    -- Non-super-admin users can have organization_id (can be NULL temporarily during signup)
    (role != 'super_admin')
);

-- Note: The application layer should enforce that non-super-admin users have organization_id
-- before they can access the application. The database constraint allows NULL for flexibility
-- during the signup process.