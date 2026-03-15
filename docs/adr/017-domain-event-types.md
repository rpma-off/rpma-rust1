---
title: "ADR-017: Domain Event Types and Factory Pattern"
summary: "Domain events use a structured enum (`DomainEvent`) with factory functions for consistent event creation. Each event includes correlation IDs, timestamps, and optional metadata."
domain: "events"
status: "accepted"
read_when:
  - "Designing new features"
  - "Reviewing architectural decisions"
---

# ADR-017: Domain Event Types and Factory Pattern

## Status

Accepted

## Date

2026-03-13

## Summary

Domain events use a structured enum (`DomainEvent`) with factory functions for consistent event creation. Each event includes correlation IDs, timestamps, and optional metadata.

## Context

- Need consistent event structure across domains
- Events must be traceable across the system
- Event metadata needed for debugging and audit
- Type-safe event creation prevents missing fields
- Future integration with external systems requires structured events

## Decision

### Domain Event Enum

```rust
// src-tauri/src/shared/services/domain_event.rs
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DomainEvent {
    // Task Events
    TaskCreated {
        id: String,                    // Event UUID
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
    TaskStatusChanged {
        id: String,
        task_id: String,
        old_status: String,
        new_status: String,
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

    // Intervention Events
    InterventionStarted {
        id: String,
        intervention_id: String,
        task_id: String,
        started_by: String,
        started_at: DateTime<Utc>,
        timestamp: DateTime<Utc>,
        metadata: Option<serde_json::Value>,
    },
    InterventionCompleted {
        id: String,
        intervention_id: String,
        completed_by: String,
        completed_at: DateTime<Utc>,
        quality_score: Option<f64>,
        customer_satisfaction: Option<f64>,
        actual_duration: Option<i64>,
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

    // Authentication Events
    AuthenticationSuccess {
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
}
```

### Common Fields

Every event includes:

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | Event UUID (generated) |
| `timestamp` | DateTime<Utc>| When the event occurred |
| `metadata` | Option<Value>| Additional context (optional) |
| `user_id` or equivalent | String | Who triggered the event |

### Event Type Method

```rust
impl DomainEvent {
    pub fn event_type(&self) -> &'static str {
        match self {
            DomainEvent::TaskCreated { .. } => "TaskCreated",
            DomainEvent::TaskUpdated { .. } => "TaskUpdated",
            DomainEvent::TaskStatusChanged { .. } => "TaskStatusChanged",
            DomainEvent::TaskAssigned { .. } => "TaskAssigned",
            DomainEvent::InterventionStarted { .. } => "InterventionStarted",
            DomainEvent::InterventionCompleted { .. } => "InterventionCompleted",
            DomainEvent::InterventionFinalized { .. } => "InterventionFinalized",
            DomainEvent::MaterialConsumed { .. } => "MaterialConsumed",
            DomainEvent::AuthenticationSuccess { .. } => "AuthenticationSuccess",
            DomainEvent::AuthenticationFailed { .. } => "AuthenticationFailed",
        }
    }

    pub fn aggregate_id(&self) -> &str {
        match self {
            DomainEvent::TaskCreated { task_id, .. } => task_id,
            DomainEvent::TaskUpdated { task_id, .. } => task_id,
            DomainEvent::TaskStatusChanged { task_id, .. } => task_id,
            DomainEvent::TaskAssigned { task_id, .. } => task_id,
            DomainEvent::InterventionStarted { intervention_id, .. } => intervention_id,
            DomainEvent::InterventionCompleted { intervention_id, .. } => intervention_id,
            DomainEvent::InterventionFinalized { intervention_id, .. } => intervention_id,
            DomainEvent::MaterialConsumed { material_id, .. } => material_id,
            DomainEvent::AuthenticationSuccess { user_id, .. } => user_id,
            DomainEvent::AuthenticationFailed { user_id, .. } => user_id.as_str().unwrap_or(""),
        }
    }

    pub fn occurred_at(&self) -> DateTime<Utc> {
        match self {
            DomainEvent::TaskCreated { timestamp, .. } => *timestamp,
            DomainEvent::TaskUpdated { timestamp, .. } => *timestamp,
            // ... all variants
        }
    }
}
```

### Event Factory Functions

