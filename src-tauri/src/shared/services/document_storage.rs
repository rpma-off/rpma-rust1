//! Document Storage Service (shared cross-cutting concern).
//!
//! This module provides basic document storage and management capabilities.
//! Placed in shared so that the reports domain (and others) can use it
//! without importing from the documents domain's infrastructure layer.

pub use crate::domains::documents::infrastructure::document_storage::DocumentStorageService;
