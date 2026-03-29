//! Report View Model - data preparation layer for PDF report generation.
//!
//! This module defines `ReportViewModel` and the builder function
//! `build_intervention_report_view_model`. The view model is the single
//! source of truth consumed by the PDF template; no business logic or
//! data merging should happen inside the renderer.

pub mod builders;
mod composer;
pub mod extractors;
pub mod formatters;
mod types;

pub use composer::build_intervention_report_view_model;
pub use formatters::*;
pub use types::*;

#[cfg(test)]
mod tests;
