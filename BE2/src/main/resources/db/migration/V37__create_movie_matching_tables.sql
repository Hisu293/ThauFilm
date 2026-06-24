CREATE TABLE movie_matching_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    bio VARCHAR(500),
    favorite_genres VARCHAR(500) NOT NULL DEFAULT '',
    preferred_theater VARCHAR(255),
    available_times VARCHAR(500),
    active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE movie_matching_actions (
    id UUID PRIMARY KEY,
    actor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    decision VARCHAR(10) NOT NULL CHECK (decision IN ('LIKE', 'PASS')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_movie_matching_action UNIQUE (actor_id, target_id),
    CONSTRAINT chk_movie_matching_action_not_self CHECK (actor_id <> target_id)
);

CREATE INDEX idx_movie_matching_action_actor ON movie_matching_actions(actor_id);
CREATE INDEX idx_movie_matching_action_target ON movie_matching_actions(target_id);

CREATE TABLE movie_matches (
    id UUID PRIMARY KEY,
    user_one_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_two_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_movie_match_pair UNIQUE (user_one_id, user_two_id),
    CONSTRAINT chk_movie_match_order CHECK (user_one_id < user_two_id)
);

CREATE INDEX idx_movie_match_user_one ON movie_matches(user_one_id);
CREATE INDEX idx_movie_match_user_two ON movie_matches(user_two_id);
