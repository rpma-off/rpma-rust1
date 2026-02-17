//! Domain Event Models
//!
//! This module contains all domain event definitions used for event-driven
//! communication between services. Events are immutable facts about things
//! that have happened in the system.

pub use crate::services::event_system::DomainEvent;

/// Re-export the event factory for convenient access
pub use crate::services::event_bus::event_factory;
use chrono::{DateTime, Utc};

impl DomainEvent {
    /// Get the event type name as a string
    pub fn event_type(&self) -> &'static str {
        match self {
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
            DomainEvent::InterventionFinalized { .. } => "InterventionFinalized",
            DomainEvent::InterventionCancelled { .. } => "InterventionCancelled",
            DomainEvent::MaterialConsumed { .. } => "MaterialConsumed",
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

    /// Get the timestamp of the event
    pub fn timestamp(&self) -> DateTime<Utc> {
        match self {
            DomainEvent::TaskCreated { timestamp, .. } => *timestamp,
            DomainEvent::TaskUpdated { timestamp, .. } => *timestamp,
            DomainEvent::TaskAssigned { timestamp, .. } => *timestamp,
            DomainEvent::TaskStatusChanged { timestamp, .. } => *timestamp,
            DomainEvent::TaskCompleted { timestamp, .. } => *timestamp,
            DomainEvent::ClientCreated { timestamp, .. } => *timestamp,
            DomainEvent::ClientUpdated { timestamp, .. } => *timestamp,
            DomainEvent::ClientDeactivated { timestamp, .. } => *timestamp,
            DomainEvent::InterventionCreated { timestamp, .. } => *timestamp,
            DomainEvent::InterventionStarted { timestamp, .. } => *timestamp,
            DomainEvent::InterventionStepStarted { timestamp, .. } => *timestamp,
            DomainEvent::InterventionStepCompleted { timestamp, .. } => *timestamp,
            DomainEvent::InterventionCompleted { timestamp, .. } => *timestamp,
            DomainEvent::InterventionFinalized { timestamp, .. } => *timestamp,
            DomainEvent::InterventionCancelled { timestamp, .. } => *timestamp,
            DomainEvent::MaterialConsumed { timestamp, .. } => *timestamp,
            DomainEvent::UserCreated { timestamp, .. } => *timestamp,
            DomainEvent::UserUpdated { timestamp, .. } => *timestamp,
            DomainEvent::UserLoggedIn { timestamp, .. } => *timestamp,
            DomainEvent::UserLoggedOut { timestamp, .. } => *timestamp,
            DomainEvent::AuthenticationFailed { timestamp, .. } => *timestamp,
            DomainEvent::AuthenticationSuccess { timestamp, .. } => *timestamp,
            DomainEvent::SystemError { timestamp, .. } => *timestamp,
            DomainEvent::SystemMaintenance { timestamp, .. } => *timestamp,
            DomainEvent::PerformanceAlert { timestamp, .. } => *timestamp,
        }
    }
}

/// Event metadata for additional context
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct EventMetadata {
    /// Correlation ID for tracking events across services
    pub correlation_id: String,
    /// User who triggered the event
    pub user_id: Option<String>,
    /// Source service that generated the event
    pub source: String,
    /// Client IP address if applicable
    pub ip_address: Option<String>,
    /// Additional custom metadata
    pub custom: Option<serde_json::Value>,
}

impl EventMetadata {
    /// Create new event metadata
    pub fn new(source: String) -> Self {
        Self {
            correlation_id: uuid::Uuid::new_v4().to_string(),
            user_id: None,
            source,
            ip_address: None,
            custom: None,
        }
    }

    /// Create metadata with user context
    pub fn with_user(source: String, user_id: String) -> Self {
        Self {
            correlation_id: uuid::Uuid::new_v4().to_string(),
            user_id: Some(user_id),
            source,
            ip_address: None,
            custom: None,
        }
    }

    /// Add correlation ID
    pub fn with_correlation_id(mut self, correlation_id: String) -> Self {
        self.correlation_id = correlation_id;
        self
    }

    /// Add IP address
    pub fn with_ip_address(mut self, ip_address: String) -> Self {
        self.ip_address = Some(ip_address);
        self
    }

    /// Add custom metadata
    pub fn with_custom(mut self, custom: serde_json::Value) -> Self {
        self.custom = Some(custom);
        self
    }
}

/// Event envelope for transporting events with metadata
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct EventEnvelope {
    /// The domain event
    pub event: DomainEvent,
    /// Event metadata
    pub metadata: EventMetadata,
    /// Event version for schema evolution
    pub version: i32,
}

impl EventEnvelope {
    /// Create a new event envelope
    pub fn new(event: DomainEvent, metadata: EventMetadata) -> Self {
        Self {
            event,
            metadata,
            version: 1,
        }
    }

