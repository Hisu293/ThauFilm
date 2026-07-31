ALTER TABLE refund_requests
    ADD COLUMN IF NOT EXISTS payout_confirmed_by UUID,
    ADD COLUMN IF NOT EXISTS payout_confirmed_at TIMESTAMP;

UPDATE refund_requests request
SET payout_confirmed_by = payment.paid_by_user_id,
    payout_confirmed_at = COALESCE(request.updated_at, request.created_at)
FROM payments payment
WHERE request.payment_id = payment.id
  AND request.refund_method = 'AUTOMATIC'
  AND request.bank_bin IS NOT NULL
  AND request.bank_account_number IS NOT NULL
  AND request.payout_confirmed_by IS NULL;

CREATE INDEX IF NOT EXISTS idx_refund_payout_confirmed_by
    ON refund_requests(payout_confirmed_by);
