-- Workforce references are UUID values with indexes only. No database foreign keys are used.
ALTER TABLE staff_attendance DROP CONSTRAINT IF EXISTS staff_attendance_staff_id_fkey;
ALTER TABLE staff_attendance DROP CONSTRAINT IF EXISTS staff_attendance_shift_assignment_id_fkey;
ALTER TABLE staff_shift_assignments DROP CONSTRAINT IF EXISTS staff_shift_assignments_staff_id_fkey;
ALTER TABLE staff_employment_profiles DROP CONSTRAINT IF EXISTS staff_employment_profiles_staff_id_fkey;
ALTER TABLE payroll_records DROP CONSTRAINT IF EXISTS payroll_records_staff_id_fkey;

CREATE INDEX IF NOT EXISTS idx_staff_attendance_staff_uuid ON staff_attendance (staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_shift_uuid ON staff_attendance (shift_assignment_id);
CREATE INDEX IF NOT EXISTS idx_staff_shift_staff_uuid ON staff_shift_assignments (staff_id);
CREATE INDEX IF NOT EXISTS idx_employment_profile_staff_uuid ON staff_employment_profiles (staff_id);
CREATE INDEX IF NOT EXISTS idx_payroll_staff_uuid ON payroll_records (staff_id);

ALTER TABLE staff_shift_assignments
    ADD COLUMN IF NOT EXISTS assignment_source VARCHAR(20) NOT NULL DEFAULT 'ADMIN',
    ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) NOT NULL DEFAULT 'APPROVED';

ALTER TABLE staff_attendance
    ADD COLUMN IF NOT EXISTS late_minutes BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS early_leave_minutes BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS check_in_method VARCHAR(20),
    ADD COLUMN IF NOT EXISTS check_out_method VARCHAR(20);

CREATE INDEX IF NOT EXISTS idx_staff_shift_status_date
    ON staff_shift_assignments (approval_status, work_date, shift_type);

CREATE TABLE IF NOT EXISTS attendance_access_codes (
    id UUID PRIMARY KEY,
    work_date DATE NOT NULL,
    shift_type VARCHAR(20) NOT NULL,
    qr_token UUID NOT NULL UNIQUE,
    pin_code VARCHAR(6) NOT NULL,
    valid_from TIMESTAMP NOT NULL,
    valid_until TIMESTAMP NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_attendance_code_qr_uuid ON attendance_access_codes (qr_token);
CREATE INDEX IF NOT EXISTS idx_attendance_code_pin_date ON attendance_access_codes (pin_code, work_date, active);
CREATE INDEX IF NOT EXISTS idx_attendance_code_creator_uuid ON attendance_access_codes (created_by);

CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    unit VARCHAR(30) NOT NULL,
    current_stock NUMERIC(12,2) NOT NULL DEFAULT 0,
    reorder_level NUMERIC(12,2) NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_inventory_item_active ON inventory_items (active, name);

CREATE TABLE IF NOT EXISTS combo_inventory_recipes (
    id UUID PRIMARY KEY,
    combo_id UUID NOT NULL,
    inventory_item_id UUID NOT NULL,
    quantity_per_combo NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_combo_inventory_recipe UNIQUE (combo_id, inventory_item_id)
);
CREATE INDEX IF NOT EXISTS idx_recipe_combo_uuid ON combo_inventory_recipes (combo_id);
CREATE INDEX IF NOT EXISTS idx_recipe_inventory_uuid ON combo_inventory_recipes (inventory_item_id);

CREATE TABLE IF NOT EXISTS booking_combo_items (
    id UUID PRIMARY KEY,
    booking_id UUID NOT NULL,
    combo_id UUID NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_booking_combo_item UNIQUE (booking_id, combo_id)
);
CREATE INDEX IF NOT EXISTS idx_booking_combo_booking_uuid ON booking_combo_items (booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_combo_combo_uuid ON booking_combo_items (combo_id);
