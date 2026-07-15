CREATE TABLE IF NOT EXISTS refund_requests (
    id UUID PRIMARY KEY,
    booking_id UUID NOT NULL,
    payment_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    staff_id UUID,
    reviewed_by UUID,
    ticket_code VARCHAR(20) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    reason TEXT NOT NULL,
    rejection_reason TEXT,
    status VARCHAR(30) NOT NULL,
    requires_admin BOOLEAN NOT NULL DEFAULT FALSE,
    ticket_checked_in BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_refund_booking ON refund_requests (booking_id);
CREATE INDEX IF NOT EXISTS idx_refund_customer ON refund_requests (customer_id, created_at);
CREATE INDEX IF NOT EXISTS idx_refund_status ON refund_requests (status, created_at);
CREATE INDEX IF NOT EXISTS idx_refund_staff ON refund_requests (staff_id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_refund_active_booking ON refund_requests (booking_id)
    WHERE status IN ('REQUESTED', 'PENDING_APPROVAL', 'REFUND_PENDING');

CREATE TABLE IF NOT EXISTS refund_messages (
    id UUID PRIMARY KEY,
    refund_request_id UUID NOT NULL,
    sender_id UUID NOT NULL,
    sender_role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_refund_message_request ON refund_messages (refund_request_id, created_at);
CREATE INDEX IF NOT EXISTS idx_refund_message_sender ON refund_messages (sender_id);
