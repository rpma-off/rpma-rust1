//! WebSocket Event Handler
//!
//! This module provides an EventHandler implementation that broadcasts
//! domain events via WebSocket to connected frontend clients.

use async_trait::async_trait;
use std::sync::Arc;
use crate::commands::websocket::{broadcast_ws_message, WSMessage};
use crate::services::event_bus::{DomainEvent, EventHandler};
use tracing::{debug, error, info, warn};

/// WebSocket event handler that broadcasts domain events to connected clients
pub struct WebSocketEventHandler {
    /// List of event types to broadcast (empty = all events)
    filter: Vec<String>,
    /// Whether broadcasting is enabled
    enabled: bool,
}

impl WebSocketEventHandler {
    /// Create a new WebSocket event handler
    pub fn new() -> Self {
        Self {
            filter: Vec::new(),
            enabled: true,
        }
    }
    
    /// Create with specific event type filter
    pub fn with_filter(event_types: Vec<String>) -> Self {
        Self {
            filter: event_types,
            enabled: true,
        }
    }
    
    /// Create with all task-related events
    pub fn task_events_only() -> Self {
        Self {
            filter: vec![
                "TaskCreated".to_string(),
                "TaskUpdated".to_string(),
                "TaskStatusChanged".to_string(),
                "TaskAssigned".to_string(),
            ],
            enabled: true,
        }
    }
    
    /// Create with all intervention-related events
    pub fn intervention_events_only() -> Self {
        Self {
            filter: vec![
                "InterventionStarted".to_string(),
                "InterventionCompleted".to_string(),
            ],
            enabled: true,
        }
    }
    
    /// Create with all authentication-related events
    pub fn auth_events_only() -> Self {
        Self {
            filter: vec![
                "AuthenticationSuccess".to_string(),
                "AuthenticationFailed".to_string(),
            ],
            enabled: true,
        }
    }
    
    /// Enable broadcasting
    pub fn enable(&mut self) {
        self.enabled = true;
    }
    
    /// Disable broadcasting
    pub fn disable(&mut self) {
        self.enabled = false;
    }
    
    /// Check if broadcasting is enabled
    pub fn is_enabled(&self) -> bool {
        self.enabled
    }
    
    /// Check if an event type should be broadcasted
    fn should_broadcast(&self, event_type: &str) -> bool {
        if !self.enabled {
            return false;
        }
        
        // If no filter is set, broadcast all events
        if self.filter.is_empty() {
            return true;
        }
        
        self.filter.contains(&event_type.to_string())
    }
    
    /// Convert domain event to WebSocket message
    fn convert_to_ws_message(&self, event: &DomainEvent) -> Option<WSMessage> {
        match event {
            DomainEvent::TaskCreated { task_id, title, assigned_to, .. } => {
                Some(WSMessage::TaskCreated {
                    task: serde_json::json!({
                        "id": task_id,
                        "title": title,
                        "assigned_to": assigned_to,
                    }),
                })
            }
            DomainEvent::TaskUpdated { task_id, changes, .. } => {
                Some(WSMessage::TaskUpdated {
                    task_id: task_id.clone(),
                    updates: serde_json::json!({
                        "changes": changes,
                    }),
                })
            }
            DomainEvent::TaskStatusChanged { task_id, old_status, new_status, .. } => {
                Some(WSMessage::TaskStatusChanged {
                    task_id: task_id.clone(),
                    old_status: old_status.clone(),
                    new_status: new_status.clone(),
                })
            }
            DomainEvent::TaskAssigned { task_id, assigned_to, .. } => {
                Some(WSMessage::TaskUpdated {
                    task_id: task_id.clone(),
                    updates: serde_json::json!({
                        "assigned_to": assigned_to,
                    }),
                })
            }
            DomainEvent::InterventionStarted { intervention_id, task_id, .. } => {
                Some(WSMessage::InterventionStarted {
                    intervention_id: intervention_id.clone(),
                    task_id: task_id.clone(),
                })
            }
            DomainEvent::InterventionCompleted { intervention_id, .. } => {
                Some(WSMessage::InterventionCompleted {
                    intervention_id: intervention_id.clone(),
                })
            }
            DomainEvent::AuthenticationFailed { user_id, reason, .. } => {
                // Don't broadcast auth failures for security
                debug!("Auth failure for user {:?}: {}", user_id, reason);
                None
            }
            DomainEvent::AuthenticationSuccess { user_id, .. } => {
                // Don't broadcast auth success to avoid info leakage
                debug!("Auth success for user {}", user_id);
                None
            }
        }
    }
}

