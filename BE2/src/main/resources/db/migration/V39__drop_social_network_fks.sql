-- V39: Drop inline foreign key constraints from social network tables
-- These FKs conflict with the UUID reference + Index pattern used elsewhere

-- Drop FK from reviews table
DO $$
BEGIN
    EXECUTE (
        SELECT string_agg('ALTER TABLE reviews DROP CONSTRAINT ' || constraint_name, '; ')
        FROM information_schema.table_constraints
        WHERE table_name = 'reviews' AND constraint_type = 'FOREIGN KEY'
    );
END $$;

-- Drop FK from comments table
DO $$
BEGIN
    EXECUTE (
        SELECT string_agg('ALTER TABLE comments DROP CONSTRAINT ' || constraint_name, '; ')
        FROM information_schema.table_constraints
        WHERE table_name = 'comments' AND constraint_type = 'FOREIGN KEY'
    );
END $$;

-- Drop FK from follows table
DO $$
BEGIN
    EXECUTE (
        SELECT string_agg('ALTER TABLE follows DROP CONSTRAINT ' || constraint_name, '; ')
        FROM information_schema.table_constraints
        WHERE table_name = 'follows' AND constraint_type = 'FOREIGN KEY'
    );
END $$;

-- Drop FK from favorite_lists table
DO $$
BEGIN
    EXECUTE (
        SELECT string_agg('ALTER TABLE favorite_lists DROP CONSTRAINT ' || constraint_name, '; ')
        FROM information_schema.table_constraints
        WHERE table_name = 'favorite_lists' AND constraint_type = 'FOREIGN KEY'
    );
END $$;

-- Drop FK from favorite_list_items table
DO $$
BEGIN
    EXECUTE (
        SELECT string_agg('ALTER TABLE favorite_list_items DROP CONSTRAINT ' || constraint_name, '; ')
        FROM information_schema.table_constraints
        WHERE table_name = 'favorite_list_items' AND constraint_type = 'FOREIGN KEY'
    );
END $$;

-- Ensure indexes exist for better query performance
CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_movie ON reviews(movie_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_movie ON comments(movie_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_favorite_lists_user ON favorite_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_list_items_list ON favorite_list_items(favorite_list_id);
CREATE INDEX IF NOT EXISTS idx_favorite_list_items_movie ON favorite_list_items(movie_id);
