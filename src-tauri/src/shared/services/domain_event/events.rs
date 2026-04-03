use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum DomainEvent {
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
    TaskDeleted {
        id: String,
        task_id: String,
        task_number: Option<String>,
        deleted_by: String,
        timestamp: DateTime<Utc>,
        metadata: Option<serde_json::Value>,
    },
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
    QuoteCreated {
        id: String,
        quote_id: String,
        quote_number: String,
        client_id: String,
        task_id: Option<String>,
        created_by: String,
        timestamp: DateTime<Utc>,
        metadata: Option<serde_json::Value>,
    },
    QuoteUpdated {
        id: String,
        quote_id: String,
        quote_number: String,
        client_id: String,
        updated_by: String,
        timestamp: DateTime<Utc>,
        metadata: Option<serde_json::Value>,
    },
    QuoteDeleted {
        id: String,
        quote_id: String,
        quote_number: String,
        client_id: String,
        deleted_by: String,
        timestamp: DateTime<Utc>,
        metadata: Option<serde_json::Value>,
    },
    QuoteDuplicated {
        id: String,
        source_quote_id: String,
        new_quote_id: String,
        new_quote_number: String,
        client_id: String,
        duplicated_by: String,
        timestamp: DateTime<Utc>,
        metadata: Option<serde_json::Value>,
    },
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
    NotificationReceived {
        id: String,
        notification_id: String,
        user_id: String,
        message: String,
        timestamp: DateTime<Utc>,
        metadata: Option<serde_json::Value>,
    },
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
    EntityRestored {
        id: String,
        entity_id: String,
        entity_type: String,
        restored_by: String,
        timestamp: DateTime<Utc>,
        metadata: Option<serde_json::Value>,
    },
    EntityHardDeleted {
        id: String,
        entity_id: String,
        entity_type: String,
        deleted_by: String,
        timestamp: DateTime<Utc>,
        metadata: Option<serde_json::Value>,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ErrorSeverity {
    Low,
    Medium,
    High,
    Critical,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AlertSeverity {
    Info,
    Warning,
    Error,
    Critical,
}

impl DomainEvent {
    pub const TASK_CREATED: &'static str = "TaskCreated";
    pub const TASK_UPDATED: &'static str = "TaskUpdated";
    pub const TASK_ASSIGNED: &'static str = "TaskAssigned";
    pub const TASK_STATUS_CHANGED: &'static str = "TaskStatusChanged";
    pub const TASK_COMPLETED: &'static str = "TaskCompleted";
    pub const TASK_DELETED: &'static str = "TaskDeleted";
    pub const CLIENT_CREATED: &'static str = "ClientCreated";
    pub const CLIENT_UPDATED: &'static str = "ClientUpdated";
    pub const CLIENT_DEACTIVATED: &'static str = "ClientDeactivated";
    pub const INTERVENTION_CREATED: &'static str = "InterventionCreated";
    pub const INTERVENTION_STARTED: &'static str = "InterventionStarted";
    pub const INTERVENTION_STEP_STARTED: &'static str = "InterventionStepStarted";
    pub const INTERVENTION_STEP_COMPLETED: &'static str = "InterventionStepCompleted";
    pub const INTERVENTION_COMPLETED: &'static str = "InterventionCompleted";
    pub const INTERVENTION_FINALIZED: &'static str = "InterventionFinalized";
    pub const INTERVENTION_CANCELLED: &'static str = "InterventionCancelled";
    pub const MATERIAL_CONSUMED: &'static str = "MaterialConsumed";
    pub const USER_CREATED: &'static str = "UserCreated";
    pub const USER_UPDATED: &'static str = "UserUpdated";
    pub const USER_LOGGED_IN: &'static str = "UserLoggedIn";
    pub const USER_LOGGED_OUT: &'static str = "UserLoggedOut";
    pub const AUTHENTICATION_FAILED: &'static str = "AuthenticationFailed";
    pub const AUTHENTICATION_SUCCESS: &'static str = "AuthenticationSuccess";
    pub const SYSTEM_ERROR: &'static str = "SystemError";
    pub const SYSTEM_MAINTENANCE: &'static str = "SystemMaintenance";
    pub const PERFORMANCE_ALERT: &'static str = "PerformanceAlert";
    pub const NOTIFICATION_RECEIVED: &'static str = "NotificationReceived";
    pub const QUOTE_CREATED: &'static str = "QuoteCreated";
    pub const QUOTE_UPDATED: &'static str = "QuoteUpdated";
    pub const QUOTE_DELETED: &'static str = "QuoteDeleted";
    pub const QUOTE_DUPLICATED: &'static str = "QuoteDuplicated";
    pub const QUOTE_ACCEPTED: &'static str = "QuoteAccepted";
    pub const QUOTE_REJECTED: &'static str = "QuoteRejected";
    pub const QUOTE_CONVERTED: &'static str = "QuoteConverted";
    pub const QUOTE_SHARED: &'static str = "QuoteShared";
    pub const QUOTE_CUSTOMER_RESPONDED: &'static str = "QuoteCustomerResponded";
    pub const ENTITY_RESTORED: &'static str = "EntityRestored";
    pub const ENTITY_HARD_DELETED: &'static str = "EntityHardDeleted";

    pub const TASK_ASSIGNMENT_NOTIF: &'static str = "TaskAssignment";
    pub const TASK_UPDATE_NOTIF: &'static str = "TaskUpdate";
    pub const QUOTE_CREATED_NOTIF: &'static str = "QuoteCreated";
    pub const QUOTE_APPROVED_NOTIF: &'static str = "QuoteApproved";
    pub const SYSTEM_ALERT_NOTIF: &'static str = "SystemAlert";

    pub fn id(&self) -> &str {
        match self {
            DomainEvent::TaskCreated { id, .. }
            | DomainEvent::TaskUpdated { id, .. }
            | DomainEvent::TaskAssigned { id, .. }
            | DomainEvent::TaskStatusChanged { id, .. }
            | DomainEvent::TaskCompleted { id, .. }
            | DomainEvent::TaskDeleted { id, .. }
            | DomainEvent::ClientCreated { id, .. }
            | DomainEvent::ClientUpdated { id, .. }
            | DomainEvent::ClientDeactivated { id, .. }
            | DomainEvent::InterventionCreated { id, .. }
            | DomainEvent::InterventionStarted { id, .. }
            | DomainEvent::InterventionStepStarted { id, .. }
            | DomainEvent::InterventionStepCompleted { id, .. }
            | DomainEvent::InterventionCompleted { id, .. }
            | DomainEvent::InterventionFinalized { id, .. }
            | DomainEvent::InterventionCancelled { id, .. }
            | DomainEvent::MaterialConsumed { id, .. }
            | DomainEvent::QuoteCreated { id, .. }
            | DomainEvent::QuoteUpdated { id, .. }
            | DomainEvent::QuoteDeleted { id, .. }
            | DomainEvent::QuoteDuplicated { id, .. }
            | DomainEvent::QuoteShared { id, .. }
            | DomainEvent::QuoteCustomerResponded { id, .. }
            | DomainEvent::UserCreated { id, .. }
            | DomainEvent::UserUpdated { id, .. }
            | DomainEvent::UserLoggedIn { id, .. }
            | DomainEvent::UserLoggedOut { id, .. }
            | DomainEvent::AuthenticationFailed { id, .. }
            | DomainEvent::AuthenticationSuccess { id, .. }
            | DomainEvent::SystemError { id, .. }
            | DomainEvent::SystemMaintenance { id, .. }
            | DomainEvent::PerformanceAlert { id, .. }
            | DomainEvent::NotificationReceived { id, .. }
            | DomainEvent::QuoteAccepted { id, .. }
            | DomainEvent::QuoteRejected { id, .. }
            | DomainEvent::QuoteConverted { id, .. }
            | DomainEvent::EntityRestored { id, .. }
            | DomainEvent::EntityHardDeleted { id, .. } => id,
        }
    }

    pub fn metadata(&self) -> Option<&serde_json::Value> {
        match self {
            DomainEvent::TaskCreated { metadata, .. }
            | DomainEvent::TaskUpdated { metadata, .. }
            | DomainEvent::TaskAssigned { metadata, .. }
            | DomainEvent::TaskStatusChanged { metadata, .. }
            | DomainEvent::TaskCompleted { metadata, .. }
            | DomainEvent::TaskDeleted { metadata, .. }
            | DomainEvent::ClientCreated { metadata, .. }
            | DomainEvent::ClientUpdated { metadata, .. }
            | DomainEvent::ClientDeactivated { metadata, .. }
            | DomainEvent::InterventionCreated { metadata, .. }
            | DomainEvent::InterventionStarted { metadata, .. }
            | DomainEvent::InterventionStepStarted { metadata, .. }
            | DomainEvent::InterventionStepCompleted { metadata, .. }
            | DomainEvent::InterventionCompleted { metadata, .. }
            | DomainEvent::InterventionFinalized { metadata, .. }
            | DomainEvent::InterventionCancelled { metadata, .. }
            | DomainEvent::MaterialConsumed { metadata, .. }
            | DomainEvent::QuoteCreated { metadata, .. }
            | DomainEvent::QuoteUpdated { metadata, .. }
            | DomainEvent::QuoteDeleted { metadata, .. }
            | DomainEvent::QuoteDuplicated { metadata, .. }
            | DomainEvent::QuoteShared { metadata, .. }
            | DomainEvent::QuoteCustomerResponded { metadata, .. }
            | DomainEvent::UserCreated { metadata, .. }
            | DomainEvent::UserUpdated { metadata, .. }
            | DomainEvent::UserLoggedIn { metadata, .. }
            | DomainEvent::UserLoggedOut { metadata, .. }
            | DomainEvent::AuthenticationFailed { metadata, .. }
            | DomainEvent::AuthenticationSuccess { metadata, .. }
            | DomainEvent::SystemError { metadata, .. }
            | DomainEvent::SystemMaintenance { metadata, .. }
            | DomainEvent::PerformanceAlert { metadata, .. }
            | DomainEvent::NotificationReceived { metadata, .. }
            | DomainEvent::QuoteAccepted { metadata, .. }
            | DomainEvent::QuoteRejected { metadata, .. }
            | DomainEvent::QuoteConverted { metadata, .. }
            | DomainEvent::EntityRestored { metadata, .. }
            | DomainEvent::EntityHardDeleted { metadata, .. } => metadata.as_ref(),
        }
    }

    pub fn correlation_id(&self) -> Option<&str> {
        self.metadata()
            .and_then(|metadata| metadata.get("correlation_id"))
            .and_then(|value| value.as_str())
    }

    pub fn subject(&self) -> (&'static str, &str) {
        match self {
            DomainEvent::TaskCreated { task_id, .. }
            | DomainEvent::TaskUpdated { task_id, .. }
            | DomainEvent::TaskAssigned { task_id, .. }
            | DomainEvent::TaskStatusChanged { task_id, .. }
            | DomainEvent::TaskCompleted { task_id, .. }
            | DomainEvent::TaskDeleted { task_id, .. } => ("task", task_id),
            DomainEvent::ClientCreated { client_id, .. }
            | DomainEvent::ClientUpdated { client_id, .. }
            | DomainEvent::ClientDeactivated { client_id, .. } => ("client", client_id),
            DomainEvent::InterventionCreated {
                intervention_id, ..
            }
            | DomainEvent::InterventionStarted {
                intervention_id, ..
            }
            | DomainEvent::InterventionStepStarted {
                intervention_id, ..
            }
            | DomainEvent::InterventionStepCompleted {
                intervention_id, ..
            }
            | DomainEvent::InterventionCompleted {
                intervention_id, ..
            }
            | DomainEvent::InterventionFinalized {
                intervention_id, ..
            }
            | DomainEvent::InterventionCancelled {
                intervention_id, ..
            } => ("intervention", intervention_id),
            DomainEvent::MaterialConsumed { material_id, .. } => ("material", material_id),
            DomainEvent::QuoteCreated { quote_id, .. }
            | DomainEvent::QuoteUpdated { quote_id, .. }
            | DomainEvent::QuoteDeleted { quote_id, .. }
            | DomainEvent::QuoteAccepted { quote_id, .. }
            | DomainEvent::QuoteRejected { quote_id, .. }
            | DomainEvent::QuoteConverted { quote_id, .. }
            | DomainEvent::QuoteShared { quote_id, .. }
            | DomainEvent::QuoteCustomerResponded { quote_id, .. } => ("quote", quote_id),
            DomainEvent::QuoteDuplicated { new_quote_id, .. } => ("quote", new_quote_id),
            DomainEvent::UserCreated { user_id, .. }
            | DomainEvent::UserUpdated { user_id, .. }
            | DomainEvent::UserLoggedIn { user_id, .. }
            | DomainEvent::UserLoggedOut { user_id, .. }
            | DomainEvent::AuthenticationSuccess { user_id, .. } => ("user", user_id),
            DomainEvent::AuthenticationFailed { user_id, .. } => {
                ("user", user_id.as_deref().unwrap_or("unknown"))
            }
            DomainEvent::SystemError { component, .. } => ("component", component),
            DomainEvent::SystemMaintenance {
                maintenance_type, ..
            } => ("maintenance", maintenance_type),
            DomainEvent::PerformanceAlert { metric_name, .. } => ("metric", metric_name),
            DomainEvent::NotificationReceived {
                notification_id, ..
            } => ("notification", notification_id),
            DomainEvent::EntityRestored { entity_id, .. }
            | DomainEvent::EntityHardDeleted { entity_id, .. } => ("entity", entity_id),
        }
    }

    pub fn event_type(&self) -> &'static str {
        match self {
            DomainEvent::TaskCreated { .. } => Self::TASK_CREATED,
            DomainEvent::TaskUpdated { .. } => Self::TASK_UPDATED,
            DomainEvent::TaskAssigned { .. } => Self::TASK_ASSIGNED,
            DomainEvent::TaskStatusChanged { .. } => Self::TASK_STATUS_CHANGED,
            DomainEvent::TaskCompleted { .. } => Self::TASK_COMPLETED,
            DomainEvent::TaskDeleted { .. } => Self::TASK_DELETED,
            DomainEvent::ClientCreated { .. } => Self::CLIENT_CREATED,
            DomainEvent::ClientUpdated { .. } => Self::CLIENT_UPDATED,
            DomainEvent::ClientDeactivated { .. } => Self::CLIENT_DEACTIVATED,
            DomainEvent::InterventionCreated { .. } => Self::INTERVENTION_CREATED,
            DomainEvent::InterventionStarted { .. } => Self::INTERVENTION_STARTED,
            DomainEvent::InterventionStepStarted { .. } => Self::INTERVENTION_STEP_STARTED,
            DomainEvent::InterventionStepCompleted { .. } => Self::INTERVENTION_STEP_COMPLETED,
            DomainEvent::InterventionCompleted { .. } => Self::INTERVENTION_COMPLETED,
            DomainEvent::InterventionFinalized { .. } => Self::INTERVENTION_FINALIZED,
            DomainEvent::InterventionCancelled { .. } => Self::INTERVENTION_CANCELLED,
            DomainEvent::MaterialConsumed { .. } => Self::MATERIAL_CONSUMED,
            DomainEvent::UserCreated { .. } => Self::USER_CREATED,
            DomainEvent::UserUpdated { .. } => Self::USER_UPDATED,
            DomainEvent::UserLoggedIn { .. } => Self::USER_LOGGED_IN,
            DomainEvent::UserLoggedOut { .. } => Self::USER_LOGGED_OUT,
            DomainEvent::AuthenticationFailed { .. } => Self::AUTHENTICATION_FAILED,
            DomainEvent::AuthenticationSuccess { .. } => Self::AUTHENTICATION_SUCCESS,
            DomainEvent::SystemError { .. } => Self::SYSTEM_ERROR,
            DomainEvent::SystemMaintenance { .. } => Self::SYSTEM_MAINTENANCE,
            DomainEvent::PerformanceAlert { .. } => Self::PERFORMANCE_ALERT,
            DomainEvent::NotificationReceived { .. } => Self::NOTIFICATION_RECEIVED,
            DomainEvent::QuoteCreated { .. } => Self::QUOTE_CREATED,
            DomainEvent::QuoteUpdated { .. } => Self::QUOTE_UPDATED,
            DomainEvent::QuoteDeleted { .. } => Self::QUOTE_DELETED,
            DomainEvent::QuoteDuplicated { .. } => Self::QUOTE_DUPLICATED,
            DomainEvent::QuoteAccepted { .. } => Self::QUOTE_ACCEPTED,
            DomainEvent::QuoteRejected { .. } => Self::QUOTE_REJECTED,
            DomainEvent::QuoteConverted { .. } => Self::QUOTE_CONVERTED,
            DomainEvent::QuoteShared { .. } => Self::QUOTE_SHARED,
            DomainEvent::QuoteCustomerResponded { .. } => Self::QUOTE_CUSTOMER_RESPONDED,
            DomainEvent::EntityRestored { .. } => Self::ENTITY_RESTORED,
            DomainEvent::EntityHardDeleted { .. } => Self::ENTITY_HARD_DELETED,
        }
    }

    pub fn timestamp(&self) -> DateTime<Utc> {
        match self {
            DomainEvent::TaskCreated { timestamp, .. }
            | DomainEvent::TaskUpdated { timestamp, .. }
            | DomainEvent::TaskAssigned { timestamp, .. }
            | DomainEvent::TaskStatusChanged { timestamp, .. }
            | DomainEvent::TaskCompleted { timestamp, .. }
            | DomainEvent::TaskDeleted { timestamp, .. }
            | DomainEvent::ClientCreated { timestamp, .. }
            | DomainEvent::ClientUpdated { timestamp, .. }
            | DomainEvent::ClientDeactivated { timestamp, .. }
            | DomainEvent::InterventionCreated { timestamp, .. }
            | DomainEvent::InterventionStarted { timestamp, .. }
            | DomainEvent::InterventionStepStarted { timestamp, .. }
            | DomainEvent::InterventionStepCompleted { timestamp, .. }
            | DomainEvent::InterventionCompleted { timestamp, .. }
            | DomainEvent::InterventionFinalized { timestamp, .. }
            | DomainEvent::InterventionCancelled { timestamp, .. }
            | DomainEvent::MaterialConsumed { timestamp, .. }
            | DomainEvent::QuoteCreated { timestamp, .. }
            | DomainEvent::QuoteUpdated { timestamp, .. }
            | DomainEvent::QuoteDeleted { timestamp, .. }
            | DomainEvent::QuoteDuplicated { timestamp, .. }
            | DomainEvent::QuoteShared { timestamp, .. }
            | DomainEvent::QuoteCustomerResponded { timestamp, .. }
            | DomainEvent::UserCreated { timestamp, .. }
            | DomainEvent::UserUpdated { timestamp, .. }
            | DomainEvent::UserLoggedIn { timestamp, .. }
            | DomainEvent::UserLoggedOut { timestamp, .. }
            | DomainEvent::AuthenticationFailed { timestamp, .. }
            | DomainEvent::AuthenticationSuccess { timestamp, .. }
            | DomainEvent::SystemError { timestamp, .. }
            | DomainEvent::SystemMaintenance { timestamp, .. }
            | DomainEvent::PerformanceAlert { timestamp, .. }
            | DomainEvent::NotificationReceived { timestamp, .. }
            | DomainEvent::QuoteAccepted { timestamp, .. }
            | DomainEvent::QuoteRejected { timestamp, .. }
            | DomainEvent::QuoteConverted { timestamp, .. }
            | DomainEvent::EntityRestored { timestamp, .. }
            | DomainEvent::EntityHardDeleted { timestamp, .. } => *timestamp,
        }
    }
}

#[cfg(test)]
mod tests {
    use chrono::Utc;
    use serde_json::json;

    use super::DomainEvent;

    #[test]
    fn extracts_log_context_for_task_events() {
        let event = DomainEvent::TaskStatusChanged {
            id: "evt-1".to_string(),
            task_id: "task-42".to_string(),
            old_status: "planned".to_string(),
            new_status: "in_progress".to_string(),
            user_id: "user-7".to_string(),
            timestamp: Utc::now(),
            metadata: Some(json!({
                "correlation_id": "corr-123",
                "reason": "manual_update"
            })),
        };

        assert_eq!(event.id(), "evt-1");
        assert_eq!(event.correlation_id(), Some("corr-123"));
        assert_eq!(event.subject(), ("task", "task-42"));
    }

    #[test]
    fn falls_back_to_useful_subject_when_metadata_is_missing() {
        let notification_event = DomainEvent::NotificationReceived {
            id: "evt-2".to_string(),
            notification_id: "notif-9".to_string(),
            user_id: "user-1".to_string(),
            message: "hello".to_string(),
            timestamp: Utc::now(),
            metadata: None,
        };
        let auth_failed_event = DomainEvent::AuthenticationFailed {
            id: "evt-3".to_string(),
            user_id: None,
            reason: "bad password".to_string(),
            timestamp: Utc::now(),
            metadata: None,
        };

        assert_eq!(notification_event.correlation_id(), None);
        assert_eq!(notification_event.subject(), ("notification", "notif-9"));
        assert_eq!(auth_failed_event.subject(), ("user", "unknown"));
    }
}
