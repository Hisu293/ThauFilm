CREATE TABLE IF NOT EXISTS email_otps (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    purpose VARCHAR(30) NOT NULL,
    code_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    last_sent_at TIMESTAMP NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL,
    CONSTRAINT email_otps_purpose_check
        CHECK (purpose IN ('VERIFY_REGISTRATION', 'RESET_PASSWORD')),
    CONSTRAINT uk_email_otps_email_purpose UNIQUE (email, purpose)
);

CREATE INDEX IF NOT EXISTS idx_email_otps_expiry ON email_otps(expires_at);
