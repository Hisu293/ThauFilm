ALTER TABLE refund_requests
    ADD COLUMN IF NOT EXISTS automatic_attempt_count INTEGER NOT NULL DEFAULT 0;
