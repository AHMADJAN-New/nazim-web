-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule auth health monitoring to run every hour
SELECT cron.schedule(
  'auth-health-monitor',
  '0 * * * *', -- Every hour
  $$
  SELECT
    net.http_post(
        url:='https://wkrzoelctjwpiwdswmdj.supabase.co/functions/v1/auth-health-monitor',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrcnpvZWxjdGp3cGl3ZHN3bWRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3Mzk0MTEsImV4cCI6MjA2ODMxNTQxMX0.IKuOqZlXNCdCW5aacYzSB71hqIeB6KB9kCuCbERMzb0"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);

-- Create a view for easy monitoring dashboard access
CREATE OR REPLACE VIEW public.auth_health_summary AS
SELECT 
  date_trunc('hour', created_at) as hour,
  COUNT(*) as total_events,
  COUNT(*) FILTER (WHERE error_message IS NOT NULL) as error_events,
  COUNT(*) FILTER (WHERE event_type LIKE '%login_failed%') as failed_logins,
  COUNT(*) FILTER (WHERE event_type LIKE '%registration_error%') as registration_errors,
  COUNT(*) FILTER (WHERE resolved = true) as resolved_events
FROM public.auth_monitoring 
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY date_trunc('hour', created_at)
ORDER BY hour DESC;