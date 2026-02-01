//! Notification models and types

use crate::db::FromSqlRow;
use chrono::{DateTime, Utc};
use rusqlite::{Result as SqliteResult, Row};
use serde::{Deserialize, Serialize};
#[cfg(any(feature = "specta", feature = "ts-rs"))]
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[cfg_attr(any(feature = "specta", feature = "ts-rs"), derive(TS))]
pub enum NotificationChannel {
    Email,
    Sms,
    Push,
}

impl std::fmt::Display for NotificationChannel {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = match self {
            Self::Email => "email",
            Self::Sms => "sms",
            Self::Push => "push",
        };
        write!(f, "{}", s)
    }
}

impl rusqlite::ToSql for NotificationChannel {
    fn to_sql(&self) -> rusqlite::Result<rusqlite::types::ToSqlOutput<'_>> {
        Ok(rusqlite::types::ToSqlOutput::Owned(self.to_string().into()))
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[cfg_attr(any(feature = "specta", feature = "ts-rs"), derive(TS))]
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

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(any(feature = "specta", feature = "ts-rs"), derive(TS))]
pub struct NotificationTemplate {
    pub id: String,
    pub name: String,
    pub notification_type: NotificationType,
    pub channel: NotificationChannel,
    pub subject_template: String, // For email
    pub body_template: String,
    pub variables: Vec<String>, // List of variable names that can be substituted
    pub is_active: bool,
    #[cfg_attr(any(feature = "specta", feature = "ts-rs"), ts(type = "string"))]
    pub created_at: DateTime<Utc>,
    #[cfg_attr(any(feature = "specta", feature = "ts-rs"), ts(type = "string"))]
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(any(feature = "specta", feature = "ts-rs"), derive(TS))]
pub struct NotificationMessage {
    pub id: String,
    pub user_id: String,
    pub notification_type: NotificationType,
    pub channel: NotificationChannel,
    pub recipient: String,       // email address or phone number
    pub subject: Option<String>, // For email
    pub body: String,
    pub priority: NotificationPriority,
    pub status: NotificationStatus,
    #[cfg_attr(any(feature = "specta", feature = "ts-rs"), ts(type = "string"))]
    pub scheduled_at: Option<DateTime<Utc>>,
    #[cfg_attr(any(feature = "specta", feature = "ts-rs"), ts(type = "string"))]
    pub sent_at: Option<DateTime<Utc>>,
    pub error_message: Option<String>,
    #[cfg_attr(any(feature = "specta", feature = "ts-rs"), ts(type = "string"))]
    pub created_at: DateTime<Utc>,
    #[cfg_attr(any(feature = "specta", feature = "ts-rs"), ts(type = "string"))]
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(any(feature = "specta", feature = "ts-rs"), derive(TS))]
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

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(any(feature = "specta", feature = "ts-rs"), derive(TS))]
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

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(any(feature = "specta", feature = "ts-rs"), derive(TS))]
pub struct EmailConfig {
    pub provider: EmailProvider,
    pub api_key: String,
    pub from_email: String,
    pub from_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(any(feature = "specta", feature = "ts-rs"), derive(TS))]
pub enum EmailProvider {
    SendGrid,
    Mailgun,
    Smtp,
}

impl std::fmt::Display for EmailProvider {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = match self {
            Self::SendGrid => "sendgrid",
            Self::Mailgun => "mailgun",
            Self::Smtp => "smtp",
        };
        write!(f, "{}", s)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(any(feature = "specta", feature = "ts-rs"), derive(TS))]
pub struct SmsConfig {
    pub provider: SmsProvider,
    pub api_key: String,
    pub from_number: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(any(feature = "specta", feature = "ts-rs"), derive(TS))]
pub enum SmsProvider {
    Twilio,
    AwsSns,
}

impl std::fmt::Display for SmsProvider {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = match self {
            Self::Twilio => "twilio",
            Self::AwsSns => "aws_sns",
        };
        write!(f, "{}", s)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(any(feature = "specta", feature = "ts-rs"), derive(TS))]
