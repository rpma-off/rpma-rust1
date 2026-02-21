use std::sync::Arc;
use std::sync::Mutex;

use crate::domains::sync::infrastructure::sync::background::BackgroundSyncService;
use crate::domains::sync::infrastructure::sync::queue::SyncQueue;

/// Facade for the Sync bounded context.
///
/// Provides a unified entry point for offline-sync queue management
/// and background synchronisation operations.
#[derive(Debug)]
pub struct SyncFacade {
    sync_queue: Arc<SyncQueue>,
    background_sync: Arc<Mutex<BackgroundSyncService>>,
}

impl SyncFacade {
    pub fn new(
        sync_queue: Arc<SyncQueue>,
        background_sync: Arc<Mutex<BackgroundSyncService>>,
    ) -> Self {
        Self {
            sync_queue,
            background_sync,
        }
    }

    pub fn is_ready(&self) -> bool {
        true
    }

    /// Access the underlying sync queue.
    pub fn sync_queue(&self) -> &Arc<SyncQueue> {
        &self.sync_queue
    }

    /// Access the underlying background sync service.
    pub fn background_sync(&self) -> &Arc<Mutex<BackgroundSyncService>> {
        &self.background_sync
    }
}
