ALTER TABLE community_posts
    ADD COLUMN IF NOT EXISTS image_public_id VARCHAR(255);
