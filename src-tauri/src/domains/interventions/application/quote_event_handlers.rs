use std::sync::Arc;

use async_trait::async_trait;
use tracing::info;

use crate::shared::event_bus::{DomainEvent, DomainEventHandler};

use crate::domains::interventions::application::contracts::InterventionCreator;

/// Handler for QuoteAccepted events — log-only (ADR-016 side-effect).
pub struct QuoteAcceptedHandler {
    _service: Arc<dyn InterventionCreator>,
}

impl QuoteAcceptedHandler {
    pub fn new(service: Arc<dyn InterventionCreator>) -> Self {
        Self { _service: service }
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
        vec![DomainEvent::QUOTE_ACCEPTED]
    }
}

/// Handler for QuoteConverted events — log-only (ADR-016 side-effect).
///
/// ADR-016: The primary operation (intervention creation via
/// `InterventionCreator::create_from_quote`) is now performed synchronously in
/// the `quote_convert_to_task` IPC handler.  This handler is kept solely for
/// observability logging.
pub struct QuoteConvertedHandler {
    _service: Arc<dyn InterventionCreator>,
}

impl QuoteConvertedHandler {
    pub fn new(service: Arc<dyn InterventionCreator>) -> Self {
        Self { _service: service }
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
                "QuoteConvertedHandler: Quote converted to task (intervention creation handled by application layer)"
            );
        }
        Ok(())
    }

    fn interested_events(&self) -> Vec<&'static str> {
        vec![DomainEvent::QUOTE_CONVERTED]
    }
}
