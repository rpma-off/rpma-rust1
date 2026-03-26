//! Application layer for the documents domain (ADR-001).
//!
//! PhotoService owns business logic for photo storage, compression, and thumbnails.
//! report_view_model owns report rendering and field mapping.
//! ReportApplicationService orchestrates the PDF-generation workflow.

pub mod report_service;

pub use crate::domains::documents::photo_handler::PhotoService;
pub use crate::domains::documents::report_view_model::*;
pub use report_service::ReportApplicationService;
