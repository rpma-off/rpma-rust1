//! Notification domain models — all pure types, zero SQL dependencies.

use crate::db::FromSqlRow;
use chrono::{DateTime, Utc};
use rusqlite::{Result as SqliteResult, Row};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

// ── Notification channel / type enums ────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, TS)]
pub enum NotificationChannel {
    InApp,
}

impl std::fmt::Display for NotificationChannel {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "in_app")
    }
}

impl rusqlite::ToSql for NotificationChannel {
    fn to_sql(&self) -> rusqlite::Result<rusqlite::types::ToSqlOutput<'_>> {
        Ok(rusqlite::types::ToSqlOutput::Owned(self.to_string().into()))
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, TS)]
pub enum NotificationType {
    TaskAssignment,
    TaskUpdate,
    TaskCompletion,
    StatusChange,
    OverdueWarning,
    SystemAlert,
    NewAssignment,
    DeadlineReminder,
    QualityApproval,
}

impl std::fmt::Display for NotificationType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = match self {
            Self::TaskAssignment => "task_assignment",
            Self::TaskUpdate => "task_update",
            Self::TaskCompletion => "task_completion",
            Self::StatusChange => "status_change",
            Self::OverdueWarning => "overdue_warning",
            Self::SystemAlert => "system_alert",
            Self::NewAssignment => "new_assignment",
            Self::DeadlineReminder => "deadline_reminder",
            Self::QualityApproval => "quality_approval",
        };
        write!(f, "{}", s)
    }
}

impl rusqlite::ToSql for NotificationType {
    fn to_sql(&self) -> rusqlite::Result<rusqlite::types::ToSqlOutput<'_>> {
        Ok(rusqlite::types::ToSqlOutput::Owned(self.to_string().into()))
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub enum NotificationPriority {
    Low,
    Normal,
    High,
    Critical,
}

impl std::fmt::Display for NotificationPriority {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = match self {
            Self::Low => "low",
            Self::Normal => "normal",
            Self::High => "high",
            Self::Critical => "critical",
        };
        write!(f, "{}", s)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub enum NotificationStatus {
    Pending,
    Sent,
    Failed,
    Cancelled,
}

impl std::fmt::Display for NotificationStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = match self {
            Self::Pending => "pending",
            Self::Sent => "sent",
            Self::Failed => "failed",
            Self::Cancelled => "cancelled",
        };
        write!(f, "{}", s)
    }
}

// ── Config & template types ───────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct NotificationConfig {
    pub quiet_hours_start: Option<String>,
    pub quiet_hours_end: Option<String>,
    pub timezone: String,
}

