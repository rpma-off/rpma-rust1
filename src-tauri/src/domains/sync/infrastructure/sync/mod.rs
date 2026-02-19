//! Sync module - Handles offline synchronization
//!
//! This module provides the sync queue system and background sync service
//! for offline-first operations as specified in PRD-07 and PRD-08.

pub mod background;
pub mod queue;

// Re-export main types
pub use background::BackgroundSyncService;
pub use queue::SyncQueue;