impl Default for WebSocketEventHandler {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl EventHandler for WebSocketEventHandler {
    async fn handle(&self, event: &DomainEvent) -> Result<(), String> {
        let event_type = event.event_type();
        
        if !self.should_broadcast(event_type) {
            debug!("Skipping broadcast for event type: {}", event_type);
            return Ok(());
        }
        
        match self.convert_to_ws_message(event) {
            Some(ws_message) => {
                debug!("Broadcasting {} event via WebSocket", event_type);
                
                if let Err(e) = broadcast_ws_message(ws_message).await {
                    // Log error but don't fail - WebSocket might not be initialized
                    debug!("Failed to broadcast WebSocket message: {}", e);
                } else {
                    debug!("Successfully broadcasted {} event", event_type);
                }
            }
            None => {
                debug!("Event type {} not convertible to WebSocket message", event_type);
            }
        }
        
        Ok(())
    }
    
    fn interested_events(&self) -> Vec<&'static str> {
        vec![
            "TaskCreated",
            "TaskUpdated",
            "TaskStatusChanged",
            "TaskAssigned",
            "InterventionStarted",
            "InterventionCompleted",
            "AuthenticationFailed",
            "AuthenticationSuccess",
        ]
    }
}

/// Builder for creating WebSocket event handler with custom configuration
pub struct WebSocketEventHandlerBuilder {
    filter: Vec<String>,
    enabled: bool,
}

impl WebSocketEventHandlerBuilder {
    /// Create a new builder
    pub fn new() -> Self {
        Self {
            filter: Vec::new(),
            enabled: true,
        }
    }
    
    /// Add an event type to filter
    pub fn add_event_type(mut self, event_type: String) -> Self {
        self.filter.push(event_type);
        self
    }
    
    /// Set event types filter
    pub fn with_event_types(mut self, event_types: Vec<String>) -> Self {
        self.filter = event_types;
        self
    }
    
    /// Enable/disable broadcasting
    pub fn enabled(mut self, enabled: bool) -> Self {
        self.enabled = enabled;
        self
    }
    
    /// Build the handler
    pub fn build(self) -> WebSocketEventHandler {
        WebSocketEventHandler {
            filter: self.filter,
            enabled: self.enabled,
        }
    }
}

impl Default for WebSocketEventHandlerBuilder {
    fn default() -> Self {
        Self::new()
    }
}

/// Extension trait for broadcasting events directly
pub trait WebSocketBroadcast {
    /// Broadcast a domain event via WebSocket
    async fn broadcast_event(&self, event: &DomainEvent) -> Result<(), String>;
}

