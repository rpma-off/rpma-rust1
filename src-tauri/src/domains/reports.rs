//! Reports domain — report generation, analytics, exports
//!
//! This module re-exports all reports-related components across layers.

// Public facade
pub use crate::services::report_jobs::ReportJobService;

// Models
pub(crate) use crate::models::reports::{
    DateRange, ExportFormat, ExportResult, ReportFilters, ReportType,
};

// Services
pub(crate) use crate::services::analytics::AnalyticsService;
pub(crate) use crate::services::pdf_generation::PdfGenerationService;