    /// Create envelope with current timestamp
    pub fn with_event(event: DomainEvent, source: String) -> Self {
        Self::new(event, EventMetadata::new(source))
    }

    /// Create envelope with user context
    pub fn with_user(event: DomainEvent, source: String, user_id: String) -> Self {
        Self::new(event, EventMetadata::with_user(source, user_id))
    }
}

/// Event filter for querying events
#[derive(Debug, Clone)]
pub struct EventFilter {
    /// Filter by event types
    pub event_types: Option<Vec<String>>,
    /// Filter by aggregate ID
    pub aggregate_id: Option<String>,
    /// Filter by user ID
    pub user_id: Option<String>,
    /// Filter by start time
    pub from_timestamp: Option<chrono::DateTime<chrono::Utc>>,
    /// Filter by end time
    pub to_timestamp: Option<chrono::DateTime<chrono::Utc>>,
    /// Maximum number of events to return
    pub limit: Option<usize>,
}

impl EventFilter {
    /// Create a new empty filter
    pub fn new() -> Self {
        Self {
            event_types: None,
            aggregate_id: None,
            user_id: None,
            from_timestamp: None,
            to_timestamp: None,
            limit: None,
        }
    }

    /// Filter by event type
    pub fn with_event_type(mut self, event_type: String) -> Self {
        self.event_types = Some(vec![event_type]);
        self
    }

    /// Filter by multiple event types
    pub fn with_event_types(mut self, event_types: Vec<String>) -> Self {
        self.event_types = Some(event_types);
        self
    }

    /// Filter by aggregate ID
    pub fn with_aggregate_id(mut self, aggregate_id: String) -> Self {
        self.aggregate_id = Some(aggregate_id);
        self
    }

    /// Filter by user ID
    pub fn with_user_id(mut self, user_id: String) -> Self {
        self.user_id = Some(user_id);
        self
    }

    /// Filter by time range
    pub fn with_time_range(
        mut self,
        from: chrono::DateTime<chrono::Utc>,
        to: chrono::DateTime<chrono::Utc>,
    ) -> Self {
        self.from_timestamp = Some(from);
        self.to_timestamp = Some(to);
        self
    }

    /// Set result limit
    pub fn with_limit(mut self, limit: usize) -> Self {
        self.limit = Some(limit);
        self
    }
}

impl Default for EventFilter {
    fn default() -> Self {
        Self::new()
    }
}

/// Event store trait for persisting events
pub trait EventStore: Send + Sync {
    /// Store a single event
    fn store(&self, envelope: &EventEnvelope) -> Result<(), String>;

    /// Store multiple events
    fn store_batch(&self, envelopes: &[EventEnvelope]) -> Result<(), String>;

    /// Get events by filter
    fn query(&self, filter: EventFilter) -> Result<Vec<EventEnvelope>, String>;

    /// Get events for a specific aggregate
    fn get_aggregate_events(
        &self,
        aggregate_id: &str,
        from_version: Option<i64>,
    ) -> Result<Vec<EventEnvelope>, String>;
}

/// In-memory event store implementation for testing
pub struct InMemoryEventStore {
    events: std::sync::Mutex<Vec<EventEnvelope>>,
}

impl InMemoryEventStore {
    /// Create a new in-memory event store
    pub fn new() -> Self {
        Self {
            events: std::sync::Mutex::new(Vec::new()),
        }
    }

    /// Clear all events
    pub fn clear(&self) {
        let mut events = self.events.lock().unwrap();
        events.clear();
    }

    /// Get total event count
    pub fn count(&self) -> usize {
        let events = self.events.lock().unwrap();
        events.len()
    }
}

impl Default for InMemoryEventStore {
    fn default() -> Self {
        Self::new()
    }
}

impl EventStore for InMemoryEventStore {
    fn store(&self, envelope: &EventEnvelope) -> Result<(), String> {
        let mut events = self.events.lock().unwrap();
        events.push(envelope.clone());
        Ok(())
    }

    fn store_batch(&self, envelopes: &[EventEnvelope]) -> Result<(), String> {
        let mut events = self.events.lock().unwrap();
        events.extend_from_slice(envelopes);
        Ok(())
    }

