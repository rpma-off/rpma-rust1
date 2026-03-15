//! Domain Event Models
//!
//! This module contains all domain event definitions used for event-driven
//! communication between services. Events are immutable facts about things
//! that have happened in the system.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

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
    InterventionFinalized {
        id: String,
        intervention_id: String,
        task_id: String,
        technician_id: String,
        completed_at_ms: i64,
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

    // Material Events
    MaterialConsumed {
        id: String,
        material_id: String,
        intervention_id: String,
        quantity: f64,
        unit: String,
        consumed_by: String,
        timestamp: DateTime<Utc>,
        metadata: Option<serde_json::Value>,
    },

    // Quote Events
    QuoteShared {
        id: String,
        quote_id: String,
        quote_number: String,
        shared_by: String,
        shared_at_ms: i64,
        timestamp: DateTime<Utc>,
        metadata: Option<serde_json::Value>,
    },
    QuoteCustomerResponded {
        id: String,
        quote_id: String,
        quote_number: String,
        action: String,
        customer_id: Option<String>,
        responded_at_ms: i64,
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

    // Notification Events
    NotificationReceived {
        id: String,
        notification_id: String,
        user_id: String,
        message: String,
        timestamp: DateTime<Utc>,
        metadata: Option<serde_json::Value>,
    },

    // Quote Events
    QuoteAccepted {
        id: String,
        quote_id: String,
        quote_number: String,
        client_id: String,
        accepted_by: String,
        task_id: Option<String>,
        timestamp: DateTime<Utc>,
        metadata: Option<serde_json::Value>,
    },
    QuoteRejected {
        id: String,
        quote_id: String,
        quote_number: String,
        client_id: String,
        rejected_by: String,
        reason: Option<String>,
        timestamp: DateTime<Utc>,
        metadata: Option<serde_json::Value>,
    },
    QuoteConverted {
        id: String,
        quote_id: String,
        quote_number: String,
        client_id: String,
        task_id: String,
        task_number: String,
        converted_by: String,
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
            DomainEvent::NotificationReceived { .. } => "NotificationReceived",
            DomainEvent::QuoteAccepted { .. } => "QuoteAccepted",
            DomainEvent::QuoteRejected { .. } => "QuoteRejected",
            DomainEvent::QuoteConverted { .. } => "QuoteConverted",
            DomainEvent::QuoteShared { .. } => "QuoteShared",
            DomainEvent::QuoteCustomerResponded { .. } => "QuoteCustomerResponded",
        }
    }

    /// Get the timestamp of an event
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
            DomainEvent::NotificationReceived { timestamp, .. } => *timestamp,
            DomainEvent::QuoteAccepted { timestamp, .. } => *timestamp,
            DomainEvent::QuoteRejected { timestamp, .. } => *timestamp,
            DomainEvent::QuoteConverted { timestamp, .. } => *timestamp,
            DomainEvent::QuoteShared { timestamp, .. } => *timestamp,
            DomainEvent::QuoteCustomerResponded { timestamp, .. } => *timestamp,
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
    pub from_timestamp: Option<DateTime<Utc>>,
    /// Filter by end time
    pub to_timestamp: Option<DateTime<Utc>>,
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
    pub fn with_time_range(mut self, from: DateTime<Utc>, to: DateTime<Utc>) -> Self {
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
        let mut events = self.events.lock().unwrap_or_else(|e| e.into_inner());
        events.clear();
    }

    /// Get total event count
    pub fn count(&self) -> usize {
        let events = self.events.lock().unwrap_or_else(|e| e.into_inner());
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
        let mut events = self.events.lock().unwrap_or_else(|e| e.into_inner());
        events.push(envelope.clone());
        Ok(())
    }

    fn store_batch(&self, envelopes: &[EventEnvelope]) -> Result<(), String> {
        let mut events = self.events.lock().unwrap_or_else(|e| e.into_inner());
        events.extend_from_slice(envelopes);
        Ok(())
    }

    fn query(&self, filter: EventFilter) -> Result<Vec<EventEnvelope>, String> {
        let events = self.events.lock().unwrap_or_else(|e| e.into_inner());

        let filtered: Vec<_> = events
            .iter()
            .filter(|e| {
                if let Some(ref types) = filter.event_types {
                    if !types.contains(&e.event.event_type().to_string()) {
                        return false;
                    }
                }
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
        Ok(Vec::new())
    }
}
