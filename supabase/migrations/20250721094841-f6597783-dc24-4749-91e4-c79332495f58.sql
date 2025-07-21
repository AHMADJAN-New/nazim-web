-- Create enum types
CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'teacher', 'staff', 'student', 'parent');
CREATE TYPE student_status AS ENUM ('active', 'inactive', 'graduated', 'transferred', 'suspended');
CREATE TYPE exam_type AS ENUM ('midterm', 'final', 'quiz', 'assignment', 'omr');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'excused');
CREATE TYPE fee_status AS ENUM ('pending', 'paid', 'overdue', 'waived');

-- Profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  role user_role NOT NULL DEFAULT 'student',
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Branches/Schools table
CREATE TABLE public.branches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  principal_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Academic years
CREATE TABLE public.academic_years (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN DEFAULT false,
  branch_id UUID NOT NULL REFERENCES public.branches(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Classes/Grades
CREATE TABLE public.classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  grade_level INTEGER,
  section TEXT,
  capacity INTEGER DEFAULT 30,
  class_teacher_id UUID REFERENCES public.profiles(id),
  branch_id UUID NOT NULL REFERENCES public.branches(id),
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Subjects
CREATE TABLE public.subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  credits INTEGER DEFAULT 1,
  branch_id UUID NOT NULL REFERENCES public.branches(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Students
CREATE TABLE public.students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id TEXT UNIQUE NOT NULL,
  admission_date DATE NOT NULL,
  date_of_birth DATE,
  gender TEXT,
  blood_group TEXT,
  guardian_name TEXT,
  guardian_phone TEXT,
  guardian_email TEXT,
  emergency_contact TEXT,
  status student_status DEFAULT 'active',
  class_id UUID REFERENCES public.classes(id),
  branch_id UUID NOT NULL REFERENCES public.branches(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Staff members
CREATE TABLE public.staff (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  employee_id TEXT UNIQUE NOT NULL,
  designation TEXT,
  department TEXT,
  hire_date DATE,
  salary DECIMAL(10,2),
  qualification TEXT,
  experience_years INTEGER,
  branch_id UUID NOT NULL REFERENCES public.branches(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Attendance
CREATE TABLE public.attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id),
  class_id UUID NOT NULL REFERENCES public.classes(id),
  date DATE NOT NULL,
  status attendance_status NOT NULL,
  remarks TEXT,
  marked_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, date)
);

-- Exams
CREATE TABLE public.exams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type exam_type NOT NULL,
  subject_id UUID NOT NULL REFERENCES public.subjects(id),
  class_id UUID NOT NULL REFERENCES public.classes(id),
  exam_date DATE NOT NULL,
  duration_minutes INTEGER,
  total_marks INTEGER NOT NULL,
  pass_marks INTEGER,
  instructions TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  branch_id UUID NOT NULL REFERENCES public.branches(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- OMR Scans
CREATE TABLE public.omr_scans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES public.exams(id),
  student_id UUID NOT NULL REFERENCES public.students(id),
  file_name TEXT NOT NULL,
  file_url TEXT,
  student_id_extracted TEXT,
  score INTEGER,
  total_questions INTEGER,
  answers JSONB,
  layout_id TEXT,
  scan_accuracy DECIMAL(5,2),
  scanned_by UUID NOT NULL REFERENCES public.profiles(id),
  scanned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Answer Keys
CREATE TABLE public.answer_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES public.exams(id),
  layout_id TEXT NOT NULL,
  answers JSONB NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(exam_id, layout_id)
);

-- Hifz Progress
CREATE TABLE public.hifz_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id),
  date DATE NOT NULL,
  surah_name TEXT,
  ayah_from INTEGER,
  ayah_to INTEGER,
  pages_memorized INTEGER,
  revision_pages INTEGER,
  mistakes_count INTEGER,
  teacher_feedback TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  recorded_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Fees
CREATE TABLE public.fees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id),
  fee_type TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE,
  status fee_status DEFAULT 'pending',
  payment_method TEXT,
  transaction_id TEXT,
  remarks TEXT,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Library Books
CREATE TABLE public.library_books (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  isbn TEXT UNIQUE,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  publisher TEXT,
  publication_year INTEGER,
  category TEXT,
  total_copies INTEGER DEFAULT 1,
  available_copies INTEGER DEFAULT 1,
  location TEXT,
  branch_id UUID NOT NULL REFERENCES public.branches(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Library Transactions
CREATE TABLE public.library_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL REFERENCES public.library_books(id),
  student_id UUID NOT NULL REFERENCES public.students(id),
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  return_date DATE,
  fine_amount DECIMAL(8,2) DEFAULT 0,
  status TEXT DEFAULT 'issued',
  issued_by UUID NOT NULL REFERENCES public.profiles(id),
  returned_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Hostel Rooms
CREATE TABLE public.hostel_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_number TEXT NOT NULL,
  floor INTEGER,
  capacity INTEGER DEFAULT 2,
  occupied_count INTEGER DEFAULT 0,
  room_type TEXT,
  monthly_fee DECIMAL(8,2),
  facilities TEXT[],
  branch_id UUID NOT NULL REFERENCES public.branches(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(room_number, branch_id)
);

-- Hostel Allocations
CREATE TABLE public.hostel_allocations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id),
  room_id UUID NOT NULL REFERENCES public.hostel_rooms(id),
  allocated_date DATE NOT NULL,
  checkout_date DATE,
  status TEXT DEFAULT 'active',
  monthly_fee DECIMAL(8,2),
  allocated_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Assets
CREATE TABLE public.assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  purchase_date DATE,
  purchase_cost DECIMAL(10,2),
  current_value DECIMAL(10,2),
  condition TEXT,
  location TEXT,
  assigned_to UUID REFERENCES public.profiles(id),
  branch_id UUID NOT NULL REFERENCES public.branches(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Communications/Announcements
CREATE TABLE public.communications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'announcement',
  target_audience TEXT[], -- ['students', 'teachers', 'parents', 'staff']
  class_ids UUID[], -- specific classes if targeted
  priority TEXT DEFAULT 'normal',
  published_date TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  branch_id UUID NOT NULL REFERENCES public.branches(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.omr_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answer_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hifz_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hostel_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hostel_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;

-- Create security definer function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS user_role AS $$
BEGIN
  RETURN (SELECT role FROM public.profiles WHERE id = user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create RLS Policies

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can insert profiles" ON public.profiles FOR INSERT WITH CHECK (get_user_role(auth.uid()) IN ('super_admin', 'admin'));

-- Students policies
CREATE POLICY "All authenticated users can view students" ON public.students FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and teachers can manage students" ON public.students FOR ALL USING (get_user_role(auth.uid()) IN ('super_admin', 'admin', 'teacher'));

-- Staff policies  
CREATE POLICY "All authenticated users can view staff" ON public.staff FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage staff" ON public.staff FOR ALL USING (get_user_role(auth.uid()) IN ('super_admin', 'admin'));

-- Attendance policies
CREATE POLICY "All authenticated users can view attendance" ON public.attendance FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers and admins can manage attendance" ON public.attendance FOR ALL USING (get_user_role(auth.uid()) IN ('super_admin', 'admin', 'teacher'));

-- Exams policies
CREATE POLICY "All authenticated users can view exams" ON public.exams FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers and admins can manage exams" ON public.exams FOR ALL USING (get_user_role(auth.uid()) IN ('super_admin', 'admin', 'teacher'));

-- OMR scans policies
CREATE POLICY "All authenticated users can view omr scans" ON public.omr_scans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers and admins can manage omr scans" ON public.omr_scans FOR ALL USING (get_user_role(auth.uid()) IN ('super_admin', 'admin', 'teacher'));

-- Answer keys policies
CREATE POLICY "All authenticated users can view answer keys" ON public.answer_keys FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers and admins can manage answer keys" ON public.answer_keys FOR ALL USING (get_user_role(auth.uid()) IN ('super_admin', 'admin', 'teacher'));

-- Apply similar policies to other tables
CREATE POLICY "All authenticated users can view branches" ON public.branches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage branches" ON public.branches FOR ALL USING (get_user_role(auth.uid()) IN ('super_admin', 'admin'));

CREATE POLICY "All authenticated users can view academic years" ON public.academic_years FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage academic years" ON public.academic_years FOR ALL USING (get_user_role(auth.uid()) IN ('super_admin', 'admin'));

CREATE POLICY "All authenticated users can view classes" ON public.classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and teachers can manage classes" ON public.classes FOR ALL USING (get_user_role(auth.uid()) IN ('super_admin', 'admin', 'teacher'));

CREATE POLICY "All authenticated users can view subjects" ON public.subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage subjects" ON public.subjects FOR ALL USING (get_user_role(auth.uid()) IN ('super_admin', 'admin'));

CREATE POLICY "All authenticated users can view hifz progress" ON public.hifz_progress FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers and admins can manage hifz progress" ON public.hifz_progress FOR ALL USING (get_user_role(auth.uid()) IN ('super_admin', 'admin', 'teacher'));

CREATE POLICY "All authenticated users can view fees" ON public.fees FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and staff can manage fees" ON public.fees FOR ALL USING (get_user_role(auth.uid()) IN ('super_admin', 'admin', 'staff'));

CREATE POLICY "All authenticated users can view library books" ON public.library_books FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and staff can manage library books" ON public.library_books FOR ALL USING (get_user_role(auth.uid()) IN ('super_admin', 'admin', 'staff'));

CREATE POLICY "All authenticated users can view library transactions" ON public.library_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and staff can manage library transactions" ON public.library_transactions FOR ALL USING (get_user_role(auth.uid()) IN ('super_admin', 'admin', 'staff'));

CREATE POLICY "All authenticated users can view hostel rooms" ON public.hostel_rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and staff can manage hostel rooms" ON public.hostel_rooms FOR ALL USING (get_user_role(auth.uid()) IN ('super_admin', 'admin', 'staff'));

CREATE POLICY "All authenticated users can view hostel allocations" ON public.hostel_allocations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and staff can manage hostel allocations" ON public.hostel_allocations FOR ALL USING (get_user_role(auth.uid()) IN ('super_admin', 'admin', 'staff'));

CREATE POLICY "All authenticated users can view assets" ON public.assets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and staff can manage assets" ON public.assets FOR ALL USING (get_user_role(auth.uid()) IN ('super_admin', 'admin', 'staff'));

CREATE POLICY "All authenticated users can view communications" ON public.communications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and teachers can manage communications" ON public.communications FOR ALL USING (get_user_role(auth.uid()) IN ('super_admin', 'admin', 'teacher'));

-- Create triggers for updated_at columns
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON public.branches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON public.staff FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create profile automatically when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();