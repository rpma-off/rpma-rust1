use std::sync::Arc;

use async_trait::async_trait;

use crate::domains::notifications::NotificationsFacade;
use crate::shared::event_bus::{DomainEvent, DomainEventHandler};

use super::helper::NotificationHelper;

/// Handles system-wide domain events and translates them into user notifications.
pub struct NotificationEventHandler {
    facade: Arc<NotificationsFacade>,
}

impl NotificationEventHandler {
    pub fn new(facade: Arc<NotificationsFacade>) -> Self {
        Self { facade }
    }
}

#[async_trait]
impl DomainEventHandler for NotificationEventHandler {
    async fn handle(&self, event: &DomainEvent) -> Result<(), String> {
        let event_type = event.event_type();
        let event_id = event.id();
        let correlation_id = event.correlation_id().unwrap_or("unknown");

        match event {
            DomainEvent::TaskAssigned {
                task_id,
                technician_id,
                ..
            } => {
                let task_title = format!("Tâche {}", task_id);
                if let Err(e) = NotificationHelper::create_task_assigned(
                    &self.facade,
                    technician_id,
                    task_id,
                    &task_title,
                )
                .await
                {
                    tracing::error!(
                        event_type = %event_type,
                        event_id = %event_id,
                        correlation_id = %correlation_id,
                        action = "create_task_assigned_notification",
                        task_id = %task_id,
                        technician_id = %technician_id,
                        error = %e,
                        "Failed to handle notification event"
                    );
                }
            }
            DomainEvent::TaskStatusChanged {
                task_id,
                new_status,
                user_id,
                ..
            } => {
                let task_title = format!("Tâche {}", task_id);
                if let Err(e) = NotificationHelper::create_task_updated(
                    &self.facade,
                    user_id,
                    task_id,
                    &task_title,
                    new_status,
                )
                .await
                {
                    tracing::error!(
                        event_type = %event_type,
                        event_id = %event_id,
                        correlation_id = %correlation_id,
                        action = "create_task_updated_notification",
                        task_id = %task_id,
                        user_id = %user_id,
                        new_status = %new_status,
                        error = %e,
                        "Failed to handle notification event"
                    );
                }
            }
            DomainEvent::InterventionCreated {
                intervention_id,
                task_id,
                user_id,
                ..
            } => {
                if let Err(e) = NotificationHelper::create_intervention_created(
                    &self.facade,
                    user_id,
                    intervention_id,
                    task_id,
                )
                .await
                {
                    tracing::error!(
                        event_type = %event_type,
                        event_id = %event_id,
                        correlation_id = %correlation_id,
                        action = "create_intervention_created_notification",
                        intervention_id = %intervention_id,
                        task_id = %task_id,
                        user_id = %user_id,
                        error = %e,
                        "Failed to handle notification event"
                    );
                }
            }
            DomainEvent::QuoteCreated {
                quote_id,
                client_id,
                created_by,
                ..
            } => {
                let client_name = format!("Client {}", client_id);
                if let Err(e) = NotificationHelper::create_quote_created(
                    &self.facade,
                    created_by,
                    quote_id,
                    &client_name,
                )
                .await
                {
                    tracing::error!(
                        event_type = %event_type,
                        event_id = %event_id,
                        correlation_id = %correlation_id,
                        action = "create_quote_created_notification",
                        quote_id = %quote_id,
                        client_id = %client_id,
                        created_by = %created_by,
                        error = %e,
                        "Failed to handle notification event"
                    );
                }
            }
            DomainEvent::QuoteAccepted {
                quote_id,
                client_id,
                accepted_by,
                ..
            } => {
                let client_name = format!("Client {}", client_id);
                if let Err(e) = NotificationHelper::create_quote_approved(
                    &self.facade,
                    accepted_by,
                    quote_id,
                    &client_name,
                )
                .await
                {
                    tracing::error!(
                        event_type = %event_type,
                        event_id = %event_id,
                        correlation_id = %correlation_id,
                        action = "create_quote_approved_notification",
                        quote_id = %quote_id,
                        client_id = %client_id,
                        accepted_by = %accepted_by,
                        error = %e,
                        "Failed to handle notification event"
                    );
                }
            }
            DomainEvent::ClientCreated {
                client_id,
                name,
                user_id,
                ..
            } => {
                if let Err(e) = NotificationHelper::create_client_created(
                    &self.facade,
                    user_id,
                    client_id,
                    name,
                )
                .await
                {
                    tracing::error!(
                        event_type = %event_type,
                        event_id = %event_id,
                        correlation_id = %correlation_id,
                        action = "create_client_created_notification",
                        client_id = %client_id,
                        user_id = %user_id,
                        error = %e,
                        "Failed to handle notification event"
                    );
                }
            }
            DomainEvent::SystemError {
                error_message,
                component,
                ..
            } => {
                let title = format!("Erreur Système: {}", component);
                if let Err(e) = NotificationHelper::create_system_alert(
                    &self.facade,
                    "system",
                    &title,
                    error_message,
                )
                .await
                {
                    tracing::error!(
                        event_type = %event_type,
                        event_id = %event_id,
                        correlation_id = %correlation_id,
                        action = "create_system_alert_notification",
                        component = %component,
                        error = %e,
                        "Failed to handle notification event"
                    );
                }
            }
            _ => {}
        }
        Ok(())
    }

    fn interested_events(&self) -> Vec<&'static str> {
        vec![
            DomainEvent::TASK_ASSIGNED,
            DomainEvent::TASK_STATUS_CHANGED,
            DomainEvent::INTERVENTION_CREATED,
            DomainEvent::QUOTE_CREATED,
            DomainEvent::QUOTE_ACCEPTED,
            DomainEvent::CLIENT_CREATED,
            DomainEvent::SYSTEM_ERROR,
        ]
    }
}
