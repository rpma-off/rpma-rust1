use std::sync::Arc;

use async_trait::async_trait;
use tracing::{info, warn};

use crate::shared::event_bus::{DomainEvent, DomainEventHandler};

use crate::domains::interventions::infrastructure::intervention_workflow::InterventionWorkflowService;

/// Handler for QuoteAccepted events
pub struct QuoteAcceptedHandler {
    service: Arc<InterventionWorkflowService>,
}

impl QuoteAcceptedHandler {
    /// TODO: document
    pub fn new(service: Arc<InterventionWorkflowService>) -> Self {
        Self { service }
    }
}

#[async_trait]
impl DomainEventHandler for QuoteAcceptedHandler {
    async fn handle(&self, event: &DomainEvent) -> Result<(), String> {
        if let DomainEvent::QuoteAccepted {
            quote_id,
            quote_number,
            client_id,
            accepted_by,
            task_id,
            ..
        } = event
        {
            info!(
                quote_id = %quote_id,
                quote_number = %quote_number,
                client_id = %client_id,
                accepted_by = %accepted_by,
                "QuoteAcceptedHandler: Quote accepted, preparing for intervention"
            );

            if let Some(task_id) = task_id {
                info!(
                    task_id = %task_id,
                    "QuoteAcceptedHandler: Task already linked to quote, skipping intervention creation"
                );
            }
        }
        Ok(())
    }

    fn interested_events(&self) -> Vec<&'static str> {
        vec!["QuoteAccepted"]
    }
}

/// Handler for QuoteConverted events
pub struct QuoteConvertedHandler {
    service: Arc<InterventionWorkflowService>,
}

impl QuoteConvertedHandler {
    /// TODO: document
    pub fn new(service: Arc<InterventionWorkflowService>) -> Self {
        Self { service }
    }
}

#[async_trait]
impl DomainEventHandler for QuoteConvertedHandler {
    async fn handle(&self, event: &DomainEvent) -> Result<(), String> {
        if let DomainEvent::QuoteConverted {
            quote_id,
            quote_number,
            client_id,
            task_id,
            task_number,
            converted_by,
            ..
        } = event
        {
            info!(
                quote_id = %quote_id,
                quote_number = %quote_number,
                client_id = %client_id,
                task_id = %task_id,
                task_number = %task_number,
                converted_by = %converted_by,
                "QuoteConvertedHandler: Quote converted to task, creating intervention"
            );

            // Create intervention from the converted quote
            match self
                .service
                .start_intervention_from_quote(task_id, quote_id)
            {
                Ok(_) => {
                    info!(
                        task_id = %task_id,
                        quote_id = %quote_id,
                        "QuoteConvertedHandler: Intervention created successfully"
                    );
                }
                Err(e) => {
                    warn!(
                        task_id = %task_id,
                        quote_id = %quote_id,
                        error = %e,
                        "QuoteConvertedHandler: Failed to create intervention"
                    );
                }
            }
        }
        Ok(())
    }

    fn interested_events(&self) -> Vec<&'static str> {
        vec!["QuoteConverted"]
    }
}
