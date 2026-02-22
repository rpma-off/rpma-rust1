use std::sync::Arc;
use crate::db::Database;
use crate::domains::documents::infrastructure::photo::PhotoService;
use crate::domains::documents::DocumentsFacade;

#[tokio::test]
async fn documents_facade_is_ready() {
    let db = Database::new_in_memory().await.expect("in-memory database");
    let settings = crate::domains::settings::domain::models::settings::StorageSettings {
        local_storage_path: Some("/tmp/test-photos".to_string()),
        ..Default::default()
    };
    let service = Arc::new(PhotoService::new(db, &settings).expect("photo service"));
    let facade = DocumentsFacade::new(service);
    assert!(facade.is_ready());
}

#[tokio::test]
async fn validate_photo_extension_accepts_jpg() {
    let db = Database::new_in_memory().await.expect("in-memory database");
    let settings = crate::domains::settings::domain::models::settings::StorageSettings {
        local_storage_path: Some("/tmp/test-photos".to_string()),
        ..Default::default()
    };
    let service = Arc::new(PhotoService::new(db, &settings).expect("photo service"));
    let facade = DocumentsFacade::new(service);
    assert!(facade.validate_photo_extension("photo.jpg").is_ok());
}