impl Default for NotificationConfig {
    fn default() -> Self {
        Self {
            quiet_hours_start: Some("22:00".to_string()),
            quiet_hours_end: Some("08:00".to_string()),
            timezone: "Europe/Paris".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct TemplateVariables {
    pub user_name: Option<String>,
    pub task_title: Option<String>,
    pub task_id: Option<String>,
    pub client_name: Option<String>,
    pub due_date: Option<String>,
    pub status: Option<String>,
    pub priority: Option<String>,
    pub assignee_name: Option<String>,
    pub system_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct NotificationTemplate {
    pub id: String,
    pub name: String,
    pub notification_type: NotificationType,
    pub channel: NotificationChannel,
    pub subject_template: String,
    pub body_template: String,
    pub variables: Vec<String>,
    pub is_active: bool,
    pub created_at: i64,
    pub updated_at: i64,
}

impl NotificationTemplate {
    pub fn new(
        id: String,
        name: String,
        notification_type: NotificationType,
        channel: NotificationChannel,
        subject_template: String,
        body_template: String,
        variables: Vec<String>,
    ) -> Self {
        let now = chrono::Utc::now().timestamp_millis();
        Self {
            id,
            name,
            notification_type,
            channel,
            subject_template,
            body_template,
            variables,
            is_active: true,
            created_at: now,
            updated_at: now,
        }
    }

    pub fn from_row(row: &Row) -> SqliteResult<Self> {
        let notification_type_value: Option<String> = row
            .get("notification_type")
            .or_else(|_| row.get("message_type"))
            .unwrap_or(None);

        Ok(Self {
            id: row.get("id")?,
            name: row.get("name")?,
            notification_type: notification_type_value
                .and_then(|s| match s.as_str() {
                    "task_assignment" => Some(NotificationType::TaskAssignment),
                    "task_update" => Some(NotificationType::TaskUpdate),
                    "task_completion" => Some(NotificationType::TaskCompletion),
                    "status_change" => Some(NotificationType::StatusChange),
                    "overdue_warning" => Some(NotificationType::OverdueWarning),
                    "system_alert" => Some(NotificationType::SystemAlert),
                    "new_assignment" => Some(NotificationType::NewAssignment),
                    "deadline_reminder" => Some(NotificationType::DeadlineReminder),
                    "quality_approval" => Some(NotificationType::QualityApproval),
                    _ => None,
                })
                .unwrap_or(NotificationType::SystemAlert),
            channel: row
                .get::<_, Option<String>>("channel")?
                .and_then(|s| match s.as_str() {
                    "in_app" => Some(NotificationChannel::InApp),
                    _ => None,
                })
                .unwrap_or(NotificationChannel::InApp),
            subject_template: row.get("subject")?,
            body_template: row.get("body")?,
            variables: row
                .get::<_, Option<String>>("variables")?
                .and_then(|s| serde_json::from_str(&s).ok())
                .unwrap_or_default(),
            is_active: row.get::<_, i32>("is_active")? == 1,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
        })
    }
}

impl FromSqlRow for NotificationTemplate {
    fn from_row(row: &Row) -> SqliteResult<Self> {
        Self::from_row(row)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct NotificationMessage {
    pub id: String,
    pub user_id: String,
    pub notification_type: NotificationType,
    pub channel: NotificationChannel,
    pub recipient: String,
    pub subject: Option<String>,
    pub body: String,
    pub priority: NotificationPriority,
    pub status: NotificationStatus,
    pub scheduled_at: Option<i64>,
    pub sent_at: Option<i64>,
    pub error_message: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct Notification {
    pub id: String,
    pub created_at: i64,
    pub r#type: String,
    pub title: String,
    pub message: String,
    pub entity_type: String,
    pub entity_id: String,
    pub entity_url: String,
    pub read: bool,
    pub user_id: String,
}

impl Notification {
    pub fn new(
        user_id: String,
        r#type: String,
        title: String,
        message: String,
        entity_type: String,
        entity_id: String,
        entity_url: String,
    ) -> Self {
        Self {
            id: crate::shared::utils::uuid::generate_uuid_string(),
            created_at: chrono::Utc::now().timestamp_millis(),
            r#type,
            title,
            message,
            entity_type,
            entity_id,
            entity_url,
            read: false,
            user_id,
        }
    }
}

impl FromSqlRow for Notification {
    fn from_row(row: &Row) -> SqliteResult<Self> {
        let created_at: i64 = row.get("created_at")?;
        Ok(Self {
            id: row.get("id")?,
            created_at,
            r#type: row.get("type")?,
            title: row.get("title")?,
            message: row.get("message")?,
            entity_type: row.get("entity_type")?,
            entity_id: row.get("entity_id")?,
            entity_url: row.get("entity_url")?,
            read: row.get::<_, i32>("read")? == 1,
            user_id: row.get("user_id")?,
        })
    }
}

// ── NotificationPreferences (merged from both domain model files) ─────────────

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct NotificationPreferences {
    pub id: String,
    pub user_id: String,
    pub in_app_enabled: bool,
    pub task_assigned: bool,
    pub task_updated: bool,
    pub task_completed: bool,
    pub task_overdue: bool,
    pub client_created: bool,
    pub client_updated: bool,
    pub system_alerts: bool,
    pub maintenance_notifications: bool,
    pub quiet_hours_enabled: bool,
    pub quiet_hours_start: Option<String>,
    pub quiet_hours_end: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

impl NotificationPreferences {
    pub fn new(user_id: String) -> Self {
        let now = chrono::Utc::now().timestamp_millis();
        Self {
            id: crate::shared::utils::uuid::generate_uuid_string(),
            user_id,
            in_app_enabled: true,
            task_assigned: true,
            task_updated: true,
            task_completed: true,
            task_overdue: true,
            client_created: true,
            client_updated: true,
            system_alerts: true,
            maintenance_notifications: true,
            quiet_hours_enabled: false,
            quiet_hours_start: None,
            quiet_hours_end: None,
            created_at: now,
            updated_at: now,
        }
    }
}

impl FromSqlRow for NotificationPreferences {
    fn from_row(row: &Row) -> SqliteResult<Self> {
        Ok(Self {
            id: row.get("id")?,
            user_id: row.get("user_id")?,
            in_app_enabled: row.get::<_, i32>("in_app_enabled")? == 1,
            task_assigned: row.get::<_, i32>("task_assigned")? == 1,
            task_updated: row.get::<_, i32>("task_updated")? == 1,
            task_completed: row.get::<_, i32>("task_completed")? == 1,
            task_overdue: row.get::<_, i32>("task_overdue")? == 1,
            client_created: row.get::<_, i32>("client_created")? == 1,
            client_updated: row.get::<_, i32>("client_updated")? == 1,
            system_alerts: row.get::<_, i32>("system_alerts")? == 1,
            maintenance_notifications: row.get::<_, i32>("maintenance_notifications")? == 1,
            quiet_hours_enabled: row.get::<_, i32>("quiet_hours_enabled")? == 1,
            quiet_hours_start: row.get("quiet_hours_start")?,
            quiet_hours_end: row.get("quiet_hours_end")?,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
        })
    }
}

// ── Message types ─────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, TS)]
#[ts(export)]
pub enum MessageType {
    Email,
    Sms,
    InApp,
}

impl MessageType {
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "email" => Some(MessageType::Email),
            "sms" => Some(MessageType::Sms),
            "in_app" => Some(MessageType::InApp),
            _ => None,
        }
    }
    pub fn to_str(&self) -> &'static str {
        match self {
            MessageType::Email => "email",
            MessageType::Sms => "sms",
            MessageType::InApp => "in_app",
        }
    }
}

impl std::fmt::Display for MessageType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.to_str())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, TS)]
#[ts(export)]
pub enum MessageStatus {
    Pending,
    Sent,
    Delivered,
    Failed,
    Read,
}

impl MessageStatus {
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "pending" => Some(MessageStatus::Pending),
            "sent" => Some(MessageStatus::Sent),
            "delivered" => Some(MessageStatus::Delivered),
            "failed" => Some(MessageStatus::Failed),
            "read" => Some(MessageStatus::Read),
            _ => None,
        }
    }
    pub fn to_str(&self) -> &'static str {
        match self {
            MessageStatus::Pending => "pending",
            MessageStatus::Sent => "sent",
            MessageStatus::Delivered => "delivered",
            MessageStatus::Failed => "failed",
            MessageStatus::Read => "read",
        }
    }
}

