ALTER TABLE tickets ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMP;

UPDATE tickets
SET checked_in_at = created_at
WHERE checked_in = TRUE AND checked_in_at IS NULL;
