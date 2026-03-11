//! Request contracts for the Notifications bounded context.

use crate::domains::notifications::domain::models::notification::{
    NotificationType, TemplateVariables,
};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// TODO: document
#[derive(Debug, Serialize, Deserialize, TS)]
pub struct SendNotificationRequest {
    pub user_id: String,
    pub notification_type: NotificationType,
    pub recipient: String,
    pub variables: TemplateVariables,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Request to update notification service configuration.
#[derive(Debug, Serialize, Deserialize, TS)]
pub struct UpdateNotificationConfigRequest {
    pub quiet_hours_start: Option<String>,
    pub quiet_hours_end: Option<String>,
    pub timezone: Option<String>,
    #[serde(default)]
    pub correlation_id: Option<String>,
}
