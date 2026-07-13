ALTER TABLE community_posts
    ADD COLUMN IF NOT EXISTS share_count BIGINT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS community_post_comments (
    id UUID PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_community_comment_post_created
    ON community_post_comments(post_id, created_at DESC);

CREATE TABLE IF NOT EXISTS community_post_reactions (
    id UUID PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    type VARCHAR(16) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_community_reaction_post_user UNIQUE (post_id, user_id),
    CONSTRAINT chk_community_reaction_type CHECK (type IN ('LIKE', 'LOVE', 'HAHA', 'WOW', 'SAD', 'ANGRY'))
);

CREATE INDEX IF NOT EXISTS idx_community_reaction_post
    ON community_post_reactions(post_id);
