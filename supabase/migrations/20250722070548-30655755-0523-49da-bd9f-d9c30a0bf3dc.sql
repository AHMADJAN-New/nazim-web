-- Create trigger for handling new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update demo accounts in profiles table to ensure they exist and have correct roles
INSERT INTO public.profiles (id, email, full_name, role, school_id)
SELECT 
  au.id,
  au.email,
  CASE 
    WHEN au.email = 'super.admin@greenvalley.edu' THEN 'Super Administrator'
    WHEN au.email = 'admin@greenvalley.edu' THEN 'School Administrator'
    WHEN au.email = 'teacher@greenvalley.edu' THEN 'John Teacher'
    WHEN au.email = 'student@greenvalley.edu' THEN 'Sarah Student'
    WHEN au.email = 'parent@greenvalley.edu' THEN 'Parent User'
    WHEN au.email = 'staff@greenvalley.edu' THEN 'Staff Member'
    WHEN au.email = 'pending@greenvalley.edu' THEN 'Pending User'
  END as full_name,
  CASE 
    WHEN au.email = 'super.admin@greenvalley.edu' THEN 'super_admin'::user_role
    WHEN au.email = 'admin@greenvalley.edu' THEN 'admin'::user_role
    WHEN au.email = 'teacher@greenvalley.edu' THEN 'teacher'::user_role
    WHEN au.email = 'student@greenvalley.edu' THEN 'student'::user_role
    WHEN au.email = 'parent@greenvalley.edu' THEN 'parent'::user_role
    WHEN au.email = 'staff@greenvalley.edu' THEN 'staff'::user_role
    WHEN au.email = 'pending@greenvalley.edu' THEN 'student'::user_role
  END as role,
  (SELECT id FROM public.schools WHERE code = 'GVS' LIMIT 1) as school_id
FROM auth.users au
WHERE au.email IN (
  'super.admin@greenvalley.edu',
  'admin@greenvalley.edu', 
  'teacher@greenvalley.edu',
  'student@greenvalley.edu',
  'parent@greenvalley.edu',
  'staff@greenvalley.edu',
  'pending@greenvalley.edu'
)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  school_id = EXCLUDED.school_id;