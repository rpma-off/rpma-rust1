use crate::db::Database;
use crate::domains::documents::infrastructure::photo::PhotoService;
use crate::domains::documents::DocumentsFacade;
use std::sync::Arc;

#[tokio::test]
async fn validate_photo_extension_accepts_all_valid_types() {
    let db = Database::new_in_memory().await.expect("in-memory database");
    let settings = crate::domains::settings::domain::models::settings::StorageSettings {
        local_storage_path: Some("/tmp/test-photos".to_string()),
        ..Default::default()
    };
    let service = Arc::new(PhotoService::new(db, &settings).expect("photo service"));
    let facade = DocumentsFacade::new(service);
    for ext in &["jpg", "jpeg", "png", "webp", "heic"] {
        let filename = format!("photo.{}", ext);
        assert!(
            facade.validate_photo_extension(&filename).is_ok(),
            "Expected {} to be valid",
            ext
        );
    }
}

#[tokio::test]
async fn validate_photo_extension_is_case_insensitive() {
    let db = Database::new_in_memory().await.expect("in-memory database");
    let settings = crate::domains::settings::domain::models::settings::StorageSettings {
        local_storage_path: Some("/tmp/test-photos".to_string()),
        ..Default::default()
    };
    let service = Arc::new(PhotoService::new(db, &settings).expect("photo service"));
    let facade = DocumentsFacade::new(service);
    assert!(facade.validate_photo_extension("photo.JPG").is_ok());
    assert!(facade.validate_photo_extension("photo.Png").is_ok());
}
