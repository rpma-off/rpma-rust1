use crate::commands::{AppState, ApiError};
use crate::models::message::*;
use rusqlite::params;

/// Send a new message
#[tauri::command]
pub async fn message_send(
    request: SendMessageRequest,
    state: AppState<'_>,
) -> Result<Message, ApiError> {
    let conn = state.db.get_connection()
        .map_err(|e| ApiError {
            message: e.to_string(),
            code: "DATABASE_ERROR".to_string(),
            details: None,
        })?;

    // Generate ID
    let id = format!("{:x}", rand::random::<u128>());

    let now = chrono::Utc::now().timestamp();

    // Insert message
    conn.execute(
        "INSERT INTO messages (
            id, message_type, sender_id, recipient_id, recipient_email,
            recipient_phone, subject, body, template_id, task_id, client_id,
            priority, scheduled_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        params![
            id,
            request.message_type,
            None::<String>, // sender_id - would come from session
            request.recipient_id,
            request.recipient_email,
            request.recipient_phone,
            request.subject,
            request.body,
            request.template_id,
            request.task_id,
            request.client_id,
            request.priority.unwrap_or_else(|| "normal".to_string()),
            request.scheduled_at,
            now,
            now,
        ]
    ).map_err(|e| ApiError {
        message: e.to_string(),
        code: "INSERT_ERROR".to_string(),
        details: None,
    })?;

    // Return the created message
    let message = conn.query_row(
        "SELECT
            id, message_type, sender_id, recipient_id, recipient_email,
            recipient_phone, subject, body, template_id, task_id, client_id,
            status, priority, scheduled_at, sent_at, read_at, error_message,
            metadata, created_at, updated_at
        FROM messages WHERE id = ?",
        params![id],
        |row| {
            Ok(Message {
                id: row.get(0)?,
                message_type: row.get(1)?,
                sender_id: row.get(2)?,
                recipient_id: row.get(3)?,
                recipient_email: row.get(4)?,
                recipient_phone: row.get(5)?,
                subject: row.get(6)?,
                body: row.get(7)?,
                template_id: row.get(8)?,
                task_id: row.get(9)?,
                client_id: row.get(10)?,
                status: row.get(11)?,
                priority: row.get(12)?,
                scheduled_at: row.get(13)?,
                sent_at: row.get(14)?,
                read_at: row.get(15)?,
                error_message: row.get(16)?,
                metadata: row.get(17)?,
                created_at: row.get(18)?,
                updated_at: row.get(19)?,
            })
        }
    ).map_err(|e| ApiError {
        message: e.to_string(),
        code: "FETCH_ERROR".to_string(),
        details: None,
    })?;

    Ok(message)
}

