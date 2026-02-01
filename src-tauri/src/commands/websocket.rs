//! WebSocket server for real-time updates
//!
//! This module provides WebSocket server capabilities for broadcasting
//! real-time updates to connected frontend clients.

use crate::commands::AppResult;
use futures_util::{SinkExt, StreamExt};
use lazy_static::lazy_static;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::net::TcpListener;
use tokio::sync::{mpsc, Mutex};
use tokio_tungstenite::{accept_async, tungstenite::Message};
use tracing::{debug, error, info, warn};
use uuid::Uuid;

/// WebSocket message types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum WSMessage {
    // Connection messages
    Connect {
        client_id: String,
    },
    Disconnect {
        client_id: String,
    },

    // Task updates
    TaskCreated {
        task: serde_json::Value,
    },
    TaskUpdated {
        task_id: String,
        updates: serde_json::Value,
    },
    TaskDeleted {
        task_id: String,
    },
    TaskStatusChanged {
        task_id: String,
        old_status: String,
        new_status: String,
    },

    // Intervention updates
    InterventionStarted {
        intervention_id: String,
        task_id: String,
    },
    InterventionUpdated {
        intervention_id: String,
        updates: serde_json::Value,
    },
    InterventionCompleted {
        intervention_id: String,
    },
    InterventionStepAdvanced {
        intervention_id: String,
        step_number: usize,
    },

    // Client updates
    ClientCreated {
        client: serde_json::Value,
    },
    ClientUpdated {
        client_id: String,
        updates: serde_json::Value,
    },
    ClientDeleted {
        client_id: String,
    },

    // System notifications
    Notification {
        title: String,
        message: String,
        level: String,
    },

    // Ping/Pong for connection health
    Ping,
    Pong,
}

/// WebSocket client connection
struct WSClient {
    id: String,
    sender: mpsc::UnboundedSender<Message>,
}

/// Global WebSocket server state
#[allow(dead_code)]
struct WSServerState {
    clients: HashMap<String, WSClient>,
    #[allow(dead_code)]
    broadcast_tx: mpsc::UnboundedSender<WSMessage>,
}

impl WSServerState {
    fn new(broadcast_tx: mpsc::UnboundedSender<WSMessage>) -> Self {
        Self {
            clients: HashMap::new(),
            broadcast_tx,
        }
    }

    fn add_client(&mut self, client: WSClient) {
        info!("WebSocket client connected: {}", client.id);
        self.clients.insert(client.id.clone(), client);
    }

    fn remove_client(&mut self, client_id: &str) {
        if self.clients.remove(client_id).is_some() {
            info!("WebSocket client disconnected: {}", client_id);
        }
    }

    fn broadcast(&mut self, message: WSMessage) {
        let message_json = match serde_json::to_string(&message) {
            Ok(json) => json,
            Err(e) => {
                error!("Failed to serialize WebSocket message: {}", e);
                return;
            }
        };

        let ws_message = Message::Text(message_json);
        let mut disconnected_clients = Vec::new();

        for (client_id, client) in &self.clients {
            if let Err(_) = client.sender.send(ws_message.clone()) {
                disconnected_clients.push(client_id.clone());
            }
        }

        // Clean up disconnected clients
        for client_id in disconnected_clients {
            self.remove_client(&client_id);
        }
    }

    fn send_to_client(&mut self, client_id: &str, message: WSMessage) {
        if let Some(client) = self.clients.get(client_id) {
            let message_json = match serde_json::to_string(&message) {
                Ok(json) => json,
                Err(e) => {
                    error!("Failed to serialize WebSocket message: {}", e);
                    return;
                }
            };

            let ws_message = Message::Text(message_json);
            if let Err(_) = client.sender.send(ws_message) {
                self.remove_client(client_id);
            }
        }
    }
}

lazy_static! {
    static ref WS_STATE: Arc<Mutex<Option<Arc<Mutex<WSServerState>>>>> = Arc::new(Mutex::new(None));
    static ref WS_BROADCAST_TX: Arc<Mutex<Option<mpsc::UnboundedSender<WSMessage>>>> =
        Arc::new(Mutex::new(None));
}

