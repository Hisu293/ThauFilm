ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS provider VARCHAR(30),
  ADD COLUMN IF NOT EXISTS provider_checkout_id VARCHAR(120),
  ADD COLUMN IF NOT EXISTS provider_payment_id VARCHAR(120),
  ADD COLUMN IF NOT EXISTS checkout_url TEXT,
  ADD COLUMN IF NOT EXISTS qr_code TEXT,
  ADD COLUMN IF NOT EXISTS provider_refund_id VARCHAR(120),
  ADD COLUMN IF NOT EXISTS refund_reason TEXT,
  ADD COLUMN IF NOT EXISTS refund_failed_reason TEXT,
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_payment_provider_checkout ON payments(provider_checkout_id);
CREATE INDEX IF NOT EXISTS idx_payment_provider_payment ON payments(provider_payment_id);
