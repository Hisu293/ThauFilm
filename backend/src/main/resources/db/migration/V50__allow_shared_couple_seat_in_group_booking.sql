ALTER TABLE group_booking_members
    DROP CONSTRAINT IF EXISTS uk_group_booking_seat;

DROP INDEX IF EXISTS uk_group_booking_seat;
