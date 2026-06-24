-- Add applicable_seat_types to discounts table
-- NULL means the discount applies to all seat types
-- Non-null value is a comma-separated list e.g. 'STANDARD,VIP,COUPLE'
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS applicable_seat_types VARCHAR(100) DEFAULT NULL;
