//! Tauri commands for material management - PRD-08
//!
//! Provides IPC endpoints for material inventory management and consumption tracking.

use crate::commands::{ApiResponse, AppState};
use crate::models::material::{MaterialType, InventoryTransactionType};
use crate::services::material::{
    CreateMaterialRequest, RecordConsumptionRequest, UpdateStockRequest,
    CreateMaterialCategoryRequest, CreateSupplierRequest, CreateInventoryTransactionRequest,
};

/// Create a new material
#[tauri::command]
pub async fn material_create(
    state: AppState<'_>,
    request: CreateMaterialRequest,
    user_id: String,
) -> Result<ApiResponse<crate::models::material::Material>, crate::commands::AppError> {
    let service = state.material_service.clone();

    match service.create_material(request, Some(user_id)) {
        Ok(material) => Ok(ApiResponse::success(material)),
        Err(e) => Err(crate::commands::AppError::from(e.to_string())),
    }
}

/// Get material by ID
#[tauri::command]
pub async fn material_get(
    state: AppState<'_>,
    id: String,
) -> Result<ApiResponse<Option<crate::models::material::Material>>, crate::commands::AppError> {
    let service = state.material_service.clone();

    match service.get_material(&id) {
        Ok(material) => Ok(ApiResponse::success(material)),
        Err(e) => Err(crate::commands::AppError::from(e.to_string())),
    }
}

/// Get material by SKU
#[tauri::command]
pub async fn material_get_by_sku(
    state: AppState<'_>,
    sku: String,
) -> Result<ApiResponse<Option<crate::models::material::Material>>, crate::commands::AppError> {
    let service = state.material_service.clone();

    match service.get_material_by_sku(&sku) {
        Ok(material) => Ok(ApiResponse::success(material)),
        Err(e) => Err(crate::commands::AppError::from(e.to_string())),
    }
}

/// List materials with filtering
#[tauri::command]
pub async fn material_list(
    state: AppState<'_>,
    material_type: Option<String>,
    category: Option<String>,
    active_only: Option<bool>,
    limit: Option<i32>,
    offset: Option<i32>,
) -> Result<ApiResponse<Vec<crate::models::material::Material>>, crate::commands::AppError> {
    let service = state.material_service.clone();

    // Parse material type
    let mt = material_type.and_then(|s| match s.as_str() {
        "ppf_film" => Some(MaterialType::PpfFilm),
        "adhesive" => Some(MaterialType::Adhesive),
        "cleaning_solution" => Some(MaterialType::CleaningSolution),
        "tool" => Some(MaterialType::Tool),
        "consumable" => Some(MaterialType::Consumable),
        _ => None,
    });

    match service.list_materials(mt, category, active_only.unwrap_or(true), limit, offset) {
        Ok(materials) => Ok(ApiResponse::success(materials)),
        Err(e) => Err(crate::commands::AppError::from(e.to_string())),
    }
}

/// Update material
#[tauri::command]
pub async fn material_update(
    state: AppState<'_>,
    id: String,
    request: CreateMaterialRequest,
    user_id: String,
) -> Result<ApiResponse<crate::models::material::Material>, crate::commands::AppError> {
    let service = state.material_service.clone();

    match service.update_material(&id, request, Some(user_id)) {
        Ok(material) => Ok(ApiResponse::success(material)),
        Err(e) => Err(crate::commands::AppError::from(e.to_string())),
    }
}

/// Update material stock
#[tauri::command]
pub async fn material_update_stock(
    state: AppState<'_>,
    request: UpdateStockRequest,
) -> Result<ApiResponse<crate::models::material::Material>, crate::commands::AppError> {
    let service = state.material_service.clone();

    match service.update_stock(request) {
        Ok(material) => Ok(ApiResponse::success(material)),
        Err(e) => Err(crate::commands::AppError::from(e.to_string())),
    }
}

/// Record material consumption
#[tauri::command]
pub async fn material_record_consumption(
    state: AppState<'_>,
    request: RecordConsumptionRequest,
) -> Result<ApiResponse<crate::models::material::MaterialConsumption>, crate::commands::AppError> {
    let service = state.material_service.clone();

    match service.record_consumption(request) {
        Ok(consumption) => Ok(ApiResponse::success(consumption)),
        Err(e) => Err(crate::commands::AppError::from(e.to_string())),
    }
}

/// Get material consumption for an intervention
#[tauri::command]
pub async fn material_get_intervention_consumption(
    state: AppState<'_>,
    intervention_id: String,
) -> Result<ApiResponse<Vec<crate::models::material::MaterialConsumption>>, crate::commands::AppError>
{
    let service = state.material_service.clone();

    match service.get_intervention_consumption(&intervention_id) {
        Ok(consumptions) => Ok(ApiResponse::success(consumptions)),
        Err(e) => Err(crate::commands::AppError::from(e.to_string())),
    }
}

