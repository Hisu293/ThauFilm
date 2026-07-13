CREATE TABLE IF NOT EXISTS community_posts (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    content TEXT,
    image_url TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_community_post_body
        CHECK (NULLIF(TRIM(content), '') IS NOT NULL OR NULLIF(TRIM(image_url), '') IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_community_post_user_created
    ON community_posts(user_id, created_at DESC);
