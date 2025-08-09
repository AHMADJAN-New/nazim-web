-- Create table for demo accounts
create table if not exists demo_accounts (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  role text not null,
  full_name text,
  description text
);

-- Seed initial demo accounts
insert into demo_accounts (email, role, full_name, description) values
  ('super.admin@greenvalley.edu', 'super_admin', 'Super Administrator', 'System administrator with full access'),
  ('admin@greenvalley.edu', 'admin', 'School Administrator', 'School administration access'),
  ('teacher@greenvalley.edu', 'teacher', 'John Teacher', 'Teaching and class management'),
  ('student@greenvalley.edu', 'student', 'Sarah Student', 'Student portal access'),
  ('parent@greenvalley.edu', 'parent', 'Parent User', 'Parent/guardian access'),
  ('staff@greenvalley.edu', 'staff', 'Staff Member', 'General staff access'),
  ('pending@greenvalley.edu', 'pending', 'Pending User', 'Pending approval account');
