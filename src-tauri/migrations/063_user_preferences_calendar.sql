-- Migration 063: Add calendar preference columns to user_settings
-- These columns persist the calendar view and filter state per user
-- so preferences survive browser cache clears and device changes.

ALTER TABLE user_settings ADD COLUMN calendar_view TEXT;
ALTER TABLE user_settings ADD COLUMN calendar_show_my_events_only INTEGER;
ALTER TABLE user_settings ADD COLUMN calendar_filter_statuses TEXT;    -- JSON array
ALTER TABLE user_settings ADD COLUMN calendar_filter_priorities TEXT;  -- JSON array
