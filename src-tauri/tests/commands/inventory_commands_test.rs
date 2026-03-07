use serde_json::json;

use crate::commands::AppResult;
use crate::domains::inventory::ipc::material::{MaterialCreateRequest, create_material};
use rpma_rust1::test_utils::{mock_app_handle, setup_test_db};

#[tokio::test]
async fn test_create_material_unauthenticated_fails() -> AppResult<()> {
    let app_handle = mock_app_handle();
    let db = setup_test_db();
    
    // Mount database state but NO session to simulate unauthenticated request
    app_handle.manage(db.db());

    let req = MaterialCreateRequest {
        name: "Test PPF Material".to_string(),
        sku: "PPF-001".to_string(),
        description: None,
        category: "PPF".to_string(),
        manufacturer: "Xpel".to_string(),
        unit_of_measure: "Roll".to_string(),
        minimum_stock_level: 1.0,
        current_stock: 5.0,
        cost_per_unit: 1000.0,
    };

    let result = create_material(app_handle.clone(), req).await;
    
    // Verify IPC command correctly blocks unauthenticated callers
    assert!(result.is_err());
    let err_msg = result.unwrap_err();
    assert!(
        err_msg.contains("Session not found") || err_msg.contains("auth") || err_msg.contains("Unauthorized"),
        "Expected authentication error, got: {}", err_msg
    );

    Ok(())
}
