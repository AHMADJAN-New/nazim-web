-- Create required ENUM types FIRST
CREATE TYPE public.application_status AS ENUM ('pending', 'approved', 'rejected', 'interview', 'waitlist');
CREATE TYPE public.invoice_status AS ENUM ('pending', 'paid', 'overdue', 'cancelled', 'partial');
CREATE TYPE public.report_status AS ENUM ('processing', 'completed', 'failed', 'cancelled');

-- Create missing tables for comprehensive school management system

-- 1. Admission Applications table
CREATE TABLE public.admission_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id TEXT NOT NULL UNIQUE,
  student_name TEXT NOT NULL,
  father_name TEXT NOT NULL,
  mother_name TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  date_of_birth DATE,
  previous_school TEXT,
  class_applying_for TEXT NOT NULL,
  documents_submitted JSONB DEFAULT '[]'::jsonb,
  status public.application_status NOT NULL DEFAULT 'pending',
  applied_date DATE NOT NULL DEFAULT CURRENT_DATE,
  interview_date DATE,
  admission_fee NUMERIC,
  remarks TEXT,
  branch_id UUID NOT NULL,
  reviewed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. ID Cards table
CREATE TABLE public.id_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  card_number TEXT NOT NULL UNIQUE,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  issued_by UUID NOT NULL,
  photo_url TEXT,
  qr_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Fee Structures table
CREATE TABLE public.fee_structures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_name TEXT NOT NULL,
  academic_year_id UUID NOT NULL,
  tuition_fee NUMERIC NOT NULL DEFAULT 0,
  admission_fee NUMERIC NOT NULL DEFAULT 0,
  exam_fee NUMERIC NOT NULL DEFAULT 0,
  library_fee NUMERIC NOT NULL DEFAULT 0,
  sports_fee NUMERIC NOT NULL DEFAULT 0,
  transport_fee NUMERIC NOT NULL DEFAULT 0,
  hostel_fee NUMERIC NOT NULL DEFAULT 0,
  other_fees JSONB DEFAULT '{}'::jsonb,
  total_fee NUMERIC GENERATED ALWAYS AS (
    tuition_fee + admission_fee + exam_fee + library_fee + sports_fee + transport_fee + hostel_fee
  ) STORED,
  branch_id UUID NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Invoices table
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  student_id UUID NOT NULL,
  fee_structure_id UUID NOT NULL,
  academic_year_id UUID NOT NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  total_amount NUMERIC NOT NULL,
  paid_amount NUMERIC NOT NULL DEFAULT 0,
  discount_amount NUMERIC NOT NULL DEFAULT 0,
  status public.invoice_status NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  payment_date DATE,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Report Templates table
CREATE TABLE public.report_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  type TEXT NOT NULL,
  query_template TEXT NOT NULL,
  parameters JSONB DEFAULT '[]'::jsonb,
  format_options JSONB DEFAULT '["PDF", "Excel"]'::jsonb,
  access_level TEXT NOT NULL DEFAULT 'Staff',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Generated Reports table
CREATE TABLE public.generated_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL,
  report_name TEXT NOT NULL,
  file_path TEXT,
  file_size INTEGER,
  format TEXT NOT NULL,
  parameters JSONB DEFAULT '{}'::jsonb,
  status public.report_status NOT NULL DEFAULT 'processing',
  generated_by UUID NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  download_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_public BOOLEAN NOT NULL DEFAULT false
);

-- 7. Scheduled Reports table
CREATE TABLE public.scheduled_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL,
  name TEXT NOT NULL,
  schedule_expression TEXT NOT NULL,
  next_run TIMESTAMP WITH TIME ZONE NOT NULL,
  recipients TEXT[] NOT NULL DEFAULT '{}',
  format TEXT NOT NULL DEFAULT 'PDF',
  parameters JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 8. System Settings table
CREATE TABLE public.system_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  updated_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(category, key)
);

-- 9. User Roles table (enhanced)
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role public.user_role NOT NULL,
  assigned_by UUID NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  branch_id UUID,
  permissions JSONB DEFAULT '[]'::jsonb
);

-- 10. Audit Logs table
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 11. Notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  recipient_id UUID NOT NULL,
  sender_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  priority TEXT NOT NULL DEFAULT 'normal',
  data JSONB DEFAULT '{}'::jsonb,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 12. File Uploads table
CREATE TABLE public.file_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  uploaded_by UUID NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.admission_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.id_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_uploads ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies for admission_applications
CREATE POLICY "All authenticated users can view admission applications" ON public.admission_applications FOR SELECT USING (true);
CREATE POLICY "Admins and staff can manage admission applications" ON public.admission_applications FOR ALL USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role, 'staff'::user_role]));