/// Get material consumption summary for an intervention
#[tauri::command]
pub async fn material_get_intervention_summary(
    state: AppState<'_>,
    intervention_id: String,
) -> Result<
    ApiResponse<crate::models::material::InterventionMaterialSummary>,
    crate::commands::AppError,
> {
    let service = state.material_service.clone();

    match service.get_intervention_material_summary(&intervention_id) {
        Ok(summary) => Ok(ApiResponse::success(summary)),
        Err(e) => Err(crate::commands::AppError::from(e.to_string())),
    }
}

/// Get material statistics
#[tauri::command]
pub async fn material_get_stats(
    state: AppState<'_>,
) -> Result<ApiResponse<crate::models::material::MaterialStats>, crate::commands::AppError> {
    let service = state.material_service.clone();

    match service.get_material_stats() {
        Ok(stats) => Ok(ApiResponse::success(stats)),
        Err(e) => Err(crate::commands::AppError::from(e.to_string())),
    }
}

/// Get low stock materials
#[tauri::command]
pub async fn material_get_low_stock(
    state: AppState<'_>,
) -> Result<ApiResponse<Vec<crate::models::material::Material>>, crate::commands::AppError> {
    let service = state.material_service.clone();

    match service.get_low_stock_materials() {
        Ok(materials) => Ok(ApiResponse::success(materials)),
        Err(e) => Err(crate::commands::AppError::from(e.to_string())),
    }
}

/// Get expired materials
#[tauri::command]
pub async fn material_get_expired(
    state: AppState<'_>,
) -> Result<ApiResponse<Vec<crate::models::material::Material>>, crate::commands::AppError> {
    let service = state.material_service.clone();

    match service.get_expired_materials() {
        Ok(materials) => Ok(ApiResponse::success(materials)),
        Err(e) => Err(crate::commands::AppError::from(e.to_string())),
    }
}

/// Create a new material category
#[tauri::command]
pub async fn material_category_create(
    state: AppState<'_>,
    request: CreateMaterialCategoryRequest,
    user_id: String,
) -> Result<ApiResponse<crate::models::material::MaterialCategory>, crate::commands::AppError> {
    let service = state.material_service.clone();

    match service.create_material_category(request, Some(user_id)) {
        Ok(category) => Ok(ApiResponse::success(category)),
        Err(e) => Err(crate::commands::AppError::from(e.to_string())),
    }
}

/// Get material category by ID
#[tauri::command]
pub async fn material_category_get(
    state: AppState<'_>,
    id: String,
) -> Result<ApiResponse<Option<crate::models::material::MaterialCategory>>, crate::commands::AppError> {
    let service = state.material_service.clone();

    match service.get_material_category(&id) {
        Ok(category) => Ok(ApiResponse::success(category)),
        Err(e) => Err(crate::commands::AppError::from(e.to_string())),
    }
}

/// List material categories
#[tauri::command]
pub async fn material_category_list(
    state: AppState<'_>,
    active_only: Option<bool>,
    limit: Option<i32>,
    offset: Option<i32>,
) -> Result<ApiResponse<Vec<crate::models::material::MaterialCategory>>, crate::commands::AppError> {
    let service = state.material_service.clone();

    match service.list_material_categories(active_only.unwrap_or(true), limit, offset) {
        Ok(categories) => Ok(ApiResponse::success(categories)),
        Err(e) => Err(crate::commands::AppError::from(e.to_string())),
    }
}

/// Update material category
#[tauri::command]
pub async fn material_category_update(
    state: AppState<'_>,
    id: String,
    request: CreateMaterialCategoryRequest,
    user_id: String,
) -> Result<ApiResponse<crate::models::material::MaterialCategory>, crate::commands::AppError> {
    let service = state.material_service.clone();

    match service.update_material_category(&id, request, Some(user_id)) {
        Ok(category) => Ok(ApiResponse::success(category)),
        Err(e) => Err(crate::commands::AppError::from(e.to_string())),
    }
}

/// Create a new supplier
#[tauri::command]
pub async fn supplier_create(
    state: AppState<'_>,
    request: CreateSupplierRequest,
    user_id: String,
) -> Result<ApiResponse<crate::models::material::Supplier>, crate::commands::AppError> {
    let service = state.material_service.clone();

    match service.create_supplier(request, Some(user_id)) {
        Ok(supplier) => Ok(ApiResponse::success(supplier)),
        Err(e) => Err(crate::commands::AppError::from(e.to_string())),
    }
}

