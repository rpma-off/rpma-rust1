use std::sync::Arc;

use crate::db::Database;
use crate::domains::inventory::infrastructure::material::{MaterialService, UpdateStockRequest};
use crate::domains::inventory::InventoryFacade;
use crate::shared::auth_middleware::AuthMiddleware;
use crate::shared::contracts::auth::UserRole;

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
    }, &UserRole::Admin);

    assert!(result.is_err());
}

/// Verify that viewer role is denied access to inventory operations that require Technician role.
/// This regression test ensures the frontend role guard behaviour is consistent with backend RBAC.
#[test]
fn test_viewer_role_denied_inventory_access() {
    // Inventory commands use UserRole::Technician as the minimum required role.
    // Viewer must NOT be granted that access.
    assert!(
        !AuthMiddleware::has_permission(&UserRole::Viewer, &UserRole::Technician),
        "Viewer should not have Technician-level inventory access"
    );
    assert!(
        !AuthMiddleware::has_permission(&UserRole::Viewer, &UserRole::Supervisor),
        "Viewer should not have Supervisor-level inventory access"
    );
    assert!(
        !AuthMiddleware::has_permission(&UserRole::Viewer, &UserRole::Admin),
        "Viewer should not have Admin-level inventory access"
    );
}

/// Verify that technician, supervisor, and admin roles are granted inventory access.
#[test]
fn test_authorized_roles_can_access_inventory_operations() {
    // All these roles must pass the Technician-level guard used by inventory commands.
    assert!(
        AuthMiddleware::has_permission(&UserRole::Technician, &UserRole::Technician),
        "Technician should have Technician-level inventory access"
    );
    assert!(
        AuthMiddleware::has_permission(&UserRole::Supervisor, &UserRole::Technician),
        "Supervisor should have Technician-level inventory access"
    );
    assert!(
        AuthMiddleware::has_permission(&UserRole::Admin, &UserRole::Technician),
        "Admin should have Technician-level inventory access"
    );
}
