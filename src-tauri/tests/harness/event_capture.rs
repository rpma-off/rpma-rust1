//! Event capturing helper for domain invariant tests.
//!
//! [`EventCapture`] implements [`EventHandler`] and accumulates every
//! [`DomainEvent`] published to the event bus during a test so that
//! assertions can verify which events were emitted.
//!
//! # Usage
//!
//! ```rust,no_run
//! mod harness;
//!
//! #[tokio::test]
//! async fn example() {
//!     let app = harness::app::TestApp::new().await;
//!     let capture = harness::event_capture::EventCapture::new();
//!
//!     app.state.event_bus.register_handler(capture.clone());
//!
//!     // …perform some operation…
//!
//!     let events = capture.drain();
//!     assert!(events.iter().any(|e| matches!(e, DomainEvent::TaskCreated { .. })));
//! }
//! ```

use async_trait::async_trait;
use rpma_ppf_intervention::shared::services::domain_event::DomainEvent;
use rpma_ppf_intervention::shared::services::event_bus::EventHandler;
use std::sync::{Arc, Mutex};

/// Accumulates all domain events published to an event bus.
///
/// Clone-safe: every clone shares the same internal buffer so you can hand
/// the clone to `register_handler` while keeping the original for draining.
#[derive(Clone, Debug, Default)]
pub struct EventCapture {
    captured: Arc<Mutex<Vec<DomainEvent>>>,
}

impl EventCapture {
    /// Create a new, empty capture buffer.
    pub fn new() -> Self {
        Self::default()
    }

    /// Return and clear all captured events.
    pub fn drain(&self) -> Vec<DomainEvent> {
        self.captured
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .drain(..)
            .collect()
    }

    /// Return a snapshot without clearing the buffer (useful for assertions).
    pub fn snapshot(&self) -> Vec<DomainEvent> {
        self.captured
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .clone()
    }

    /// How many events have been captured so far.
    pub fn len(&self) -> usize {
        self.captured
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .len()
    }

    /// True if no events have been captured.
    pub fn is_empty(&self) -> bool {
        self.len() == 0
    }
}

#[async_trait]
impl EventHandler for EventCapture {
    async fn handle(&self, event: &DomainEvent) -> Result<(), String> {
        self.captured
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .push(event.clone());
        Ok(())
    }

    /// Subscribe to every event type by advertising `"*"`.
    ///
    /// Note: the event bus dispatches via exact `event_type()` lookup.
    /// Register using the concrete event type strings you care about, or
    /// subscribe to each type individually when testing specific events.
    fn interested_events(&self) -> Vec<&'static str> {
        vec![
            "task_created",
            "task_updated",
            "task_assigned",
            "task_status_changed",
            "task_completed",
            "client_created",
            "client_updated",
            "client_deactivated",
            "intervention_created",
            "intervention_started",
            "intervention_step_started",
            "intervention_step_completed",
            "intervention_completed",
            "intervention_finalized",
            "intervention_cancelled",
            "material_consumed",
            "quote_shared",
            "quote_customer_responded",
            "quote_converted_to_task",
            "quote_accepted",
            "quote_rejected",
            "quote_converted",
            "user_created",
            "user_updated",
            "user_logged_in",
            "user_logged_out",
            "authentication_failed",
            "authentication_success",
        ]
    }
}
