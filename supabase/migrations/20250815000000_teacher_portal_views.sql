-- Create class schedules table to store timetable entries
CREATE TABLE IF NOT EXISTS public.class_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day_of_week TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  subject TEXT,
  room TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.class_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their schedules" ON public.class_schedules
  FOR SELECT USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can manage their schedules" ON public.class_schedules
  FOR ALL USING (teacher_id = auth.uid());

-- View to expose teacher daily schedule
CREATE OR REPLACE VIEW public.teacher_daily_schedule AS
SELECT
  cs.teacher_id,
  cs.class_id,
  c.name AS class_name,
  cs.start_time,
  cs.end_time,
  cs.day_of_week,
  cs.subject,
  cs.room
FROM public.class_schedules cs
JOIN public.classes c ON c.id = cs.class_id;

-- View to expose per-class attendance percentage for current month
CREATE OR REPLACE VIEW public.class_attendance_summary AS
SELECT
  c.class_teacher_id AS teacher_id,
  c.id AS class_id,
  c.name AS class_name,
  COALESCE(AVG(a.percentage), 0) AS attendance_percentage
FROM public.classes c
LEFT JOIN public.attendance_summary a ON a.class_id = c.id
  AND a.year = EXTRACT(YEAR FROM CURRENT_DATE)
  AND a.month = EXTRACT(MONTH FROM CURRENT_DATE)
GROUP BY c.class_teacher_id, c.id, c.name;
