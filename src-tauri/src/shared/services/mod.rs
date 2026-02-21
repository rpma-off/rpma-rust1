//! Shared cross-cutting services.
//!
//! These services provide cross-domain infrastructure such as caching,
//! validation, event handling, performance monitoring, and more.
//! They are not tied to any specific bounded context.

pub mod cache;
pub mod domain_event;
pub mod event_bus;
pub mod event_system;
pub mod performance_monitor;
pub mod system;
pub mod validation;
pub mod websocket_event_handler;
pub mod worker_pool;
