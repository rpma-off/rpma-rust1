use crate::db::FromSqlRow;
use rusqlite::Row;
use serde::{Deserialize, Serialize};
// Conditional import removed
use ts_rs::TS;

/// Message types supported by the system
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

/// Message status enumeration
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

/// Message priority levels
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

    pub fn to_str(&self) -> &'static str {
        match self {
            MessagePriority::Low => "low",
            MessagePriority::Normal => "normal",
            MessagePriority::High => "high",
            MessagePriority::Urgent => "urgent",
        }
    }
}

/// Message entity representing a single message
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct Message {
    pub id: String,
    pub message_type: String, // Using String for database compatibility
    pub sender_id: Option<String>,
    pub recipient_id: Option<String>,
    pub recipient_email: Option<String>,
    pub recipient_phone: Option<String>,
    pub subject: Option<String>,
    pub body: String,
    pub template_id: Option<String>,
    pub task_id: Option<String>,
    pub client_id: Option<String>,
    pub status: String,   // Using String for database compatibility
    pub priority: String, // Using String for database compatibility
    pub scheduled_at: Option<i64>,
    pub sent_at: Option<i64>,
    pub read_at: Option<i64>,
    pub error_message: Option<String>,
    pub metadata: Option<String>, // JSON string
    pub created_at: i64,
    pub updated_at: i64,
}

/// Request to send a new message
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

/// Message template for reusable messages
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct MessageTemplate {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub message_type: String,
    pub subject: Option<String>,
    pub body: String,
    pub variables: Option<String>, // JSON array
    pub category: String,
    pub is_active: bool,
    pub created_by: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

/// Request to create/update a message template
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

/// User notification preferences
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct NotificationPreferences {
    pub id: String,
    pub user_id: String,

    // Channel preferences
    pub email_enabled: bool,
    pub sms_enabled: bool,
    pub in_app_enabled: bool,

    // Task notifications
    pub task_assigned: bool,
    pub task_updated: bool,
    pub task_completed: bool,
    pub task_overdue: bool,

    // Client notifications
    pub client_created: bool,
    pub client_updated: bool,

    // System notifications
    pub system_alerts: bool,
    pub maintenance_notifications: bool,

    // Quiet hours
    pub quiet_hours_enabled: bool,
    pub quiet_hours_start: Option<String>,
    pub quiet_hours_end: Option<String>,

    // Email settings
    pub email_frequency: String,
    pub email_digest_time: String,

    pub created_at: i64,
    pub updated_at: i64,
}

/// Request to update notification preferences
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct UpdateNotificationPreferencesRequest {
    pub email_enabled: Option<bool>,
    pub sms_enabled: Option<bool>,
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
    pub email_frequency: Option<String>,
    pub email_digest_time: Option<String>,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Message query filters
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

/// Message list response
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct MessageListResponse {
    pub messages: Vec<Message>,
    pub total: i32,
    pub has_more: bool,
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
