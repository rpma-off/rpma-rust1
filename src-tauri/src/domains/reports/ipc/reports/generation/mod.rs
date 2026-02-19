//! Report generation commands
//!
//! This module contains commands for generating reports with specific
//! business logic and data processing.

pub mod background_jobs;
pub mod entity_counts;
pub mod pdf_generation;
pub mod report_commands;
pub mod validation;

// Re-export main command functions for external use
pub use background_jobs::{cancel_report_job, get_report_job_status};
pub use entity_counts::get_entity_counts;
