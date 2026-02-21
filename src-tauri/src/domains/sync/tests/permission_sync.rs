use std::sync::{Arc, Mutex};
use crate::db::Database;
use crate::domains::sync::infrastructure::sync::background::BackgroundSyncService;
use crate::domains::sync::infrastructure::sync::queue::SyncQueue;
use crate::domains::sync::SyncFacade;

#[tokio::test]
async fn sync_facade_background_is_shared_reference() {
    let db = Database::new_in_memory().await.expect("in-memory database");
    let queue = Arc::new(SyncQueue::new(db));
    let bg = Arc::new(Mutex::new(BackgroundSyncService::new(queue.clone())));
    let facade = SyncFacade::new(queue, bg);
    let bg1 = facade.background_sync();
    let bg2 = facade.background_sync();
    assert!(Arc::ptr_eq(bg1, bg2));
}
