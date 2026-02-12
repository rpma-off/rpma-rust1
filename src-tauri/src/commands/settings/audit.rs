//! Settings audit and data consent operations
//!
//! This module handles data consent management, audit logging,
//! and GDPR-compliant data operations.

use crate::commands::settings::core::authenticate_user;
use crate::commands::{ApiResponse, AppError, AppState};
use crate::services::consent::ConsentService;

use serde::{Deserialize, Serialize};
use std::sync::Arc;
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

/// Get data consent information
#[tauri::command]

pub async fn get_data_consent(
    session_token: String,
    state: AppState<'_>,
) -> Result<ApiResponse<DataConsent>, AppError> {
    info!("Getting data consent information");

    let user = authenticate_user(&session_token, &state)?;
    let consent_service = ConsentService::new(Arc::new((*state.db).clone()));

    let consent = consent_service
        .get_consent(&user.id)
        .map_err(|e| AppError::Database(format!("Failed to get consent data: {}", e)))?;

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
    let consent_service = ConsentService::new(Arc::new((*state.db).clone()));

    let consent = consent_service
        .update_consent(
            &user.user_id,
            request.analytics_consent,
            request.marketing_consent,
            request.third_party_sharing,
            request.data_retention_period,
        )
        .map_err(|e| AppError::Database(format!("Failed to update consent data: {}", e)))?;

    Ok(ApiResponse::success(consent))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_consent_values_are_initialized() {
        let consent = DataConsent {
            user_id: "user-123".to_string(),
            analytics_consent: false,
            marketing_consent: false,
            third_party_sharing: false,
            data_retention_period: 365,
            consent_given_at: chrono::Utc::now(),
            consent_version: "1.0".to_string(),
        };
        assert_eq!(consent.user_id, "user-123");
        assert!(!consent.analytics_consent);
        assert!(!consent.marketing_consent);
        assert!(!consent.third_party_sharing);
        assert_eq!(consent.data_retention_period, 365);
        assert_eq!(consent.consent_version, "1.0");
    }
}
