//! Accessibility settings operations
//!
//! This module handles accessibility features and settings
//! including screen reader support, keyboard navigation, and visual aids.

use crate::commands::{ApiResponse, AppError, AppState};
use crate::domains::settings::ipc::settings::core::handle_settings_error;
use crate::domains::settings::domain::models::settings::UserAccessibilitySettings;

use serde::Deserialize;
use tracing::info;

// Import authentication macros
use crate::authenticate;

#[derive(Deserialize)]
pub struct UpdateUserAccessibilityRequest {
    pub session_token: String,
    pub high_contrast: Option<bool>,
    pub large_text: Option<bool>,
    pub reduce_motion: Option<bool>,
    pub screen_reader: Option<bool>,
    pub focus_indicators: Option<bool>,
    pub keyboard_navigation: Option<bool>,
    pub text_to_speech: Option<bool>,
    pub speech_rate: Option<f32>,
    pub font_size: Option<u32>,
    pub color_blind_mode: Option<String>,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Update user accessibility settings
#[tracing::instrument(skip_all)]
#[tauri::command]

pub async fn update_user_accessibility(
    request: UpdateUserAccessibilityRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    let _correlation_id = crate::commands::init_correlation_context(&request.correlation_id, None);
    info!("Updating user accessibility settings");

    let correlation_id_clone = request.correlation_id.clone();
    let user = authenticate!(&request.session_token, &state);
    crate::commands::update_correlation_context_user(&user.id);

    let mut accessibility_settings: UserAccessibilitySettings = state
        .settings_service
        .get_user_settings(&user.id)
        .map_err(|e| handle_settings_error(e, "Load user accessibility settings"))?
        .accessibility;

    if let Some(value) = request.high_contrast {
        accessibility_settings.high_contrast = value;
    }
    if let Some(value) = request.large_text {
        accessibility_settings.large_text = value;
    }
    if let Some(value) = request.reduce_motion {
        accessibility_settings.reduce_motion = value;
    }
    if let Some(value) = request.screen_reader {
        accessibility_settings.screen_reader = value;
    }
    if let Some(value) = request.focus_indicators {
        accessibility_settings.focus_indicators = value;
    }
    if let Some(value) = request.keyboard_navigation {
        accessibility_settings.keyboard_navigation = value;
    }
    if let Some(value) = request.text_to_speech {
        accessibility_settings.text_to_speech = value;
    }
    if let Some(value) = request.speech_rate {
        accessibility_settings.speech_rate = value;
    }
    if let Some(value) = request.font_size {
        accessibility_settings.font_size = value;
    }
    if let Some(value) = request.color_blind_mode {
        accessibility_settings.color_blind_mode = value;
    }

    state
        .settings_service
        .update_user_accessibility(&user.id, &accessibility_settings)
        .map(|_| {
            ApiResponse::success("Accessibility settings updated successfully".to_string())
                .with_correlation_id(correlation_id_clone.clone())
        })
        .map_err(|e| handle_settings_error(e, "Update user accessibility"))
}
