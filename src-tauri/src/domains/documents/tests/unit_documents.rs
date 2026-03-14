use crate::db::Database;
use crate::domains::documents::{PhotoService, PhotoStorageSettings};
use crate::domains::documents::DocumentsFacade;
use std::sync::Arc;

#[tokio::test]
async fn documents_facade_is_ready() {
    let db = Database::new_in_memory().await.expect("in-memory database");
    let facade_db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let settings = PhotoStorageSettings {
        local_storage_path: Some("/tmp/test-photos".to_string()),
        ..Default::default()
    };
    let service = Arc::new(PhotoService::new(db, &settings).expect("photo service"));
    let facade = DocumentsFacade::new(service, facade_db);
    assert!(facade.is_ready());
}

#[tokio::test]
async fn validate_photo_extension_accepts_jpg() {
    let db = Database::new_in_memory().await.expect("in-memory database");
    let facade_db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let settings = PhotoStorageSettings {
        local_storage_path: Some("/tmp/test-photos".to_string()),
        ..Default::default()
    };
    let service = Arc::new(PhotoService::new(db, &settings).expect("photo service"));
    let facade = DocumentsFacade::new(service, facade_db);
    assert!(facade.validate_photo_extension("photo.jpg").is_ok());
}
