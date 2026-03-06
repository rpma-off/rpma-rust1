//! Accessibility settings update operations for SettingsService

use crate::commands::AppError;
use crate::domains::settings::domain::models::settings::UserAccessibilitySettings;
use rusqlite::params;
use tracing::error;

const UPDATE_ACCESSIBILITY_SQL: &str = r#"
    UPDATE user_settings SET
        accessibility_high_contrast = ?, accessibility_large_text = ?, accessibility_reduce_motion = ?,
        accessibility_screen_reader = ?, accessibility_focus_indicators = ?, accessibility_keyboard_navigation = ?,
        accessibility_text_to_speech = ?, accessibility_speech_rate = ?, accessibility_font_size = ?,
        accessibility_color_blind_mode = ?, updated_at = ?
     WHERE user_id = ?
"#;

impl super::SettingsService {
    /// Update accessibility preferences (contrast, font size, screen reader, etc.).
    pub fn update_user_accessibility(
        &self,
        user_id: &str,
        accessibility: &UserAccessibilitySettings,
    ) -> Result<(), AppError> {
        self.with_settings_tx(user_id, "accessibility", |tx| {
            tx.execute(
                UPDATE_ACCESSIBILITY_SQL,
                params![
                    accessibility.high_contrast as i32,
                    accessibility.large_text as i32,
                    accessibility.reduce_motion as i32,
                    accessibility.screen_reader as i32,
                    accessibility.focus_indicators as i32,
                    accessibility.keyboard_navigation as i32,
                    accessibility.text_to_speech as i32,
                    accessibility.speech_rate,
                    accessibility.font_size,
                    accessibility.color_blind_mode,
                    chrono::Utc::now().timestamp_millis(),
                    user_id
                ],
            )
            .map_err(|e| {
                error!(
                    "Failed to update user accessibility settings for {}: {}",
                    user_id, e
                );
                AppError::Database("Failed to update user accessibility settings".to_string())
            })?;

            let _ = self.log_settings_change(
                tx,
                user_id,
                "accessibility",
                &format!(
                    "Updated accessibility settings: high_contrast={}, large_text={}",
                    accessibility.high_contrast, accessibility.large_text
                ),
            );

            Ok(())
        })
    }
}
