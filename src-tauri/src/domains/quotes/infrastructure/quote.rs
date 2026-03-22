//! Backward-compatible re-export of `QuoteService`.
//!
//! The business-logic service has been moved to the **application** layer
//! (`application/quote_service.rs`) to comply with ADR-002 (no business
//! logic in the infrastructure layer).  This module keeps the old import
//! path working so that callers such as `service_builder`, `app_state`,
//! `facade`, and existing tests need no changes.

// ARCH VIOLATION: re-exporting an application-layer service (`QuoteService`) from an
// infrastructure module creates an infrastructure → application dependency, which inverts
// the required dependency direction (IPC → Application → Domain ← Infrastructure).
// TODO: Remove this re-export shim. Update all callers
//   (`service_builder`, `app_state`, `facade`, tests) to import `QuoteService` directly from
//   `crate::domains::quotes::application::quote_service::QuoteService`, then delete this file.
pub use crate::domains::quotes::application::quote_service::QuoteService;