```rust
// src-tauri/src/shared/services/event_bus.rs
pub mod event_factory {
    use super::*;
    use uuid::Uuid;

    /// Create a TaskCreated event
    pub fn task_created(
        task_id: String,
        title: String,
        assigned_to: Option<String>,
    ) -> DomainEvent {
        DomainEvent::TaskCreated {
            id: Uuid::new_v4().to_string(),
            task_id: task_id.clone(),
            task_number: task_id,
            title,
            user_id: assigned_to.unwrap_or_else(|| "system".to_string()),
            timestamp: Utc::now(),
            metadata: None,
        }
    }

    /// Create a TaskStatusChanged event
    pub fn task_status_changed(
        task_id: String,
        old_status: String,
        new_status: String,
        user_id: String,
    ) -> DomainEvent {
        DomainEvent::TaskStatusChanged {
            id: Uuid::new_v4().to_string(),
            task_id,
            old_status,
            new_status,
            user_id,
            timestamp: Utc::now(),
            metadata: None,
        }
    }

    /// Create a TaskAssigned event
    pub fn task_assigned(
        task_id: String,
        technician_id: String,
        assigned_by: String,
    ) -> DomainEvent {
        DomainEvent::TaskAssigned {
            id: Uuid::new_v4().to_string(),
            task_id,
            technician_id,
            assigned_by,
            assigned_at: Utc::now(),
            timestamp: Utc::now(),
            metadata: None,
        }
    }

    /// Create an InterventionFinalized event
    pub fn intervention_finalized(
        intervention_id: String,
        task_id: String,
        technician_id: String,
        completed_at_ms: i64,
    ) -> DomainEvent {
        DomainEvent::InterventionFinalized {
            id: Uuid::new_v4().to_string(),
            intervention_id,
            task_id,
            technician_id,
            completed_at_ms,
            timestamp: Utc::now(),
            metadata: None,
        }
    }

    /// Create a MaterialConsumed event
    pub fn material_consumed(
        material_id: String,
        intervention_id: String,
        quantity: f64,
        unit: String,
        consumed_by: String,
    ) -> DomainEvent {
        DomainEvent::MaterialConsumed {
            id: Uuid::new_v4().to_string(),
            material_id,
            intervention_id,
            quantity,
            unit,
            consumed_by,
            timestamp: Utc::now(),
            metadata: None,
        }
    }

    /// Create an AuthenticationSuccess event
    pub fn authentication_success(user_id: String) -> DomainEvent {
        DomainEvent::AuthenticationSuccess {
            id: Uuid::new_v4().to_string(),
            user_id,
            timestamp: Utc::now(),
            metadata: None,
        }
    }

    /// Create an AuthenticationFailed event
    pub fn authentication_failed(user_id: Option<String>, reason: String) -> DomainEvent {
        DomainEvent::AuthenticationFailed {
            id: Uuid::new_v4().to_string(),
            user_id,
            reason,
            timestamp: Utc::now(),
            metadata: None,
        }
    }
}
```

### Usage in Services

```rust
// src-tauri/src/domains/tasks/infrastructure/task.rs
impl TaskService {
    pub async fn create(&self, request: CreateTaskRequest, ctx: &RequestContext) -> AppResult<Task> {
        // ... create task logic ...

        // Publish event
        let event = event_factory::task_created(
            task.id.clone(),
            task.title.clone(),
            task.assigned_to.clone(),
        );
        self.event_bus.publish(event)?;

        Ok(task)
    }

    pub async fn update_status(&self, id: &str, new_status: TaskStatus, ctx: &RequestContext) -> AppResult<Task> {
        let old_task = self.get(id)?;
        let old_status = old_task.status.clone();

        // ... update logic ...

        let event = event_factory::task_status_changed(
            id.to_string(),
            old_status.to_string(),
            new_status.to_string(),
            ctx.user_id().to_string(),
        );
        self.event_bus.publish(event)?;

        Ok(task)
    }
}
```

### Event Metadata Pattern

```rust
// Adding metadata for debugging/tracing
let event = DomainEvent::TaskCreated {
    id: Uuid::new_v4().to_string(),
    task_id: task.id.clone(),
    task_number: task.id.clone(),
    title: task.title.clone(),
    user_id: ctx.user_id().to_string(),
    timestamp: Utc::now(),
    metadata: Some(json!({
        "correlation_id": ctx.correlation_id,
        "source": "task_service",
        "version": "1.0",
        "client_version": "web-2.1.0",
    })),
};
```

## Consequences

### Positive

- Type-safe event creation prevents missing fields
- Consistent event structure across all domains
- UUID ensures unique event IDs
- Correlation via metadata
- Easy to add new event types
- Serializable for persistence/logging

### Negative

- Event enum grows large as domains grow
- Each event variant requires corresponding factory function
- Metadata field is optional and underutilized

## Adding New Events

1. Add variant to `DomainEvent` enum
2. Implement `event_type()` match arm
3. Implement `aggregate_id()` match arm
4. Create factory function in `event_factory`
5. Register handler interest if needed
6. Publish from service layer

## Related Files

- `src-tauri/src/shared/services/domain_event.rs` — Event definitions
- `src-tauri/src/shared/services/event_bus.rs` — Factory and bus
- Domain services that publish events
- Event handlers that consume events

## When to Read This ADR

- Adding new domain event types
- Creating event factory functions
- Understanding event structure
- Adding event metadata
- Serializing events for logging

## References

- ADR-016: In-Memory Event Bus
- Domain-Driven Design (Domain Events)
- Event sourcing patterns