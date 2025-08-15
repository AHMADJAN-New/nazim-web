-- Fix critical security issue: Restrict access to profiles table
-- First, let's see what policies currently exist and fix the security issue

-- Start by disabling all policies temporarily to assess the situation
DO $$
DECLARE
    pol_name text;
BEGIN
    -- Drop all existing policies on profiles table systematically
    FOR pol_name IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'profiles' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol_name || '" ON public.profiles';
    END LOOP;
END $$;

-- Now create the secure policies from scratch
-- Policy 1: Users can only view and edit their own profile
CREATE POLICY "Own profile access" 
ON public.profiles 
FOR ALL 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Policy 2: Super admins and admins can view all profiles
CREATE POLICY "Admin view all profiles" 
ON public.profiles 
FOR SELECT 
USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]));

-- Policy 3: Super admins and admins can create profiles
CREATE POLICY "Admin create profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]));

-- Policy 4: Super admins and admins can update any profile
CREATE POLICY "Admin update profiles" 
ON public.profiles 
FOR UPDATE 
USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]))
WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]));

-- Policy 5: Only super admins can delete profiles
CREATE POLICY "Super admin delete profiles" 
ON public.profiles 
FOR DELETE 
USING (get_user_role(auth.uid()) = 'super_admin'::user_role);

-- Policy 6: Teachers can view student profiles in their classes only
CREATE POLICY "Teacher view student profiles" 
ON public.profiles 
FOR SELECT 
USING (
  get_user_role(auth.uid()) = 'teacher'::user_role 
  AND id IN (
    SELECT s.user_id 
    FROM students s 
    JOIN classes c ON s.class_id = c.id 
    WHERE c.class_teacher_id = auth.uid()
  )
);

-- Ensure RLS is properly enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;