//! Application-layer contracts for the Sync bounded context.

#[derive(Debug, Clone, serde::Serialize)]
pub struct SyncResult {
    pub processed_operations: usize,
    pub successful_operations: usize,
    pub failed_operations: usize,
    pub duration_ms: u64,
    pub errors: Vec<String>,
}
