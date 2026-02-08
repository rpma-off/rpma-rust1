//! Settings audit and data consent operations
//!
//! This module handles data consent management, audit logging,
//! and GDPR-compliant data operations.

use crate::commands::settings::core::authenticate_user;
use crate::commands::{ApiResponse, AppError, AppState};

use rusqlite::{params, OptionalExtension};
use serde::{Deserialize, Serialize};
use tracing::info;

// Import authentication macros
use crate::authenticate;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataConsent {
    pub user_id: String,
    pub analytics_consent: bool,
    pub marketing_consent: bool,
    pub third_party_sharing: bool,
    pub data_retention_period: u32,
    pub consent_given_at: chrono::DateTime<chrono::Utc>,
    pub consent_version: String,
}

#[derive(Deserialize)]
pub struct UpdateDataConsentRequest {
    pub session_token: String,
    pub analytics_consent: Option<bool>,
    pub marketing_consent: Option<bool>,
    pub third_party_sharing: Option<bool>,
    pub data_retention_period: Option<u32>,
}

fn default_data_consent(user_id: &str) -> DataConsent {
    DataConsent {
        user_id: user_id.to_string(),
        analytics_consent: false,
        marketing_consent: false,
        third_party_sharing: false,
        data_retention_period: 365,
        consent_given_at: chrono::Utc::now(),
        consent_version: "1.0".to_string(),
    }
}

fn upsert_data_consent(conn: &rusqlite::Connection, consent: &DataConsent) -> Result<(), AppError> {
    let consent_data = serde_json::to_string(consent)
        .map_err(|e| AppError::Database(format!("Failed to serialize consent data: {}", e)))?;
    let now = chrono::Utc::now().timestamp_millis();

    conn.execute(
        "INSERT INTO user_consent (user_id, consent_data, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET
             consent_data = excluded.consent_data,
             updated_at = excluded.updated_at",
        params![consent.user_id, consent_data, now],
    )
    .map_err(|e| AppError::Database(format!("Failed to save consent data: {}", e)))?;

    Ok(())
}

/// Get data consent information
#[tauri::command]

pub async fn get_data_consent(
    session_token: String,
    state: AppState<'_>,
) -> Result<ApiResponse<DataConsent>, AppError> {
    info!("Getting data consent information");

    let user = authenticate_user(&session_token, &state)?;
    let conn = state
        .db
        .get_connection()
        .map_err(|e| AppError::Database(format!("Failed to access database: {}", e)))?;

    let stored_consent: Option<String> = conn
        .query_row(
            "SELECT consent_data FROM user_consent WHERE user_id = ?",
            params![user.id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| AppError::Database(format!("Failed to load consent data: {}", e)))?;

    let consent = match stored_consent {
        Some(payload) => serde_json::from_str::<DataConsent>(&payload)
            .unwrap_or_else(|_| default_data_consent(&user.id)),
        None => {
            let default = default_data_consent(&user.id);
            upsert_data_consent(&conn, &default)?;
            default
        }
    };

    Ok(ApiResponse::success(consent))
}

/// Update data consent preferences
#[tauri::command]

pub async fn update_data_consent(
    request: UpdateDataConsentRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<DataConsent>, AppError> {
    info!("Updating data consent preferences");

    let user = authenticate!(&request.session_token, &state);
    let conn = state
        .db
        .get_connection()
        .map_err(|e| AppError::Database(format!("Failed to access database: {}", e)))?;

    let stored_consent: Option<String> = conn
        .query_row(
            "SELECT consent_data FROM user_consent WHERE user_id = ?",
            params![user.id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| AppError::Database(format!("Failed to load consent data: {}", e)))?;

    let mut consent = match stored_consent {
        Some(payload) => serde_json::from_str::<DataConsent>(&payload)
            .unwrap_or_else(|_| default_data_consent(&user.id)),
        None => default_data_consent(&user.id),
    };

    if let Some(value) = request.analytics_consent {
        consent.analytics_consent = value;
    }
    if let Some(value) = request.marketing_consent {
        consent.marketing_consent = value;
    }
    if let Some(value) = request.third_party_sharing {
        consent.third_party_sharing = value;
    }
    if let Some(value) = request.data_retention_period {
        consent.data_retention_period = value;
    }
    consent.consent_given_at = chrono::Utc::now();
    consent.consent_version = "1.0".to_string();

    upsert_data_consent(&conn, &consent)?;

    Ok(ApiResponse::success(consent))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::auth::UserRole;
    use std::sync::Arc;
    use tempfile::TempDir;

    fn create_test_db() -> (TempDir, Arc<crate::db::Database>) {
        let temp_dir = tempfile::tempdir().expect("failed to create temp dir");
        let db_path = temp_dir.path().join("audit-consent-tests.db");
        let db = Arc::new(
            crate::db::Database::new(&db_path, "test_encryption_key_32_bytes_long!")
                .expect("failed to create database"),
        );
        db.init().expect("failed to init database");
        let latest = crate::db::Database::get_latest_migration_version();
        db.migrate(latest).expect("failed to run migrations");
        (temp_dir, db)
    }

    fn insert_test_user(conn: &rusqlite::Connection, user_id: &str) {
        conn.execute(
            "INSERT INTO users (id, email, username, password_hash, full_name, role, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?)",
            params![
                user_id,
                "audit.test@example.com",
                "audit_test_user",
                "hashed_password",
                "Audit Tester",
                UserRole::Technician.to_string(),
                1,
            ],
        )
        .expect("failed to insert test user");
    }

    #[test]
    fn default_consent_values_are_initialized() {
        let consent = default_data_consent("user-123");
        assert_eq!(consent.user_id, "user-123");
        assert!(!consent.analytics_consent);
        assert!(!consent.marketing_consent);
        assert!(!consent.third_party_sharing);
        assert_eq!(consent.data_retention_period, 365);
        assert_eq!(consent.consent_version, "1.0");
    }

    #[test]
    fn consent_upsert_roundtrip_persists_updates() {
        let (_temp_dir, db) = create_test_db();
        let conn = db.get_connection().expect("failed to get connection");
        insert_test_user(&conn, "user-abc");

        let mut consent = default_data_consent("user-abc");
        consent.analytics_consent = true;
        consent.marketing_consent = true;
        consent.data_retention_period = 730;

        upsert_data_consent(&conn, &consent).expect("failed to upsert consent");

        let stored_payload: String = conn
            .query_row(
                "SELECT consent_data FROM user_consent WHERE user_id = ?",
                params!["user-abc"],
                |row| row.get(0),
            )
            .expect("failed to fetch stored consent");
        let stored: DataConsent =
            serde_json::from_str(&stored_payload).expect("invalid stored consent json");

        assert!(stored.analytics_consent);
        assert!(stored.marketing_consent);
        assert_eq!(stored.data_retention_period, 730);

        consent.third_party_sharing = true;
        upsert_data_consent(&conn, &consent).expect("failed to update consent");

        let updated_payload: String = conn
            .query_row(
                "SELECT consent_data FROM user_consent WHERE user_id = ?",
                params!["user-abc"],
                |row| row.get(0),
            )
            .expect("failed to fetch updated consent");
        let updated: DataConsent =
            serde_json::from_str(&updated_payload).expect("invalid updated consent json");
        assert!(updated.third_party_sharing);
    }
}
