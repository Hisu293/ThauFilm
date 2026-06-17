-- Convert all INTEGER status columns to VARCHAR(20)
-- Map: 0 = INACTIVE, 1 = ACTIVE, 2 = MAINTENANCE

-- theaters.status
ALTER TABLE theaters
  ALTER COLUMN status TYPE VARCHAR(20)
  USING CASE status::int
         WHEN 0 THEN 'INACTIVE'
         WHEN 1 THEN 'ACTIVE'
         WHEN 2 THEN 'MAINTENANCE'
         ELSE 'ACTIVE'
       END;

-- cinema_room.status
ALTER TABLE cinema_room
  ALTER COLUMN status TYPE VARCHAR(20)
  USING CASE status::int
         WHEN 0 THEN 'INACTIVE'
         WHEN 1 THEN 'ACTIVE'
         WHEN 2 THEN 'MAINTENANCE'
         ELSE 'ACTIVE'
       END;

-- seat.status
ALTER TABLE seat
  ALTER COLUMN status TYPE VARCHAR(20)
  USING CASE status::int
         WHEN 0 THEN 'INACTIVE'
         WHEN 1 THEN 'ACTIVE'
         WHEN 2 THEN 'MAINTENANCE'
         ELSE 'ACTIVE'
       END;

-- showtime.status (mapping riêng theo ShowtimeStatus)
-- Old: 0=CANCELLED, 1=SCHEDULED, 2=OPEN, 3=RUNNING, 4=COMPLETED
ALTER TABLE showtime
  ALTER COLUMN status TYPE VARCHAR(20)
  USING CASE status::int
         WHEN 0 THEN 'CANCELLED'
         WHEN 1 THEN 'SCHEDULED'
         WHEN 2 THEN 'OPEN'
         WHEN 3 THEN 'RUNNING'
         WHEN 4 THEN 'COMPLETED'
         ELSE 'SCHEDULED'
       END;

-- Ensure NOT NULL constraints
ALTER TABLE theaters     ALTER COLUMN status SET NOT NULL;
ALTER TABLE cinema_room  ALTER COLUMN status SET NOT NULL;
ALTER TABLE seat         ALTER COLUMN status SET NOT NULL;
ALTER TABLE showtime     ALTER COLUMN status SET NOT NULL;

-- Update check constraints
ALTER TABLE theaters     DROP CONSTRAINT IF EXISTS chk_theaters_status;
ALTER TABLE theaters     ADD  CONSTRAINT chk_theaters_status
  CHECK (status IN ('ACTIVE','INACTIVE','MAINTENANCE'));

ALTER TABLE cinema_room  DROP CONSTRAINT IF EXISTS chk_cinema_room_status;
ALTER TABLE cinema_room  ADD  CONSTRAINT chk_cinema_room_status
  CHECK (status IN ('ACTIVE','INACTIVE','MAINTENANCE'));

ALTER TABLE seat         DROP CONSTRAINT IF EXISTS chk_seat_status;
ALTER TABLE seat         ADD  CONSTRAINT chk_seat_status
  CHECK (status IN ('ACTIVE','INACTIVE','MAINTENANCE'));

ALTER TABLE showtime     DROP CONSTRAINT IF EXISTS chk_showtime_status;
ALTER TABLE showtime     ADD  CONSTRAINT chk_showtime_status
  CHECK (status IN ('SCHEDULED','OPEN','RUNNING','COMPLETED','CANCELLED'));
