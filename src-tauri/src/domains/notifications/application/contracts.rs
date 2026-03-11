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
    pub recipient: String, // email or phone
    pub variables: TemplateVariables,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Request to update notification service configuration.
///
/// Only `quiet_hours_*` and `timezone` have an effect. The `email_*`,
/// `sms_*`, and `push_enabled` fields are NOT IMPLEMENTED and are
/// retained for API/schema compatibility only.
#[derive(Debug, Serialize, Deserialize, TS)]
pub struct UpdateNotificationConfigRequest {
    /// NOT IMPLEMENTED — no email delivery.
    pub email_provider: Option<String>,
    /// NOT IMPLEMENTED — no email delivery.
    pub email_api_key: Option<String>,
    /// NOT IMPLEMENTED — no email delivery.
    pub email_from_email: Option<String>,
    /// NOT IMPLEMENTED — no email delivery.
    pub email_from_name: Option<String>,
    /// NOT IMPLEMENTED — no SMS delivery.
    pub sms_provider: Option<String>,
    /// NOT IMPLEMENTED — no SMS delivery.
    pub sms_api_key: Option<String>,
    /// NOT IMPLEMENTED — no SMS delivery.
    pub sms_from_number: Option<String>,
    /// NOT IMPLEMENTED — no push delivery.
    pub push_enabled: Option<bool>,
    pub quiet_hours_start: Option<String>,
    pub quiet_hours_end: Option<String>,
    pub timezone: Option<String>,
    #[serde(default)]
    pub correlation_id: Option<String>,
}
