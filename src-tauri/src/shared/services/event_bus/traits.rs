use async_trait::async_trait;

use crate::shared::services::domain_event::DomainEvent;

/// Event handler trait for subscribing to domain events
#[async_trait]
pub trait EventHandler: Send + Sync {
    /// Handle a domain event
    async fn handle(&self, event: &DomainEvent) -> Result<(), String>;

    /// Get the event types this handler is interested in
    fn interested_events(&self) -> Vec<&'static str>;
}

/// Event publisher trait for dependency injection (sync interface)
pub trait EventPublisher: Send + Sync {
    /// Publish a domain event
    fn publish(&self, event: DomainEvent) -> Result<(), String>;

    /// Publish multiple events
    fn publish_batch(&self, events: Vec<DomainEvent>) -> Result<(), String>;
}
