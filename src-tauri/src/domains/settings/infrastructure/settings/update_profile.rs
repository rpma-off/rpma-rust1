//! Profile update operations for SettingsService

use crate::commands::AppError;
use crate::domains::settings::domain::models::settings::UserProfileSettings;
use rusqlite::params;
use tracing::error;

const UPDATE_PROFILE_SQL: &str = r#"
    UPDATE user_settings SET
        full_name = ?, email = ?, phone = ?, avatar_url = ?, notes = ?, updated_at = ?
     WHERE user_id = ?
"#;

impl super::SettingsService {
    /// Update user profile fields (name, email, phone, avatar, notes).
    pub fn update_user_profile(
        &self,
        user_id: &str,
        profile: &UserProfileSettings,
    ) -> Result<(), AppError> {
        self.with_settings_tx(user_id, "profile", |tx| {
            tx.execute(
                UPDATE_PROFILE_SQL,
                params![
                    profile.full_name,
                    profile.email,
                    profile.phone,
                    profile.avatar_url,
                    profile.notes,
                    chrono::Utc::now().timestamp_millis(),
                    user_id
                ],
            )
            .map_err(|e| {
                error!("Failed to update user profile for {}: {}", user_id, e);
                AppError::Database("Failed to update user profile".to_string())
            })?;

            let _ = self.log_settings_change(
                tx,
                user_id,
                "profile",
                &format!("Updated profile: {:?}", profile),
            );

            Ok(())
        })
    }

    /// Validate and persist a base64-encoded avatar image for a user.
    ///
    /// All avatar business rules (size limit, allowed MIME types, encoding) are
    /// enforced here rather than in the IPC handler.
    pub fn upload_avatar(
        &self,
        user_id: &str,
        avatar_data: &str,
        mime_type: &str,
    ) -> Result<String, AppError> {
        use base64::{engine::general_purpose, Engine as _};

        let decoded = general_purpose::STANDARD
            .decode(avatar_data)
            .map_err(|e| AppError::Validation(format!("Invalid base64 data: {}", e)))?;

        if decoded.len() > 5 * 1024 * 1024 {
            return Err(AppError::Validation(
                "Avatar file too large (max 5MB)".to_string(),
            ));
        }

        if !["image/jpeg", "image/png", "image/gif", "image/webp"].contains(&mime_type) {
            return Err(AppError::Validation("Unsupported image format".to_string()));
        }

        let data_url = format!("data:{};base64,{}", mime_type.trim(), avatar_data.trim());

        let mut profile = self.get_user_settings(user_id)?.profile;
        profile.avatar_url = Some(data_url.clone());
        self.update_user_profile(user_id, &profile)?;

        Ok(data_url)
    }
}
