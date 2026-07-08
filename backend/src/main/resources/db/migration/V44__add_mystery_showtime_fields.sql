ALTER TABLE showtime
    ADD COLUMN IF NOT EXISTS mystery BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS mystery_unlock_at TIMESTAMP NULL;

UPDATE showtime
SET mystery_unlock_at = start_time
WHERE mystery = TRUE
  AND mystery_unlock_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_showtime_mystery ON showtime(mystery);
