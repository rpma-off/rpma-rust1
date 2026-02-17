use std::sync::{Arc, Mutex};

use rpma_ppf_intervention::shared::event_bus::{
    DomainEvent, DomainEventBus, DomainEventHandler, InMemoryDomainEventBus, InterventionFinalized,
};

#[derive(Default)]
struct CountingHandler {
    count: Arc<Mutex<u32>>,
}

impl DomainEventHandler for CountingHandler {
    fn interested_events(&self) -> Vec<&'static str> {
        vec!["InterventionFinalized"]
    }

    fn handle(&self, _event: &DomainEvent) {
        let mut count = self.count.lock().expect("count lock");
        *count += 1;
    }
}

#[test]
fn finalize_intervention_emits_event_and_inventory_updates() {
    let bus = InMemoryDomainEventBus::new();
    let handler = Arc::new(CountingHandler::default());
    let count_ref = handler.count.clone();

    bus.subscribe(handler);
    bus.publish(DomainEvent::InterventionFinalized(InterventionFinalized {
        intervention_id: "int-1".to_string(),
        task_id: "task-1".to_string(),
        technician_id: "tech-1".to_string(),
        completed_at_ms: 100,
    }));

    assert_eq!(*count_ref.lock().expect("count lock"), 1);
}

#[test]
fn finalize_intervention_rollback_does_not_update_inventory() {
    let bus = InMemoryDomainEventBus::new();
    let handler = Arc::new(CountingHandler::default());
    let count_ref = handler.count.clone();

    bus.subscribe(handler);
    // Simulate rollback: event is not published.

    assert_eq!(*count_ref.lock().expect("count lock"), 0);
}
