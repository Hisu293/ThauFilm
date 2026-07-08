-- V40: Drop all remaining foreign key constraints
-- This migration ensures complete removal of all FK constraints in the system

DO $$
DECLARE
    constraint_rec RECORD;
    drop_sql TEXT;
BEGIN
    FOR constraint_rec IN 
        SELECT tc.table_name, tc.constraint_name
        FROM information_schema.table_constraints tc
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
    LOOP
        drop_sql := 'ALTER TABLE ' || constraint_rec.table_name || 
                    ' DROP CONSTRAINT IF EXISTS ' || constraint_rec.constraint_name;
        EXECUTE drop_sql;
        RAISE NOTICE 'Dropped FK: %.%', constraint_rec.table_name, constraint_rec.constraint_name;
    END LOOP;
END $$;
