ALTER TABLE staff_employment_profiles
    ADD COLUMN IF NOT EXISTS shift_leader BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_employment_profile_shift_leader
    ON staff_employment_profiles (shift_leader, staff_id);

WITH ranked_codes AS (
    SELECT id, ROW_NUMBER() OVER (
        PARTITION BY work_date, shift_type
        ORDER BY created_at DESC
    ) AS row_number
    FROM attendance_access_codes
    WHERE active = TRUE
)
UPDATE attendance_access_codes
SET active = FALSE
WHERE id IN (SELECT id FROM ranked_codes WHERE row_number > 1);

CREATE UNIQUE INDEX IF NOT EXISTS uk_active_attendance_code_per_shift
    ON attendance_access_codes (work_date, shift_type)
    WHERE active = TRUE;
