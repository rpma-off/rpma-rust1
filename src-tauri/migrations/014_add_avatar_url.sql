-- Migration 014: Add avatar_url to user_settings table
-- Add avatar_url column to store user profile picture URLs

ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS avatar_url TEXT;
