//! Quiet-hours configuration state for the notifications domain.
//!
//! Despite the name, `NotificationService` is NOT a business service. It is a
//! process-wide configuration holder for quiet-hours windows and timezone. It
//! does not send, route, or process any notifications.
//!
//! Actual notification business logic lives in:
//! - `facade::NotificationsFacade` — application facade used by IPC handlers
//! - `message_service::MessageService` — multi-channel message dispatch
//!
//! The `lazy_static` singleton is initialized at startup via the
//! `initialize_notification_service` IPC command and read by `get_notification_status`.

use lazy_static::lazy_static;
use std::sync::Arc;
use tokio::sync::Mutex;

use crate::domains::notifications::models::NotificationConfig;

lazy_static! {
    static ref NOTIFICATION_SERVICE: Arc<Mutex<Option<NotificationService>>> =
        Arc::new(Mutex::new(None));
}

/// Process-wide holder for notification quiet-hours configuration.
///
/// This is a config/state container, not a business service. For notification
/// creation and retrieval, use `NotificationsFacade`.
#[derive(Clone)]
pub struct NotificationService {
    config: Arc<Mutex<NotificationConfig>>,
}

impl NotificationService {
    pub fn new(config: NotificationConfig) -> Self {
        Self {
            config: Arc::new(Mutex::new(config)),
        }
    }

    pub async fn update_config(&self, config: NotificationConfig) {
        let mut current_config = self.config.lock().await;
        *current_config = config;
    }

    pub async fn is_quiet_hours(&self) -> bool {
        use chrono::Utc;
        use chrono_tz::Europe;
        let config = self.get_config().await;
        let now = Utc::now().with_timezone(&Europe::Paris);

        if let (Some(start), Some(end)) = (&config.quiet_hours_start, &config.quiet_hours_end) {
            let start_time =
                chrono::NaiveTime::parse_from_str(start, "%H:%M").unwrap_or_else(|_| {
                    chrono::NaiveTime::from_hms_opt(22, 0, 0).unwrap_or(chrono::NaiveTime::MIN)
                });
            let end_time = chrono::NaiveTime::parse_from_str(end, "%H:%M").unwrap_or_else(|_| {
                chrono::NaiveTime::from_hms_opt(8, 0, 0).unwrap_or(chrono::NaiveTime::MIN)
            });
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

    pub async fn get_config(&self) -> NotificationConfig {
        self.config.lock().await.clone()
    }

    /// Initialize the process-wide notification service with the given config.
    pub async fn initialize_global(config: NotificationConfig) {
        let service = NotificationService::new(config);
        *NOTIFICATION_SERVICE.lock().await = Some(service);
    }

    /// Return the status of the process-wide notification service as JSON.
    pub async fn get_global_status() -> serde_json::Value {
        if NOTIFICATION_SERVICE.lock().await.is_some() {
            serde_json::json!({ "initialized": true, "channels": ["in_app"] })
        } else {
            serde_json::json!({ "initialized": false })
        }
    }
}
