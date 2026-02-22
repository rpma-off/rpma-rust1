use std::sync::Arc;

use crate::db::Database;
use crate::domains::inventory::infrastructure::material::MaterialService;
use crate::domains::inventory::InventoryFacade;

#[tokio::test]
async fn list_materials_with_invalid_type_filter_returns_ok() {
    let db = Arc::new(
        Database::new_in_memory()
            .await
            .expect("create in-memory database"),
    );
    let material_service = Arc::new(MaterialService::new((*db).clone()));
    let facade = InventoryFacade::new(db, material_service);

    let result = facade.list_materials(Some("invalid_type".to_string()), None, false, None, None);
    assert!(result.is_ok());
}

#[tokio::test]
async fn list_materials_with_category_filter_returns_ok() {
    let db = Arc::new(
        Database::new_in_memory()
            .await
            .expect("create in-memory database"),
    );
    let material_service = Arc::new(MaterialService::new((*db).clone()));
    let facade = InventoryFacade::new(db, material_service);

    let result = facade.list_materials(
        None,
        Some("NonexistentCategory".to_string()),
        true,
        Some(10),
        Some(0),
    );
    assert!(result.is_ok());
    assert!(result.unwrap().is_empty());
}