/// Get supplier by ID
#[tauri::command]
pub async fn supplier_get(
    state: AppState<'_>,
    id: String,
) -> Result<ApiResponse<Option<crate::models::material::Supplier>>, crate::commands::AppError> {
    let service = state.material_service.clone();

    match service.get_supplier(&id) {
        Ok(supplier) => Ok(ApiResponse::success(supplier)),
        Err(e) => Err(crate::commands::AppError::from(e.to_string())),
    }
}

/// List suppliers
#[tauri::command]
pub async fn supplier_list(
    state: AppState<'_>,
    active_only: Option<bool>,
    preferred_only: Option<bool>,
    limit: Option<i32>,
    offset: Option<i32>,
) -> Result<ApiResponse<Vec<crate::models::material::Supplier>>, crate::commands::AppError> {
    let service = state.material_service.clone();

    match service.list_suppliers(active_only.unwrap_or(true), preferred_only, limit, offset) {
        Ok(suppliers) => Ok(ApiResponse::success(suppliers)),
        Err(e) => Err(crate::commands::AppError::from(e.to_string())),
    }
}

/// Update supplier
#[tauri::command]
pub async fn supplier_update(
    state: AppState<'_>,
    id: String,
    request: CreateSupplierRequest,
    user_id: String,
) -> Result<ApiResponse<crate::models::material::Supplier>, crate::commands::AppError> {
    let service = state.material_service.clone();

    match service.update_supplier(&id, request, Some(user_id)) {
        Ok(supplier) => Ok(ApiResponse::success(supplier)),
        Err(e) => Err(crate::commands::AppError::from(e.to_string())),
    }
}

/// Create inventory transaction
#[tauri::command]
pub async fn inventory_transaction_create(
    state: AppState<'_>,
    request: CreateInventoryTransactionRequest,
    user_id: String,
) -> Result<ApiResponse<crate::models::material::InventoryTransaction>, crate::commands::AppError> {
    let service = state.material_service.clone();

    match service.create_inventory_transaction(request, &user_id) {
        Ok(transaction) => Ok(ApiResponse::success(transaction)),
        Err(e) => Err(crate::commands::AppError::from(e.to_string())),
    }
}

/// Get inventory transactions for a material
#[tauri::command]
pub async fn inventory_transaction_list_by_material(
    state: AppState<'_>,
    material_id: String,
    transaction_type: Option<String>,
    limit: Option<i32>,
    offset: Option<i32>,
) -> Result<ApiResponse<Vec<crate::models::material::InventoryTransaction>>, crate::commands::AppError> {
    let service = state.material_service.clone();

    // Parse transaction type
    let tt = transaction_type.and_then(|s| match s.as_str() {
        "stock_in" => Some(InventoryTransactionType::StockIn),
        "stock_out" => Some(InventoryTransactionType::StockOut),
        "adjustment" => Some(InventoryTransactionType::Adjustment),
        "transfer" => Some(InventoryTransactionType::Transfer),
        "waste" => Some(InventoryTransactionType::Waste),
        "return" => Some(InventoryTransactionType::Return),
        _ => None,
    });

    match service.list_inventory_transactions_by_material(&material_id, tt, limit, offset) {
        Ok(transactions) => Ok(ApiResponse::success(transactions)),
        Err(e) => Err(crate::commands::AppError::from(e.to_string())),
    }
}

/// Get recent inventory transactions
#[tauri::command]
pub async fn inventory_transaction_list_recent(
    state: AppState<'_>,
    limit: Option<i32>,
) -> Result<ApiResponse<Vec<crate::models::material::InventoryTransaction>>, crate::commands::AppError> {
    let service = state.material_service.clone();

    match service.list_recent_inventory_transactions(limit.unwrap_or(50)) {
        Ok(transactions) => Ok(ApiResponse::success(transactions)),
        Err(e) => Err(crate::commands::AppError::from(e.to_string())),
    }
}

/// Get inventory statistics
#[tauri::command]
pub async fn inventory_get_stats(
    state: AppState<'_>,
) -> Result<ApiResponse<crate::models::material::InventoryStats>, crate::commands::AppError> {
    let service = state.material_service.clone();

    match service.get_inventory_stats() {
        Ok(stats) => Ok(ApiResponse::success(stats)),
        Err(e) => Err(crate::commands::AppError::from(e.to_string())),
    }
}

/// Get inventory movement summary
#[tauri::command]
pub async fn inventory_get_movement_summary(
    state: AppState<'_>,
    material_id: Option<String>,
    date_from: Option<String>,
    date_to: Option<String>,
) -> Result<ApiResponse<Vec<crate::models::material::InventoryMovementSummary>>, crate::commands::AppError> {
    let service = state.material_service.clone();

    match service.get_inventory_movement_summary(material_id.as_deref(), date_from.as_deref(), date_to.as_deref()) {
        Ok(summary) => Ok(ApiResponse::success(summary)),
        Err(e) => Err(crate::commands::AppError::from(e.to_string())),
    }
}
