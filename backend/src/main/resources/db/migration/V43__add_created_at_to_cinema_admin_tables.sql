ALTER TABLE theaters
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE cinema_room
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE showtime
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_theaters_created_at ON theaters(created_at);
CREATE INDEX IF NOT EXISTS idx_cinema_room_created_at ON cinema_room(created_at);
CREATE INDEX IF NOT EXISTS idx_showtime_created_at ON showtime(created_at);
