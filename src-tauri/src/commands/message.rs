//! Message commands using MessageService
//! 
//! This module provides Tauri commands for message operations,
//! delegating business logic to the MessageService.

use crate::commands::{AppError, AppState};
use crate::models::message::*;
use crate::repositories::message_repository::MessageQuery as RepoMessageQuery;

/// Send a new message
#[tauri::command]
pub async fn message_send(
    request: SendMessageRequest,
    state: AppState<'_>,
) -> Result<Message, AppError> {
    // Generate ID
    let id = format!("{:x}", rand::random::<u128>());
    let now = chrono::Utc::now().timestamp();

    // Create message entity
    let message = Message {
        id: id.clone(),
        message_type: request.message_type,
        sender_id: None, // sender_id - would come from session
        recipient_id: request.recipient_id,
        recipient_email: request.recipient_email,
        recipient_phone: request.recipient_phone,
        subject: request.subject,
        body: request.body,
        template_id: request.template_id,
        task_id: request.task_id,
        client_id: request.client_id,
        status: "pending".to_string(),
        priority: request.priority.unwrap_or_else(|| "normal".to_string()),
        scheduled_at: request.scheduled_at,
        sent_at: None,
        read_at: None,
        error_message: None,
        metadata: None,
        created_at: now,
        updated_at: now,
    };

    // Send message through service
    state.message_service.send_message(message).await
}

/// Get messages with filtering and pagination
#[tauri::command]
pub async fn message_get_list(
    query: MessageQuery,
    state: AppState<'_>,
) -> Result<MessageListResponse, AppError> {
    // Convert MessageQuery to RepoMessageQuery
    let repo_query = RepoMessageQuery {
        search: None,
        message_type: query.message_type.and_then(|t| t.parse().ok()),
        status: query.status.and_then(|s| s.parse().ok()),
        sender_id: query.sender_id,
        recipient_id: query.recipient_id,
        task_id: query.task_id,
        client_id: query.client_id,
        date_from: query.date_from,
        date_to: query.date_to,
        limit: query.limit.map(|l| l as i64),
        offset: query.offset.map(|o| o as i64),
        sort_by: None,
        sort_order: None,
    };

    // Get messages through service
    let (messages, total) = state.message_service.get_messages(repo_query).await?;
    
    let offset = query.offset.unwrap_or(0);
    let has_more = (offset + messages.len() as i32) < total as i32;

    Ok(MessageListResponse {
        messages,
        total: total as i32,
        has_more,
    })
}

/// Mark message as read
#[tauri::command]
pub async fn message_mark_read(
    message_id: String,
    state: AppState<'_>,
) -> Result<(), AppError> {
    state.message_service.mark_read(&message_id).await
}

/// Get message templates
/// 
/// Note: This function accesses message templates directly via DB
/// as template management is not part of the MessageService scope.
/// Consider creating a separate TemplateService if template operations grow.
#[tauri::command]
pub async fn message_get_templates(
    category: Option<String>,
    message_type: Option<String>,
    state: AppState<'_>,
) -> Result<Vec<MessageTemplate>, AppError> {
    use rusqlite::params;
    
    let conn = state.db.get_connection().map_err(|e| {
        AppError::Database(format!("Failed to get database connection: {}", e))
    })?;

    let mut sql = String::from(
        "SELECT id, name, description, message_type, subject, body, variables, category, is_active, created_by, created_at, updated_at
        FROM message_templates WHERE is_active = 1"
    );
    let mut owned_params = Vec::new();

    if let Some(cat) = &category {
        sql.push_str(" AND category = ?");
        owned_params.push(cat.clone());
    }

    if let Some(msg_type) = &message_type {
        sql.push_str(" AND message_type = ?");
        owned_params.push(msg_type.clone());
    }

    sql.push_str(" ORDER BY name");

    let mut stmt = conn.prepare(&sql).map_err(|e| {
        AppError::Database(format!("Failed to prepare query: {}", e))
    })?;

    let templates = stmt
        .query_map(rusqlite::params_from_iter(owned_params), |row| {
            Ok(MessageTemplate {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                message_type: row.get(3)?,
                subject: row.get(4)?,
                body: row.get(5)?,
                variables: row.get(6)?,
                category: row.get(7)?,
                is_active: row.get(8)?,
                created_by: row.get(9)?,
                created_at: row.get(10)?,
                updated_at: row.get(11)?,
            })
        })
        .map_err(|e| AppError::Database(format!("Failed to query templates: {}", e)))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Database(format!("Failed to collect templates: {}", e)))?;

    Ok(templates)
}

