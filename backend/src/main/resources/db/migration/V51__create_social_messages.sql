CREATE TABLE IF NOT EXISTS social_messages (
    id UUID PRIMARY KEY,
    sender_id UUID NOT NULL,
    recipient_id UUID NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_social_message_sender_created
    ON social_messages(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_message_recipient_created
    ON social_messages(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_message_pair
    ON social_messages(sender_id, recipient_id, created_at);
