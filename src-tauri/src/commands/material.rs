//! Tauri commands for material management - PRD-08
//!
//! Provides IPC endpoints for material inventory management and consumption tracking.

use crate::commands::{ApiResponse, AppState};
use crate::models::material::MaterialType;
use crate::services::material::{
    CreateMaterialRequest, RecordConsumptionRequest, UpdateStockRequest,
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
