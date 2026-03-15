//! Sync queue DTOs — pure types shared with the frontend via ts-rs.
//! These have no database dependency; they describe the offline-sync protocol.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// Entity types that can be synchronized
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub enum EntityType {
    #[serde(rename = "task")]
    Task,
    #[serde(rename = "client")]
    Client,
    #[serde(rename = "intervention")]
    Intervention,
    #[serde(rename = "step")]
    Step,
    #[serde(rename = "photo")]
    Photo,
    #[serde(rename = "user")]
    User,
}

/// Operation types for sync queue
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub enum OperationType {
    #[serde(rename = "create")]
    Create,
    #[serde(rename = "update")]
    Update,
    #[serde(rename = "delete")]
    Delete,
}

/// Sync operation status
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub enum SyncStatus {
    #[serde(rename = "pending")]
    Pending,
    #[serde(rename = "processing")]
    Processing,
    #[serde(rename = "completed")]
    Completed,
    #[serde(rename = "failed")]
    Failed,
    #[serde(rename = "abandoned")]
    Abandoned,
}

/// Main sync operation structure
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct SyncOperation {
    pub id: Option<i64>,
    pub operation_type: OperationType,
    pub entity_type: EntityType,
    pub entity_id: String,
    #[ts(type = "JsonValue")]
    pub data: serde_json::Value,
    pub dependencies: Vec<String>,
    pub timestamp_utc: String,
    pub retry_count: u32,
    pub max_retries: u32,
    pub last_error: Option<String>,
    pub status: SyncStatus,
    pub created_at: String,
    pub updated_at: String,
}

/// Metrics for sync queue monitoring
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct SyncQueueMetrics {
    pub pending_operations: i64,
    pub processing_operations: i64,
    pub completed_operations: i64,
    pub failed_operations: i64,
    pub abandoned_operations: i64,
    pub oldest_pending_age_seconds: Option<i64>,
    pub average_retry_count: f64,
}
