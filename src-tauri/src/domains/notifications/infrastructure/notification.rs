//! Notification service — in-app only.
//!
//! External delivery channels (Email, SMS, Push) are not implemented.
//! This service manages notification configuration and quiet hours logic
//! for in-app notifications only.

use crate::domains::notifications::domain::models::notification::NotificationConfig;
use chrono::Utc;
use chrono_tz::Europe;
use std::sync::Arc;
use tokio::sync::Mutex;

/// In-app notification configuration service.
#[derive(Clone)]
pub struct NotificationService {
    config: Arc<Mutex<NotificationConfig>>,
}

impl NotificationService {
    /// Create a new NotificationService with the given configuration.
    pub fn new(config: NotificationConfig) -> Self {
        Self {
            config: Arc::new(Mutex::new(config)),
        }
    }

    /// Update configuration at runtime.
    pub async fn update_config(&self, config: NotificationConfig) {
        let mut current_config = self.config.lock().await;
        *current_config = config;
    }

    /// Check whether the current time falls within quiet hours.
    pub async fn is_quiet_hours(&self) -> bool {
        let config = self.get_config().await;
        let now = Utc::now().with_timezone(&Europe::Paris);

        if let (Some(start), Some(end)) = (&config.quiet_hours_start, &config.quiet_hours_end) {
            let start_time = chrono::NaiveTime::parse_from_str(start, "%H:%M").unwrap_or(
                chrono::NaiveTime::from_hms_opt(22, 0, 0).expect("22:00:00 is a valid time"),
            );
            let end_time = chrono::NaiveTime::parse_from_str(end, "%H:%M").unwrap_or(
                chrono::NaiveTime::from_hms_opt(8, 0, 0).expect("08:00:00 is a valid time"),
            );

            let current_time = now.time();
            if start_time <= end_time {
                current_time >= start_time && current_time <= end_time
            } else {
                current_time >= start_time || current_time <= end_time
            }
        } else {
            false
        }
    }

    /// Return the current configuration snapshot.
    pub async fn get_config(&self) -> NotificationConfig {
        self.config.lock().await.clone()
    }
}
