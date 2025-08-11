-- Tighten SELECT RLS on sensitive tables

-- HIFZ PROGRESS
DROP POLICY IF EXISTS "All authenticated users can view hifz progress" ON public.hifz_progress;
CREATE POLICY "Role-based hifz progress access"
ON public.hifz_progress
FOR SELECT
USING (
  public.get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::user_role,'admin'::user_role,'teacher'::user_role])
  OR EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = hifz_progress.student_id AND s.user_id = auth.uid()
  )
);

-- OMR SCANS
DROP POLICY IF EXISTS "All authenticated users can view omr scans" ON public.omr_scans;
CREATE POLICY "Role-based omr scans access"
ON public.omr_scans
FOR SELECT
USING (
  public.get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::user_role,'admin'::user_role,'teacher'::user_role])
  OR EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = omr_scans.student_id AND s.user_id = auth.uid()
  )
);

-- ID CARDS
DROP POLICY IF EXISTS "All authenticated users can view id cards" ON public.id_cards;
CREATE POLICY "Role-based id cards access"
ON public.id_cards
FOR SELECT
USING (
  public.get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::user_role,'admin'::user_role,'staff'::user_role])
  OR EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = id_cards.student_id AND s.user_id = auth.uid()
  )
);

-- HOSTEL ALLOCATIONS
DROP POLICY IF EXISTS "All authenticated users can view hostel allocations" ON public.hostel_allocations;
CREATE POLICY "Role-based hostel allocations access"
ON public.hostel_allocations
FOR SELECT
USING (
  public.get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::user_role,'admin'::user_role,'staff'::user_role])
  OR EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = hostel_allocations.student_id AND s.user_id = auth.uid()
  )
);

-- ATTENDANCE LOGS
DROP POLICY IF EXISTS "All authenticated users can view attendance logs" ON public.attendance_logs;
CREATE POLICY "Role-based attendance logs access"
ON public.attendance_logs
FOR SELECT
USING (
  public.get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::user_role,'admin'::user_role,'teacher'::user_role,'staff'::user_role])
  OR EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.student_id = attendance_logs.student_id AND s.user_id = auth.uid()
  )
);