impl WebSocketBroadcast for Arc<WebSocketEventHandler> {
    async fn broadcast_event(&self, event: &DomainEvent) -> Result<(), String> {
        self.handle(event).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::event_bus::event_factory;
    
    #[test]
    fn test_websocket_handler_creation() {
        let handler = WebSocketEventHandler::new();
        assert!(handler.is_enabled());
        assert!(handler.filter.is_empty());
    }
    
    #[test]
    fn test_websocket_handler_filtered() {
        let handler = WebSocketEventHandler::with_filter(vec![
            "TaskCreated".to_string(),
            "TaskUpdated".to_string(),
        ]);
        
        assert!(handler.should_broadcast("TaskCreated"));
        assert!(handler.should_broadcast("TaskUpdated"));
        assert!(!handler.should_broadcast("TaskStatusChanged"));
    }
    
    #[test]
    fn test_websocket_handler_disabled() {
        let mut handler = WebSocketEventHandler::new();
        handler.disable();
        
        assert!(!handler.is_enabled());
        assert!(!handler.should_broadcast("TaskCreated"));
    }
    
    #[test]
    fn test_websocket_handler_interested_events() {
        let handler = WebSocketEventHandler::new();
        let events = handler.interested_events();
        
        assert!(events.contains(&"TaskCreated"));
        assert!(events.contains(&"TaskUpdated"));
        assert!(events.contains(&"InterventionStarted"));
        assert!(events.contains(&"AuthenticationSuccess"));
    }
    
    #[test]
    fn test_event_conversion_task_created() {
        let handler = WebSocketEventHandler::new();
        let event = event_factory::task_created(
            "task-123".to_string(),
            "Test Task".to_string(),
            Some("user-456".to_string()),
        );
        
        let ws_msg = handler.convert_to_ws_message(&event);
        assert!(ws_msg.is_some());
        
        match ws_msg.unwrap() {
            WSMessage::TaskCreated { task } => {
                assert_eq!(task["id"], "task-123");
                assert_eq!(task["title"], "Test Task");
            }
            _ => panic!("Expected TaskCreated message"),
        }
    }
    
    #[test]
    fn test_event_conversion_task_status_changed() {
        let handler = WebSocketEventHandler::new();
        let event = event_factory::task_status_changed(
            "task-123".to_string(),
            "pending".to_string(),
            "in_progress".to_string(),
        );
        
        let ws_msg = handler.convert_to_ws_message(&event);
        assert!(ws_msg.is_some());
        
        match ws_msg.unwrap() {
            WSMessage::TaskStatusChanged { task_id, old_status, new_status } => {
                assert_eq!(task_id, "task-123");
                assert_eq!(old_status, "pending");
                assert_eq!(new_status, "in_progress");
            }
            _ => panic!("Expected TaskStatusChanged message"),
        }
    }
    
    #[test]
    fn test_event_conversion_intervention_started() {
        let handler = WebSocketEventHandler::new();
        let event = event_factory::intervention_started(
            "int-123".to_string(),
            "task-456".to_string(),
        );
        
        let ws_msg = handler.convert_to_ws_message(&event);
        assert!(ws_msg.is_some());
        
        match ws_msg.unwrap() {
            WSMessage::InterventionStarted { intervention_id, task_id } => {
                assert_eq!(intervention_id, "int-123");
                assert_eq!(task_id, "task-456");
            }
            _ => panic!("Expected InterventionStarted message"),
        }
    }
    
    #[test]
    fn test_auth_events_not_broadcasted() {
        let handler = WebSocketEventHandler::new();
        
        let auth_success = event_factory::authentication_success("user-123".to_string());
        let auth_failed = event_factory::authentication_failed(
            Some("user-123".to_string()),
            "Invalid password".to_string(),
        );
        
        // Auth events should return None for security
        assert!(handler.convert_to_ws_message(&auth_success).is_none());
        assert!(handler.convert_to_ws_message(&auth_failed).is_none());
    }
    
    #[test]
    fn test_builder_pattern() {
        let handler = WebSocketEventHandlerBuilder::new()
            .add_event_type("TaskCreated".to_string())
            .add_event_type("TaskUpdated".to_string())
            .enabled(true)
            .build();
        
        assert!(handler.is_enabled());
        assert!(handler.should_broadcast("TaskCreated"));
        assert!(handler.should_broadcast("TaskUpdated"));
        assert!(!handler.should_broadcast("InterventionStarted"));
    }
    
    #[test]
    fn test_predefined_filters() {
        let task_handler = WebSocketEventHandler::task_events_only();
        assert!(task_handler.should_broadcast("TaskCreated"));
        assert!(task_handler.should_broadcast("TaskUpdated"));
        assert!(!task_handler.should_broadcast("InterventionStarted"));
        
        let intervention_handler = WebSocketEventHandler::intervention_events_only();
        assert!(!intervention_handler.should_broadcast("TaskCreated"));
        assert!(intervention_handler.should_broadcast("InterventionStarted"));
        assert!(intervention_handler.should_broadcast("InterventionCompleted"));
        
        let auth_handler = WebSocketEventHandler::auth_events_only();
        assert!(!auth_handler.should_broadcast("TaskCreated"));
        assert!(auth_handler.should_broadcast("AuthenticationSuccess"));
        assert!(auth_handler.should_broadcast("AuthenticationFailed"));
    }
}
