use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// Represents a generated intervention report with its metadata.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct InterventionReport {
    pub id: String,
    pub intervention_id: String,
    /// Human-readable report number in INT-YYYY-NNNN format.
    pub report_number: String,
    #[ts(type = "string")]
    pub generated_at: DateTime<Utc>,
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
