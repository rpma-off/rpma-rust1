use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// TODO: document
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct ReportCapabilities {
    pub version: String,
    pub status: String,
    pub available_exports: Vec<String>,
}
