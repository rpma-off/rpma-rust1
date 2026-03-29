use super::{EventEnvelope, EventFilter};

pub trait EventStore: Send + Sync {
    fn store(&self, envelope: &EventEnvelope) -> Result<(), String>;
    fn store_batch(&self, envelopes: &[EventEnvelope]) -> Result<(), String>;
    fn query(&self, filter: EventFilter) -> Result<Vec<EventEnvelope>, String>;
    fn get_aggregate_events(
        &self,
        aggregate_id: &str,
        from_version: Option<i64>,
    ) -> Result<Vec<EventEnvelope>, String>;
}

pub struct InMemoryEventStore {
    events: std::sync::Mutex<Vec<EventEnvelope>>,
}

impl InMemoryEventStore {
    pub fn new() -> Self {
        Self {
            events: std::sync::Mutex::new(Vec::new()),
        }
    }

    pub fn clear(&self) {
        let mut events = self.events.lock().unwrap_or_else(|e| e.into_inner());
        events.clear();
    }

    pub fn count(&self) -> usize {
        let events = self.events.lock().unwrap_or_else(|e| e.into_inner());
        events.len()
    }
}

impl Default for InMemoryEventStore {
    fn default() -> Self {
        Self::new()
    }
}

impl EventStore for InMemoryEventStore {
    fn store(&self, envelope: &EventEnvelope) -> Result<(), String> {
        let mut events = self.events.lock().unwrap_or_else(|e| e.into_inner());
        events.push(envelope.clone());
        Ok(())
    }

    fn store_batch(&self, envelopes: &[EventEnvelope]) -> Result<(), String> {
        let mut events = self.events.lock().unwrap_or_else(|e| e.into_inner());
        events.extend_from_slice(envelopes);
        Ok(())
    }

    fn query(&self, filter: EventFilter) -> Result<Vec<EventEnvelope>, String> {
        let events = self.events.lock().unwrap_or_else(|e| e.into_inner());

        let filtered: Vec<_> = events
            .iter()
            .filter(|envelope| {
                if let Some(ref types) = filter.event_types {
                    if !types.contains(&envelope.event.event_type().to_string()) {
                        return false;
                    }
                }
                if let Some(from) = filter.from_timestamp {
                    if envelope.event.timestamp() < from {
                        return false;
                    }
                }
                if let Some(to) = filter.to_timestamp {
                    if envelope.event.timestamp() > to {
                        return false;
                    }
                }
                true
            })
            .cloned()
            .collect();

        if let Some(limit) = filter.limit {
            Ok(filtered.into_iter().take(limit).collect())
        } else {
            Ok(filtered)
        }
    }

    fn get_aggregate_events(
        &self,
        _aggregate_id: &str,
        _from_version: Option<i64>,
    ) -> Result<Vec<EventEnvelope>, String> {
        Ok(Vec::new())
    }
}
