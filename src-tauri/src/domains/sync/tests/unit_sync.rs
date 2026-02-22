use crate::db::Database;
use crate::domains::sync::infrastructure::sync::background::BackgroundSyncService;
use crate::domains::sync::infrastructure::sync::queue::SyncQueue;
use crate::domains::sync::SyncFacade;
use std::sync::{Arc, Mutex};

#[tokio::test]
async fn sync_facade_is_ready() {
    let db = Database::new_in_memory().await.expect("in-memory database");
    let queue = Arc::new(SyncQueue::new(db));
    let bg = Arc::new(Mutex::new(BackgroundSyncService::new(queue.clone())));
    let facade = SyncFacade::new(queue, bg);
    assert!(facade.is_ready());
}

#[tokio::test]
async fn sync_facade_exposes_queue() {
    let db = Database::new_in_memory().await.expect("in-memory database");
    let queue = Arc::new(SyncQueue::new(db));
    let bg = Arc::new(Mutex::new(BackgroundSyncService::new(queue.clone())));
    let facade = SyncFacade::new(queue, bg);
    let _q = facade.sync_queue();
}
