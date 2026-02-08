-- Migration 027: Add Trigger for User Settings Auto-Creation
-- Description: Automatically create user_settings when user is created
-- Author: System
-- Date: 2025-02-07

-- Drop trigger if exists (for idempotency)
DROP TRIGGER IF EXISTS user_insert_create_settings;

-- Create trigger to auto-create user_settings on user insert
CREATE TRIGGER user_insert_create_settings
AFTER INSERT ON users
FOR EACH ROW
WHEN NEW.is_active = 1
BEGIN
    INSERT INTO user_settings (
        id, user_id, full_name, email, phone, avatar_url, notes,
        email_notifications, push_notifications, task_assignments, task_updates,
        system_alerts, weekly_reports, theme, language, date_format, time_format,
        high_contrast, large_text, reduce_motion, screen_reader, auto_refresh, refresh_interval,
        two_factor_enabled, session_timeout,
        cache_enabled, cache_size, offline_mode, sync_on_startup, background_sync,
        image_compression, preload_data,
        accessibility_high_contrast, accessibility_large_text, accessibility_reduce_motion,
        accessibility_screen_reader, accessibility_focus_indicators, accessibility_keyboard_navigation,
        accessibility_text_to_speech, accessibility_speech_rate, accessibility_font_size,
        accessibility_color_blind_mode,
        notifications_email_enabled, notifications_push_enabled, notifications_in_app_enabled,
        notifications_task_assigned, notifications_task_updated, notifications_task_completed,
        notifications_task_overdue, notifications_system_alerts, notifications_maintenance,
        notifications_security_alerts, notifications_quiet_hours_enabled,
        notifications_quiet_hours_start, notifications_quiet_hours_end,
        notifications_digest_frequency, notifications_batch_notifications,
        notifications_sound_enabled, notifications_sound_volume,
        created_at, updated_at
    ) VALUES (
        lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))),
        NEW.id,
        COALESCE(NEW.first_name || ' ' || NEW.last_name, ''),
        NEW.email,
        NEW.phone,
        NULL,
        NULL,
        1, 1, 1, 1, 1, 0, 'system', 'fr', 'DD/MM/YYYY', '24h',
        0, 0, 0, 0, 1, 60,
        0, 480,
        1, 100, 0, 1, 1, 1, 0,
        0, 0, 0, 0, 1, 1, 0, 1.0, 16, 'none',
        1, 1, 1, 1, 1, 0, 1, 0, 1, 0, '22:00', '08:00', 'never', 0, 1, 70,
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    );
END;

-- Log the migration
INSERT INTO schema_version (version, applied_at, migration_hash, description, migration_time_ms)
VALUES (
    27,
    strftime('%s', 'now') * 1000,
    'user_settings_auto_create_trigger',
    'Added trigger to auto-create user_settings on user insert',
    0
);