impl std::fmt::Display for MessageStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.to_str())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, TS)]
#[ts(export)]
pub enum MessagePriority {
    Low,
    Normal,
    High,
    Urgent,
}

impl MessagePriority {
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "low" => Some(MessagePriority::Low),
            "normal" => Some(MessagePriority::Normal),
            "high" => Some(MessagePriority::High),
            "urgent" => Some(MessagePriority::Urgent),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct Message {
    pub id: String,
    pub message_type: String,
    pub sender_id: Option<String>,
    pub recipient_id: Option<String>,
    pub recipient_email: Option<String>,
    pub recipient_phone: Option<String>,
    pub subject: Option<String>,
    pub body: String,
    pub template_id: Option<String>,
    pub task_id: Option<String>,
    pub client_id: Option<String>,
    pub status: String,
    pub priority: String,
    pub scheduled_at: Option<i64>,
    pub sent_at: Option<i64>,
    pub read_at: Option<i64>,
    pub error_message: Option<String>,
    pub metadata: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

impl FromSqlRow for Message {
    fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Message {
            id: row.get("id")?,
            message_type: row.get("message_type")?,
            sender_id: row.get("sender_id")?,
            recipient_id: row.get("recipient_id")?,
            recipient_email: row.get("recipient_email")?,
            recipient_phone: row.get("recipient_phone")?,
            subject: row.get("subject")?,
            body: row.get("body")?,
            template_id: row.get("template_id")?,
            task_id: row.get("task_id")?,
            client_id: row.get("client_id")?,
            status: row.get("status")?,
            priority: row.get("priority")?,
            scheduled_at: row.get("scheduled_at")?,
            sent_at: row.get("sent_at")?,
            read_at: row.get("read_at")?,
            error_message: row.get("error_message")?,
            metadata: row.get("metadata")?,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct SendMessageRequest {
    pub message_type: String,
    pub recipient_id: Option<String>,
    pub recipient_email: Option<String>,
    pub recipient_phone: Option<String>,
    pub subject: Option<String>,
    pub body: String,
    pub template_id: Option<String>,
    pub task_id: Option<String>,
    pub client_id: Option<String>,
    pub priority: Option<String>,
    pub scheduled_at: Option<i64>,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct MessageTemplate {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub message_type: String,
    pub subject: Option<String>,
    pub body: String,
    pub variables: Option<String>,
    pub category: String,
    pub is_active: bool,
    pub created_by: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct MessageTemplateRequest {
    pub name: String,
    pub description: Option<String>,
    pub message_type: String,
    pub subject: Option<String>,
    pub body: String,
    pub variables: Option<Vec<String>>,
    pub category: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct UpdateNotificationPreferencesRequest {
    pub in_app_enabled: Option<bool>,
    pub task_assigned: Option<bool>,
    pub task_updated: Option<bool>,
    pub task_completed: Option<bool>,
    pub task_overdue: Option<bool>,
    pub client_created: Option<bool>,
    pub client_updated: Option<bool>,
    pub system_alerts: Option<bool>,
    pub maintenance_notifications: Option<bool>,
    pub quiet_hours_enabled: Option<bool>,
    pub quiet_hours_start: Option<String>,
    pub quiet_hours_end: Option<String>,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, TS)]
#[ts(export)]
pub struct MessageQuery {
    pub message_type: Option<String>,
    pub sender_id: Option<String>,
    pub recipient_id: Option<String>,
    pub task_id: Option<String>,
    pub client_id: Option<String>,
    pub status: Option<String>,
    pub priority: Option<String>,
    pub date_from: Option<i64>,
    pub date_to: Option<i64>,
    pub limit: Option<i32>,
    pub offset: Option<i32>,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct MessageListResponse {
    pub messages: Vec<Message>,
    pub total: i32,
    pub has_more: bool,
}

/// Request to send a notification (used by cross-domain callers and type export).
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct SendNotificationRequest {
    pub user_id: String,
    pub notification_type: String,
    pub title: String,
    pub message: String,
    pub entity_type: String,
    pub entity_id: String,
    pub entity_url: String,
    #[serde(default)]
    pub correlation_id: Option<String>,
}
