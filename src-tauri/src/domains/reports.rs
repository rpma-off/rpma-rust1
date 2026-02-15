//! Reports domain — report generation, analytics, exports
//!
//! This module re-exports all reports-related components across layers.

// Models
pub use crate::models::reports::{
    DateRange, ExportFormat, ExportResult, ReportFilters, ReportType,
};

// Services
pub use crate::services::analytics::AnalyticsService;
pub use crate::services::pdf_generation::PdfGenerationService;
pub use crate::services::report_jobs::ReportJobService;
