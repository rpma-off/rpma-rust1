//! Request contracts for the Notifications bounded context.

use crate::models::notification::{NotificationType, TemplateVariables};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Serialize, Deserialize, TS)]
pub struct SendNotificationRequest {
    pub user_id: String,
    pub notification_type: NotificationType,
    pub recipient: String, // email or phone
    pub variables: TemplateVariables,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, TS)]
pub struct UpdateNotificationConfigRequest {
    pub email_provider: Option<String>,
    pub email_api_key: Option<String>,
    pub email_from_email: Option<String>,
    pub email_from_name: Option<String>,
    pub sms_provider: Option<String>,
    pub sms_api_key: Option<String>,
    pub sms_from_number: Option<String>,
    pub push_enabled: Option<bool>,
    pub quiet_hours_start: Option<String>,
    pub quiet_hours_end: Option<String>,
    pub timezone: Option<String>,
    #[serde(default)]
    pub correlation_id: Option<String>,
}
