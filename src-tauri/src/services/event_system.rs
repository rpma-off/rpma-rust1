//! Event system for loose coupling between domains
//!
//! This module provides a comprehensive event-driven architecture
//! that enables loose coupling between different service domains.

use std::collections::HashMap;
use std::sync::Arc;

use async_stream::stream;
use chrono::{DateTime, Utc};
use futures::Stream;
use serde::{Deserialize, Serialize};
use tokio::sync::{broadcast, RwLock};

/// Domain event types for system-wide communication
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum DomainEvent {
    // Task Events
    TaskCreated {
        id: String,
        task_id: String,
        task_number: String,
        title: String,
        user_id: String,
        timestamp: DateTime<Utc>,
        metadata: Option<serde_json::Value>,
    },
    TaskUpdated {
        id: String,
        task_id: String,
        previous_state: Option<serde_json::Value>,
        new_state: Option<serde_json::Value>,
        changed_fields: Vec<String>,
        user_id: String,
        timestamp: DateTime<Utc>,
        metadata: Option<serde_json::Value>,
    },
    TaskAssigned {
        id: String,
        task_id: String,
        technician_id: String,
        assigned_by: String,
        assigned_at: DateTime<Utc>,
        timestamp: DateTime<Utc>,
        metadata: Option<serde_json::Value>,
    },
    TaskStatusChanged {
        id: String,
        task_id: String,
        old_status: String,
        new_status: String,
        user_id: String,
        timestamp: DateTime<Utc>,
        metadata: Option<serde_json::Value>,
    },
    TaskCompleted {
        id: String,
        task_id: String,
        completed_by: String,
        completed_at: DateTime<Utc>,
        actual_duration: Option<i32>,
        timestamp: DateTime<Utc>,
        metadata: Option<serde_json::Value>,
    },

    // Client Events
    ClientCreated {
        id: String,
        client_id: String,
        name: String,
        user_id: String,
        timestamp: DateTime<Utc>,
        metadata: Option<serde_json::Value>,
    },
    ClientUpdated {
        id: String,
        client_id: String,
        previous_state: Option<serde_json::Value>,
        new_state: Option<serde_json::Value>,
        changed_fields: Vec<String>,
        user_id: String,
        timestamp: DateTime<Utc>,
        metadata: Option<serde_json::Value>,
    },
    ClientDeactivated {
        id: String,
        client_id: String,
        deactivated_by: String,
        reason: Option<String>,
        timestamp: DateTime<Utc>,
        metadata: Option<serde_json::Value>,
    },

    // Intervention Events
    InterventionCreated {
        id: String,
        intervention_id: String,
        task_id: String,
        ppf_zones_config: Option<String>,
        film_type: Option<String>,
        user_id: String,
        timestamp: DateTime<Utc>,
        metadata: Option<serde_json::Value>,
    },
    InterventionStarted {
        id: String,
        intervention_id: String,
        task_id: String,
        started_by: String,
        started_at: DateTime<Utc>,
        timestamp: DateTime<Utc>,
        metadata: Option<serde_json::Value>,
    },
    InterventionStepStarted {
        id: String,
        intervention_id: String,
        step_id: String,
        step_number: i32,
        started_by: String,
        location_lat: Option<f64>,
        location_lon: Option<f64>,
        timestamp: DateTime<Utc>,
        metadata: Option<serde_json::Value>,
    },
    InterventionStepCompleted {
        id: String,
        intervention_id: String,
        step_id: String,
        step_number: i32,
        completed_by: String,
        photos_taken: i32,
        actual_duration: Option<i32>,
        quality_score: Option<i32>,
        timestamp: DateTime<Utc>,
        metadata: Option<serde_json::Value>,
    },
    InterventionCompleted {
        id: String,
        intervention_id: String,
        completed_by: String,
        completed_at: DateTime<Utc>,
        quality_score: Option<i32>,
        customer_satisfaction: Option<i32>,
        actual_duration: Option<i32>,
        timestamp: DateTime<Utc>,
        metadata: Option<serde_json::Value>,
    },
    InterventionCancelled {
        id: String,
        intervention_id: String,
        cancelled_by: String,
        reason: String,
        cancelled_at: DateTime<Utc>,
        timestamp: DateTime<Utc>,
        metadata: Option<serde_json::Value>,
    },

    // User Events
    UserCreated {
        id: String,
        user_id: String,
        email: String,
        role: String,
        created_by: String,
        timestamp: DateTime<Utc>,
        metadata: Option<serde_json::Value>,
    },
    UserUpdated {
        id: String,
        user_id: String,
        previous_state: Option<serde_json::Value>,
        new_state: Option<serde_json::Value>,
        changed_fields: Vec<String>,
        updated_by: String,
        timestamp: DateTime<Utc>,
        metadata: Option<serde_json::Value>,
    },
    UserLoggedIn {
        id: String,
        user_id: String,
        ip_address: Option<String>,
        user_agent: Option<String>,
        timestamp: DateTime<Utc>,
        metadata: Option<serde_json::Value>,
    },
    UserLoggedOut {
        id: String,
        user_id: String,
        timestamp: DateTime<Utc>,
        metadata: Option<serde_json::Value>,
    },
    AuthenticationFailed {
        id: String,
        user_id: Option<String>,
        reason: String,
        timestamp: DateTime<Utc>,
        metadata: Option<serde_json::Value>,
    },
    AuthenticationSuccess {
        id: String,
        user_id: String,
        timestamp: DateTime<Utc>,
        metadata: Option<serde_json::Value>,
    },

    // System Events
    SystemError {
        id: String,
        error_code: String,
        error_message: String,
        component: String,
        severity: ErrorSeverity,
        timestamp: DateTime<Utc>,
        metadata: Option<serde_json::Value>,
    },
    SystemMaintenance {
        id: String,
        maintenance_type: String,
        description: String,
        started_by: String,
        started_at: DateTime<Utc>,
        estimated_duration: Option<i32>,
        timestamp: DateTime<Utc>,
        metadata: Option<serde_json::Value>,
    },
    PerformanceAlert {
        id: String,
        metric_name: String,
        current_value: f64,
        threshold_value: f64,
        severity: AlertSeverity,
        timestamp: DateTime<Utc>,
        metadata: Option<serde_json::Value>,
    },
}

