CREATE TABLE IF NOT EXISTS staff_employment_profiles (
    staff_id UUID PRIMARY KEY REFERENCES users(id),
    employment_type VARCHAR(20) NOT NULL DEFAULT 'PART_TIME',
    hourly_rate NUMERIC(12,2) NOT NULL DEFAULT 25000,
    monthly_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
    overtime_hourly_rate NUMERIC(12,2) NOT NULL DEFAULT 0,
    default_allowance NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_employment_type CHECK (employment_type IN ('PART_TIME', 'FULL_TIME'))
);

INSERT INTO staff_employment_profiles (staff_id, employment_type, hourly_rate)
SELECT id, 'PART_TIME', 25000 FROM users WHERE role = 'STAFF'
ON CONFLICT (staff_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS staff_shift_assignments (
    id UUID PRIMARY KEY,
    staff_id UUID NOT NULL REFERENCES users(id),
    work_date DATE NOT NULL,
    shift_type VARCHAR(20) NOT NULL,
    scheduled_start TIMESTAMP NOT NULL,
    scheduled_end TIMESTAMP NOT NULL,
    note VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_staff_shift_day UNIQUE (staff_id, work_date),
    CONSTRAINT chk_shift_type CHECK (shift_type IN ('MORNING', 'AFTERNOON', 'EVENING', 'LATE')),
    CONSTRAINT chk_shift_time CHECK (scheduled_end > scheduled_start)
);

CREATE INDEX IF NOT EXISTS idx_staff_shift_date ON staff_shift_assignments (work_date, shift_type);
CREATE INDEX IF NOT EXISTS idx_staff_shift_staff ON staff_shift_assignments (staff_id, work_date DESC);

ALTER TABLE staff_attendance
    ADD COLUMN IF NOT EXISTS shift_assignment_id UUID REFERENCES staff_shift_assignments(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_staff_attendance_shift ON staff_attendance (shift_assignment_id);

CREATE TABLE IF NOT EXISTS payroll_records (
    id UUID PRIMARY KEY,
    staff_id UUID NOT NULL REFERENCES users(id),
    payroll_month DATE NOT NULL,
    employment_type VARCHAR(20) NOT NULL,
    regular_minutes BIGINT NOT NULL DEFAULT 0,
    overtime_minutes BIGINT NOT NULL DEFAULT 0,
    base_salary NUMERIC(14,2) NOT NULL DEFAULT 0,
    overtime_pay NUMERIC(14,2) NOT NULL DEFAULT 0,
    allowance NUMERIC(14,2) NOT NULL DEFAULT 0,
    bonus NUMERIC(14,2) NOT NULL DEFAULT 0,
    deduction NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_salary NUMERIC(14,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    note VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_payroll_staff_month UNIQUE (staff_id, payroll_month),
    CONSTRAINT chk_payroll_employment_type CHECK (employment_type IN ('PART_TIME', 'FULL_TIME')),
    CONSTRAINT chk_payroll_status CHECK (status IN ('DRAFT', 'APPROVED', 'PAID'))
);

CREATE INDEX IF NOT EXISTS idx_payroll_month ON payroll_records (payroll_month DESC, status);
