//! Performance settings update operations for SettingsService

use crate::commands::AppError;
use crate::domains::settings::domain::models::settings::UserPerformanceSettings;
use rusqlite::params;
use tracing::error;

const UPDATE_PERFORMANCE_SQL: &str = r#"
    UPDATE user_settings SET
        cache_enabled = ?, cache_size = ?, offline_mode = ?, sync_on_startup = ?,
        background_sync = ?, image_compression = ?, preload_data = ?, updated_at = ?
     WHERE user_id = ?
"#;

impl super::SettingsService {
    /// Update performance/caching preferences (cache, sync, compression).
    pub fn update_user_performance(
        &self,
        user_id: &str,
        performance: &UserPerformanceSettings,
    ) -> Result<(), AppError> {
        self.with_settings_tx(user_id, "performance", |tx| {
            tx.execute(
                UPDATE_PERFORMANCE_SQL,
                params![
                    performance.cache_enabled as i32,
                    performance.cache_size,
                    performance.offline_mode as i32,
                    performance.sync_on_startup as i32,
                    performance.background_sync as i32,
                    performance.image_compression as i32,
                    performance.preload_data as i32,
                    chrono::Utc::now().timestamp_millis(),
                    user_id
                ],
            )
            .map_err(|e| {
                error!(
                    "Failed to update user performance settings for {}: {}",
                    user_id, e
                );
                AppError::Database("Failed to update user performance settings".to_string())
            })?;

            let _ = self.log_settings_change(
                tx,
                user_id,
                "performance",
                &format!(
                    "Updated performance settings: cache_enabled={}, cache_size={}, offline_mode={}",
                    performance.cache_enabled, performance.cache_size, performance.offline_mode
                ),
            );

            Ok(())
        })
    }
}
