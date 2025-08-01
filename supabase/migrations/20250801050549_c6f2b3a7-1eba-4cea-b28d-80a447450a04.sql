-- Create attendance devices table
CREATE TABLE public.attendance_devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_name TEXT NOT NULL,
  device_type TEXT NOT NULL DEFAULT 'zkt', -- zkt, biometric, qr, rfid
  ip_address INET,
  port INTEGER,
  location TEXT,
  branch_id UUID NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_sync TIMESTAMP WITH TIME ZONE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create attendance logs table for device data
CREATE TABLE public.attendance_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id UUID NOT NULL,
  student_id TEXT NOT NULL, -- Can be student ID, card number, or biometric ID
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  log_type TEXT NOT NULL DEFAULT 'check_in', -- check_in, check_out
  verification_method TEXT NOT NULL, -- fingerprint, face, card, qr
  device_user_id TEXT, -- ID used in the device
  raw_data JSONB DEFAULT '{}',
  processed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create exam results table
CREATE TABLE public.exam_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID NOT NULL,
  student_id UUID NOT NULL,
  marks_obtained INTEGER NOT NULL,
  grade TEXT,
  percentage NUMERIC(5,2),
  remarks TEXT,
  entered_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(exam_id, student_id)
);

-- Create attendance summary table for quick access
CREATE TABLE public.attendance_summary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  class_id UUID NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  total_days INTEGER NOT NULL DEFAULT 0,
  present_days INTEGER NOT NULL DEFAULT 0,
  absent_days INTEGER NOT NULL DEFAULT 0,
  late_days INTEGER NOT NULL DEFAULT 0,
  percentage NUMERIC(5,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, class_id, month, year)
);

-- Enable Row Level Security
ALTER TABLE public.attendance_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_summary ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for attendance_devices
CREATE POLICY "Admins and staff can manage attendance devices"
ON public.attendance_devices
FOR ALL
USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role, 'staff'::user_role]));

CREATE POLICY "All authenticated users can view attendance devices"
ON public.attendance_devices
FOR SELECT
USING (true);

-- Create RLS policies for attendance_logs
CREATE POLICY "System can insert attendance logs"
ON public.attendance_logs
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins and staff can manage attendance logs"
ON public.attendance_logs
FOR ALL
USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role, 'staff'::user_role]));

CREATE POLICY "All authenticated users can view attendance logs"
ON public.attendance_logs
FOR SELECT
USING (true);

-- Create RLS policies for exam_results
CREATE POLICY "Teachers and admins can manage exam results"
ON public.exam_results
FOR ALL
USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role, 'teacher'::user_role]));

CREATE POLICY "All authenticated users can view exam results"
ON public.exam_results
FOR SELECT
USING (true);

-- Create RLS policies for attendance_summary
CREATE POLICY "Admins and staff can manage attendance summary"
ON public.attendance_summary
FOR ALL
USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role, 'staff'::user_role]));

CREATE POLICY "All authenticated users can view attendance summary"
ON public.attendance_summary
FOR SELECT
USING (true);

-- Create function to process attendance logs and mark attendance
CREATE OR REPLACE FUNCTION public.process_attendance_log()
RETURNS TRIGGER AS $$
DECLARE
    student_record RECORD;
    attendance_record RECORD;
BEGIN
    -- Find student by student_id or device_user_id
    SELECT s.id, s.class_id INTO student_record
    FROM public.students s
    JOIN public.profiles p ON s.user_id = p.id
    WHERE s.student_id = NEW.student_id OR s.student_id = NEW.device_user_id;

    IF student_record.id IS NOT NULL THEN
        -- Check if attendance already exists for this date
        SELECT * INTO attendance_record
        FROM public.attendance
        WHERE student_id = student_record.id 
        AND class_id = student_record.class_id
        AND date = NEW.timestamp::date;

        IF attendance_record.id IS NULL THEN
            -- Create new attendance record
            INSERT INTO public.attendance (
                student_id,
                class_id,
                date,
                status,
                marked_by,
                remarks
            ) VALUES (
                student_record.id,
                student_record.class_id,
                NEW.timestamp::date,
                'present'::attendance_status,
                (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1), -- System admin
                'Auto-marked from device: ' || (SELECT device_name FROM public.attendance_devices WHERE id = NEW.device_id)
            );
        ELSE
            -- Update existing record if it was absent
            UPDATE public.attendance
            SET status = 'present'::attendance_status,
                remarks = COALESCE(remarks, '') || ' | Auto-updated from device'
            WHERE id = attendance_record.id AND status = 'absent'::attendance_status;
        END IF;

        -- Mark log as processed
        UPDATE public.attendance_logs
        SET processed = true
        WHERE id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically process attendance logs
CREATE TRIGGER process_attendance_log_trigger
    AFTER INSERT ON public.attendance_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.process_attendance_log();

-- Create updated_at triggers
CREATE TRIGGER update_attendance_devices_updated_at
    BEFORE UPDATE ON public.attendance_devices
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_exam_results_updated_at
    BEFORE UPDATE ON public.exam_results
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_attendance_summary_updated_at
    BEFORE UPDATE ON public.attendance_summary
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_attendance_logs_device_id ON public.attendance_logs(device_id);
CREATE INDEX idx_attendance_logs_student_id ON public.attendance_logs(student_id);
CREATE INDEX idx_attendance_logs_timestamp ON public.attendance_logs(timestamp);
CREATE INDEX idx_exam_results_exam_student ON public.exam_results(exam_id, student_id);
CREATE INDEX idx_attendance_summary_student_date ON public.attendance_summary(student_id, year, month);