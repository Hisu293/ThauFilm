ALTER TABLE refund_requests
    ADD COLUMN IF NOT EXISTS refund_method VARCHAR(20) NOT NULL DEFAULT 'MANUAL',
    ADD COLUMN IF NOT EXISTS bank_bin VARCHAR(10),
    ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(20);

ALTER TABLE refund_requests
    ADD CONSTRAINT chk_refund_method
    CHECK (refund_method IN ('MANUAL', 'AUTOMATIC'));
