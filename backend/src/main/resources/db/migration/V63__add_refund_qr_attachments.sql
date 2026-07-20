ALTER TABLE refund_messages
    ADD COLUMN IF NOT EXISTS image_url VARCHAR(1000),
    ADD COLUMN IF NOT EXISTS image_public_id VARCHAR(500);

ALTER TABLE refund_requests
    ADD COLUMN IF NOT EXISTS refund_qr_message_id UUID;

CREATE INDEX IF NOT EXISTS idx_refund_qr_message
    ON refund_requests (refund_qr_message_id);
