CREATE TABLE IF NOT EXISTS online_viewing_sessions (
    id UUID PRIMARY KEY,
    booking_id UUID NOT NULL UNIQUE,
    user_id UUID NOT NULL,
    movie_id UUID NOT NULL,
    device_id VARCHAR(100) NOT NULL,
    started_at TIMESTAMP NOT NULL,
    last_heartbeat_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_online_session_user_movie
    ON online_viewing_sessions(user_id, movie_id);
CREATE INDEX IF NOT EXISTS idx_online_session_heartbeat
    ON online_viewing_sessions(last_heartbeat_at);
