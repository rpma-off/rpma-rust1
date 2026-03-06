//! Schema compatibility patching for user_settings table.
//!
//! Legacy databases may miss columns that newer settings code expects.
//! This module patches the table in-place to keep settings reads/updates
//! resilient across application upgrades.

use crate::commands::AppError;
use std::collections::HashSet;
use tracing::warn;

/// All columns that must exist in `user_settings`, together with their DDL
/// definition used when adding a missing column via `ALTER TABLE`.
const EXPECTED_COLUMNS: &[(&str, &str)] = &[
    ("full_name", "TEXT"),
    ("email", "TEXT"),
    ("phone", "TEXT"),
    ("avatar_url", "TEXT"),
    ("notes", "TEXT"),
    ("email_notifications", "INTEGER NOT NULL DEFAULT 1"),
    ("push_notifications", "INTEGER NOT NULL DEFAULT 1"),
    ("task_assignments", "INTEGER NOT NULL DEFAULT 1"),
    ("task_updates", "INTEGER NOT NULL DEFAULT 1"),
    ("system_alerts", "INTEGER NOT NULL DEFAULT 1"),
    ("weekly_reports", "INTEGER NOT NULL DEFAULT 0"),
    ("theme", "TEXT NOT NULL DEFAULT 'system'"),
    ("language", "TEXT NOT NULL DEFAULT 'fr'"),
    ("date_format", "TEXT NOT NULL DEFAULT 'DD/MM/YYYY'"),
    ("time_format", "TEXT NOT NULL DEFAULT '24h'"),
    ("high_contrast", "INTEGER NOT NULL DEFAULT 0"),
    ("large_text", "INTEGER NOT NULL DEFAULT 0"),
    ("reduce_motion", "INTEGER NOT NULL DEFAULT 0"),
    ("screen_reader", "INTEGER NOT NULL DEFAULT 0"),
    ("auto_refresh", "INTEGER NOT NULL DEFAULT 1"),
    ("refresh_interval", "INTEGER NOT NULL DEFAULT 60"),
    ("two_factor_enabled", "INTEGER NOT NULL DEFAULT 0"),
    ("session_timeout", "INTEGER NOT NULL DEFAULT 480"),
    ("cache_enabled", "INTEGER NOT NULL DEFAULT 1"),
    ("cache_size", "INTEGER NOT NULL DEFAULT 100"),
    ("offline_mode", "INTEGER NOT NULL DEFAULT 0"),
    ("sync_on_startup", "INTEGER NOT NULL DEFAULT 1"),
    ("background_sync", "INTEGER NOT NULL DEFAULT 1"),
    ("image_compression", "INTEGER NOT NULL DEFAULT 1"),
    ("preload_data", "INTEGER NOT NULL DEFAULT 0"),
    ("accessibility_high_contrast", "INTEGER NOT NULL DEFAULT 0"),
    ("accessibility_large_text", "INTEGER NOT NULL DEFAULT 0"),
    ("accessibility_reduce_motion", "INTEGER NOT NULL DEFAULT 0"),
    ("accessibility_screen_reader", "INTEGER NOT NULL DEFAULT 0"),
    (
        "accessibility_focus_indicators",
        "INTEGER NOT NULL DEFAULT 1",
    ),
    (
        "accessibility_keyboard_navigation",
        "INTEGER NOT NULL DEFAULT 1",
    ),
    ("accessibility_text_to_speech", "INTEGER NOT NULL DEFAULT 0"),
    ("accessibility_speech_rate", "REAL NOT NULL DEFAULT 1.0"),
    ("accessibility_font_size", "INTEGER NOT NULL DEFAULT 16"),
    (
        "accessibility_color_blind_mode",
        "TEXT NOT NULL DEFAULT 'none'",
    ),
    ("notifications_email_enabled", "INTEGER NOT NULL DEFAULT 1"),
    ("notifications_push_enabled", "INTEGER NOT NULL DEFAULT 1"),
    ("notifications_in_app_enabled", "INTEGER NOT NULL DEFAULT 1"),
    ("notifications_task_assigned", "INTEGER NOT NULL DEFAULT 1"),
    ("notifications_task_updated", "INTEGER NOT NULL DEFAULT 1"),
    ("notifications_task_completed", "INTEGER NOT NULL DEFAULT 0"),
    ("notifications_task_overdue", "INTEGER NOT NULL DEFAULT 1"),
    ("notifications_system_alerts", "INTEGER NOT NULL DEFAULT 1"),
    ("notifications_maintenance", "INTEGER NOT NULL DEFAULT 0"),
    (
        "notifications_security_alerts",
        "INTEGER NOT NULL DEFAULT 1",
    ),
    (
        "notifications_quiet_hours_enabled",
        "INTEGER NOT NULL DEFAULT 0",
    ),
    (
        "notifications_quiet_hours_start",
        "TEXT NOT NULL DEFAULT '22:00'",
    ),
    (
        "notifications_quiet_hours_end",
        "TEXT NOT NULL DEFAULT '08:00'",
    ),
    (
        "notifications_digest_frequency",
        "TEXT NOT NULL DEFAULT 'never'",
    ),
    (
        "notifications_batch_notifications",
        "INTEGER NOT NULL DEFAULT 0",
    ),
    ("notifications_sound_enabled", "INTEGER NOT NULL DEFAULT 1"),
    ("notifications_sound_volume", "INTEGER NOT NULL DEFAULT 70"),
    ("updated_at", "INTEGER NOT NULL DEFAULT 0"),
];

impl super::SettingsService {
    /// Legacy databases may miss columns that newer settings code expects.
    /// We patch the table in-place to keep settings reads/updates resilient.
    pub(super) fn ensure_user_settings_schema_compatibility(
        &self,
        conn: &rusqlite::Connection,
    ) -> Result<(), AppError> {
        let mut stmt = conn
            .prepare("PRAGMA table_info(user_settings)")
            .map_err(|e| {
                AppError::Database(format!("Failed to inspect user_settings schema: {}", e))
            })?;

        let existing_columns: HashSet<String> = stmt
            .query_map([], |row| row.get::<_, String>(1))
            .map_err(|e| {
                AppError::Database(format!("Failed to inspect user_settings columns: {}", e))
            })?
            .collect::<Result<HashSet<_>, _>>()
            .map_err(|e| {
                AppError::Database(format!("Failed to read user_settings columns: {}", e))
            })?;

        if existing_columns.is_empty() {
            return Err(AppError::Database(
                "user_settings table not found while validating settings schema".to_string(),
            ));
        }

        for &(column, definition) in EXPECTED_COLUMNS {
            if existing_columns.contains(column) {
                continue;
            }

            let alter_sql = format!(
                "ALTER TABLE user_settings ADD COLUMN {} {}",
                column, definition
            );
            conn.execute(&alter_sql, []).map_err(|e| {
                AppError::Database(format!(
                    "Failed to upgrade user settings schema (missing column '{}'): {}",
                    column, e
                ))
            })?;
            warn!(
                "Added missing '{}' column to user_settings table for compatibility",
                column
            );
        }

        Ok(())
    }
}
