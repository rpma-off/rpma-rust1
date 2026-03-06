//! Settings service for user settings management
//!
//! This module defines the `SettingsService` struct and the shared helpers that
//! are used by the specialised sub-modules.  All SQL access lives in this
//! infrastructure layer (per ADR-002).

use crate::commands::AppError;
use rusqlite::params;
use std::sync::Arc;
use tracing::{error, warn};
use uuid::Uuid;

// --- Sub-module declarations ------------------------------------------------
// Each sub-module extends `SettingsService` via `impl super::SettingsService`.

mod app_settings;
mod consent_query;
mod create;
mod delete;
mod read;
mod schema_compat;
mod update_accessibility;
mod update_notifications;
mod update_performance;
mod update_preferences;
mod update_profile;
mod update_security;

// ---------------------------------------------------------------------------

#[derive(Clone, Debug)]
pub struct SettingsService {
    db: Arc<crate::db::Database>,
}

impl SettingsService {
    pub fn new(db: Arc<crate::db::Database>) -> Self {
        Self { db }
    }

    /// Execute `op` inside a transaction that first guarantees the
    /// `user_settings` row for `user_id` exists.
    fn with_settings_tx<T>(
        &self,
        user_id: &str,
        context: &str,
        op: impl FnOnce(&rusqlite::Transaction) -> Result<T, AppError>,
    ) -> Result<T, AppError> {
        let mut conn = self.db.get_connection().map_err(|e| {
            error!("Failed to get database connection: {}", e);
            AppError::Database("Database connection failed".to_string())
        })?;
        self.ensure_user_settings_schema_compatibility(&conn)?;

        let tx = conn.transaction().map_err(|e| {
            error!("Failed to start transaction for {} update: {}", context, e);
            AppError::Database("Failed to start transaction".to_string())
        })?;

        self.ensure_user_settings_exist_with_tx(&tx, user_id)?;

        let result = op(&tx)?;

        tx.commit().map_err(|e| {
            error!(
                "Failed to commit {} update transaction for {}: {}",
                context, user_id, e
            );
            AppError::Database("Failed to commit transaction".to_string())
        })?;

        Ok(result)
    }

    /// Log settings change for audit purposes
    fn log_settings_change(
        &self,
        tx: &rusqlite::Transaction,
        user_id: &str,
        setting_type: &str,
        details: &str,
    ) {
        let id = Uuid::new_v4().to_string();
        let timestamp = chrono::Utc::now().timestamp_millis();

        if let Err(e) = tx.execute(
            "INSERT INTO settings_audit_log (id, user_id, setting_type, details, timestamp) VALUES (?, ?, ?, ?, ?)",
            params![id, user_id, setting_type, details, timestamp],
        ) {
            error!("Failed to log settings change for user {}: {}", user_id, e);
            warn!("Audit logging failed but continuing with settings update");
        }
    }
}

#[cfg(test)]
mod tests {
    use super::SettingsService;
    use crate::shared::contracts::auth::{UserAccount, UserRole};
    use crate::shared::services::cross_domain::AuthService;
    use chrono::Utc;
    use rusqlite::params;
    use std::sync::Arc;
    use tempfile::TempDir;
    use tracing::{debug, info};
    use uuid::Uuid;

    struct LocalTestDb {
        _temp_dir: TempDir,
        db: Arc<crate::db::Database>,
    }

    impl LocalTestDb {
        fn new() -> Self {
            let temp_dir = tempfile::tempdir().expect("failed to create temp dir");
            let db_path = temp_dir.path().join("settings-service-tests.db");
            let db = Arc::new(
                crate::db::Database::new(&db_path, "test_encryption_key_32_bytes_long!")
                    .expect("failed to create database"),
            );
            db.init().expect("failed to init database");
            let latest = crate::db::Database::get_latest_migration_version();
            db.migrate(latest).expect("failed to run migrations");

            Self {
                _temp_dir: temp_dir,
                db,
            }
        }
    }

    fn setup_services() -> (LocalTestDb, SettingsService, AuthService) {
        let test_db = LocalTestDb::new();
        let db = test_db.db.clone();
        let settings_service = SettingsService::new(db.clone());
        let auth_service =
            AuthService::new(db.as_ref().clone()).expect("failed to create auth service");

        (test_db, settings_service, auth_service)
    }

    fn create_test_user(auth_service: &AuthService) -> crate::shared::contracts::auth::UserAccount {
        auth_service
            .create_account(
                "settings.test@example.com",
                "settings.test@example.com",
                "Settings",
                "Tester",
                crate::shared::contracts::auth::UserRole::Technician,
                "CurrentPass1!",
            )
            .expect("failed to create test user")
    }

