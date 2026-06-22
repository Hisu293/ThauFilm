CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    content TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_review_user_movie UNIQUE (user_id, movie_id)
);

CREATE INDEX IF NOT EXISTS idx_review_movie ON reviews(movie_id);
CREATE INDEX IF NOT EXISTS idx_review_user ON reviews(user_id);

CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_comment_movie ON comments(movie_id);
CREATE INDEX IF NOT EXISTS idx_comment_user ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_parent ON comments(parent_id);

CREATE TABLE IF NOT EXISTS follows (
    id UUID PRIMARY KEY,
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_follow_pair UNIQUE (follower_id, following_id),
    CONSTRAINT chk_follow_not_self CHECK (follower_id <> following_id)
);

CREATE INDEX IF NOT EXISTS idx_follow_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follow_following ON follows(following_id);

CREATE TABLE IF NOT EXISTS favorite_lists (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_favlist_user ON favorite_lists(user_id);

CREATE TABLE IF NOT EXISTS favorite_list_items (
    id UUID PRIMARY KEY,
    favorite_list_id UUID NOT NULL REFERENCES favorite_lists(id) ON DELETE CASCADE,
    movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    added_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_favorite_list_movie UNIQUE (favorite_list_id, movie_id)
);

CREATE INDEX IF NOT EXISTS idx_favlistitem_list ON favorite_list_items(favorite_list_id);
CREATE INDEX IF NOT EXISTS idx_favlistitem_movie ON favorite_list_items(movie_id);
