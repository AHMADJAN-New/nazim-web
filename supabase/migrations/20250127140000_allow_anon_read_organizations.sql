-- Allow anonymous users to read organizations for signup purposes
-- This is safe because organizations only contain public information (name, slug)
-- Users still need to be assigned to an organization by an admin

-- Create policy: Anonymous users can read all organizations (for signup)
CREATE POLICY "Anonymous users can read organizations for signup"
    ON public.organizations
    FOR SELECT
    TO anon
    USING (true);

-- Note: This allows unauthenticated users to see organization names during signup
-- The actual organization assignment is still controlled by admins via profiles table

