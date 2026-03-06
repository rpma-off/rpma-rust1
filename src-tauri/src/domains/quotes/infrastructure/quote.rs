//! Backward-compatible re-export of `QuoteService`.
//!
//! The business-logic service has been moved to the **application** layer
//! (`application/quote_service.rs`) to comply with ADR-002 (no business
//! logic in the infrastructure layer).  This module keeps the old import
//! path working so that callers such as `service_builder`, `app_state`,
//! `facade`, and existing tests need no changes.

pub use crate::domains::quotes::application::quote_service::QuoteService;
