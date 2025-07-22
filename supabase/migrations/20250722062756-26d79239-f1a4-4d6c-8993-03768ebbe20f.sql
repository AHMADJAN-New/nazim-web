
-- Create password reset tokens table
CREATE TABLE public.password_reset_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Create policy for password reset tokens
CREATE POLICY "Users can create password reset tokens" 
  ON public.password_reset_tokens 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Users can view their own password reset tokens" 
  ON public.password_reset_tokens 
  FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own password reset tokens" 
  ON public.password_reset_tokens 
  FOR UPDATE 
  USING (user_id = auth.uid());

-- Create function to clean up expired tokens
CREATE OR REPLACE FUNCTION public.cleanup_expired_reset_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.password_reset_tokens 
  WHERE expires_at < now() OR used = true;
END;
$$;

-- Add audit logging for password events
CREATE TABLE public.password_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'password_reset_requested', 'password_reset_completed', 'password_changed'
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security for audit logs
ALTER TABLE public.password_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view password audit logs" 
  ON public.password_audit_logs 
  FOR SELECT 
  USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]));

CREATE POLICY "System can insert password audit logs" 
  ON public.password_audit_logs 
  FOR INSERT 
  WITH CHECK (true);
