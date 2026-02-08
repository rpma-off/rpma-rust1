//! Sync queue models - Complete implementation for PRD-07

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
// Conditional import removed
use ts_rs::TS;

/// Operation types for sync queue
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[derive(TS)]
#[serde(rename_all = "lowercase")]
pub enum OperationType {
    Create,
    Update,
    Delete,
}

impl std::fmt::Display for OperationType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = match self {
            Self::Create => "create",
            Self::Update => "update",
            Self::Delete => "delete",
        };
        write!(f, "{}", s)
    }
}

/// Entity types that can be synchronized
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[derive(TS)]
#[serde(rename_all = "lowercase")]
pub enum EntityType {
    Task,
    Client,
    Intervention,
    Step,
    Photo,
    User,
}

impl std::fmt::Display for EntityType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = match self {
            Self::Task => "task",
            Self::Client => "client",
            Self::Intervention => "intervention",
            Self::Step => "step",
            Self::Photo => "photo",
            Self::User => "user",
        };
        write!(f, "{}", s)
    }
}

/// Sync operation status
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[derive(TS)]
#[serde(rename_all = "lowercase")]
pub enum SyncStatus {
    Pending,
    Processing,
    Completed,
    Failed,
    Abandoned,
}

impl std::fmt::Display for SyncStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = match self {
            Self::Pending => "pending",
            Self::Processing => "processing",
            Self::Completed => "completed",
            Self::Failed => "failed",
            Self::Abandoned => "abandoned",
        };
        write!(f, "{}", s)
    }
}

/// Main sync operation structure
#[derive(Debug, Clone, Serialize, Deserialize)]
#[derive(TS)]
pub struct SyncOperation {
    pub id: Option<i64>,
    pub operation_type: OperationType,
    pub entity_type: EntityType,
    pub entity_id: String,
    #[ts(type = "any")]
    pub data: serde_json::Value,
    pub dependencies: Vec<String>,
    #[ts(type = "string")]
    pub timestamp_utc: DateTime<Utc>,
    pub retry_count: i32,
    pub max_retries: i32,
    pub last_error: Option<String>,
    pub status: SyncStatus,
    #[ts(type = "string")]
    pub created_at: DateTime<Utc>,
    #[ts(type = "string")]
    pub updated_at: DateTime<Utc>,
}

/// Metrics for sync queue monitoring
#[derive(Debug, Clone, Serialize, Deserialize)]
#[derive(TS)]
pub struct SyncQueueMetrics {
    pub pending_operations: i64,
    pub processing_operations: i64,
    pub completed_operations: i64,
    pub failed_operations: i64,
    pub abandoned_operations: i64,
    pub oldest_pending_age_seconds: Option<i64>,
    pub average_retry_count: f64,
}

// Legacy types for backward compatibility (to be removed after migration)
#[deprecated(note = "Use EntityType instead")]
pub type SyncEntityType = EntityType;

#[deprecated(note = "Use OperationType instead")]
pub type SyncOperationType = OperationType;

#[deprecated(note = "Use SyncOperation instead")]
pub type SyncQueueItem = SyncOperation;
