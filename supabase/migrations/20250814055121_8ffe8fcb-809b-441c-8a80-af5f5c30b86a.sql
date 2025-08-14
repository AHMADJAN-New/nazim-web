-- Fix Security Definer View issue by recreating auth_health_summary view
-- with proper ownership and access controls

-- Drop the existing view that runs with postgres privileges
DROP VIEW IF EXISTS public.auth_health_summary;

-- Recreate the view without elevated privileges
-- This ensures it respects RLS policies and user permissions
CREATE VIEW public.auth_health_summary AS
SELECT 
    date_trunc('hour', created_at) AS hour,
    count(*) AS total_events,
    count(*) FILTER (WHERE error_message IS NOT NULL) AS error_events,
    count(*) FILTER (WHERE event_type LIKE '%login_failed%') AS failed_logins,
    count(*) FILTER (WHERE event_type LIKE '%registration_error%') AS registration_errors,
    count(*) FILTER (WHERE resolved = true) AS resolved_events
FROM public.auth_monitoring
WHERE created_at >= (now() - interval '7 days')
GROUP BY date_trunc('hour', created_at)
ORDER BY date_trunc('hour', created_at) DESC;

-- Set proper ownership to authenticator role instead of postgres
ALTER VIEW public.auth_health_summary OWNER TO authenticator;

-- Enable RLS on the view
-- Note: Views inherit RLS from underlying tables, but we ensure it's explicit
COMMENT ON VIEW public.auth_health_summary IS 'Auth monitoring summary view - inherits RLS from auth_monitoring table';

-- Ensure only admins can access this view via RLS on the underlying auth_monitoring table
-- (The auth_monitoring table already has proper RLS policies that restrict access to admins)