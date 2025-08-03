-- Create exam_questions table
CREATE TABLE public.exam_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID NOT NULL,
  question_number INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'multiple_choice', -- multiple_choice, short_answer, essay, true_false
  options JSONB, -- For multiple choice questions
  correct_answer TEXT,
  marks INTEGER NOT NULL DEFAULT 1,
  difficulty_level TEXT DEFAULT 'medium', -- easy, medium, hard
  subject_area TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create system_settings table
CREATE TABLE public.system_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_name TEXT NOT NULL DEFAULT 'School Management System',
  school_logo_url TEXT,
  school_address TEXT,
  school_phone TEXT,
  school_email TEXT,
  school_website TEXT,
  academic_year_start_month INTEGER DEFAULT 4, -- April
  academic_year_end_month INTEGER DEFAULT 3, -- March
  default_language TEXT DEFAULT 'en',
  currency_symbol TEXT DEFAULT '$',
  date_format TEXT DEFAULT 'DD/MM/YYYY',
  time_format TEXT DEFAULT '24h',
  timezone TEXT DEFAULT 'UTC',
  primary_color TEXT DEFAULT '#3b82f6',
  secondary_color TEXT DEFAULT '#64748b',
  accent_color TEXT DEFAULT '#06b6d4',
  report_header_text TEXT,
  report_footer_text TEXT,
  enable_notifications BOOLEAN DEFAULT true,
  enable_sms BOOLEAN DEFAULT false,
  enable_email BOOLEAN DEFAULT true,
  max_students_per_class INTEGER DEFAULT 30,
  passing_grade_percentage NUMERIC DEFAULT 60,
  late_fee_amount NUMERIC DEFAULT 0,
  branch_id UUID NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(branch_id) -- One setting per branch
);

-- Enable RLS
ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for exam_questions
CREATE POLICY "All authenticated users can view exam questions"
ON public.exam_questions
FOR SELECT
USING (true);

CREATE POLICY "Teachers and admins can manage exam questions"
ON public.exam_questions
FOR ALL
USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role, 'teacher'::user_role]));

-- RLS Policies for system_settings
CREATE POLICY "All authenticated users can view system settings"
ON public.system_settings
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage system settings"
ON public.system_settings
FOR ALL
USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]));

-- Create triggers for updated_at
CREATE TRIGGER update_exam_questions_updated_at
BEFORE UPDATE ON public.exam_questions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at
BEFORE UPDATE ON public.system_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_exam_questions_exam_id ON public.exam_questions(exam_id);
CREATE INDEX idx_exam_questions_created_by ON public.exam_questions(created_by);
CREATE INDEX idx_system_settings_branch_id ON public.system_settings(branch_id);