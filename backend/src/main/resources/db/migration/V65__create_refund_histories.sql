CREATE TABLE refund_histories (
    id UUID PRIMARY KEY,
    booking_id UUID NOT NULL,
    payment_id UUID NOT NULL,
    refund_amount NUMERIC(12,2) NOT NULL,
    refund_reason TEXT NOT NULL,
    payos_refund_id VARCHAR(120),
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    response_json TEXT
);

CREATE INDEX idx_refund_history_booking ON refund_histories (booking_id);
CREATE INDEX idx_refund_history_payment ON refund_histories (payment_id);
CREATE INDEX idx_refund_history_status ON refund_histories (status);