/// Error severity levels
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ErrorSeverity {
    Low,
    Medium,
    High,
    Critical,
}

/// Alert severity levels
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AlertSeverity {
    Info,
    Warning,
    Error,
    Critical,
}

/// Event handler trait for subscribing to domain events
pub trait EventHandler: Send + Sync {
    /// Handle a domain event
    fn handle(&self, event: &DomainEvent) -> Result<(), String>;
    
    /// Get the event types this handler is interested in
    fn interested_events(&self) -> Vec<&'static str>;
}

/// Event publisher trait
pub trait EventPublisher: Send + Sync {
    /// Publish a domain event
    fn publish(&self, event: DomainEvent) -> Result<(), String>;
    
    /// Publish multiple events
    fn publish_batch(&self, events: Vec<DomainEvent>) -> Result<(), String>;
}

/// Event store for persisting events
pub trait EventStore: Send + Sync {
    /// Store an event
    fn store(&self, event: &DomainEvent) -> Result<(), String>;
    
    /// Get events for a specific aggregate
    fn get_events(&self, aggregate_id: &str, from_version: Option<i64>) -> Result<Vec<DomainEvent>, String>;
    
    /// Get events by type
    fn get_events_by_type(&self, event_type: &str, limit: Option<usize>) -> Result<Vec<DomainEvent>, String>;
    
    /// Get events in time range
    fn get_events_in_range(&self, start: DateTime<Utc>, end: DateTime<Utc>) -> Result<Vec<DomainEvent>, String>;
}

/// In-memory event bus implementation
pub struct InMemoryEventBus {
    sender: broadcast::Sender<DomainEvent>,
    handlers: Arc<RwLock<HashMap<String, Vec<Arc<dyn EventHandler>>>>>,
}

impl Clone for InMemoryEventBus {
    fn clone(&self) -> Self {
        Self {
            sender: self.sender.clone(),
            handlers: Arc::clone(&self.handlers),
        }
    }
}