pub struct NotificationConfig {
    pub email: Option<EmailConfig>,
    pub sms: Option<SmsConfig>,
    pub push_enabled: bool,
    pub quiet_hours_start: Option<String>, // HH:MM format
    pub quiet_hours_end: Option<String>,   // HH:MM format
    pub timezone: String,
}

// Template variables for substitution
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(any(feature = "specta", feature = "ts-rs"), derive(TS))]
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

impl Default for NotificationConfig {
    fn default() -> Self {
        Self {
            email: None,
            sms: None,
            push_enabled: true,
            quiet_hours_start: Some("22:00".to_string()),
            quiet_hours_end: Some("08:00".to_string()),
            timezone: "Europe/Paris".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(any(feature = "specta", feature = "ts-rs"), derive(TS))]
pub struct NotificationPreferences {
    pub id: String,
    pub user_id: String,

    pub email_enabled: bool,
    pub sms_enabled: bool,
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

    pub email_frequency: String,
    pub email_digest_time: String,

    #[cfg_attr(any(feature = "specta", feature = "ts-rs"), ts(type = "string"))]
    pub created_at: i64,
    #[cfg_attr(any(feature = "specta", feature = "ts-rs"), ts(type = "string"))]
    pub updated_at: i64,
}

impl NotificationPreferences {
    pub fn new(user_id: String) -> Self {
        let now = chrono::Utc::now().timestamp();
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            user_id,
            email_enabled: true,
            sms_enabled: false,
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
            email_frequency: "immediate".to_string(),
            email_digest_time: "09:00".to_string(),
            created_at: now,
            updated_at: now,
        }
    }

    pub fn from_row(row: &Row) -> SqliteResult<Self> {
        Ok(Self {
            id: row.get("id")?,
            user_id: row.get("user_id")?,
            email_enabled: row.get::<_, i32>("email_enabled")? == 1,
            sms_enabled: row.get::<_, i32>("sms_enabled")? == 1,
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
            email_frequency: row.get("email_frequency")?,
            email_digest_time: row.get("email_digest_time")?,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
        })
    }
}

impl FromSqlRow for NotificationPreferences {
    fn from_row(row: &Row) -> SqliteResult<Self> {
        Self::from_row(row)
    }
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
        let now = Utc::now();
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
        Ok(Self {
            id: row.get("id")?,
            name: row.get("name")?,
            notification_type: row
                .get::<_, Option<String>>("notification_type")?
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
                    "email" => Some(NotificationChannel::Email),
                    "sms" => Some(NotificationChannel::Sms),
                    "push" => Some(NotificationChannel::Push),
                    _ => None,
                })
                .unwrap_or(NotificationChannel::Email),
            subject_template: row.get("subject")?,
            body_template: row.get("body")?,
            variables: row
                .get::<_, Option<String>>("variables")?
                .and_then(|s| serde_json::from_str(&s).ok())
                .unwrap_or_default(),
            is_active: row.get::<_, i32>("is_active")? == 1,
            created_at: DateTime::from_timestamp_millis(row.get("created_at")?)
                .unwrap_or_else(|| Utc::now()),
            updated_at: DateTime::from_timestamp_millis(row.get("updated_at")?)
                .unwrap_or_else(|| Utc::now()),
        })
    }
}

impl FromSqlRow for NotificationTemplate {
    fn from_row(row: &Row) -> SqliteResult<Self> {
        Self::from_row(row)
    }
}

impl NotificationMessage {
    pub fn new(
        user_id: String,
        notification_type: NotificationType,
        channel: NotificationChannel,
        recipient: String,
        subject: Option<String>,
        body: String,
        priority: NotificationPriority,
    ) -> Self {
        let now = Utc::now();
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            user_id,
            notification_type,
            channel,
            recipient,
            subject,
            body,
            priority,
            status: NotificationStatus::Pending,
            scheduled_at: None,
            sent_at: None,
            error_message: None,
            created_at: now,
            updated_at: now,
        }
    }
}
