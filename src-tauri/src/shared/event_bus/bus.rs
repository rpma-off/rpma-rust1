use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use super::events::DomainEvent;

pub trait DomainEventHandler: Send + Sync {
    fn interested_events(&self) -> Vec<&'static str>;
    fn handle(&self, event: &DomainEvent);
}

pub trait DomainEventBus: Send + Sync {
    fn publish(&self, event: DomainEvent);
    fn subscribe(&self, handler: Arc<dyn DomainEventHandler>);
}

#[derive(Default)]
pub struct InMemoryDomainEventBus {
    handlers: Mutex<HashMap<String, Vec<Arc<dyn DomainEventHandler>>>>,
}

impl InMemoryDomainEventBus {
    pub fn new() -> Self {
        Self::default()
    }
}

impl DomainEventBus for InMemoryDomainEventBus {
    fn publish(&self, event: DomainEvent) {
        let interested = {
            let handlers = self
                .handlers
                .lock()
                .expect("Failed to acquire event bus handlers lock during publish");
            handlers
                .get(event.event_type())
                .cloned()
                .unwrap_or_default()
        };

        for handler in interested {
            handler.handle(&event);
        }
    }

    fn subscribe(&self, handler: Arc<dyn DomainEventHandler>) {
        let mut handlers = self
            .handlers
            .lock()
            .expect("Failed to acquire event bus handlers lock during subscribe");

        for event_type in handler.interested_events() {
            handlers
                .entry(event_type.to_string())
                .or_default()
                .push(handler.clone());
        }
    }
}
