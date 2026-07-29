CREATE TABLE audit_logs (
    id UUID PRIMARY KEY,
    occurred_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actor_id UUID,
    actor_email VARCHAR(255),
    actor_role VARCHAR(30),
    actor_type VARCHAR(30) NOT NULL,
    action VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    source VARCHAR(30) NOT NULL,
    target_type VARCHAR(50),
    target_id VARCHAR(100),
    description TEXT NOT NULL,
    old_values TEXT,
    new_values TEXT,
    changed_fields TEXT,
    reason TEXT,
    status VARCHAR(20) NOT NULL,
    failure_reason TEXT,
    ip_address VARCHAR(64),
    user_agent TEXT,
    request_id VARCHAR(100),
    correlation_id VARCHAR(100),
    session_id VARCHAR(100),
    provider_event_id VARCHAR(150),
    theater_id UUID,
    sensitive BOOLEAN NOT NULL DEFAULT FALSE,
    metadata TEXT
);

CREATE INDEX idx_audit_logs_occurred_at ON audit_logs (occurred_at DESC);
CREATE INDEX idx_audit_logs_actor_id ON audit_logs (actor_id);
CREATE INDEX idx_audit_logs_action ON audit_logs (action);
CREATE INDEX idx_audit_logs_category ON audit_logs (category);
CREATE INDEX idx_audit_logs_target ON audit_logs (target_type, target_id);
CREATE INDEX idx_audit_logs_status ON audit_logs (status);
CREATE INDEX idx_audit_logs_correlation_id ON audit_logs (correlation_id);
CREATE INDEX idx_audit_logs_theater_id ON audit_logs (theater_id);
CREATE INDEX idx_audit_logs_provider_event ON audit_logs (provider_event_id);
