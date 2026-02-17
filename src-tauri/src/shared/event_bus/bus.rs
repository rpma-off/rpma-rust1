use std::sync::{Arc, OnceLock};

use async_trait::async_trait;

use crate::services::event_bus::{EventHandler, InMemoryEventBus};

use super::events::DomainEvent;

#[async_trait]
pub trait DomainEventHandler: Send + Sync {
    async fn handle(&self, event: &DomainEvent) -> Result<(), String>;
    fn interested_events(&self) -> Vec<&'static str>;
}

pub trait DomainEventBus: Send + Sync {
    fn publish(&self, event: DomainEvent);
    fn subscribe(&self, handler: Arc<dyn DomainEventHandler>);
}

struct HandlerAdapter {
    handler: Arc<dyn DomainEventHandler>,
}

#[async_trait]
impl EventHandler for HandlerAdapter {
    async fn handle(&self, event: &DomainEvent) -> Result<(), String> {
        self.handler.handle(event).await
    }

    fn interested_events(&self) -> Vec<&'static str> {
        self.handler.interested_events()
    }
}

impl DomainEventBus for InMemoryEventBus {
    fn publish(&self, event: DomainEvent) {
        let bus = self.clone();
        tokio::spawn(async move {
            if let Err(err) = bus.publish(event).await {
                tracing::error!(error = %err, "Failed to publish domain event");
            }
        });
    }

    fn subscribe(&self, handler: Arc<dyn DomainEventHandler>) {
        self.register_handler(HandlerAdapter { handler });
    }
}

static GLOBAL_EVENT_BUS: OnceLock<Arc<InMemoryEventBus>> = OnceLock::new();

pub fn set_global_event_bus(bus: Arc<InMemoryEventBus>) {
    let _ = GLOBAL_EVENT_BUS.set(bus);
}

pub fn global_event_bus() -> Option<Arc<InMemoryEventBus>> {
    GLOBAL_EVENT_BUS.get().cloned()
}

pub fn publish_event(event: DomainEvent) {
    if let Some(bus) = GLOBAL_EVENT_BUS.get() {
        bus.publish(event);
    }
}

pub fn register_handler(handler: Arc<dyn DomainEventHandler>) {
    if let Some(bus) = GLOBAL_EVENT_BUS.get() {
        bus.subscribe(handler);
    }
}
