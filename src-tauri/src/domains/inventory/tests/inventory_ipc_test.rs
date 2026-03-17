//! IPC contract tests for inventory commands.
//!
//! Validates the three failure modes for `material_create` and related
//! inventory IPC commands:
//!   1. Unauthenticated call → `AppError::Authentication`
//!   2. Insufficient role for admin-only operations → `AppError::Authorization`
//!   3. Malformed input → validation error
//!
//! Also tests a real happy-path `create_material` against an in-memory DB.

use crate::domains::inventory::domain::models::material::{MaterialType, UnitOfMeasure};
use crate::domains::inventory::infrastructure::material::{CreateMaterialRequest, MaterialService};
use crate::shared::context::session_resolver::resolve_request_context;
use crate::shared::contracts::auth::UserRole;
use crate::shared::ipc::errors::AppError;
use crate::test_utils::{build_test_app_state, make_test_session, TestDatabase};
use std::sync::Arc;

// ── helpers ───────────────────────────────────────────────────────────────────

fn valid_material_request(sku: &str) -> CreateMaterialRequest {
    CreateMaterialRequest {
        sku: sku.to_string(),
        name: "IPC Test Film".to_string(),
        description: Some("Used in IPC contract tests".to_string()),
        material_type: MaterialType::PpfFilm,
        category: Some("Films".to_string()),
        subcategory: None,
        category_id: None,
        brand: Some("TestBrand".to_string()),
        model: None,
        specifications: None,
        unit_of_measure: UnitOfMeasure::Roll,
        current_stock: None,
        minimum_stock: Some(1.0),
        maximum_stock: Some(100.0),
        reorder_point: Some(5.0),
        unit_cost: Some(500.0),
        currency: Some("EUR".to_string()),
        supplier_id: None,
        supplier_name: None,
        supplier_sku: None,
        quality_grade: None,
        certification: None,
        expiry_date: None,
        batch_number: None,
        storage_location: Some("Shelf A".to_string()),
        warehouse_id: None,
        is_active: None,
        is_discontinued: None,
    }
}

// ── happy path ────────────────────────────────────────────────────────────────

#[test]
fn test_material_create_happy_path_returns_material_with_id() {
    let test_db = TestDatabase::new().expect("test db");
    let material_service = MaterialService::new((*test_db.db()).clone());

    let result = material_service.create_material(
        valid_material_request("IPC-MAT-001"),
        Some("test_user".to_string()),
    );

    assert!(result.is_ok(), "create_material failed: {:?}", result);
    let material = result.unwrap();
    assert!(!material.id.is_empty(), "material id must not be empty");
    assert_eq!(material.sku, "IPC-MAT-001");
    assert_eq!(material.name, "IPC Test Film");
}

// ── auth failure ──────────────────────────────────────────────────────────────

#[tokio::test]
async fn test_material_create_unauthenticated_returns_authentication_error() {
    let state = build_test_app_state().await;
    // No session seeded

    let result = resolve_request_context(&state, None, &None);

    assert!(result.is_err());
    match result.unwrap_err() {
        AppError::Authentication(_) => {}
        other => panic!("Expected Authentication, got: {:?}", other),
    }
}

// ── RBAC rejection ────────────────────────────────────────────────────────────

#[tokio::test]
async fn test_material_create_viewer_rejected_from_admin_only_gate() {
    let state = build_test_app_state().await;
    state.session_store.set(make_test_session(UserRole::Viewer));

    let result = resolve_request_context(&state, Some(UserRole::Admin), &None);

    assert!(result.is_err());
    match result.unwrap_err() {
        AppError::Authorization(_) => {}
        other => panic!("Expected Authorization, got: {:?}", other),
    }
}

#[tokio::test]
async fn test_material_create_admin_passes_gate() {
    let state = build_test_app_state().await;
    state.session_store.set(make_test_session(UserRole::Admin));

    let result = resolve_request_context(&state, Some(UserRole::Admin), &None);

    assert!(result.is_ok(), "Admin should pass Admin-gated resolve");
}

// ── validation rejection ──────────────────────────────────────────────────────

#[test]
fn test_material_create_empty_sku_auto_generates_sku() {
    // create_material auto-generates a UUID-based SKU when the request SKU is empty.
    let test_db = TestDatabase::new().expect("test db");
    let material_service = MaterialService::new((*test_db.db()).clone());

    let result =
        material_service.create_material(valid_material_request(""), Some("test_user".to_string()));

    assert!(
        result.is_ok(),
        "empty SKU should be auto-generated, not rejected"
    );
    let material = result.unwrap();
    assert!(
        !material.sku.is_empty(),
        "auto-generated SKU must not be empty"
    );
    assert!(
        material.sku.starts_with("SKU-"),
        "auto-generated SKU must start with 'SKU-'"
    );
}

#[test]
fn test_material_create_empty_name_returns_validation_error() {
    let test_db = TestDatabase::new().expect("test db");
    let material_service = MaterialService::new((*test_db.db()).clone());

    let mut req = valid_material_request("IPC-EMPTY-NAME");
    req.name = "".to_string();

    let result = material_service.create_material(req, Some("test_user".to_string()));

    assert!(result.is_err(), "empty name should be rejected");
}

#[test]
fn test_material_create_duplicate_sku_returns_error() {
    let test_db = TestDatabase::new().expect("test db");
    let material_service = MaterialService::new((*test_db.db()).clone());

    // First insert must succeed.
    material_service
        .create_material(
            valid_material_request("IPC-DUP-001"),
            Some("test_user".to_string()),
        )
        .expect("first insert");

    // Second insert with same SKU must fail.
    let result = material_service.create_material(
        valid_material_request("IPC-DUP-001"),
        Some("test_user".to_string()),
    );

    assert!(result.is_err(), "duplicate SKU should be rejected");
}

#[test]
fn test_material_create_with_active_status() {
    let test_db = TestDatabase::new().expect("test db");
    let material_service = MaterialService::new((*test_db.db()).clone());

    // Test creating inactive material
    let mut req_inactive = valid_material_request("IPC-INACTIVE");
    req_inactive.is_active = Some(false);
    let mat_inactive = material_service
        .create_material(req_inactive, Some("test_user".to_string()))
        .expect("create inactive material");
    assert!(!mat_inactive.is_active, "material should be inactive");

    // Test creating active material (explicitly)
    let mut req_active = valid_material_request("IPC-ACTIVE");
    req_active.is_active = Some(true);
    let mat_active = material_service
        .create_material(req_active, Some("test_user".to_string()))
        .expect("create active material");
    assert!(mat_active.is_active, "material should be active");

    // Test updating inactive to active
    let mut update_req = valid_material_request("IPC-INACTIVE"); // Use same SKU for update logic if needed, but update_material takes ID
    update_req.is_active = Some(true);
    let mat_reactivated = material_service
        .update_material(&mat_inactive.id, update_req, Some("test_user".to_string()))
        .expect("reactivate material");
    assert!(mat_reactivated.is_active, "material should now be active");
}