-- Create RLS Policies for id_cards
CREATE POLICY "All authenticated users can view id cards" ON public.id_cards FOR SELECT USING (true);
CREATE POLICY "Admins and staff can manage id cards" ON public.id_cards FOR ALL USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role, 'staff'::user_role]));

-- Create RLS Policies for fee_structures
CREATE POLICY "All authenticated users can view fee structures" ON public.fee_structures FOR SELECT USING (true);
CREATE POLICY "Admins can manage fee structures" ON public.fee_structures FOR ALL USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]));

-- Create RLS Policies for invoices
CREATE POLICY "All authenticated users can view invoices" ON public.invoices FOR SELECT USING (true);
CREATE POLICY "Admins and staff can manage invoices" ON public.invoices FOR ALL USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role, 'staff'::user_role]));

-- Create RLS Policies for report_templates
CREATE POLICY "All authenticated users can view report templates" ON public.report_templates FOR SELECT USING (true);
CREATE POLICY "Admins can manage report templates" ON public.report_templates FOR ALL USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]));

-- Create RLS Policies for generated_reports
CREATE POLICY "Users can view their own generated reports" ON public.generated_reports FOR SELECT USING (generated_by = auth.uid() OR is_public = true OR get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]));
CREATE POLICY "All authenticated users can generate reports" ON public.generated_reports FOR INSERT WITH CHECK (generated_by = auth.uid());
CREATE POLICY "Users can update their own reports" ON public.generated_reports FOR UPDATE USING (generated_by = auth.uid() OR get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]));

-- Create RLS Policies for scheduled_reports
CREATE POLICY "All authenticated users can view scheduled reports" ON public.scheduled_reports FOR SELECT USING (true);
CREATE POLICY "Admins can manage scheduled reports" ON public.scheduled_reports FOR ALL USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]));

-- Create RLS Policies for system_settings
CREATE POLICY "All authenticated users can view public settings" ON public.system_settings FOR SELECT USING (is_public = true OR get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]));
CREATE POLICY "Only super admins can manage system settings" ON public.system_settings FOR ALL USING (get_user_role(auth.uid()) = 'super_admin'::user_role);

-- Create RLS Policies for user_roles
CREATE POLICY "All authenticated users can view user roles" ON public.user_roles FOR SELECT USING (true);
CREATE POLICY "Admins can manage user roles" ON public.user_roles FOR ALL USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]));

-- Create RLS Policies for audit_logs
CREATE POLICY "Only admins can view audit logs" ON public.audit_logs FOR SELECT USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]));
CREATE POLICY "System can insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (true);

-- Create RLS Policies for notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (recipient_id = auth.uid() OR get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]));
CREATE POLICY "All authenticated users can create notifications" ON public.notifications FOR INSERT WITH CHECK (sender_id = auth.uid() OR get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]));
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (recipient_id = auth.uid());

-- Create RLS Policies for file_uploads
CREATE POLICY "Users can view public files or their own uploads" ON public.file_uploads FOR SELECT USING (is_public = true OR uploaded_by = auth.uid() OR get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]));
CREATE POLICY "All authenticated users can upload files" ON public.file_uploads FOR INSERT WITH CHECK (uploaded_by = auth.uid());
CREATE POLICY "Users can update their own file uploads" ON public.file_uploads FOR UPDATE USING (uploaded_by = auth.uid() OR get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]));

-- Create updated_at triggers for all tables
CREATE TRIGGER update_admission_applications_updated_at BEFORE UPDATE ON public.admission_applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_id_cards_updated_at BEFORE UPDATE ON public.id_cards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_fee_structures_updated_at BEFORE UPDATE ON public.fee_structures FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_report_templates_updated_at BEFORE UPDATE ON public.report_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_scheduled_reports_updated_at BEFORE UPDATE ON public.scheduled_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON public.system_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_admission_applications_status ON public.admission_applications(status);
CREATE INDEX idx_admission_applications_branch ON public.admission_applications(branch_id);
CREATE INDEX idx_admission_applications_applied_date ON public.admission_applications(applied_date);

CREATE INDEX idx_id_cards_student ON public.id_cards(student_id);
CREATE INDEX idx_id_cards_active ON public.id_cards(is_active);
CREATE INDEX idx_id_cards_expiry ON public.id_cards(expiry_date);

CREATE INDEX idx_fee_structures_class ON public.fee_structures(class_name);
CREATE INDEX idx_fee_structures_academic_year ON public.fee_structures(academic_year_id);
CREATE INDEX idx_fee_structures_branch ON public.fee_structures(branch_id);

CREATE INDEX idx_invoices_student ON public.invoices(student_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_due_date ON public.invoices(due_date);
CREATE INDEX idx_invoices_academic_year ON public.invoices(academic_year_id);

CREATE INDEX idx_generated_reports_generated_by ON public.generated_reports(generated_by);
CREATE INDEX idx_generated_reports_template ON public.generated_reports(template_id);
CREATE INDEX idx_generated_reports_generated_at ON public.generated_reports(generated_at);

CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);
CREATE INDEX idx_user_roles_active ON public.user_roles(is_active);

CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at);

CREATE INDEX idx_notifications_recipient ON public.notifications(recipient_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at);

CREATE INDEX idx_file_uploads_entity ON public.file_uploads(entity_type, entity_id);
CREATE INDEX idx_file_uploads_uploaded_by ON public.file_uploads(uploaded_by);

-- Insert default system settings (only if super admin exists)
INSERT INTO public.system_settings (category, key, value, description, is_public, updated_by) 
SELECT 'school', 'name', '"Nazim Islamic School"', 'School name', true, id 
FROM public.profiles WHERE role = 'super_admin' LIMIT 1;

INSERT INTO public.system_settings (category, key, value, description, is_public, updated_by) 
SELECT 'school', 'address', '"Street 45, Block C, Model Town, Lahore"', 'School address', true, id 
FROM public.profiles WHERE role = 'super_admin' LIMIT 1;

INSERT INTO public.system_settings (category, key, value, description, is_public, updated_by) 
SELECT 'school', 'phone', '"+92-42-12345678"', 'School phone number', true, id 
FROM public.profiles WHERE role = 'super_admin' LIMIT 1;

INSERT INTO public.system_settings (category, key, value, description, is_public, updated_by) 
SELECT 'school', 'email', '"info@nazimschool.edu.pk"', 'School email address', true, id 
FROM public.profiles WHERE role = 'super_admin' LIMIT 1;

INSERT INTO public.system_settings (category, key, value, description, is_public, updated_by) 
SELECT 'system', 'timezone', '"Asia/Karachi"', 'System timezone', true, id 
FROM public.profiles WHERE role = 'super_admin' LIMIT 1;

INSERT INTO public.system_settings (category, key, value, description, is_public, updated_by) 
SELECT 'system', 'currency', '"PKR"', 'System currency', true, id 
FROM public.profiles WHERE role = 'super_admin' LIMIT 1;

INSERT INTO public.system_settings (category, key, value, description, is_public, updated_by) 
SELECT 'system', 'date_format', '"DD/MM/YYYY"', 'Date display format', true, id 
FROM public.profiles WHERE role = 'super_admin' LIMIT 1;

INSERT INTO public.system_settings (category, key, value, description, is_public, updated_by) 
SELECT 'academic', 'current_year', '"2024-2025"', 'Current academic year', true, id 
FROM public.profiles WHERE role = 'super_admin' LIMIT 1;

-- Insert default report templates (only if super admin exists)
INSERT INTO public.report_templates (name, description, category, type, query_template, parameters, access_level, created_by) 
SELECT 'Student Attendance Report', 'Daily, weekly, and monthly attendance statistics', 'Attendance', 'Standard', 'SELECT * FROM attendance WHERE date BETWEEN $start_date AND $end_date', '["start_date", "end_date", "class_id"]', 'Staff', id 
FROM public.profiles WHERE role = 'super_admin' LIMIT 1;

INSERT INTO public.report_templates (name, description, category, type, query_template, parameters, access_level, created_by) 
SELECT 'Fee Collection Summary', 'Monthly fee collection status and trends', 'Finance', 'Financial', 'SELECT * FROM fees WHERE due_date BETWEEN $start_date AND $end_date', '["start_date", "end_date", "class_id"]', 'Finance', id 
FROM public.profiles WHERE role = 'super_admin' LIMIT 1;

INSERT INTO public.report_templates (name, description, category, type, query_template, parameters, access_level, created_by) 
SELECT 'Academic Performance Analysis', 'Student exam results and performance trends', 'Academics', 'Academic', 'SELECT * FROM omr_scans WHERE scanned_at BETWEEN $start_date AND $end_date', '["start_date", "end_date", "exam_id"]', 'Academic', id 
FROM public.profiles WHERE role = 'super_admin' LIMIT 1;

INSERT INTO public.report_templates (name, description, category, type, query_template, parameters, access_level, created_by) 
SELECT 'Library Usage Report', 'Book circulation and member activity', 'Library', 'Operational', 'SELECT * FROM library_transactions WHERE issue_date BETWEEN $start_date AND $end_date', '["start_date", "end_date"]', 'Staff', id 
FROM public.profiles WHERE role = 'super_admin' LIMIT 1;

INSERT INTO public.report_templates (name, description, category, type, query_template, parameters, access_level, created_by) 
SELECT 'Hostel Occupancy Report', 'Room occupancy rates and facility utilization', 'Hostel', 'Operational', 'SELECT * FROM hostel_allocations WHERE allocated_date BETWEEN $start_date AND $end_date', '["start_date", "end_date"]', 'Management', id 
FROM public.profiles WHERE role = 'super_admin' LIMIT 1;