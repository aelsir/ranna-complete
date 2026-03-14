-- Migration 014: Relax User Profiles Constraints
-- Relaxes the display_name check to allow Latin characters and extra symbols

ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_display_name_check;

-- Optional: Add a more relaxed check if needed, or just leave it open
-- ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_display_name_check 
-- CHECK (display_name IS NULL OR length(display_name) <= 100);
