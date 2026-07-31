CREATE TABLE user_notifications (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    notification_type VARCHAR(80) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    link VARCHAR(500),
    read_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_notification_user_time
    ON user_notifications(user_id, created_at DESC);

CREATE INDEX idx_user_notification_unread
    ON user_notifications(user_id, read_at);
