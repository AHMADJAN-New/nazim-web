-- Create notifications table for user notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    recipient_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    type VARCHAR(50) DEFAULT 'info', -- info, success, warning, error, etc.
    action_url TEXT, -- Optional URL to navigate to when notification is clicked
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP
    WITH
        TIME ZONE,
        created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT now(),
        updated_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT now(),
        deleted_at TIMESTAMP
    WITH
        TIME ZONE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON public.notifications (recipient_id);

CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications (is_read);

CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_read ON public.notifications (recipient_id, is_read);

CREATE INDEX IF NOT EXISTS idx_notifications_deleted_at ON public.notifications (deleted_at)
WHERE
    deleted_at IS NULL;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can read their own notifications
CREATE POLICY "Users can read their own notifications" ON public.notifications FOR
SELECT TO authenticated USING (
        recipient_id = auth.uid ()
        AND deleted_at IS NULL
    );

-- RLS Policy: Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR
UPDATE TO authenticated USING (
    recipient_id = auth.uid ()
    AND deleted_at IS NULL
)
WITH
    CHECK (
        recipient_id = auth.uid ()
        AND deleted_at IS NULL
    );

-- RLS Policy: System can insert notifications for any user
-- This allows admins/super admins to create notifications for users
CREATE POLICY "Admins can create notifications" ON public.notifications FOR
INSERT
    TO authenticated
WITH
    CHECK (
        -- Users can create notifications for themselves
        recipient_id = auth.uid ()
        OR
        -- Admins and super admins can create notifications for users in their organization
        EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE
                id = auth.uid ()
                AND role IN ('admin', 'super_admin')
                AND deleted_at IS NULL
        )
    );

-- RLS Policy: Service role has full access
CREATE POLICY "Service role full access to notifications" ON public.notifications FOR ALL TO service_role USING (true)
WITH
    CHECK (true);

-- Function to automatically set read_at when is_read is set to true
CREATE OR REPLACE FUNCTION set_notification_read_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_read = true AND OLD.is_read = false THEN
        NEW.read_at := now();
    ELSIF NEW.is_read = false THEN
        NEW.read_at := NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to set read_at timestamp
CREATE TRIGGER set_notification_read_at_trigger
    BEFORE UPDATE ON public.notifications
    FOR EACH ROW
    WHEN (OLD.is_read IS DISTINCT FROM NEW.is_read)
    EXECUTE FUNCTION set_notification_read_at();

-- Add comment to table
COMMENT ON
TABLE public.notifications IS 'User notifications for system alerts, announcements, and updates';

COMMENT ON COLUMN public.notifications.type IS 'Notification type: info, success, warning, error, announcement, etc.';

COMMENT ON COLUMN public.notifications.action_url IS 'Optional URL to navigate to when notification is clicked';

COMMENT ON COLUMN public.notifications.read_at IS 'Timestamp when notification was marked as read';