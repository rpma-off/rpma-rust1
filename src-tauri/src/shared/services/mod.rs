//! Shared cross-cutting services.
//!
//! These services provide cross-domain infrastructure such as caching,
//! validation, event handling, performance monitoring, and more.
//! They are not tied to any specific bounded context.

pub mod cache;
pub mod cross_domain;
pub mod document_storage;
pub mod domain_event;
pub mod event_bus;
pub mod global_search;
pub mod system;
pub mod validation;
