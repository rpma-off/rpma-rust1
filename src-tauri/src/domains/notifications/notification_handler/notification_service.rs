use std::sync::Arc;
use tokio::sync::Mutex;

use crate::domains::notifications::models::NotificationConfig;

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
        use chrono_tz::Europe;
        use chrono::Utc;
        let config = self.get_config().await;
        let now = Utc::now().with_timezone(&Europe::Paris);

        if let (Some(start), Some(end)) = (&config.quiet_hours_start, &config.quiet_hours_end) {
            let start_time = chrono::NaiveTime::parse_from_str(start, "%H:%M")
                .unwrap_or_else(|_| {
                    chrono::NaiveTime::from_hms_opt(22, 0, 0).unwrap_or(chrono::NaiveTime::MIN)
                });
            let end_time = chrono::NaiveTime::parse_from_str(end, "%H:%M")
                .unwrap_or_else(|_| {
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
}
