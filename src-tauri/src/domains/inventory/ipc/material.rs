//! Tauri commands for material management - PRD-08
//!
//! Provides IPC endpoints for material inventory management and consumption tracking.

use crate::authenticate;
use crate::commands::{ApiResponse, AppState};
use crate::domains::inventory::infrastructure::material::{
    CreateInventoryTransactionRequest, CreateMaterialCategoryRequest, CreateMaterialRequest,
    CreateSupplierRequest, RecordConsumptionRequest, UpdateStockRequest,
};
use tracing::{error, info, instrument};

/// Create a new material
#[tauri::command]
#[instrument(skip(state, session_token, request), fields(user_id))]
pub async fn material_create(
    state: AppState<'_>,
    session_token: String,
    request: CreateMaterialRequest,
    correlation_id: Option<String>,
) -> Result<
    ApiResponse<crate::domains::inventory::domain::models::material::Material>,
    crate::commands::AppError,
> {
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let current_user = authenticate!(&session_token, &state);
    tracing::Span::current().record("user_id", &current_user.user_id.as_str());
    crate::commands::update_correlation_context_user(&current_user.user_id);
    let service = state.material_service.clone();

    match service.create_material(request, Some(current_user.user_id)) {
        Ok(material) => {
            info!(material_id = %material.id, "Material created");
            Ok(ApiResponse::success(material).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!(error = %e, "Failed to create material");
            Err(crate::commands::AppError::internal_sanitized(
                "create_material",
                &e,
            ))
        }
    }
}

/// Get material by ID
#[tauri::command]
#[instrument(skip(state, session_token), fields(user_id))]
pub async fn material_get(
    state: AppState<'_>,
    session_token: String,
    id: String,
    correlation_id: Option<String>,
) -> Result<
    ApiResponse<Option<crate::domains::inventory::domain::models::material::Material>>,
    crate::commands::AppError,
> {
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let current_user = authenticate!(&session_token, &state);
    tracing::Span::current().record("user_id", &current_user.user_id.as_str());
    crate::commands::update_correlation_context_user(&current_user.user_id);
    let service = state.material_service.clone();

    match service.get_material(&id) {
        Ok(material) => {
            Ok(ApiResponse::success(material).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!(error = %e, material_id = %id, "Failed to get material");
            Err(crate::commands::AppError::internal_sanitized(
                "get_material",
                &e,
            ))
        }
    }
}

/// Get material by SKU
#[tauri::command]
#[instrument(skip(state, session_token), fields(user_id))]
pub async fn material_get_by_sku(
    state: AppState<'_>,
    session_token: String,
    sku: String,
    correlation_id: Option<String>,
) -> Result<
    ApiResponse<Option<crate::domains::inventory::domain::models::material::Material>>,
    crate::commands::AppError,
> {
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let current_user = authenticate!(&session_token, &state);
    tracing::Span::current().record("user_id", &current_user.user_id.as_str());
    crate::commands::update_correlation_context_user(&current_user.user_id);
    let service = state.material_service.clone();

    match service.get_material_by_sku(&sku) {
        Ok(material) => {
            Ok(ApiResponse::success(material).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!(error = %e, sku = %sku, "Failed to get material by SKU");
            Err(crate::commands::AppError::internal_sanitized(
                "get_material_by_sku",
                &e,
            ))
        }
    }
}

/// List materials with filtering
#[tauri::command]
#[instrument(skip(state, session_token), fields(user_id))]
pub async fn material_list(
    state: AppState<'_>,
    session_token: String,
    material_type: Option<String>,
    category: Option<String>,
    active_only: Option<bool>,
    limit: Option<i32>,
    offset: Option<i32>,
    correlation_id: Option<String>,
) -> Result<
    ApiResponse<Vec<crate::domains::inventory::domain::models::material::Material>>,
    crate::commands::AppError,
> {
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let current_user = authenticate!(&session_token, &state);
    tracing::Span::current().record("user_id", &current_user.user_id.as_str());
    crate::commands::update_correlation_context_user(&current_user.user_id);
    let service = state.inventory_service.clone();

    match service.list_materials(
        material_type,
        category,
        active_only.unwrap_or(true),
        limit,
        offset,
    ) {
        Ok(materials) => {
            Ok(ApiResponse::success(materials).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!(error = %e, "Failed to list materials");
            Err(e)
        }
    }
}

/// Update material
#[tauri::command]
#[instrument(skip(state, session_token, request), fields(user_id))]
pub async fn material_update(
    state: AppState<'_>,
    session_token: String,
    id: String,
    request: CreateMaterialRequest,
    correlation_id: Option<String>,
) -> Result<
    ApiResponse<crate::domains::inventory::domain::models::material::Material>,
    crate::commands::AppError,
> {
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let current_user = authenticate!(&session_token, &state);
    tracing::Span::current().record("user_id", &current_user.user_id.as_str());
    crate::commands::update_correlation_context_user(&current_user.user_id);
    let service = state.material_service.clone();

    match service.update_material(&id, request, Some(current_user.user_id)) {
        Ok(material) => {
            info!(material_id = %id, "Material updated");
            Ok(ApiResponse::success(material).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!(error = %e, material_id = %id, "Failed to update material");
            Err(crate::commands::AppError::internal_sanitized(
                "update_material",
                &e,
            ))
        }
    }
}

/// Update material stock
#[tauri::command]
#[instrument(skip(state, session_token, request), fields(user_id))]
pub async fn material_update_stock(
    state: AppState<'_>,
    session_token: String,
    request: UpdateStockRequest,
    correlation_id: Option<String>,
) -> Result<
    ApiResponse<crate::domains::inventory::domain::models::material::Material>,
    crate::commands::AppError,
> {
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let current_user = authenticate!(&session_token, &state);
    tracing::Span::current().record("user_id", &current_user.user_id.as_str());
    crate::commands::update_correlation_context_user(&current_user.user_id);
    let service = state.inventory_service.clone();

    match service.update_stock(request) {
        Ok(material) => {
            info!(material_id = %material.id, "Material stock updated");
            Ok(ApiResponse::success(material).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!(error = %e, "Failed to update material stock");
            Err(e)
        }
    }
}

/// Record material consumption
#[tauri::command]
#[instrument(skip(state, session_token, request), fields(user_id))]
pub async fn material_record_consumption(
    state: AppState<'_>,
    session_token: String,
    request: RecordConsumptionRequest,
    correlation_id: Option<String>,
) -> Result<
    ApiResponse<crate::domains::inventory::domain::models::material::MaterialConsumption>,
    crate::commands::AppError,
> {
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let current_user = authenticate!(&session_token, &state);
    tracing::Span::current().record("user_id", &current_user.user_id.as_str());
    crate::commands::update_correlation_context_user(&current_user.user_id);
    let service = state.inventory_service.clone();

    match service.record_consumption(request) {
        Ok(consumption) => {
            info!(consumption_id = %consumption.id, "Material consumption recorded");
            Ok(ApiResponse::success(consumption).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!(error = %e, "Failed to record material consumption");
            Err(e)
        }
    }
}

/// Get material consumption for an intervention
#[tauri::command]
#[instrument(skip(state, session_token), fields(user_id))]
pub async fn material_get_intervention_consumption(
    state: AppState<'_>,
    session_token: String,
    intervention_id: String,
    correlation_id: Option<String>,
) -> Result<
    ApiResponse<Vec<crate::domains::inventory::domain::models::material::MaterialConsumption>>,
    crate::commands::AppError,
> {
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let current_user = authenticate!(&session_token, &state);
    tracing::Span::current().record("user_id", &current_user.user_id.as_str());
    crate::commands::update_correlation_context_user(&current_user.user_id);
    let service = state.material_service.clone();

    match service.get_intervention_consumption(&intervention_id) {
        Ok(consumptions) => Ok(
            ApiResponse::success(consumptions).with_correlation_id(Some(correlation_id.clone()))
        ),
        Err(e) => {
            error!(error = %e, intervention_id = %intervention_id, "Failed to get intervention consumption");
            Err(crate::commands::AppError::internal_sanitized(
                "get_intervention_consumption",
                &e,
            ))
        }
    }
}

/// Get material consumption summary for an intervention
#[tauri::command]
#[instrument(skip(state, session_token), fields(user_id))]
pub async fn material_get_intervention_summary(
    state: AppState<'_>,
    session_token: String,
    intervention_id: String,
    correlation_id: Option<String>,
) -> Result<
    ApiResponse<crate::domains::inventory::domain::models::material::InterventionMaterialSummary>,
    crate::commands::AppError,
> {
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let current_user = authenticate!(&session_token, &state);
    tracing::Span::current().record("user_id", &current_user.user_id.as_str());
    crate::commands::update_correlation_context_user(&current_user.user_id);
    let service = state.material_service.clone();

    match service.get_intervention_material_summary(&intervention_id) {
        Ok(summary) => {
            Ok(ApiResponse::success(summary).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!(error = %e, intervention_id = %intervention_id, "Failed to get intervention material summary");
            Err(crate::commands::AppError::internal_sanitized(
                "get_intervention_material_summary",
                &e,
            ))
        }
    }
}

/// Get material statistics
#[tauri::command]
#[instrument(skip(state, session_token), fields(user_id))]
pub async fn material_get_stats(
    state: AppState<'_>,
    session_token: String,
    correlation_id: Option<String>,
) -> Result<
    ApiResponse<crate::domains::inventory::domain::models::material::MaterialStats>,
    crate::commands::AppError,
> {
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let current_user = authenticate!(&session_token, &state);
    tracing::Span::current().record("user_id", &current_user.user_id.as_str());
    crate::commands::update_correlation_context_user(&current_user.user_id);
    let service = state.inventory_service.clone();

    match service.get_material_stats() {
        Ok(stats) => {
            Ok(ApiResponse::success(stats).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!(error = %e, "Failed to get material stats");
            Err(e)
        }
    }
}

/// Get low stock materials
#[tauri::command]
#[instrument(skip(state, session_token), fields(user_id))]
pub async fn material_get_low_stock(
    state: AppState<'_>,
    session_token: String,
    correlation_id: Option<String>,
) -> Result<
    ApiResponse<Vec<crate::domains::inventory::domain::models::material::Material>>,
    crate::commands::AppError,
> {
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let current_user = authenticate!(&session_token, &state);
    tracing::Span::current().record("user_id", &current_user.user_id.as_str());
    crate::commands::update_correlation_context_user(&current_user.user_id);
    let service = state.material_service.clone();

    match service.get_low_stock_materials() {
        Ok(materials) => {
            Ok(ApiResponse::success(materials).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!(error = %e, "Failed to get low stock materials");
            Err(crate::commands::AppError::internal_sanitized(
                "get_low_stock_materials",
                &e,
            ))
        }
    }
}

/// Get expired materials
#[tauri::command]
#[instrument(skip(state, session_token), fields(user_id))]
pub async fn material_get_expired(
    state: AppState<'_>,
    session_token: String,
    correlation_id: Option<String>,
) -> Result<
    ApiResponse<Vec<crate::domains::inventory::domain::models::material::Material>>,
    crate::commands::AppError,
> {
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let current_user = authenticate!(&session_token, &state);
    tracing::Span::current().record("user_id", &current_user.user_id.as_str());
    crate::commands::update_correlation_context_user(&current_user.user_id);
    let service = state.material_service.clone();

    match service.get_expired_materials() {
        Ok(materials) => {
            Ok(ApiResponse::success(materials).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!(error = %e, "Failed to get expired materials");
            Err(crate::commands::AppError::internal_sanitized(
                "get_expired_materials",
                &e,
            ))
        }
    }
}

/// Get inventory statistics
#[tauri::command]
#[instrument(skip(state, session_token), fields(user_id))]
pub async fn inventory_get_stats(
    state: AppState<'_>,
    session_token: String,
    correlation_id: Option<String>,
) -> Result<
    ApiResponse<crate::domains::inventory::domain::models::material::InventoryStats>,
    crate::commands::AppError,
> {
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let current_user = authenticate!(&session_token, &state);
    tracing::Span::current().record("user_id", &current_user.user_id.as_str());
    crate::commands::update_correlation_context_user(&current_user.user_id);
    let service = state.inventory_service.clone();

    match service.get_inventory_stats() {
        Ok(stats) => {
            Ok(ApiResponse::success(stats).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!(error = %e, "Failed to get inventory stats");
            Err(e)
        }
    }
}

/// Delete (soft-delete/archive) a material
#[tauri::command]
#[instrument(skip(state, session_token), fields(user_id))]
pub async fn material_delete(
    state: AppState<'_>,
    session_token: String,
    id: String,
    correlation_id: Option<String>,
) -> Result<ApiResponse<()>, crate::commands::AppError> {
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let current_user = authenticate!(&session_token, &state);
    tracing::Span::current().record("user_id", &current_user.user_id.as_str());
    crate::commands::update_correlation_context_user(&current_user.user_id);
    let service = state.material_service.clone();

    match service.delete_material(&id, Some(current_user.user_id)) {
        Ok(()) => {
            info!(material_id = %id, "Material archived");
            Ok(ApiResponse::success(()).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!(error = %e, material_id = %id, "Failed to delete material");
            Err(crate::commands::AppError::internal_sanitized(
                "delete_material",
                &e,
            ))
        }
    }
}

/// Adjust material stock with reason
#[tauri::command]
#[instrument(skip(state, session_token, request), fields(user_id))]
pub async fn material_adjust_stock(
    state: AppState<'_>,
    session_token: String,
    request: UpdateStockRequest,
    correlation_id: Option<String>,
) -> Result<
    ApiResponse<crate::domains::inventory::domain::models::material::Material>,
    crate::commands::AppError,
> {
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let current_user = authenticate!(&session_token, &state);
    tracing::Span::current().record("user_id", &current_user.user_id.as_str());
    crate::commands::update_correlation_context_user(&current_user.user_id);
    let service = state.material_service.clone();

    let adjusted_request = UpdateStockRequest {
        recorded_by: Some(current_user.user_id),
        ..request
    };

    match service.update_stock(adjusted_request) {
        Ok(material) => {
            info!(material_id = %material.id, "Material stock adjusted");
            Ok(ApiResponse::success(material).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!(error = %e, "Failed to adjust material stock");
            Err(crate::commands::AppError::internal_sanitized(
                "adjust_stock",
                &e,
            ))
        }
    }
}

/// Get consumption history for a material
#[tauri::command]
#[instrument(skip(state, session_token), fields(user_id))]
pub async fn material_get_consumption_history(
    state: AppState<'_>,
    session_token: String,
    material_id: String,
    limit: Option<i32>,
    offset: Option<i32>,
    correlation_id: Option<String>,
) -> Result<
    ApiResponse<Vec<crate::domains::inventory::domain::models::material::MaterialConsumption>>,
    crate::commands::AppError,
> {
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let current_user = authenticate!(&session_token, &state);
    tracing::Span::current().record("user_id", &current_user.user_id.as_str());
    crate::commands::update_correlation_context_user(&current_user.user_id);
    let service = state.material_service.clone();

    match service.get_consumption_history(&material_id, limit, offset) {
        Ok(records) => {
            Ok(ApiResponse::success(records).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!(error = %e, material_id = %material_id, "Failed to get consumption history");
            Err(crate::commands::AppError::internal_sanitized(
                "get_consumption_history",
                &e,
            ))
        }
    }
}

/// Create inventory transaction
#[tauri::command]
#[instrument(skip(state, session_token, request), fields(user_id))]
pub async fn material_create_inventory_transaction(
    state: AppState<'_>,
    session_token: String,
    request: CreateInventoryTransactionRequest,
    correlation_id: Option<String>,
) -> Result<
    ApiResponse<crate::domains::inventory::domain::models::material::InventoryTransaction>,
    crate::commands::AppError,
> {
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let current_user = authenticate!(&session_token, &state);
    tracing::Span::current().record("user_id", &current_user.user_id.as_str());
    crate::commands::update_correlation_context_user(&current_user.user_id);
    let service = state.material_service.clone();

    match service.create_inventory_transaction(request, &current_user.user_id) {
        Ok(transaction) => {
            info!(transaction_id = %transaction.id, "Inventory transaction created");
            Ok(ApiResponse::success(transaction).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!(error = %e, "Failed to create inventory transaction");
            Err(crate::commands::AppError::internal_sanitized(
                "create_inventory_transaction",
                &e,
            ))
        }
    }
}

/// Get transaction history for a material
#[tauri::command]
#[instrument(skip(state, session_token), fields(user_id))]
pub async fn material_get_transaction_history(
    state: AppState<'_>,
    session_token: String,
    material_id: String,
    limit: Option<i32>,
    offset: Option<i32>,
    correlation_id: Option<String>,
) -> Result<
    ApiResponse<Vec<crate::domains::inventory::domain::models::material::InventoryTransaction>>,
    crate::commands::AppError,
> {
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let current_user = authenticate!(&session_token, &state);
    tracing::Span::current().record("user_id", &current_user.user_id.as_str());
    crate::commands::update_correlation_context_user(&current_user.user_id);
    let service = state.material_service.clone();

    match service.list_inventory_transactions_by_material(&material_id, None, limit, offset) {
        Ok(transactions) => Ok(
            ApiResponse::success(transactions).with_correlation_id(Some(correlation_id.clone()))
        ),
        Err(e) => {
            error!(error = %e, material_id = %material_id, "Failed to get transaction history");
            Err(crate::commands::AppError::internal_sanitized(
                "get_transaction_history",
                &e,
            ))
        }
    }
}

/// Create material category
#[tauri::command]
#[instrument(skip(state, session_token, request), fields(user_id))]
pub async fn material_create_category(
    state: AppState<'_>,
    session_token: String,
    request: CreateMaterialCategoryRequest,
    correlation_id: Option<String>,
) -> Result<
    ApiResponse<crate::domains::inventory::domain::models::material::MaterialCategory>,
    crate::commands::AppError,
> {
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let current_user = authenticate!(&session_token, &state);
    tracing::Span::current().record("user_id", &current_user.user_id.as_str());
    crate::commands::update_correlation_context_user(&current_user.user_id);
    let service = state.material_service.clone();

    match service.create_material_category(request, Some(current_user.user_id)) {
        Ok(category) => {
            info!(category_id = %category.id, "Material category created");
            Ok(ApiResponse::success(category).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!(error = %e, "Failed to create material category");
            Err(crate::commands::AppError::internal_sanitized(
                "create_material_category",
                &e,
            ))
        }
    }
}

/// List material categories
#[tauri::command]
#[instrument(skip(state, session_token), fields(user_id))]
pub async fn material_list_categories(
    state: AppState<'_>,
    session_token: String,
    active_only: Option<bool>,
    limit: Option<i32>,
    offset: Option<i32>,
    correlation_id: Option<String>,
) -> Result<
    ApiResponse<Vec<crate::domains::inventory::domain::models::material::MaterialCategory>>,
    crate::commands::AppError,
> {
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let current_user = authenticate!(&session_token, &state);
    tracing::Span::current().record("user_id", &current_user.user_id.as_str());
    crate::commands::update_correlation_context_user(&current_user.user_id);
    let service = state.material_service.clone();

    match service.list_material_categories(active_only.unwrap_or(true), limit, offset) {
        Ok(categories) => {
            Ok(ApiResponse::success(categories).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!(error = %e, "Failed to list material categories");
            Err(crate::commands::AppError::internal_sanitized(
                "list_material_categories",
                &e,
            ))
        }
    }
}

/// Create supplier
#[tauri::command]
#[instrument(skip(state, session_token, request), fields(user_id))]
pub async fn material_create_supplier(
    state: AppState<'_>,
    session_token: String,
    request: CreateSupplierRequest,
    correlation_id: Option<String>,
) -> Result<
    ApiResponse<crate::domains::inventory::domain::models::material::Supplier>,
    crate::commands::AppError,
> {
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let current_user = authenticate!(&session_token, &state);
    tracing::Span::current().record("user_id", &current_user.user_id.as_str());
    crate::commands::update_correlation_context_user(&current_user.user_id);
    let service = state.material_service.clone();

    match service.create_supplier(request, Some(current_user.user_id)) {
        Ok(supplier) => {
            info!(supplier_id = %supplier.id, "Supplier created");
            Ok(ApiResponse::success(supplier).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!(error = %e, "Failed to create supplier");
            Err(crate::commands::AppError::internal_sanitized(
                "create_supplier",
                &e,
            ))
        }
    }
}

/// List suppliers
#[tauri::command]
#[instrument(skip(state, session_token), fields(user_id))]
pub async fn material_list_suppliers(
    state: AppState<'_>,
    session_token: String,
    active_only: Option<bool>,
    preferred_only: Option<bool>,
    limit: Option<i32>,
    offset: Option<i32>,
    correlation_id: Option<String>,
) -> Result<
    ApiResponse<Vec<crate::domains::inventory::domain::models::material::Supplier>>,
    crate::commands::AppError,
> {
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let current_user = authenticate!(&session_token, &state);
    tracing::Span::current().record("user_id", &current_user.user_id.as_str());
    crate::commands::update_correlation_context_user(&current_user.user_id);
    let service = state.material_service.clone();

    match service.list_suppliers(active_only.unwrap_or(true), preferred_only, limit, offset) {
        Ok(suppliers) => {
            Ok(ApiResponse::success(suppliers).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!(error = %e, "Failed to list suppliers");
            Err(crate::commands::AppError::internal_sanitized(
                "list_suppliers",
                &e,
            ))
        }
    }
}

/// Get low stock materials
#[tauri::command]
#[instrument(skip(state, session_token), fields(user_id))]
pub async fn material_get_low_stock_materials(
    state: AppState<'_>,
    session_token: String,
    correlation_id: Option<String>,
) -> Result<
    ApiResponse<Vec<crate::domains::inventory::domain::models::material::Material>>,
    crate::commands::AppError,
> {
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let current_user = authenticate!(&session_token, &state);
    tracing::Span::current().record("user_id", &current_user.user_id.as_str());
    crate::commands::update_correlation_context_user(&current_user.user_id);
    let service = state.material_service.clone();

    match service.get_low_stock_materials() {
        Ok(materials) => {
            Ok(ApiResponse::success(materials).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!(error = %e, "Failed to get low stock materials");
            Err(crate::commands::AppError::internal_sanitized(
                "get_low_stock_materials",
                &e,
            ))
        }
    }
}

/// Get expired materials
#[tauri::command]
#[instrument(skip(state, session_token), fields(user_id))]
pub async fn material_get_expired_materials(
    state: AppState<'_>,
    session_token: String,
    correlation_id: Option<String>,
) -> Result<
    ApiResponse<Vec<crate::domains::inventory::domain::models::material::Material>>,
    crate::commands::AppError,
> {
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let current_user = authenticate!(&session_token, &state);
    tracing::Span::current().record("user_id", &current_user.user_id.as_str());
    crate::commands::update_correlation_context_user(&current_user.user_id);
    let service = state.material_service.clone();

    match service.get_expired_materials() {
        Ok(materials) => {
            Ok(ApiResponse::success(materials).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!(error = %e, "Failed to get expired materials");
            Err(crate::commands::AppError::internal_sanitized(
                "get_expired_materials",
                &e,
            ))
        }
    }
}

/// Get inventory movement summary
#[tauri::command]
#[instrument(skip(state, session_token), fields(user_id))]
pub async fn material_get_inventory_movement_summary(
    state: AppState<'_>,
    session_token: String,
    material_id: Option<String>,
    date_from: Option<String>,
    date_to: Option<String>,
    correlation_id: Option<String>,
) -> Result<
    ApiResponse<Vec<crate::domains::inventory::domain::models::material::InventoryMovementSummary>>,
    crate::commands::AppError,
> {
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let current_user = authenticate!(&session_token, &state);
    tracing::Span::current().record("user_id", &current_user.user_id.as_str());
    crate::commands::update_correlation_context_user(&current_user.user_id);
    let service = state.material_service.clone();

    match service.get_inventory_movement_summary(
        material_id.as_deref(),
        date_from.as_deref(),
        date_to.as_deref(),
    ) {
        Ok(summary) => {
            Ok(ApiResponse::success(summary).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!(error = %e, "Failed to get inventory movement summary");
            Err(crate::commands::AppError::internal_sanitized(
                "get_inventory_movement_summary",
                &e,
            ))
        }
    }
}
