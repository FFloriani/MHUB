-- Remove unique constraint to allow multiple notifications for the same recurring event (on different days)
ALTER TABLE public.notification_logs
DROP CONSTRAINT IF EXISTS notification_logs_event_id_user_id_key;

-- Optional: Add index on sent_at to speed up recent log checks
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at ON notification_logs(sent_at);
