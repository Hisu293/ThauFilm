CREATE TABLE IF NOT EXISTS showtime (
    id UUID PRIMARY KEY,
    movie_id UUID NOT NULL,
    cinema_room_id UUID NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    status INT NOT NULL DEFAULT 1,
    CONSTRAINT fk_showtime_movie FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
    CONSTRAINT fk_showtime_cinema_room FOREIGN KEY (cinema_room_id) REFERENCES cinema_room(id) ON DELETE CASCADE,
    CONSTRAINT chk_showtime_time_range CHECK (end_time > start_time)
);
