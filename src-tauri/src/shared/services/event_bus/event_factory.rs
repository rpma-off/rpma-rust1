use chrono::Utc;
use uuid::Uuid;

use crate::shared::services::domain_event::DomainEvent;

/// Create a TaskCreated event (no correlation context).
pub fn task_created(task_id: String, title: String, assigned_to: Option<String>) -> DomainEvent {
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

/// Create a TaskCreated event that carries the request correlation ID in
/// its metadata so that audit log entries and other handlers can preserve
/// trace continuity across the IPC -> service -> event pipeline.
///
/// Unlike [`task_created`], this variant requires explicit user and task
/// number fields so that the audit record is fully populated.
pub fn task_created_with_ctx(
    task_id: String,
    task_number: String,
    title: String,
    user_id: String,
    correlation_id: String,
) -> DomainEvent {
    DomainEvent::TaskCreated {
        id: Uuid::new_v4().to_string(),
        task_id,
        task_number,
        title,
        user_id,
        timestamp: Utc::now(),
        metadata: Some(serde_json::json!({ "correlation_id": correlation_id })),
    }
}

/// Creates a `TaskUpdated` event attributed to the system user.
pub fn task_updated(task_id: String, changes: Vec<String>) -> DomainEvent {
    DomainEvent::TaskUpdated {
        id: Uuid::new_v4().to_string(),
        task_id,
        previous_state: None,
        new_state: None,
        changed_fields: changes,
        user_id: "system".to_string(),
        timestamp: Utc::now(),
        metadata: None,
    }
}

/// Create a TaskUpdated event with actor + correlation context.
pub fn task_updated_with_ctx(
    task_id: String,
    changes: Vec<String>,
    user_id: String,
    correlation_id: String,
) -> DomainEvent {
    DomainEvent::TaskUpdated {
        id: Uuid::new_v4().to_string(),
        task_id,
        previous_state: None,
        new_state: None,
        changed_fields: changes,
        user_id,
        timestamp: Utc::now(),
        metadata: Some(serde_json::json!({ "correlation_id": correlation_id })),
    }
}

/// Creates a `TaskStatusChanged` event attributed to the system user.
pub fn task_status_changed(task_id: String, old_status: String, new_status: String) -> DomainEvent {
    DomainEvent::TaskStatusChanged {
        id: Uuid::new_v4().to_string(),
        task_id,
        old_status,
        new_status,
        user_id: "system".to_string(),
        timestamp: Utc::now(),
        metadata: None,
    }
}

/// Create a TaskStatusChanged event with actor + correlation context.
pub fn task_status_changed_with_ctx(
    task_id: String,
    old_status: String,
    new_status: String,
    user_id: String,
    correlation_id: String,
    reason: Option<String>,
) -> DomainEvent {
    DomainEvent::TaskStatusChanged {
        id: Uuid::new_v4().to_string(),
        task_id,
        old_status,
        new_status,
        user_id,
        timestamp: Utc::now(),
        metadata: Some(serde_json::json!({
            "correlation_id": correlation_id,
            "reason": reason
        })),
    }
}

/// Create a TaskDeleted event with actor + correlation context.
pub fn task_deleted_with_ctx(
    task_id: String,
    task_number: Option<String>,
    deleted_by: String,
    correlation_id: String,
) -> DomainEvent {
    DomainEvent::TaskDeleted {
        id: Uuid::new_v4().to_string(),
        task_id,
        task_number,
        deleted_by,
        timestamp: Utc::now(),
        metadata: Some(serde_json::json!({ "correlation_id": correlation_id })),
    }
}

/// Creates a `TaskAssigned` event for the given technician.
pub fn task_assigned(task_id: String, assigned_to: String) -> DomainEvent {
    DomainEvent::TaskAssigned {
        id: Uuid::new_v4().to_string(),
        task_id,
        technician_id: assigned_to,
        assigned_by: "system".to_string(),
        assigned_at: Utc::now(),
        timestamp: Utc::now(),
        metadata: None,
    }
}

/// Creates an `AuthenticationFailed` event with an optional user identifier.
pub fn authentication_failed(user_id: Option<String>, reason: String) -> DomainEvent {
    DomainEvent::AuthenticationFailed {
        id: Uuid::new_v4().to_string(),
        user_id,
        reason,
        timestamp: Utc::now(),
        metadata: None,
    }
}

/// Creates an `AuthenticationSuccess` event for the given user.
pub fn authentication_success(user_id: String) -> DomainEvent {
    DomainEvent::AuthenticationSuccess {
        id: Uuid::new_v4().to_string(),
        user_id,
        timestamp: Utc::now(),
        metadata: None,
    }
}

/// Creates an `InterventionStarted` event linking intervention to task.
pub fn intervention_started(intervention_id: String, task_id: String) -> DomainEvent {
    DomainEvent::InterventionStarted {
        id: Uuid::new_v4().to_string(),
        intervention_id,
        task_id,
        started_by: "system".to_string(),
        started_at: Utc::now(),
        timestamp: Utc::now(),
        metadata: None,
    }
}

/// Creates an `InterventionCompleted` event with default quality fields.
pub fn intervention_completed(intervention_id: String) -> DomainEvent {
    DomainEvent::InterventionCompleted {
        id: Uuid::new_v4().to_string(),
        intervention_id,
        completed_by: "system".to_string(),
        completed_at: Utc::now(),
        quality_score: None,
        customer_satisfaction: None,
        actual_duration: None,
        timestamp: Utc::now(),
        metadata: None,
    }
}

/// Creates an `InterventionFinalized` event with completion timestamp.
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

/// Creates a `MaterialConsumed` event for inventory tracking.
pub fn material_consumed(
    material_id: String,
    intervention_id: String,
    quantity: f64,
    unit: String,
) -> DomainEvent {
    DomainEvent::MaterialConsumed {
        id: Uuid::new_v4().to_string(),
        material_id,
        intervention_id,
        quantity,
        unit,
        consumed_by: "system".to_string(),
        timestamp: Utc::now(),
        metadata: None,
    }
}

/// Create a QuoteCreated event.
pub fn quote_created(
    quote_id: String,
    quote_number: String,
    client_id: String,
    created_by: String,
    task_id: Option<String>,
) -> DomainEvent {
    DomainEvent::QuoteCreated {
        id: Uuid::new_v4().to_string(),
        quote_id,
        quote_number,
        client_id,
        task_id,
        created_by,
        timestamp: Utc::now(),
        metadata: None,
    }
}

/// Create a QuoteUpdated event.
pub fn quote_updated(
    quote_id: String,
    quote_number: String,
    client_id: String,
    updated_by: String,
) -> DomainEvent {
    DomainEvent::QuoteUpdated {
        id: Uuid::new_v4().to_string(),
        quote_id,
        quote_number,
        client_id,
        updated_by,
        timestamp: Utc::now(),
        metadata: None,
    }
}

/// Create a QuoteDeleted event.
pub fn quote_deleted(
    quote_id: String,
    quote_number: String,
    client_id: String,
    deleted_by: String,
) -> DomainEvent {
    DomainEvent::QuoteDeleted {
        id: Uuid::new_v4().to_string(),
        quote_id,
        quote_number,
        client_id,
        deleted_by,
        timestamp: Utc::now(),
        metadata: None,
    }
}

/// Create a QuoteDuplicated event.
pub fn quote_duplicated(
    source_quote_id: String,
    new_quote_id: String,
    new_quote_number: String,
    client_id: String,
    duplicated_by: String,
) -> DomainEvent {
    DomainEvent::QuoteDuplicated {
        id: Uuid::new_v4().to_string(),
        source_quote_id,
        new_quote_id,
        new_quote_number,
        client_id,
        duplicated_by,
        timestamp: Utc::now(),
        metadata: None,
    }
}

/// Create a QuoteAccepted event.
pub fn quote_accepted(
    quote_id: String,
    quote_number: String,
    client_id: String,
    accepted_by: String,
    task_id: Option<String>,
    metadata: Option<serde_json::Value>,
) -> DomainEvent {
    DomainEvent::QuoteAccepted {
        id: Uuid::new_v4().to_string(),
        quote_id,
        quote_number,
        client_id,
        accepted_by,
        task_id,
        timestamp: Utc::now(),
        metadata,
    }
}

/// Create a QuoteRejected event.
pub fn quote_rejected(
    quote_id: String,
    quote_number: String,
    client_id: String,
    rejected_by: String,
    reason: Option<String>,
) -> DomainEvent {
    DomainEvent::QuoteRejected {
        id: Uuid::new_v4().to_string(),
        quote_id,
        quote_number,
        client_id,
        rejected_by,
        reason,
        timestamp: Utc::now(),
        metadata: None,
    }
}

/// Create a QuoteConverted event.
pub fn quote_converted(
    quote_id: String,
    quote_number: String,
    client_id: String,
    task_id: String,
    task_number: String,
    converted_by: String,
) -> DomainEvent {
    DomainEvent::QuoteConverted {
        id: Uuid::new_v4().to_string(),
        quote_id,
        quote_number,
        client_id,
        task_id,
        task_number,
        converted_by,
        timestamp: Utc::now(),
        metadata: None,
    }
}

/// Create an EntityRestored event.
pub fn entity_restored(entity_id: String, entity_type: String, restored_by: String) -> DomainEvent {
    DomainEvent::EntityRestored {
        id: Uuid::new_v4().to_string(),
        entity_id,
        entity_type,
        restored_by,
        timestamp: Utc::now(),
        metadata: None,
    }
}

/// Create an EntityHardDeleted event.
pub fn entity_hard_deleted(
    entity_id: String,
    entity_type: String,
    deleted_by: String,
) -> DomainEvent {
    DomainEvent::EntityHardDeleted {
        id: Uuid::new_v4().to_string(),
        entity_id,
        entity_type,
        deleted_by,
        timestamp: Utc::now(),
        metadata: None,
    }
}

/// Create a `ClientCreated` domain event (ADR-017).
pub fn client_created(client_id: String, name: String, user_id: String) -> DomainEvent {
    DomainEvent::ClientCreated {
        id: Uuid::new_v4().to_string(),
        client_id,
        name,
        user_id,
        timestamp: Utc::now(),
        metadata: None,
    }
}

/// Create a `ClientDeactivated` domain event (ADR-017).
pub fn client_deactivated(client_id: String, deactivated_by: String) -> DomainEvent {
    DomainEvent::ClientDeactivated {
        id: Uuid::new_v4().to_string(),
        client_id,
        deactivated_by,
        reason: None,
        timestamp: Utc::now(),
        metadata: None,
    }
}

/// Create a `NotificationReceived` domain event.
///
/// Emitted after a notification is persisted so the frontend can
/// invalidate its notification cache via the Tauri `notification:received`
/// event instead of relying on polling.
pub fn notification_received(
    notification_id: String,
    user_id: String,
    message: String,
) -> DomainEvent {
    DomainEvent::NotificationReceived {
        id: Uuid::new_v4().to_string(),
        notification_id,
        user_id,
        message,
        timestamp: Utc::now(),
        metadata: None,
    }
}

/// Create a `UserCreated` domain event with actor + correlation context
/// (ADR-017, ADR-020).
pub fn user_created_with_ctx(
    user_id: String,
    email: String,
    role: String,
    created_by: String,
    correlation_id: String,
) -> DomainEvent {
    DomainEvent::UserCreated {
        id: Uuid::new_v4().to_string(),
        user_id,
        email,
        role,
        created_by,
        timestamp: Utc::now(),
        metadata: Some(serde_json::json!({ "correlation_id": correlation_id })),
    }
}

/// Create a `UserUpdated` domain event with actor + correlation context (ADR-017, ADR-020).
pub fn user_updated_with_ctx(
    user_id: String,
    changed_fields: Vec<String>,
    updated_by: String,
    correlation_id: String,
) -> DomainEvent {
    DomainEvent::UserUpdated {
        id: Uuid::new_v4().to_string(),
        user_id,
        previous_state: None,
        new_state: None,
        changed_fields,
        updated_by,
        timestamp: Utc::now(),
        metadata: Some(serde_json::json!({ "correlation_id": correlation_id })),
    }
}

/// Create a `UserDeleted` domain event reusing the generic `EntityHardDeleted`
/// variant (ADR-017, ADR-020).
pub fn user_deleted_with_ctx(
    user_id: String,
    deleted_by: String,
    correlation_id: String,
) -> DomainEvent {
    DomainEvent::EntityHardDeleted {
        id: Uuid::new_v4().to_string(),
        entity_id: user_id,
        entity_type: "user".to_string(),
        deleted_by,
        timestamp: Utc::now(),
        metadata: Some(serde_json::json!({ "correlation_id": correlation_id })),
    }
}

/// Create a `QuoteShared` domain event (ADR-017).
pub fn quote_shared(
    quote_id: String,
    quote_number: String,
    shared_by: String,
    shared_at_ms: i64,
) -> DomainEvent {
    DomainEvent::QuoteShared {
        id: Uuid::new_v4().to_string(),
        quote_id,
        quote_number,
        shared_by,
        shared_at_ms,
        timestamp: Utc::now(),
        metadata: None,
    }
}

/// Create a `QuoteCustomerResponded` domain event (ADR-017).
pub fn quote_customer_responded(
    quote_id: String,
    quote_number: String,
    action: String,
    customer_id: Option<String>,
    responded_at_ms: i64,
) -> DomainEvent {
    DomainEvent::QuoteCustomerResponded {
        id: Uuid::new_v4().to_string(),
        quote_id,
        quote_number,
        action,
        customer_id,
        responded_at_ms,
        timestamp: Utc::now(),
        metadata: None,
    }
}
