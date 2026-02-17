//! Sync domain — offline queue and background synchronization
//!
//! This module re-exports all sync-related components across layers.

// Public facade
pub use crate::sync::BackgroundSyncService;

// Models
pub(crate) use crate::models::sync::{
    EntityType, OperationType, SyncOperation, SyncQueueMetrics, SyncStatus,
};

// Services
pub(crate) use crate::sync::SyncQueue;
