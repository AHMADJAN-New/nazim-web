-- Fix database security issues - Part 1: Fix function search paths

-- Fix all function search paths for security
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
 RETURNS user_role
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  RETURN (SELECT role FROM public.profiles WHERE id = user_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.process_attendance_log()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
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
                (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1),
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
$function$;