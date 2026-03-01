//! WebSocket IPC commands
//!
//! This module provides Tauri commands for managing WebSocket connections
//! and real-time updates from the frontend.

use crate::authenticate;
use crate::commands::{websocket::*, AppResult, AppState, UserRole};
use serde::{Deserialize, Serialize};

/// Request to initialize WebSocket server
#[derive(Debug, Serialize, Deserialize)]
pub struct InitWebSocketServerRequest {
    pub port: Option<u16>,
}

/// Response for WebSocket server initialization
#[derive(Debug, Serialize, Deserialize)]
pub struct InitWebSocketServerResponse {
    pub success: bool,
    pub port: u16,
    pub message: String,
}

/// Request to broadcast a message
#[derive(Debug, Serialize, Deserialize)]
pub struct BroadcastWSMessageRequest {
    pub message: WSMessage,
}

/// Request to send message to specific client
#[derive(Debug, Serialize, Deserialize)]
pub struct SendWSMessageRequest {
    pub client_id: String,
    pub message: WSMessage,
}

/// Initialize WebSocket server
#[tauri::command]
pub async fn init_websocket_server(
    session_token: String,
    state: AppState<'_>,
    request: InitWebSocketServerRequest,
    correlation_id: Option<String>,
) -> AppResult<InitWebSocketServerResponse> {
    let current_user = authenticate!(&session_token, &state, UserRole::Admin);
    let _correlation_id =
        crate::commands::init_correlation_context(&correlation_id, Some(&current_user.user_id));

    let port = request.port.unwrap_or(8080);

    match crate::commands::websocket::init_websocket_server(port).await {
        Ok(()) => Ok(InitWebSocketServerResponse {
            success: true,
            port,
            message: format!("WebSocket server started on port {}", port),
        }),
        Err(e) => Ok(InitWebSocketServerResponse {
            success: false,
            port,
            message: format!("Failed to start WebSocket server: {:?}", e),
        }),
    }
}

/// Broadcast message to all connected clients
#[tauri::command]
pub async fn broadcast_websocket_message(
    session_token: String,
    state: AppState<'_>,
    request: BroadcastWSMessageRequest,
    correlation_id: Option<String>,
) -> AppResult<()> {
    let current_user = authenticate!(&session_token, &state, UserRole::Supervisor);
    let _correlation_id =
        crate::commands::init_correlation_context(&correlation_id, Some(&current_user.user_id));

    broadcast_ws_message(request.message).await
}

/// Send message to specific client
#[tauri::command]
pub async fn send_websocket_message_to_client(
    session_token: String,
    state: AppState<'_>,
    request: SendWSMessageRequest,
    correlation_id: Option<String>,
) -> AppResult<()> {
    let current_user = authenticate!(&session_token, &state, UserRole::Supervisor);
    let _correlation_id =
        crate::commands::init_correlation_context(&correlation_id, Some(&current_user.user_id));

    send_ws_message_to_client(&request.client_id, request.message).await
}