/// Get messages with filtering and pagination
#[tauri::command]
pub async fn message_get_list(
    query: MessageQuery,
    state: AppState<'_>,
) -> Result<MessageListResponse, ApiError> {
    let conn = state.db.get_connection()
        .map_err(|e| ApiError {
            message: e.to_string(),
            code: "DATABASE_ERROR".to_string(),
            details: None,
        })?;

    let mut sql = String::from(
        "SELECT
            id, message_type, sender_id, recipient_id, recipient_email,
            recipient_phone, subject, body, template_id, task_id, client_id,
            status, priority, scheduled_at, sent_at, read_at, error_message,
            metadata, created_at, updated_at
        FROM messages WHERE 1=1"
    );
    let mut owned_params = Vec::new();

    // Add filters
    if let Some(message_type) = &query.message_type {
        sql.push_str(" AND message_type = ?");
        owned_params.push(message_type.clone());
    }

    if let Some(sender_id) = &query.sender_id {
        sql.push_str(" AND sender_id = ?");
        owned_params.push(sender_id.clone());
    }

    if let Some(recipient_id) = &query.recipient_id {
        sql.push_str(" AND recipient_id = ?");
        owned_params.push(recipient_id.clone());
    }

    if let Some(task_id) = &query.task_id {
        sql.push_str(" AND task_id = ?");
        owned_params.push(task_id.clone());
    }

    if let Some(client_id) = &query.client_id {
        sql.push_str(" AND client_id = ?");
        owned_params.push(client_id.clone());
    }

    if let Some(priority) = &query.priority {
        sql.push_str(" AND priority = ?");
        owned_params.push(priority.clone());
    }

    if let Some(date_from) = query.date_from {
        sql.push_str(" AND created_at >= ?");
        owned_params.push(date_from.to_string());
    }

    if let Some(date_to) = query.date_to {
        sql.push_str(" AND created_at <= ?");
        owned_params.push(date_to.to_string());
    }

    if let Some(sender_id) = &query.sender_id {
        sql.push_str(" AND sender_id = ?");
        owned_params.push(sender_id.clone());
    }

    if let Some(recipient_id) = &query.recipient_id {
        sql.push_str(" AND recipient_id = ?");
        owned_params.push(recipient_id.clone());
    }

    if let Some(task_id) = &query.task_id {
        sql.push_str(" AND task_id = ?");
        owned_params.push(task_id.clone());
    }

    if let Some(client_id) = &query.client_id {
        sql.push_str(" AND client_id = ?");
        owned_params.push(client_id.clone());
    }

    if let Some(status) = &query.status {
        sql.push_str(" AND status = ?");
        owned_params.push(status.clone());
    }

    if let Some(priority) = &query.priority {
        sql.push_str(" AND priority = ?");
        owned_params.push(priority.clone());
    }

    if let Some(date_from) = query.date_from {
        sql.push_str(" AND created_at >= ?");
        owned_params.push(date_from.to_string());
    }

    if let Some(date_to) = query.date_to {
        sql.push_str(" AND created_at <= ?");
        owned_params.push(date_to.to_string());
    }

    if let Some(recipient_id) = &query.recipient_id {
        sql.push_str(" AND recipient_id = ?");
        owned_params.push(recipient_id.clone());
    }

    if let Some(task_id) = &query.task_id {
        sql.push_str(" AND task_id = ?");
        owned_params.push(task_id.clone());
    }

    if let Some(client_id) = &query.client_id {
        sql.push_str(" AND client_id = ?");
        owned_params.push(client_id.clone());
    }

    if let Some(status) = &query.status {
        sql.push_str(" AND status = ?");
        owned_params.push(status.clone());
    }

    if let Some(priority) = &query.priority {
        sql.push_str(" AND priority = ?");
        owned_params.push(priority.clone());
    }

    if let Some(date_from) = query.date_from {
        sql.push_str(" AND created_at >= ?");
        owned_params.push(date_from.to_string());
    }

    if let Some(date_to) = query.date_to {
        sql.push_str(" AND created_at <= ?");
        owned_params.push(date_to.to_string());
    }

    sql.push_str(" ORDER BY created_at DESC");

    let limit = query.limit.unwrap_or(50);
    let offset = query.offset.unwrap_or(0);

    sql.push_str(" LIMIT ? OFFSET ?");
    owned_params.push(limit.to_string());
    owned_params.push(offset.to_string());

    let mut stmt = conn.prepare(&sql)
        .map_err(|e| ApiError {
            message: e.to_string(),
            code: "QUERY_ERROR".to_string(),
            details: None,
        })?;

    let messages = stmt.query_map(
        rusqlite::params_from_iter(owned_params),
        |row| {
            Ok(Message {
                id: row.get(0)?,
                message_type: row.get(1)?,
                sender_id: row.get(2)?,
                recipient_id: row.get(3)?,
                recipient_email: row.get(4)?,
                recipient_phone: row.get(5)?,
                subject: row.get(6)?,
                body: row.get(7)?,
                template_id: row.get(8)?,
                task_id: row.get(9)?,
                client_id: row.get(10)?,
                status: row.get(11)?,
                priority: row.get(12)?,
                scheduled_at: row.get(13)?,
                sent_at: row.get(14)?,
                read_at: row.get(15)?,
                error_message: row.get(16)?,
                metadata: row.get(17)?,
                created_at: row.get(18)?,
                updated_at: row.get(19)?,
            })
        }
    ).map_err(|e| ApiError {
        message: e.to_string(),
        code: "MAPPING_ERROR".to_string(),
        details: None,
    })?.collect::<Result<Vec<_>, _>>()
    .map_err(|e| ApiError {
        message: e.to_string(),
        code: "COLLECTION_ERROR".to_string(),
        details: None,
    })?;

    // Get total count
    let mut count_sql = String::from("SELECT COUNT(*) FROM messages WHERE 1=1");
    let mut count_params = Vec::new();

    // Add same filters for count
    if let Some(message_type) = &query.message_type {
        count_sql.push_str(" AND message_type = ?");
        count_params.push(message_type.as_str());
    }
    // ... add other filters similarly

    let total: i32 = conn.query_row(
        &count_sql,
        rusqlite::params_from_iter(count_params),
        |row| row.get(0)
    ).unwrap_or(0);

    let has_more = (offset + messages.len() as i32) < total;

    Ok(MessageListResponse {
        messages,
        total,
        has_more,
    })
}

