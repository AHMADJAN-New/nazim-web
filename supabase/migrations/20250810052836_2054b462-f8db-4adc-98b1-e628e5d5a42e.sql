-- Re-run corrected migration (remove nonexistent 'accountant' role)

-- 1) password_reset_tokens: restrict INSERT to own user_id
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'password_reset_tokens' AND policyname = 'Users can create password reset tokens'
  ) THEN
    EXECUTE 'DROP POLICY "Users can create password reset tokens" ON public.password_reset_tokens;';
  END IF;
END $$;

CREATE POLICY "Users can create their own password reset tokens"
ON public.password_reset_tokens
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- 2) attendance_logs: restrict INSERT to admin/teacher/staff only
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'attendance_logs' AND policyname = 'System can insert attendance logs'
  ) THEN
    EXECUTE 'DROP POLICY "System can insert attendance logs" ON public.attendance_logs;';
  END IF;
END $$;

CREATE POLICY "Privileged roles can insert attendance logs"
ON public.attendance_logs
FOR INSERT
TO authenticated
WITH CHECK (
  get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role, 'teacher'::user_role, 'staff'::user_role])
);

-- 3) Finance tables: tighten SELECT to privileged roles (super_admin, admin, staff)
-- donations
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'donations' AND policyname = 'All authenticated users can view donations'
  ) THEN
    EXECUTE 'DROP POLICY "All authenticated users can view donations" ON public.donations;';
  END IF;
END $$;

CREATE POLICY "Privileged roles can view donations"
ON public.donations
FOR SELECT
TO authenticated
USING (
  get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role, 'staff'::user_role])
);

-- invoices
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'invoices' AND policyname = 'All authenticated users can view invoices'
  ) THEN
    EXECUTE 'DROP POLICY "All authenticated users can view invoices" ON public.invoices;';
  END IF;
END $$;

CREATE POLICY "Privileged roles can view invoices"
ON public.invoices
FOR SELECT
TO authenticated
USING (
  get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role, 'staff'::user_role])
);

-- fees
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'fees' AND policyname = 'All authenticated users can view fees'
  ) THEN
    EXECUTE 'DROP POLICY "All authenticated users can view fees" ON public.fees;';
  END IF;
END $$;

CREATE POLICY "Privileged roles can view fees"
ON public.fees
FOR SELECT
TO authenticated
USING (
  get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role, 'staff'::user_role])
);

-- 4) Add validation trigger to ensure password_reset_tokens.expires_at is in the future at insert time
CREATE OR REPLACE FUNCTION public.validate_password_reset_token()
RETURNS trigger AS $$
BEGIN
  IF NEW.expires_at <= now() THEN
    RAISE EXCEPTION 'expires_at must be in the future';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '';

DROP TRIGGER IF EXISTS trg_validate_password_reset_token ON public.password_reset_tokens;
CREATE TRIGGER trg_validate_password_reset_token
BEFORE INSERT ON public.password_reset_tokens
FOR EACH ROW EXECUTE FUNCTION public.validate_password_reset_token();