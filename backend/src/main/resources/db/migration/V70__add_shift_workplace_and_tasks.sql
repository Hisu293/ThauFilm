ALTER TABLE staff_shift_assignments
    ADD COLUMN IF NOT EXISTS workplace VARCHAR(255),
    ADD COLUMN IF NOT EXISTS tasks TEXT;
