-- Update booking status enum values
-- Add HOLD and EXPIRED status
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS chk_booking_status;

ALTER TABLE bookings ADD CONSTRAINT chk_booking_status 
    CHECK (status IN ('HOLD', 'CONFIRMED', 'EXPIRED', 'CANCELLED'));

-- Update existing PENDING bookings to EXPIRED if hold_expires_at has passed
UPDATE bookings 
SET status = 'EXPIRED' 
WHERE status = 'PENDING' AND hold_expires_at < NOW();

-- Update remaining PENDING bookings to HOLD
UPDATE bookings 
SET status = 'HOLD' 
WHERE status = 'PENDING';
