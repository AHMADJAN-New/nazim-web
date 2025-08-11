-- Create application logs table for monitoring and debugging
CREATE TABLE IF NOT EXISTS public.application_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    level TEXT NOT NULL CHECK (level IN ('error', 'warn', 'info', 'debug')),
    message TEXT NOT NULL,
    context JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_agent TEXT,
    url TEXT,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_application_logs_level ON public.application_logs(level);
CREATE INDEX IF NOT EXISTS idx_application_logs_timestamp ON public.application_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_application_logs_user_id ON public.application_logs(user_id);

-- RLS policies
ALTER TABLE public.application_logs ENABLE ROW LEVEL SECURITY;

-- Only allow authenticated users to insert logs
CREATE POLICY "Users can insert their own logs" ON public.application_logs
    FOR INSERT
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Only super admins can read logs
CREATE POLICY "Super admins can read all logs" ON public.application_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_id = auth.uid() AND role = 'super_admin'
        )
    );

-- Automatically set user_id from auth context
CREATE OR REPLACE FUNCTION public.set_log_user_id()
RETURNS TRIGGER AS $$
BEGIN
    NEW.user_id = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER set_application_logs_user_id
    BEFORE INSERT ON public.application_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.set_log_user_id();

-- Cleanup old logs (keep only last 30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM public.application_logs
    WHERE timestamp < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-logs', '0 2 * * *', 'SELECT public.cleanup_old_logs();');