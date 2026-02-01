//! Accessibility settings operations
//!
//! This module handles accessibility features and settings
//! including screen reader support, keyboard navigation, and visual aids.

use crate::commands::settings::core::handle_settings_error;
use crate::commands::{ApiResponse, AppError, AppState};
use crate::models::settings::UserAccessibilitySettings;

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
}

/// Update user accessibility settings
#[tauri::command]

pub async fn update_user_accessibility(
    request: UpdateUserAccessibilityRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    info!("Updating user accessibility settings");

    let user = authenticate!(&request.session_token, &state);

    let accessibility_settings = UserAccessibilitySettings {
        high_contrast: request.high_contrast.unwrap_or(false),
        large_text: request.large_text.unwrap_or(false),
        reduce_motion: request.reduce_motion.unwrap_or(false),
        screen_reader: request.screen_reader.unwrap_or(false),
        focus_indicators: request.focus_indicators.unwrap_or(false),
        keyboard_navigation: request.keyboard_navigation.unwrap_or(false),
        text_to_speech: request.text_to_speech.unwrap_or(false),
        speech_rate: request.speech_rate.unwrap_or(1.0),
        font_size: request.font_size.unwrap_or(16),
        color_blind_mode: request.color_blind_mode.unwrap_or_else(|| "none".to_string()),
    };

    state
        .settings_service
        .update_user_accessibility(&user.id, &accessibility_settings)
        .map(|_| ApiResponse::success("Accessibility settings updated successfully".to_string()))
        .map_err(|e| handle_settings_error(e, "Update user accessibility"))
}