-- Fix critical security issue: Restrict access to profiles table
-- This prevents unauthorized access to user personal information

-- Drop all existing policies on profiles table to start clean
DROP POLICY IF EXISTS "All authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles read access" ON public.profiles;
DROP POLICY IF EXISTS "Users can manage their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Teachers can view their students profiles" ON public.profiles;
DROP POLICY IF EXISTS "Parents can view their children profiles" ON public.profiles;

-- Create secure RLS policies for profiles table
-- Policy 1: Users can view and update their own profile
CREATE POLICY "Users can manage their own profile" 
ON public.profiles 
FOR ALL 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Policy 2: Admins can view all profiles
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]));

-- Policy 3: Admins can insert profiles
CREATE POLICY "Admins can insert profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]));

-- Policy 4: Admins can update profiles
CREATE POLICY "Admins can update profiles" 
ON public.profiles 
FOR UPDATE 
USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]))
WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]));

-- Policy 5: Admins can delete profiles
CREATE POLICY "Admins can delete profiles" 
ON public.profiles 
FOR DELETE 
USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]));

-- Policy 6: Teachers can view profiles of students in their classes
CREATE POLICY "Teachers can view their students profiles" 
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

-- Ensure RLS is enabled on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;