//! Reports services
//!
//! This module contains the business logic services for report generation
//! and data processing, extracted from the command layer.

// Refactored core service modules (split for maintainability)
pub mod client_report;
pub mod geographic_report;
pub mod intelligence_report;
pub mod material_report;
pub mod overview_orchestrator;
pub mod quality_report;
pub mod seasonal_report;
pub mod task_report;
pub mod technician_report;
pub mod validation;

// Legacy service modules (may be deprecated/refactored later)
pub mod core_service;
pub mod export_service;
pub mod generation_service;
pub mod search_service;
pub mod types;
