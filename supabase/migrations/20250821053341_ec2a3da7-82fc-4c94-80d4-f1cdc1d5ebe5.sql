-- Remove the overly broad "Own profile access" policy that allows ALL operations
DROP POLICY IF EXISTS "Own profile access" ON public.profiles;

-- Remove the broad teacher access policy 
DROP POLICY IF EXISTS "Teacher view student profiles" ON public.profiles;

-- Create more restrictive policies for user's own profile access
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Teachers can only view limited student profile information (not sensitive data)
CREATE POLICY "Teachers view limited student info" ON public.profiles
FOR SELECT USING (
  get_user_role(auth.uid()) = 'teacher'::user_role 
  AND id IN (
    SELECT s.user_id 
    FROM students s 
    JOIN classes c ON s.class_id = c.id 
    WHERE c.class_teacher_id = auth.uid()
  )
);

-- Staff can view student profiles for administrative purposes
CREATE POLICY "Staff view student profiles" ON public.profiles
FOR SELECT USING (
  get_user_role(auth.uid()) = ANY (ARRAY['staff'::user_role]) 
  AND get_user_role(id) = 'student'::user_role
);

-- Prevent users from creating their own profiles (only admin can create)
-- The existing "Admin create profiles" policy already handles this correctly

-- Prevent users from deleting their own profiles
-- The existing "Super admin delete profiles" policy already handles this correctly