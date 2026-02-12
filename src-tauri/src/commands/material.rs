//! Tauri commands for material management - PRD-08
//!
//! Provides IPC endpoints for material inventory management and consumption tracking.

use crate::authenticate;
use crate::commands::{ApiResponse, AppState};
use crate::models::material::MaterialType;
use crate::services::material::{
    CreateMaterialRequest, RecordConsumptionRequest, UpdateStockRequest,
};
use tracing::{error, info, instrument};

/// Create a new material
#[tauri::command]
#[instrument(skip(state, session_token, request), fields(user_id))]
pub async fn material_create(
    state: AppState<'_>,
    session_token: String,
    request: CreateMaterialRequest,
) -> Result<ApiResponse<crate::models::material::Material>, crate::commands::AppError> {
    let current_user = authenticate!(&session_token, &state);
    tracing::Span::current().record("user_id", &current_user.user_id.as_str());
    let service = state.material_service.clone();

    match service.create_material(request, Some(current_user.user_id)) {
        Ok(material) => {
            info!(material_id = %material.id, "Material created");
            Ok(ApiResponse::success(material))
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
) -> Result<ApiResponse<Option<crate::models::material::Material>>, crate::commands::AppError> {
    let current_user = authenticate!(&session_token, &state);
    tracing::Span::current().record("user_id", &current_user.user_id.as_str());
    let service = state.material_service.clone();

    match service.get_material(&id) {
        Ok(material) => Ok(ApiResponse::success(material)),
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
) -> Result<ApiResponse<Option<crate::models::material::Material>>, crate::commands::AppError> {
    let current_user = authenticate!(&session_token, &state);
    tracing::Span::current().record("user_id", &current_user.user_id.as_str());
    let service = state.material_service.clone();

    match service.get_material_by_sku(&sku) {
        Ok(material) => Ok(ApiResponse::success(material)),
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
) -> Result<ApiResponse<Vec<crate::models::material::Material>>, crate::commands::AppError> {
    let current_user = authenticate!(&session_token, &state);
    tracing::Span::current().record("user_id", &current_user.user_id.as_str());
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
        Err(e) => {
            error!(error = %e, "Failed to list materials");
            Err(crate::commands::AppError::internal_sanitized(
                "list_materials",
                &e,
            ))
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
) -> Result<ApiResponse<crate::models::material::Material>, crate::commands::AppError> {
    let current_user = authenticate!(&session_token, &state);
    tracing::Span::current().record("user_id", &current_user.user_id.as_str());
    let service = state.material_service.clone();

    match service.update_material(&id, request, Some(current_user.user_id)) {
        Ok(material) => {
            info!(material_id = %id, "Material updated");
            Ok(ApiResponse::success(material))
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
) -> Result<ApiResponse<crate::models::material::Material>, crate::commands::AppError> {
    let current_user = authenticate!(&session_token, &state);
    tracing::Span::current().record("user_id", &current_user.user_id.as_str());
    let service = state.material_service.clone();

    match service.update_stock(request) {
        Ok(material) => {
            info!(material_id = %material.id, "Material stock updated");
            Ok(ApiResponse::success(material))
        }
        Err(e) => {
            error!(error = %e, "Failed to update material stock");
            Err(crate::commands::AppError::internal_sanitized(
                "update_stock",
                &e,
            ))
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
) -> Result<ApiResponse<crate::models::material::MaterialConsumption>, crate::commands::AppError> {
    let current_user = authenticate!(&session_token, &state);
    tracing::Span::current().record("user_id", &current_user.user_id.as_str());
    let service = state.material_service.clone();

    match service.record_consumption(request) {
        Ok(consumption) => {
            info!(consumption_id = %consumption.id, "Material consumption recorded");
            Ok(ApiResponse::success(consumption))
        }
        Err(e) => {
            error!(error = %e, "Failed to record material consumption");
            Err(crate::commands::AppError::internal_sanitized(
                "record_consumption",
                &e,
            ))
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
) -> Result<ApiResponse<Vec<crate::models::material::MaterialConsumption>>, crate::commands::AppError>
{
    let current_user = authenticate!(&session_token, &state);
    tracing::Span::current().record("user_id", &current_user.user_id.as_str());
    let service = state.material_service.clone();

    match service.get_intervention_consumption(&intervention_id) {
        Ok(consumptions) => Ok(ApiResponse::success(consumptions)),
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
) -> Result<
    ApiResponse<crate::models::material::InterventionMaterialSummary>,
    crate::commands::AppError,
> {
    let current_user = authenticate!(&session_token, &state);
    tracing::Span::current().record("user_id", &current_user.user_id.as_str());
    let service = state.material_service.clone();

    match service.get_intervention_material_summary(&intervention_id) {
        Ok(summary) => Ok(ApiResponse::success(summary)),
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
) -> Result<ApiResponse<crate::models::material::MaterialStats>, crate::commands::AppError> {
    let current_user = authenticate!(&session_token, &state);
    tracing::Span::current().record("user_id", &current_user.user_id.as_str());
    let service = state.material_service.clone();

    match service.get_material_stats() {
        Ok(stats) => Ok(ApiResponse::success(stats)),
        Err(e) => {
            error!(error = %e, "Failed to get material stats");
            Err(crate::commands::AppError::internal_sanitized(
                "get_material_stats",
                &e,
            ))
        }
    }
}

/// Get low stock materials
#[tauri::command]
#[instrument(skip(state, session_token), fields(user_id))]
pub async fn material_get_low_stock(
    state: AppState<'_>,
    session_token: String,
) -> Result<ApiResponse<Vec<crate::models::material::Material>>, crate::commands::AppError> {
    let current_user = authenticate!(&session_token, &state);
    tracing::Span::current().record("user_id", &current_user.user_id.as_str());
    let service = state.material_service.clone();

    match service.get_low_stock_materials() {
        Ok(materials) => Ok(ApiResponse::success(materials)),
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
) -> Result<ApiResponse<Vec<crate::models::material::Material>>, crate::commands::AppError> {
    let current_user = authenticate!(&session_token, &state);
    tracing::Span::current().record("user_id", &current_user.user_id.as_str());
    let service = state.material_service.clone();

    match service.get_expired_materials() {
        Ok(materials) => Ok(ApiResponse::success(materials)),
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
) -> Result<ApiResponse<crate::models::material::InventoryStats>, crate::commands::AppError> {
    let current_user = authenticate!(&session_token, &state);
    tracing::Span::current().record("user_id", &current_user.user_id.as_str());
    let service = state.material_service.clone();

    match service.get_inventory_stats() {
        Ok(stats) => Ok(ApiResponse::success(stats)),
        Err(e) => {
            error!(error = %e, "Failed to get inventory stats");
            Err(crate::commands::AppError::internal_sanitized(
                "get_inventory_stats",
                &e,
            ))
        }
    }
}
