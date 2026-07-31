ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS paid_by_user_id UUID;

UPDATE payments payment
SET paid_by_user_id = booking.user_id
FROM bookings booking
WHERE payment.booking_id = booking.id
  AND payment.paid_by_user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_payment_paid_by_user
    ON payments(paid_by_user_id);
