use std::sync::Arc;

use crate::db::Database;
use crate::domains::inventory::InventoryFacade;
use crate::domains::inventory::infrastructure::material::{MaterialService, UpdateStockRequest};

#[tokio::test]
async fn update_stock_with_nonexistent_material_returns_error() {
    let db = Arc::new(
        Database::new_in_memory()
            .await
            .expect("create in-memory database"),
    );
    let material_service = Arc::new(MaterialService::new((*db).clone()));
    let facade = InventoryFacade::new(db, material_service);

    let result = facade.update_stock(UpdateStockRequest {
        material_id: "nonexistent-id".to_string(),
        quantity_change: 5.0,
        reason: "test".to_string(),
        recorded_by: Some("test_user".to_string()),
    });

    assert!(result.is_err());
}
