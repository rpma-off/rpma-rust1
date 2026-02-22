use std::sync::{Arc, Mutex};
use crate::db::Database;
use crate::domains::sync::infrastructure::sync::background::BackgroundSyncService;
use crate::domains::sync::infrastructure::sync::queue::SyncQueue;
use crate::domains::sync::SyncFacade;

#[tokio::test]
async fn sync_facade_queue_is_shared_reference() {
    let db = Database::new_in_memory().await.expect("in-memory database");
    let queue = Arc::new(SyncQueue::new(db));
    let bg = Arc::new(Mutex::new(BackgroundSyncService::new(queue.clone())));
    let facade = SyncFacade::new(queue, bg);
    let q1 = facade.sync_queue();
    let q2 = facade.sync_queue();
    assert!(Arc::ptr_eq(q1, q2));
}
