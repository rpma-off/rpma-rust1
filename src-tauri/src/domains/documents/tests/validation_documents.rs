use std::sync::Arc;
use crate::db::Database;
use crate::domains::documents::infrastructure::photo::PhotoService;
use crate::domains::documents::DocumentsFacade;
use crate::shared::ipc::errors::AppError;

#[tokio::test]
async fn validate_photo_extension_rejects_invalid_extension() {
    let db = Database::new_in_memory().await.expect("in-memory database");
    let settings = crate::domains::settings::domain::models::settings::StorageSettings {
        local_storage_path: Some("/tmp/test-photos".to_string()),
        ..Default::default()
    };
    let service = Arc::new(PhotoService::new(db, &settings).expect("photo service"));
    let facade = DocumentsFacade::new(service);
    let err = facade.validate_photo_extension("document.pdf").unwrap_err();
    assert!(matches!(err, AppError::Validation(_)));
}

#[tokio::test]
async fn validate_photo_extension_rejects_no_extension() {
    let db = Database::new_in_memory().await.expect("in-memory database");
    let settings = crate::domains::settings::domain::models::settings::StorageSettings {
        local_storage_path: Some("/tmp/test-photos".to_string()),
        ..Default::default()
    };
    let service = Arc::new(PhotoService::new(db, &settings).expect("photo service"));
    let facade = DocumentsFacade::new(service);
    let err = facade.validate_photo_extension("noextension").unwrap_err();
    assert!(matches!(err, AppError::Validation(_)));
}