/// Get WebSocket server statistics
#[tauri::command]
pub async fn get_websocket_stats(
    session_token: String,
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> AppResult<serde_json::Value> {
    let current_user = authenticate!(&session_token, &state, UserRole::Admin);
    let _correlation_id =
        crate::commands::init_correlation_context(&correlation_id, Some(&current_user.user_id));

    Ok(get_ws_stats().await)
}

/// Shutdown WebSocket server
#[tauri::command]
pub async fn shutdown_websocket_server(
    session_token: String,
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> AppResult<()> {
    let current_user = authenticate!(&session_token, &state, UserRole::Admin);
    let _correlation_id =
        crate::commands::init_correlation_context(&correlation_id, Some(&current_user.user_id));

    shutdown_ws_server().await
}

/// Broadcast task-related real-time updates
#[tauri::command]
pub async fn broadcast_task_update(
    session_token: String,
    state: AppState<'_>,
    task_id: String,
    update_type: String,
    data: serde_json::Value,
    correlation_id: Option<String>,
) -> AppResult<()> {
    let current_user = authenticate!(&session_token, &state, UserRole::Supervisor);
    let _correlation_id =
        crate::commands::init_correlation_context(&correlation_id, Some(&current_user.user_id));

    let message = match update_type.as_str() {
        "created" => WSMessage::TaskCreated { task: data },
        "updated" => WSMessage::TaskUpdated {
            task_id,
            updates: data,
        },
        "deleted" => WSMessage::TaskDeleted { task_id },
        "status_changed" => {
            if let (Some(old_status), Some(new_status)) =
                (data.get("old_status"), data.get("new_status"))
            {
                WSMessage::TaskStatusChanged {
                    task_id,
                    old_status: old_status.as_str().unwrap_or("").to_string(),
                    new_status: new_status.as_str().unwrap_or("").to_string(),
                }
            } else {
                return Err(crate::commands::AppError::Validation(
                    "Invalid status change data".to_string(),
                ));
            }
        }
        _ => {
            return Err(crate::commands::AppError::Validation(format!(
                "Unknown update type: {}",
                update_type
            )))
        }
    };

    broadcast_ws_message(message).await
}

/// Broadcast intervention-related real-time updates
#[tauri::command]
pub async fn broadcast_intervention_update(
    session_token: String,
    state: AppState<'_>,
    intervention_id: String,
    update_type: String,
    data: serde_json::Value,
    correlation_id: Option<String>,
) -> AppResult<()> {
    let current_user = authenticate!(&session_token, &state, UserRole::Supervisor);
    let _correlation_id =
        crate::commands::init_correlation_context(&correlation_id, Some(&current_user.user_id));

    let message = match update_type.as_str() {
        "started" => {
            if let Some(task_id) = data.get("task_id").and_then(|v| v.as_str()) {
                WSMessage::InterventionStarted {
                    intervention_id,
                    task_id: task_id.to_string(),
                }
            } else {
                return Err(crate::commands::AppError::Validation(
                    "Missing task_id for intervention start".to_string(),
                ));
            }
        }
        "updated" => WSMessage::InterventionUpdated {
            intervention_id,
            updates: data,
        },
        "completed" => WSMessage::InterventionCompleted { intervention_id },
        "step_advanced" => {
            if let Some(step_number) = data.get("step_number").and_then(|v| v.as_u64()) {
                WSMessage::InterventionStepAdvanced {
                    intervention_id,
                    step_number: step_number as usize,
                }
            } else {
                return Err(crate::commands::AppError::Validation(
                    "Missing step_number for step advance".to_string(),
                ));
            }
        }
        _ => {
            return Err(crate::commands::AppError::Validation(format!(
                "Unknown intervention update type: {}",
                update_type
            )))
        }
    };

    broadcast_ws_message(message).await
}

/// Broadcast client-related real-time updates
#[tauri::command]
pub async fn broadcast_client_update(
    session_token: String,
    state: AppState<'_>,
    client_id: String,
    update_type: String,
    data: serde_json::Value,
    correlation_id: Option<String>,
) -> AppResult<()> {
    let current_user = authenticate!(&session_token, &state, UserRole::Supervisor);
    let _correlation_id =
        crate::commands::init_correlation_context(&correlation_id, Some(&current_user.user_id));

    let message = match update_type.as_str() {
        "created" => WSMessage::ClientCreated { client: data },
        "updated" => WSMessage::ClientUpdated {
            client_id,
            updates: data,
        },
        "deleted" => WSMessage::ClientDeleted { client_id },
        _ => {
            return Err(crate::commands::AppError::Validation(format!(
                "Unknown client update type: {}",
                update_type
            )))
        }
    };

    broadcast_ws_message(message).await
}

/// Broadcast system notification
#[tauri::command]
pub async fn broadcast_system_notification(
    session_token: String,
    state: AppState<'_>,
    title: String,
    message: String,
    level: String,
    correlation_id: Option<String>,
) -> AppResult<()> {
    let current_user = authenticate!(&session_token, &state, UserRole::Supervisor);
    let _correlation_id =
        crate::commands::init_correlation_context(&correlation_id, Some(&current_user.user_id));

    let ws_message = WSMessage::Notification {
        title,
        message,
        level,
    };
    broadcast_ws_message(ws_message).await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ws_message_types() {
        // Test serialization of different message types
        let messages = vec![
            WSMessage::TaskCreated {
                task: serde_json::json!({"id": "1"}),
            },
            WSMessage::TaskUpdated {
                task_id: "1".to_string(),
                updates: serde_json::json!({"status": "completed"}),
            },
            WSMessage::InterventionStarted {
                intervention_id: "1".to_string(),
                task_id: "1".to_string(),
            },
            WSMessage::Notification {
                title: "Test".to_string(),
                message: "Message".to_string(),
                level: "info".to_string(),
            },
        ];

        for message in messages {
            let serialized = serde_json::to_string(&message).unwrap();
            let deserialized: WSMessage = serde_json::from_str(&serialized).unwrap();
            // Basic check that deserialization works
            assert!(matches!(
                deserialized,
                WSMessage::TaskCreated { .. }
                    | WSMessage::TaskUpdated { .. }
                    | WSMessage::InterventionStarted { .. }
                    | WSMessage::Notification { .. }
            ));
        }
    }
}
