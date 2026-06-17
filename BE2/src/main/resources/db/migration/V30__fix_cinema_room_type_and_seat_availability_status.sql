-- Fix cinema_room.type
ALTER TABLE cinema_room
  ADD COLUMN IF NOT EXISTS type varchar(20);

UPDATE cinema_room
  SET type = 'STANDARD'
 WHERE type IS NULL;

ALTER TABLE cinema_room
  ALTER COLUMN type SET NOT NULL;

ALTER TABLE cinema_room
  ADD CONSTRAINT chk_cinema_room_type
    CHECK (type IN ('STANDARD','VIP','IMAX','FOUR_DX'));

-- Fix seat_availabilities.status
ALTER TABLE seat_availabilities
  ADD COLUMN IF NOT EXISTS status varchar(20);

UPDATE seat_availabilities
  SET status = 'AVAILABLE'
 WHERE status IS NULL;

ALTER TABLE seat_availabilities
  ALTER COLUMN status SET NOT NULL;

ALTER TABLE seat_availabilities
  ADD CONSTRAINT chk_seat_avail_status
    CHECK (status IN ('AVAILABLE','HOLDING','BOOKED','SOLD'));