/// Initialize WebSocket server
pub async fn init_websocket_server(port: u16) -> AppResult<()> {
    info!("Initializing WebSocket server on port {}", port);

    let (broadcast_tx, mut broadcast_rx) = mpsc::unbounded_channel::<WSMessage>();

    // Store broadcast sender globally
    *WS_BROADCAST_TX.lock().await = Some(broadcast_tx.clone());

    // Initialize server state
    let state = Arc::new(Mutex::new(WSServerState::new(broadcast_tx)));
    *WS_STATE.lock().await = Some(state.clone());

    // Start WebSocket server
    let addr = format!("127.0.0.1:{}", port);
    let listener = TcpListener::bind(&addr).await.map_err(|e| {
        crate::commands::AppError::Internal(format!("Failed to bind WebSocket server: {}", e))
    })?;

    info!("WebSocket server listening on {}", addr);

    // Spawn broadcast handler
    let state_clone = Arc::clone(&state);
    tokio::spawn(async move {
        while let Some(message) = broadcast_rx.recv().await {
            let mut state = state_clone.lock().await;
            state.broadcast(message);
        }
    });

    // Spawn connection handler
    let state_clone = Arc::clone(&state);
    tokio::spawn(async move {
        while let Ok((stream, addr)) = listener.accept().await {
            debug!("New WebSocket connection attempt from {}", addr);

            let state = Arc::clone(&state_clone);
            tokio::spawn(async move {
                match accept_async(stream).await {
                    Ok(ws_stream) => {
                        let (sender, receiver) = ws_stream.split();
                        let client_id = Uuid::new_v4().to_string();

                        let (tx, mut rx) = mpsc::unbounded_channel();
                        let tx_clone = tx.clone();

                        // Add client to state
                        {
                            let mut state = state.lock().await;
                            state.add_client(WSClient {
                                id: client_id.clone(),
                                sender: tx,
                            });
                        }

                        // Handle incoming messages from client
                        let client_id_clone = client_id.clone();
                        let receive_task = tokio::spawn(async move {
                            let mut receiver = receiver;
                            while let Some(message) = receiver.next().await {
                                match message {
                                    Ok(Message::Close(_)) => break,
                                    Ok(Message::Ping(data)) => {
                                        let pong_msg = Message::Pong(data);
                                        if let Err(e) = tx_clone.send(pong_msg) {
                                            error!("Failed to send pong: {}", e);
                                            break;
                                        }
                                    }
                                    Ok(Message::Text(text)) => {
                                        debug!(
                                            "Received message from client {}: {}",
                                            client_id_clone, text
                                        );
                                        // Handle client messages if needed
                                    }
                                    Err(e) => {
                                        error!(
                                            "WebSocket error for client {}: {}",
                                            client_id_clone, e
                                        );
                                        break;
                                    }
                                    _ => {} // Ignore other message types
                                }
                            }
                        });

                        // Handle outgoing messages to client
                        let client_id_for_send = client_id.clone();
                        let send_task = tokio::spawn(async move {
                            let mut sender = sender;
                            while let Some(message) = rx.recv().await {
                                if let Err(e) = sender.send(message).await {
                                    error!(
                                        "Failed to send message to client {}: {}",
                                        client_id_for_send, e
                                    );
                                    break;
                                }
                            }
                        });

                        // Wait for either task to complete
                        tokio::select! {
                            _ = receive_task => {}
                            _ = send_task => {}
                        }

                        // Remove client from state
                        {
                            let mut state = state.lock().await;
                            state.remove_client(&client_id);
                        }

                        debug!("WebSocket connection closed for client {}", client_id);
                    }
                    Err(e) => {
                        warn!("Failed to accept WebSocket connection: {}", e);
                    }
                }
            });
        }
    });

    Ok(())
}

/// Broadcast a message to all connected clients
pub async fn broadcast_ws_message(message: WSMessage) -> AppResult<()> {
    if let Some(tx) = WS_BROADCAST_TX.lock().await.as_ref() {
        tx.send(message).map_err(|e| {
            crate::commands::AppError::Internal(format!("Failed to broadcast message: {}", e))
        })?;
    }
    Ok(())
}

/// Send a message to a specific client
pub async fn send_ws_message_to_client(client_id: &str, message: WSMessage) -> AppResult<()> {
    if let Some(state_arc) = WS_STATE.lock().await.as_ref() {
        let mut state = state_arc.lock().await;
        state.send_to_client(client_id, message);
    }
    Ok(())
}

/// Get WebSocket server statistics
pub async fn get_ws_stats() -> serde_json::Value {
    if let Some(state_arc) = WS_STATE.lock().await.as_ref() {
        let state = state_arc.lock().await;
        serde_json::json!({
            "connected_clients": state.clients.len(),
            "server_running": true
        })
    } else {
        serde_json::json!({
            "connected_clients": 0,
            "server_running": false
        })
    }
}

/// Shutdown WebSocket server
pub async fn shutdown_ws_server() -> AppResult<()> {
    *WS_STATE.lock().await = None;
    *WS_BROADCAST_TX.lock().await = None;
    info!("WebSocket server shutdown complete");
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_ws_message_serialization() {
        let message = WSMessage::TaskCreated {
            task: serde_json::json!({"id": "123", "title": "Test Task"}),
        };

        let serialized = serde_json::to_string(&message).unwrap();
        let deserialized: WSMessage = serde_json::from_str(&serialized).unwrap();

        match deserialized {
            WSMessage::TaskCreated { task } => {
                assert_eq!(task["id"], "123");
                assert_eq!(task["title"], "Test Task");
            }
            _ => panic!("Wrong message type"),
        }
    }
}
