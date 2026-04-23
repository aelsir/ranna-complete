-- Migration 033: Fix foreign keys referencing auth.users to allow user deletion
--
-- Several tables reference auth.users(id) but without ON DELETE CASCADE or ON DELETE SET NULL.
-- This prevents deleting a user from the Supabase dashboard if they have created/reviewed content or played tracks.

DO $$
DECLARE
    rec RECORD;
BEGIN
    -- 1. tracks (formerly madha).reviewed_by
    FOR rec IN 
        SELECT tc.constraint_name 
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'tracks' AND kcu.column_name = 'reviewed_by' AND tc.constraint_type = 'FOREIGN KEY'
    LOOP
        EXECUTE 'ALTER TABLE tracks DROP CONSTRAINT ' || rec.constraint_name;
    END LOOP;
    ALTER TABLE tracks ADD CONSTRAINT tracks_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

    -- 2. artists (formerly madiheen).created_by and reviewed_by
    FOR rec IN SELECT tc.constraint_name FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name WHERE tc.table_name = 'artists' AND kcu.column_name = 'created_by' AND tc.constraint_type = 'FOREIGN KEY' LOOP
        EXECUTE 'ALTER TABLE artists DROP CONSTRAINT ' || rec.constraint_name;
    END LOOP;
    ALTER TABLE artists ADD CONSTRAINT artists_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

    FOR rec IN SELECT tc.constraint_name FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name WHERE tc.table_name = 'artists' AND kcu.column_name = 'reviewed_by' AND tc.constraint_type = 'FOREIGN KEY' LOOP
        EXECUTE 'ALTER TABLE artists DROP CONSTRAINT ' || rec.constraint_name;
    END LOOP;
    ALTER TABLE artists ADD CONSTRAINT artists_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

    -- 3. authors (formerly ruwat).created_by and reviewed_by
    FOR rec IN SELECT tc.constraint_name FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name WHERE tc.table_name = 'authors' AND kcu.column_name = 'created_by' AND tc.constraint_type = 'FOREIGN KEY' LOOP
        EXECUTE 'ALTER TABLE authors DROP CONSTRAINT ' || rec.constraint_name;
    END LOOP;
    ALTER TABLE authors ADD CONSTRAINT authors_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

    FOR rec IN SELECT tc.constraint_name FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name WHERE tc.table_name = 'authors' AND kcu.column_name = 'reviewed_by' AND tc.constraint_type = 'FOREIGN KEY' LOOP
        EXECUTE 'ALTER TABLE authors DROP CONSTRAINT ' || rec.constraint_name;
    END LOOP;
    ALTER TABLE authors ADD CONSTRAINT authors_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

    -- 4. collections.created_by
    FOR rec IN SELECT tc.constraint_name FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name WHERE tc.table_name = 'collections' AND kcu.column_name = 'created_by' AND tc.constraint_type = 'FOREIGN KEY' LOOP
        EXECUTE 'ALTER TABLE collections DROP CONSTRAINT ' || rec.constraint_name;
    END LOOP;
    ALTER TABLE collections ADD CONSTRAINT collections_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

    -- 5. user_plays.user_id
    FOR rec IN SELECT tc.constraint_name FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name WHERE tc.table_name = 'user_plays' AND kcu.column_name = 'user_id' AND tc.constraint_type = 'FOREIGN KEY' LOOP
        EXECUTE 'ALTER TABLE user_plays DROP CONSTRAINT ' || rec.constraint_name;
    END LOOP;
    ALTER TABLE user_plays ADD CONSTRAINT user_plays_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

END $$;