/// Mark message as read
#[tauri::command]
pub async fn message_mark_read(
    message_id: String,
    state: AppState<'_>,
) -> Result<(), ApiError> {
    let conn = state.db.get_connection()
        .map_err(|e| ApiError {
            message: e.to_string(),
            code: "DATABASE_ERROR".to_string(),
            details: None,
        })?;

    conn.execute(
        "UPDATE messages SET status = 'read', read_at = ?, updated_at = ? WHERE id = ?",
        params![
            chrono::Utc::now().timestamp(),
            chrono::Utc::now().timestamp(),
            message_id
        ]
    ).map_err(|e| ApiError {
        message: e.to_string(),
        code: "UPDATE_ERROR".to_string(),
        details: None,
    })?;

    Ok(())
}

/// Get message templates
#[tauri::command]
pub async fn message_get_templates(
    category: Option<String>,
    message_type: Option<String>,
    state: AppState<'_>,
) -> Result<Vec<MessageTemplate>, ApiError> {
    let conn = state.db.get_connection()
        .map_err(|e| ApiError {
            message: e.to_string(),
            code: "DATABASE_ERROR".to_string(),
            details: None,
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

    let mut stmt = conn.prepare(&sql)
        .map_err(|e| ApiError {
            message: e.to_string(),
            code: "QUERY_ERROR".to_string(),
            details: None,
        })?;

    let templates = stmt.query_map(
        rusqlite::params_from_iter(owned_params),
        |row| {
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
        }
    ).map_err(|e| ApiError {
        message: e.to_string(),
        code: "MAPPING_ERROR".to_string(),
        details: None,
    })?.collect::<Result<Vec<_>, _>>()
    .map_err(|e| ApiError {
        message: e.to_string(),
        code: "COLLECTION_ERROR".to_string(),
        details: None,
    })?;

    Ok(templates)
}

/// Get user notification preferences
#[tauri::command]
pub async fn message_get_preferences(
    user_id: String,
    state: AppState<'_>,
) -> Result<NotificationPreferences, ApiError> {
    let conn = state.db.get_connection()
        .map_err(|e| ApiError {
            message: e.to_string(),
            code: "DATABASE_ERROR".to_string(),
            details: None,
        })?;

    let prefs = conn.query_row(
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
        }
    ).map_err(|e| ApiError {
        message: e.to_string(),
        code: "FETCH_ERROR".to_string(),
        details: None,
    })?;

    Ok(prefs)
}

/// Update user notification preferences
#[tauri::command]
pub async fn message_update_preferences(
    user_id: String,
    updates: UpdateNotificationPreferencesRequest,
    state: AppState<'_>,
) -> Result<NotificationPreferences, ApiError> {
    let conn = state.db.get_connection()
        .map_err(|e| ApiError {
            message: e.to_string(),
            code: "DATABASE_ERROR".to_string(),
            details: None,
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
        .map_err(|e| ApiError {
            message: e.to_string(),
            code: "UPDATE_ERROR".to_string(),
            details: None,
        })?;

    // Return updated preferences
    message_get_preferences(user_id, state).await
}