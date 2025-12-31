-- Migration: Add recurrence fields to events table
-- This allows events to repeat on specific days without creating multiple records

-- Add recurrence fields
ALTER TABLE events
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS recurrence_days INTEGER[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS recurrence_end_date DATE DEFAULT NULL;

-- recurrence_days: Array of day numbers (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
-- Example: [1, 3, 5] = Monday, Wednesday, Friday
-- recurrence_end_date: NULL means repeat forever

-- Add index for faster recurring event queries
CREATE INDEX IF NOT EXISTS idx_events_recurring ON events (user_id, is_recurring) WHERE is_recurring = TRUE;

-- Comment explaining the fields
COMMENT ON COLUMN events.is_recurring IS 'Whether this event repeats on specific days';
COMMENT ON COLUMN events.recurrence_days IS 'Array of weekday numbers (0=Sun, 1=Mon, ..., 6=Sat) when event repeats';
COMMENT ON COLUMN events.recurrence_end_date IS 'Optional end date for recurrence (NULL = forever)';

