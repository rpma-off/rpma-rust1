-- Migration 046: Remove user settings auto-create trigger
-- Description: Keep user settings creation owned by Rust services to avoid trigger/schema drift failures.

DROP TRIGGER IF EXISTS user_insert_create_settings;
