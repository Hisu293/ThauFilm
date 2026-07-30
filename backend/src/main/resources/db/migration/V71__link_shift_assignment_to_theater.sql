ALTER TABLE staff_shift_assignments
    ADD COLUMN IF NOT EXISTS theater_id UUID;

CREATE INDEX IF NOT EXISTS idx_staff_shift_theater
    ON staff_shift_assignments (theater_id);
