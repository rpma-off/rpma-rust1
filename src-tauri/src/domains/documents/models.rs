//! Models for Documents domain (photos and reports)

use serde::{Deserialize, Serialize};
use ts_rs::TS;

// ── Photo Models — canonical definitions live in shared::contracts::photo ────
pub use crate::shared::contracts::photo::{Photo, PhotoCategory, PhotoType};

// ── Report Models ─────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct InterventionReport {
    pub id: String,
    pub intervention_id: String,
    pub report_number: String,
    pub generated_at: i64,
    pub technician_id: Option<String>,
    pub technician_name: Option<String>,
    pub file_path: Option<String>,
    pub file_name: Option<String>,
    pub file_size: Option<u64>,
    pub format: String,
    pub status: String,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct ReportCapabilities {
    pub version: String,
    pub status: String,
    pub available_exports: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct InterventionReportResult {
    pub success: bool,
    pub download_url: Option<String>,
    pub file_path: Option<String>,
    pub file_name: Option<String>,
    pub format: String,
    pub file_size: Option<u64>,
    pub generated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompleteInterventionData {
    pub intervention: crate::shared::services::cross_domain::Intervention,
    pub workflow_steps: Vec<crate::shared::services::cross_domain::InterventionStep>,
    pub photos: Vec<crate::shared::contracts::photo::Photo>,
    pub client: Option<crate::shared::services::cross_domain::Client>,
}