    fn insert_session(
        test_db: &LocalTestDb,
        user: &crate::shared::contracts::auth::UserAccount,
        token: &str,
    ) {
        let conn = test_db
            .db
            .get_connection()
            .expect("failed to get connection");
        let now_ms = Utc::now().timestamp_millis();
        let expires_ms = (Utc::now() + chrono::Duration::hours(8)).timestamp_millis();
        conn.execute(
            "INSERT INTO sessions (id, user_id, username, email, role, created_at, expires_at, last_activity)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            params![
                token,
                user.id,
                user.username,
                user.email,
                user.role.to_string(),
                now_ms,
                expires_ms,
                now_ms,
            ],
        )
        .expect("failed to insert session");
    }

    #[test]
    fn default_settings_bootstrap_on_first_fetch() {
        let (test_db, settings_service, auth_service) = setup_services();
        let user = create_test_user(&auth_service);

        let first = settings_service
            .get_user_settings(&user.id)
            .expect("failed to get first settings");
        assert_eq!(first.preferences.theme, "system");
        assert_eq!(first.performance.cache_enabled, true);
        assert_eq!(first.notifications.email_enabled, true);

        let second = settings_service
            .get_user_settings(&user.id)
            .expect("failed to get second settings");
        assert_eq!(second.preferences.theme, "system");

        let conn = test_db
            .db
            .get_connection()
            .expect("failed to get connection");
        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM user_settings WHERE user_id = ?",
                params![user.id],
                |row| row.get(0),
            )
            .expect("failed to count settings rows");
        assert_eq!(count, 1);
    }

    #[test]
    fn legacy_user_settings_schema_is_healed_automatically() {
        let (test_db, settings_service, _auth_service) = setup_services();
        let legacy_user_id = "legacy-user-1";

        let conn = test_db
            .db
            .get_connection()
            .expect("failed to get connection");

        conn.execute("DROP TABLE IF EXISTS user_settings", [])
            .expect("failed to drop user_settings");
        conn.execute(
            "CREATE TABLE user_settings (
                id TEXT PRIMARY KEY NOT NULL,
                user_id TEXT NOT NULL UNIQUE
            )",
            [],
        )
        .expect("failed to create legacy user_settings table");

        conn.execute(
            "INSERT INTO user_settings (id, user_id) VALUES (?, ?)",
            params![Uuid::new_v4().to_string(), legacy_user_id],
        )
        .expect("failed to seed legacy user_settings row");

        let settings = settings_service
            .get_user_settings(legacy_user_id)
            .expect("failed to load settings from legacy schema");
        assert_eq!(settings.preferences.theme, "system");
        assert_eq!(settings.notifications.sound_volume, 70);

        let mut stmt = conn
            .prepare("PRAGMA table_info(user_settings)")
            .expect("failed to inspect user_settings columns");
        let columns: Vec<String> = stmt
            .query_map([], |row| row.get::<_, String>(1))
            .expect("failed to iterate user_settings columns")
            .collect::<Result<Vec<_>, _>>()
            .expect("failed to collect user_settings columns");

        assert!(columns.contains(&"notes".to_string()));
        assert!(columns.contains(&"updated_at".to_string()));
        assert!(columns.contains(&"notifications_sound_volume".to_string()));
    }

    #[test]
    fn legacy_nullable_quiet_hours_are_coalesced_on_read() {
        let (test_db, settings_service, _auth_service) = setup_services();
        let legacy_user_id = "legacy-user-null-quiet-hours";

        let conn = test_db
            .db
            .get_connection()
            .expect("failed to get connection");

        conn.execute("DROP TABLE IF EXISTS user_settings", [])
            .expect("failed to drop user_settings");
        conn.execute(
            "CREATE TABLE user_settings (
                id TEXT PRIMARY KEY NOT NULL,
                user_id TEXT NOT NULL UNIQUE,
                notifications_quiet_hours_start TEXT,
                notifications_quiet_hours_end TEXT
            )",
            [],
        )
        .expect("failed to create legacy nullable user_settings table");

        conn.execute(
            "INSERT INTO user_settings (id, user_id, notifications_quiet_hours_start, notifications_quiet_hours_end)
             VALUES (?, ?, NULL, NULL)",
            params![Uuid::new_v4().to_string(), legacy_user_id],
        )
        .expect("failed to seed legacy nullable user_settings row");

        let settings = settings_service
            .get_user_settings(legacy_user_id)
            .expect("failed to load settings with nullable quiet hours");

        assert_eq!(settings.notifications.quiet_hours_start, "22:00");
        assert_eq!(settings.notifications.quiet_hours_end, "08:00");
    }

    #[test]
    fn profile_update_and_avatar_roundtrip() {
        let (_test_db, settings_service, auth_service) = setup_services();
        let user = create_test_user(&auth_service);

        let mut settings = settings_service
            .get_user_settings(&user.id)
            .expect("failed to load settings");
        settings.profile.full_name = "Settings Tester".to_string();
        settings.profile.email = "new.email@example.com".to_string();
        settings.profile.phone = Some("+1234567890".to_string());
        settings.profile.avatar_url = Some("data:image/png;base64,aGVsbG8=".to_string());
        settings.profile.notes = Some("Updated through test".to_string());

        settings_service
            .update_user_profile(&user.id, &settings.profile)
            .expect("failed to update profile");

        let reloaded = settings_service
            .get_user_settings(&user.id)
            .expect("failed to reload settings");
        assert_eq!(reloaded.profile.full_name, "Settings Tester");
        assert_eq!(reloaded.profile.email, "new.email@example.com");
        assert_eq!(reloaded.profile.phone.as_deref(), Some("+1234567890"));
        assert_eq!(
            reloaded.profile.avatar_url.as_deref(),
            Some("data:image/png;base64,aGVsbG8=")
        );
        assert_eq!(
            reloaded.profile.notes.as_deref(),
            Some("Updated through test")
        );
    }

    #[test]
    fn password_change_success_and_failure_paths() {
        let (test_db, settings_service, auth_service) = setup_services();
        let user = create_test_user(&auth_service);

        insert_session(&test_db, &user, "current-token");
        insert_session(&test_db, &user, "other-token");

        let failed = settings_service.change_user_password(
            &user.id,
            "WrongPass1!",
            "NextPass1!",
            "current-token",
            &auth_service,
        );
        assert!(failed.is_err());

        settings_service
            .change_user_password(
                &user.id,
                "CurrentPass1!",
                "NextPass1!",
                "current-token",
                &auth_service,
            )
            .expect("password change should succeed");

        let conn = test_db
            .db
            .get_connection()
            .expect("failed to get connection");
        let hash: String = conn
            .query_row(
                "SELECT password_hash FROM users WHERE id = ?",
                params![user.id],
                |row| row.get(0),
            )
            .expect("failed to get password hash");

        let old_valid = auth_service
            .verify_password("CurrentPass1!", &hash)
            .expect("failed to verify old password");
        let new_valid = auth_service
            .verify_password("NextPass1!", &hash)
            .expect("failed to verify new password");
        assert!(!old_valid);
        assert!(new_valid);

        let session_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM sessions WHERE user_id = ?",
                params![user.id],
                |row| row.get(0),
            )
            .expect("failed to count sessions");
        let current_exists: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM sessions WHERE user_id = ? AND id = ?",
                params![user.id, "current-token"],
                |row| row.get(0),
            )
            .expect("failed to check current session");
        assert_eq!(session_count, 1);
        assert_eq!(current_exists, 1);
    }

    #[test]
    fn delete_account_soft_delete_and_purge() {
        let (test_db, settings_service, auth_service) = setup_services();
        let user = create_test_user(&auth_service);

        settings_service
            .get_user_settings(&user.id)
            .expect("failed to bootstrap settings");
        insert_session(&test_db, &user, "delete-token");

        let conn = test_db
            .db
            .get_connection()
            .expect("failed to get connection");
        conn.execute(
            "INSERT INTO user_consent (user_id, consent_data, created_at, updated_at)
             VALUES (?, ?, ?, ?)",
            params![
                user.id,
                "{\"analytics_consent\":true}",
                Utc::now().timestamp_millis(),
                Utc::now().timestamp_millis(),
            ],
        )
        .expect("failed to insert consent");

        settings_service
            .delete_user_account(&user.id)
            .expect("failed to delete user account");

        let is_active: i64 = conn
            .query_row(
                "SELECT is_active FROM users WHERE id = ?",
                params![user.id],
                |row| row.get(0),
            )
            .expect("failed to query user status");
        let deleted_at: i64 = conn
            .query_row(
                "SELECT deleted_at FROM users WHERE id = ?",
                params![user.id],
                |row| row.get(0),
            )
            .expect("failed to query deleted_at");
        assert_eq!(is_active, 0);
        assert!(deleted_at > 0);

        let settings_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM user_settings WHERE user_id = ?",
                params![user.id],
                |row| row.get(0),
            )
            .expect("failed to count settings rows");
        let consent_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM user_consent WHERE user_id = ?",
                params![user.id],
                |row| row.get(0),
            )
            .expect("failed to count consent rows");
        let session_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM sessions WHERE user_id = ?",
                params![user.id],
                |row| row.get(0),
            )
            .expect("failed to count sessions");

        assert_eq!(settings_count, 0);
        assert_eq!(consent_count, 0);
        assert_eq!(session_count, 0);
    }
}