impl InMemoryEventBus {
    /// Create a new in-memory event bus
    pub fn new() -> Self {
        let (sender, _) = broadcast::channel(1000); // Buffer 1000 events
        
        Self {
            sender,
            handlers: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Register an event handler
    pub async fn register_handler<H>(&self, handler: H) 
    where 
        H: EventHandler + 'static
    {
        let handler = Arc::new(handler);
        let mut handlers = self.handlers.write().await;
        
        for event_type in handler.interested_events() {
            handlers
                .entry(event_type.to_string())
                .or_insert_with(Vec::new)
                .push(handler.clone());
        }
    }

    /// Subscribe to events as a stream
    pub fn subscribe(&self) -> impl Stream<Item = DomainEvent> {
        let mut receiver = self.sender.subscribe();

        stream! {
            loop {
                match receiver.recv().await {
                    Ok(event) => yield event,
                    Err(broadcast::error::RecvError::Lagged(_)) => continue,
                    Err(broadcast::error::RecvError::Closed) => break,
                }
            }
        }
    }

    /// Process events (internal method)
    async fn process_event(&self, event: DomainEvent) -> Result<(), String> {
        let handlers = self.handlers.read().await;
        let event_type = self.get_event_type(&event);
        
        if let Some(event_handlers) = handlers.get(&event_type) {
            for handler in event_handlers {
                if let Err(e) = handler.handle(&event) {
                    // Log error but don't fail the whole processing
                    tracing::error!("Event handler failed: {}", e);
                }
            }
        }
        
        Ok(())
    }

    /// Get event type string from domain event
    fn get_event_type(&self, event: &DomainEvent) -> String {
        match event {
            DomainEvent::TaskCreated { .. } => "TaskCreated",
            DomainEvent::TaskUpdated { .. } => "TaskUpdated",
            DomainEvent::TaskAssigned { .. } => "TaskAssigned",
            DomainEvent::TaskStatusChanged { .. } => "TaskStatusChanged",
            DomainEvent::TaskCompleted { .. } => "TaskCompleted",
            DomainEvent::ClientCreated { .. } => "ClientCreated",
            DomainEvent::ClientUpdated { .. } => "ClientUpdated",
            DomainEvent::ClientDeactivated { .. } => "ClientDeactivated",
            DomainEvent::InterventionCreated { .. } => "InterventionCreated",
            DomainEvent::InterventionStarted { .. } => "InterventionStarted",
            DomainEvent::InterventionStepStarted { .. } => "InterventionStepStarted",
            DomainEvent::InterventionStepCompleted { .. } => "InterventionStepCompleted",
            DomainEvent::InterventionCompleted { .. } => "InterventionCompleted",
            DomainEvent::InterventionCancelled { .. } => "InterventionCancelled",
            DomainEvent::UserCreated { .. } => "UserCreated",
            DomainEvent::UserUpdated { .. } => "UserUpdated",
            DomainEvent::UserLoggedIn { .. } => "UserLoggedIn",
            DomainEvent::UserLoggedOut { .. } => "UserLoggedOut",
            DomainEvent::AuthenticationFailed { .. } => "AuthenticationFailed",
            DomainEvent::AuthenticationSuccess { .. } => "AuthenticationSuccess",
            DomainEvent::SystemError { .. } => "SystemError",
            DomainEvent::SystemMaintenance { .. } => "SystemMaintenance",
            DomainEvent::PerformanceAlert { .. } => "PerformanceAlert",
        }.to_string()
    }
}

impl EventPublisher for InMemoryEventBus {
    fn publish(&self, event: DomainEvent) -> Result<(), String> {
        // Send event to all subscribers
        if let Err(e) = self.sender.send(event.clone()) {
            return Err(format!("Failed to publish event: {}", e));
        }
        
        // Process event synchronously for registered handlers
        let event_bus = self.clone();
        tokio::spawn(async move {
            if let Err(e) = event_bus.process_event(event).await {
                tracing::error!("Failed to process event: {}", e);
            }
        });
        
        Ok(())
    }

    fn publish_batch(&self, events: Vec<DomainEvent>) -> Result<(), String> {
        for event in events {
            self.publish(event)?;
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use futures_util::StreamExt;
    use std::time::Duration;

    #[tokio::test]
    async fn subscribe_stream_receives_published_event() {
        let event_bus = InMemoryEventBus::new();
        let mut stream = event_bus.subscribe();
        let event = DomainEvent::UserLoggedOut {
            id: "event-1".to_string(),
            user_id: "user-1".to_string(),
            timestamp: Utc::now(),
            metadata: None,
        };

        event_bus.publish(event).unwrap();

        let received = tokio::time::timeout(Duration::from_secs(1), stream.next())
            .await
            .expect("timed out waiting for event");

        assert!(matches!(
            received,
            Some(DomainEvent::UserLoggedOut { user_id, .. }) if user_id == "user-1"
        ));
    }
}

/// Event processor that handles event processing logic
pub struct EventProcessor {
    event_store: Arc<dyn EventStore>,
    handlers: Vec<Arc<dyn EventHandler>>,
}

impl EventProcessor {
    /// Create a new event processor
    pub fn new(event_store: Arc<dyn EventStore>) -> Self {
        Self {
            event_store,
            handlers: Vec::new(),
        }
    }

    /// Add an event handler
    pub fn add_handler<H>(&mut self, handler: H)
    where
        H: EventHandler + 'static
    {
        self.handlers.push(Arc::new(handler));
    }

    /// Process a single event
    pub async fn process_event(&self, event: DomainEvent) -> Result<(), String> {
        // Store the event first
        self.event_store.store(&event)?;
        
        // Then notify all interested handlers
        for handler in &self.handlers {
            let event_type = self.get_event_type(&event);
            if handler.interested_events().contains(&event_type) {
                handler.handle(&event)?;
            }
        }
        
        Ok(())
    }

    /// Process multiple events
    pub async fn process_batch(&self, events: Vec<DomainEvent>) -> Result<(), String> {
        for event in events {
            self.process_event(event).await?;
        }
        Ok(())
    }

    /// Get event type string from domain event
    fn get_event_type(&self, event: &DomainEvent) -> &'static str {
        match event {
            DomainEvent::TaskCreated { .. } => "TaskCreated",
            DomainEvent::TaskUpdated { .. } => "TaskUpdated",
            DomainEvent::TaskAssigned { .. } => "TaskAssigned",
            DomainEvent::TaskStatusChanged { .. } => "TaskStatusChanged",
            DomainEvent::TaskCompleted { .. } => "TaskCompleted",
            DomainEvent::ClientCreated { .. } => "ClientCreated",
            DomainEvent::ClientUpdated { .. } => "ClientUpdated",
            DomainEvent::ClientDeactivated { .. } => "ClientDeactivated",
            DomainEvent::InterventionCreated { .. } => "InterventionCreated",
            DomainEvent::InterventionStarted { .. } => "InterventionStarted",
            DomainEvent::InterventionStepStarted { .. } => "InterventionStepStarted",
            DomainEvent::InterventionStepCompleted { .. } => "InterventionStepCompleted",
            DomainEvent::InterventionCompleted { .. } => "InterventionCompleted",
            DomainEvent::InterventionCancelled { .. } => "InterventionCancelled",
            DomainEvent::UserCreated { .. } => "UserCreated",
            DomainEvent::UserUpdated { .. } => "UserUpdated",
            DomainEvent::UserLoggedIn { .. } => "UserLoggedIn",
            DomainEvent::UserLoggedOut { .. } => "UserLoggedOut",
            DomainEvent::AuthenticationFailed { .. } => "AuthenticationFailed",
            DomainEvent::AuthenticationSuccess { .. } => "AuthenticationSuccess",
            DomainEvent::SystemError { .. } => "SystemError",
            DomainEvent::SystemMaintenance { .. } => "SystemMaintenance",
            DomainEvent::PerformanceAlert { .. } => "PerformanceAlert",
        }
    }
}

/// Event replay functionality
pub struct EventReplayer {
    event_store: Arc<dyn EventStore>,
}

impl EventReplayer {
    /// Create a new event replayer
    pub fn new(event_store: Arc<dyn EventStore>) -> Self {
        Self { event_store }
    }

    /// Replay events from a specific point
    pub async fn replay_from(&self, aggregate_id: &str, from_version: Option<i64>) -> Result<(), String> {
        let events = self.event_store.get_events(aggregate_id, from_version)?;
        
        for event in events {
            // Process each event in order
            // This would typically rebuild the aggregate state
            tracing::info!("Replaying event: {:?}", event);
        }
        
        Ok(())
    }

    /// Replay all events
    pub async fn replay_all(&self) -> Result<(), String> {
        let start = Utc::now() - chrono::Duration::days(30); // Last 30 days
        let end = Utc::now();
        
        let events = self.event_store.get_events_in_range(start, end)?;
        
        for event in events {
            tracing::info!("Replaying event: {:?}", event);
        }
        
        Ok(())
    }
}

/// Event projection for building read models
pub struct EventProjection {
    name: String,
    handlers: HashMap<String, Box<dyn Fn(&DomainEvent) -> Result<(), String>>>,
}

impl EventProjection {
    /// Create a new event projection
    pub fn new(name: String) -> Self {
        Self {
            name,
            handlers: HashMap::new(),
        }
    }

    /// Add a handler for a specific event type
    pub fn add_handler<F>(&mut self, event_type: &str, handler: F)
    where
        F: Fn(&DomainEvent) -> Result<(), String> + 'static
    {
        self.handlers.insert(event_type.to_string(), Box::new(handler));
    }

    /// Process an event
    pub fn process(&self, event: &DomainEvent) -> Result<(), String> {
        let event_type = match event {
            DomainEvent::TaskCreated { .. } => "TaskCreated",
            DomainEvent::TaskUpdated { .. } => "TaskUpdated",
            DomainEvent::TaskAssigned { .. } => "TaskAssigned",
            DomainEvent::TaskStatusChanged { .. } => "TaskStatusChanged",
            DomainEvent::TaskCompleted { .. } => "TaskCompleted",
            DomainEvent::ClientCreated { .. } => "ClientCreated",
            DomainEvent::ClientUpdated { .. } => "ClientUpdated",
            DomainEvent::ClientDeactivated { .. } => "ClientDeactivated",
            DomainEvent::InterventionCreated { .. } => "InterventionCreated",
            DomainEvent::InterventionStarted { .. } => "InterventionStarted",
            DomainEvent::InterventionStepStarted { .. } => "InterventionStepStarted",
            DomainEvent::InterventionStepCompleted { .. } => "InterventionStepCompleted",
            DomainEvent::InterventionCompleted { .. } => "InterventionCompleted",
            DomainEvent::InterventionCancelled { .. } => "InterventionCancelled",
            DomainEvent::UserCreated { .. } => "UserCreated",
            DomainEvent::UserUpdated { .. } => "UserUpdated",
            DomainEvent::UserLoggedIn { .. } => "UserLoggedIn",
            DomainEvent::UserLoggedOut { .. } => "UserLoggedOut",
            DomainEvent::AuthenticationFailed { .. } => "AuthenticationFailed",
            DomainEvent::AuthenticationSuccess { .. } => "AuthenticationSuccess",
            DomainEvent::SystemError { .. } => "SystemError",
            DomainEvent::SystemMaintenance { .. } => "SystemMaintenance",
            DomainEvent::PerformanceAlert { .. } => "PerformanceAlert",
        };

        if let Some(handler) = self.handlers.get(event_type) {
            handler(event)
        } else {
            Ok(())
        }
    }
}

/// Event-sourced aggregate trait
pub trait EventSourced {
    /// Get the current version of the aggregate
    fn version(&self) -> i64;
    
    /// Get the aggregate ID
    fn id(&self) -> &str;
    
    /// Apply an event to update state
    fn apply(&mut self, event: DomainEvent) -> Result<(), String>;
    
    /// Get uncommitted events
    fn get_uncommitted_events(&self) -> Vec<DomainEvent>;
    
    /// Mark events as committed
    fn mark_events_committed(&mut self);
    
    /// Load from events
    fn load_from_events(&mut self, events: Vec<DomainEvent>) -> Result<(), String>;
}

/// Macro for creating event handlers
#[macro_export]
macro_rules! event_handler {
    ($handler_type:ty, $event_type:expr, $handler:ident) => {
        impl $crate::event_system::EventHandler for $handler_type {
            fn handle(&self, event: &$crate::event_system::DomainEvent) -> Result<(), String> {
                match event {
                    $crate::event_system::DomainEvent::$event_type { .. } => {
                        self.$handler(event)
                    },
                    _ => Ok(()),
                }
            }
            
            fn interested_events(&self) -> Vec<&'static str> {
                vec![$event_type]
            }
        }
    };
}
