ALTER TABLE showtime
    ADD COLUMN IF NOT EXISTS online_price NUMERIC(10,2);

UPDATE showtime
SET online_price = 79000
WHERE online = TRUE
  AND online_price IS NULL;
