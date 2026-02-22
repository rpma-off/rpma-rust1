use std::sync::Arc;

use crate::db::Database;
use crate::domains::inventory::InventoryFacade;
use crate::domains::inventory::infrastructure::material::MaterialService;

#[tokio::test]
async fn facade_is_ready_after_creation() {
    let db = Arc::new(
        Database::new_in_memory()
            .await
            .expect("create in-memory database"),
    );
    let material_service = Arc::new(MaterialService::new((*db).clone()));

    let facade = InventoryFacade::new(db, material_service);
    assert!(facade.is_ready());
}

#[tokio::test]
async fn list_materials_returns_empty_on_clean_db() {
    let db = Arc::new(
        Database::new_in_memory()
            .await
            .expect("create in-memory database"),
    );
    let material_service = Arc::new(MaterialService::new((*db).clone()));
    let facade = InventoryFacade::new(db, material_service);

    let result = facade.list_materials(None, None, false, None, None);
    assert!(result.is_ok());
    assert!(result.unwrap().is_empty());
}

#[tokio::test]
async fn get_material_stats_succeeds_on_clean_db() {
    let db = Arc::new(
        Database::new_in_memory()
            .await
            .expect("create in-memory database"),
    );
    let material_service = Arc::new(MaterialService::new((*db).clone()));
    let facade = InventoryFacade::new(db, material_service);

    let result = facade.get_material_stats();
    assert!(result.is_ok());
}

#[tokio::test]
async fn get_inventory_stats_succeeds_on_clean_db() {
    let db = Arc::new(
        Database::new_in_memory()
            .await
            .expect("create in-memory database"),
    );
    let material_service = Arc::new(MaterialService::new((*db).clone()));
    let facade = InventoryFacade::new(db, material_service);

    let result = facade.get_inventory_stats();
    assert!(result.is_ok());
}