    fn query(&self, filter: EventFilter) -> Result<Vec<EventEnvelope>, String> {
        let events = self.events.lock().unwrap();

        let filtered: Vec<_> = events
            .iter()
            .filter(|e| {
                // Filter by event types
                if let Some(ref types) = filter.event_types {
                    if !types.contains(&e.event.event_type().to_string()) {
                        return false;
                    }
                }

                // Filter by time range
                if let Some(from) = filter.from_timestamp {
                    if e.event.timestamp() < from {
                        return false;
                    }
                }

                if let Some(to) = filter.to_timestamp {
                    if e.event.timestamp() > to {
                        return false;
                    }
                }

                true
            })
            .cloned()
            .collect();

        // Apply limit
        if let Some(limit) = filter.limit {
            Ok(filtered.into_iter().take(limit).collect())
        } else {
            Ok(filtered)
        }
    }

    fn get_aggregate_events(
        &self,
        _aggregate_id: &str,
        _from_version: Option<i64>,
    ) -> Result<Vec<EventEnvelope>, String> {
        // Simplified implementation - would extract aggregate ID from events in real implementation
        Ok(Vec::new())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::event_bus::event_factory;

    #[test]
    fn test_event_metadata_creation() {
        let metadata = EventMetadata::new("test-service".to_string());
        assert!(!metadata.correlation_id.is_empty());
        assert_eq!(metadata.source, "test-service");
        assert!(metadata.user_id.is_none());

        let metadata_with_user =
            EventMetadata::with_user("test-service".to_string(), "user-123".to_string());
        assert_eq!(metadata_with_user.user_id, Some("user-123".to_string()));
    }

    #[test]
    fn test_event_metadata_builder() {
        let metadata = EventMetadata::new("test-service".to_string())
            .with_ip_address("127.0.0.1".to_string())
            .with_custom(serde_json::json!({"key": "value"}));

        assert_eq!(metadata.ip_address, Some("127.0.0.1".to_string()));
        assert!(metadata.custom.is_some());
    }

    #[test]
    fn test_event_envelope_creation() {
        let event = event_factory::task_created("task-123".to_string(), "Test".to_string(), None);
        let envelope = EventEnvelope::with_event(event, "test-service".to_string());

        assert_eq!(envelope.version, 1);
        assert_eq!(envelope.metadata.source, "test-service");
    }

    #[test]
    fn test_event_filter_builder() {
        let filter = EventFilter::new()
            .with_event_type("TaskCreated".to_string())
            .with_user_id("user-123".to_string())
            .with_limit(10);

        assert_eq!(filter.event_types, Some(vec!["TaskCreated".to_string()]));
        assert_eq!(filter.user_id, Some("user-123".to_string()));
        assert_eq!(filter.limit, Some(10));
    }

    #[test]
    fn test_in_memory_event_store() {
        let store = InMemoryEventStore::new();

        let event = event_factory::task_created("task-123".to_string(), "Test".to_string(), None);
        let envelope = EventEnvelope::with_event(event, "test-service".to_string());

        store.store(&envelope).unwrap();
        assert_eq!(store.count(), 1);

        store.clear();
        assert_eq!(store.count(), 0);
    }

    #[test]
    fn test_event_store_batch() {
        let store = InMemoryEventStore::new();

        let envelopes = vec![
            EventEnvelope::with_event(
                event_factory::task_created("task-1".to_string(), "Task 1".to_string(), None),
                "test-service".to_string(),
            ),
            EventEnvelope::with_event(
                event_factory::task_created("task-2".to_string(), "Task 2".to_string(), None),
                "test-service".to_string(),
            ),
        ];

        store.store_batch(&envelopes).unwrap();
        assert_eq!(store.count(), 2);
    }

    #[test]
    fn test_event_store_query() {
        let store = InMemoryEventStore::new();

        let envelopes = vec![
            EventEnvelope::with_event(
                event_factory::task_created("task-1".to_string(), "Task 1".to_string(), None),
                "test-service".to_string(),
            ),
            EventEnvelope::with_event(
                event_factory::task_updated("task-2".to_string(), vec!["title".to_string()]),
                "test-service".to_string(),
            ),
        ];

        store.store_batch(&envelopes).unwrap();

        let filter = EventFilter::new().with_event_type("TaskCreated".to_string());
        let results = store.query(filter).unwrap();

        assert_eq!(results.len(), 1);
        assert_eq!(results[0].event.event_type(), "TaskCreated");
    }

    #[test]
    fn test_event_store_query_with_limit() {
        let store = InMemoryEventStore::new();

        let mut envelopes = Vec::new();
        for i in 0..10 {
            envelopes.push(EventEnvelope::with_event(
                event_factory::task_created(format!("task-{}", i), format!("Task {}", i), None),
                "test-service".to_string(),
            ));
        }

        store.store_batch(&envelopes).unwrap();

        let filter = EventFilter::new()
            .with_event_type("TaskCreated".to_string())
            .with_limit(5);
        let results = store.query(filter).unwrap();

        assert_eq!(results.len(), 5);
    }
}
