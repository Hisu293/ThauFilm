CREATE TABLE IF NOT EXISTS showtime (
    id UUID PRIMARY KEY,
    movie_id UUID NOT NULL,
    cinema_room_id UUID NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    status INT NOT NULL DEFAULT 1,
    CONSTRAINT chk_showtime_time_range CHECK (end_time > start_time)
);
