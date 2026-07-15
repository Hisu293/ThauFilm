CREATE TABLE IF NOT EXISTS staff_attendance (
    id UUID PRIMARY KEY,
    staff_id UUID NOT NULL REFERENCES users(id),
    work_date DATE NOT NULL,
    check_in_at TIMESTAMP NOT NULL,
    check_out_at TIMESTAMP NULL,
    note VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_staff_attendance_day UNIQUE (staff_id, work_date),
    CONSTRAINT chk_staff_attendance_time CHECK (check_out_at IS NULL OR check_out_at >= check_in_at)
);

CREATE INDEX IF NOT EXISTS idx_staff_attendance_staff_date
    ON staff_attendance (staff_id, work_date DESC);

CREATE INDEX IF NOT EXISTS idx_staff_attendance_work_date
    ON staff_attendance (work_date DESC);
