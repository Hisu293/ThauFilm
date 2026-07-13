CREATE TABLE IF NOT EXISTS online_movie_views (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    movie_id UUID NOT NULL,
    showtime_id UUID,
    booking_id UUID,
    viewed_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_online_view_user ON online_movie_views(user_id);
CREATE INDEX IF NOT EXISTS idx_online_view_movie ON online_movie_views(movie_id);
CREATE INDEX IF NOT EXISTS idx_online_view_showtime ON online_movie_views(showtime_id);
CREATE INDEX IF NOT EXISTS idx_online_view_booking ON online_movie_views(booking_id);
CREATE INDEX IF NOT EXISTS idx_online_view_viewed_at ON online_movie_views(viewed_at);
