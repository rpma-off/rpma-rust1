use std::sync::Arc;

use crate::db::Database;
use crate::domains::inventory::InventoryFacade;
use crate::domains::inventory::infrastructure::material::MaterialService;

#[tokio::test]
async fn unit_inventory_facade_smoke() {
    let db = Arc::new(
        Database::new_in_memory()
            .await
            .expect("create in-memory database"),
    );
    let material_service = Arc::new(MaterialService::new((*db).clone()));

    let facade = InventoryFacade::new(db, material_service);
    let debug_output = format!("{:?}", facade);

    assert!(debug_output.contains("InventoryFacade"));
}