/// Get user notification preferences
/// 
/// Note: This function accesses notification preferences directly via DB.
/// Consider moving to a NotificationPreferencesService if operations grow.
#[tauri::command]
pub async fn message_get_preferences(
    user_id: String,
    state: AppState<'_>,
) -> Result<NotificationPreferences, AppError> {
    use rusqlite::params;
    
    let conn = state.db.get_connection().map_err(|e| {
        AppError::Database(format!("Failed to get database connection: {}", e))
    })?;

    let prefs = conn
        .query_row(
            "SELECT id, user_id, email_enabled, sms_enabled, in_app_enabled,
            task_assigned, task_updated, task_completed, task_overdue,
            client_created, client_updated, system_alerts, maintenance_notifications,
            quiet_hours_enabled, quiet_hours_start, quiet_hours_end,
            email_frequency, email_digest_time, created_at, updated_at
        FROM notification_preferences WHERE user_id = ?",
            params![user_id],
            |row| {
                Ok(NotificationPreferences {
                    id: row.get(0)?,
                    user_id: row.get(1)?,
                    email_enabled: row.get(2)?,
                    sms_enabled: row.get(3)?,
                    in_app_enabled: row.get(4)?,
                    task_assigned: row.get(5)?,
                    task_updated: row.get(6)?,
                    task_completed: row.get(7)?,
                    task_overdue: row.get(8)?,
                    client_created: row.get(9)?,
                    client_updated: row.get(10)?,
                    system_alerts: row.get(11)?,
                    maintenance_notifications: row.get(12)?,
                    quiet_hours_enabled: row.get(13)?,
                    quiet_hours_start: row.get(14)?,
                    quiet_hours_end: row.get(15)?,
                    email_frequency: row.get(16)?,
                    email_digest_time: row.get(17)?,
                    created_at: row.get(18)?,
                    updated_at: row.get(19)?,
                })
            },
        )
        .map_err(|e| AppError::Database(format!("Failed to get notification preferences: {}", e)))?;

    Ok(prefs)
}

/// Update user notification preferences
/// 
/// Note: This function accesses notification preferences directly via DB.
/// Consider moving to a NotificationPreferencesService if operations grow.
#[tauri::command]
pub async fn message_update_preferences(
    user_id: String,
    updates: UpdateNotificationPreferencesRequest,
    state: AppState<'_>,
) -> Result<NotificationPreferences, AppError> {
    let conn = state.db.get_connection().map_err(|e| {
        AppError::Database(format!("Failed to get database connection: {}", e))
    })?;

    // Build dynamic update query
    let mut sql = String::from("UPDATE notification_preferences SET updated_at = ?");
    let mut params = vec![chrono::Utc::now().timestamp().to_string()];

    if updates.email_enabled.is_some() {
        sql.push_str(", email_enabled = ?");
        params.push(updates.email_enabled.unwrap().to_string());
    }
    // Add other fields similarly...

    sql.push_str(" WHERE user_id = ?");
    params.push(user_id.clone());

    conn.execute(&sql, rusqlite::params_from_iter(params))
        .map_err(|e| AppError::Database(format!("Failed to update preferences: {}", e)))?;

    // Return updated preferences
    message_get_preferences(user_id, state).await
}
