//! Sync domain — offline queue and background synchronization
//!
//! This module re-exports all sync-related components across layers.

// Models
pub use crate::models::sync::{
    EntityType, OperationType, SyncOperation, SyncQueueMetrics, SyncStatus,
};

// Services
pub use crate::sync::{BackgroundSyncService, SyncQueue};
