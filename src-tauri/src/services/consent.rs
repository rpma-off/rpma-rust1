//! Consent Service - Data consent management
//!
//! This service handles GDPR-compliant data consent operations,
//! including reading, creating, and updating user consent preferences.

use crate::db::Database;
use rusqlite::{params, OptionalExtension};
use std::sync::Arc;
use tracing::info;

use crate::models::settings::DataConsent;

/// Service for managing user data consent
#[derive(Debug)]
pub struct ConsentService {
    db: Arc<Database>,
}

impl ConsentService {
    /// Create a new ConsentService instance
    pub fn new(db: Arc<Database>) -> Self {
        Self { db }
    }

    /// Get user consent preferences, returning defaults if none exist
    pub fn get_consent(&self, user_id: &str) -> Result<DataConsent, String> {
        let conn = self.db.get_connection()?;

        let stored_consent: Option<String> = conn
            .query_row(
                "SELECT consent_data FROM user_consent WHERE user_id = ?",
                params![user_id],
                |row| row.get(0),
            )
            .optional()
            .map_err(|e| format!("Failed to load consent data: {}", e))?;

        match stored_consent {
            Some(payload) => Ok(serde_json::from_str::<DataConsent>(&payload)
                .unwrap_or_else(|_| default_data_consent(user_id))),
            None => {
                let default = default_data_consent(user_id);
                self.upsert_consent(&default)?;
                Ok(default)
            }
        }
    }

    /// Update user consent preferences
    pub fn update_consent(
        &self,
        user_id: &str,
        analytics_consent: Option<bool>,
        marketing_consent: Option<bool>,
        third_party_sharing: Option<bool>,
        data_retention_period: Option<u32>,
    ) -> Result<DataConsent, String> {
        let mut consent = self.get_consent_or_default(user_id)?;

        if let Some(value) = analytics_consent {
            consent.analytics_consent = value;
        }
        if let Some(value) = marketing_consent {
            consent.marketing_consent = value;
        }
        if let Some(value) = third_party_sharing {
            consent.third_party_sharing = value;
        }
        if let Some(value) = data_retention_period {
            consent.data_retention_period = value;
        }
        consent.consent_given_at = chrono::Utc::now();
        consent.consent_version = "1.0".to_string();

        self.upsert_consent(&consent)?;

        Ok(consent)
    }

    /// Get existing consent or return defaults (without persisting defaults)
    fn get_consent_or_default(&self, user_id: &str) -> Result<DataConsent, String> {
        let conn = self.db.get_connection()?;

        let stored_consent: Option<String> = conn
            .query_row(
                "SELECT consent_data FROM user_consent WHERE user_id = ?",
                params![user_id],
                |row| row.get(0),
            )
            .optional()
            .map_err(|e| format!("Failed to load consent data: {}", e))?;

        match stored_consent {
            Some(payload) => Ok(serde_json::from_str::<DataConsent>(&payload)
                .unwrap_or_else(|_| default_data_consent(user_id))),
            None => Ok(default_data_consent(user_id)),
        }
    }

    /// Persist consent data to the database
    pub fn upsert_consent(&self, consent: &DataConsent) -> Result<(), String> {
        let consent_data = serde_json::to_string(consent)
            .map_err(|e| format!("Failed to serialize consent data: {}", e))?;
        let now = chrono::Utc::now().timestamp_millis();

        let conn = self.db.get_connection()?;
        conn.execute(
            "INSERT INTO user_consent (user_id, consent_data, updated_at)
             VALUES (?, ?, ?)
             ON CONFLICT(user_id) DO UPDATE SET
                 consent_data = excluded.consent_data,
                 updated_at = excluded.updated_at",
            params![consent.user_id, consent_data, now],
        )
        .map_err(|e| format!("Failed to save consent data: {}", e))?;

        info!("Consent data saved for user: {}", consent.user_id);
        Ok(())
    }
}

/// Create default consent values for a user
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_consent_has_correct_values() {
        let consent = default_data_consent("user-123");
        assert_eq!(consent.user_id, "user-123");
        assert!(!consent.analytics_consent);
        assert!(!consent.marketing_consent);
        assert!(!consent.third_party_sharing);
        assert_eq!(consent.data_retention_period, 365);
        assert_eq!(consent.consent_version, "1.0");
    }
}
