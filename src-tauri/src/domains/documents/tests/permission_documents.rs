use crate::db::Database;
use crate::domains::documents::infrastructure::photo::PhotoService;
use crate::domains::documents::DocumentsFacade;
use std::sync::Arc;

#[tokio::test]
async fn documents_facade_debug_output() {
    let db = Database::new_in_memory().await.expect("in-memory database");
    let settings = crate::domains::settings::domain::models::settings::StorageSettings {
        local_storage_path: Some("/tmp/test-photos".to_string()),
        ..Default::default()
    };
    let service = Arc::new(PhotoService::new(db, &settings).expect("photo service"));
    let facade = DocumentsFacade::new(service);
    let debug = format!("{:?}", facade);
    assert!(debug.contains("DocumentsFacade"));
}

#[tokio::test]
async fn documents_facade_service_is_shared_reference() {
    let db = Database::new_in_memory().await.expect("in-memory database");
    let settings = crate::domains::settings::domain::models::settings::StorageSettings {
        local_storage_path: Some("/tmp/test-photos".to_string()),
        ..Default::default()
    };
    let service = Arc::new(PhotoService::new(db, &settings).expect("photo service"));
    let facade = DocumentsFacade::new(service);
    let svc1 = facade.photo_service();
    let svc2 = facade.photo_service();
    assert!(Arc::ptr_eq(svc1, svc2));
}
