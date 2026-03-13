//! CRUD commands for material management.

use crate::commands::{ApiResponse, AppState};
use crate::domains::inventory::domain::models::material::MaterialType;
use crate::domains::inventory::infrastructure::material::{
    CreateMaterialRequest, MaterialError,
};
use crate::resolve_context;
use crate::shared::contracts::auth::UserRole;
use tracing::{error, info, instrument};

use crate::shared::ipc::IntoDomainError;

/// Create a new material
#[tauri::command]
#[instrument(skip(state, request), fields(user_id))]
pub async fn material_create(
    state: AppState<'_>,
    request: CreateMaterialRequest,
    correlation_id: Option<String>,
) -> Result<
    ApiResponse<crate::domains::inventory::domain::models::material::Material>,
    crate::commands::AppError,
> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Technician);
    tracing::Span::current().record("user_id", ctx.user_id());
    let service = state.material_service.clone();

    match service.create_material(request, Some(ctx.user_id().to_string())) {
        Ok(material) => {
            info!(material_id = %material.id, "Material created");
            Ok(ApiResponse::success(material).with_correlation_id(Some(ctx.correlation_id.clone())))
        }
        Err(e) => {
            error!(error = %e, "Failed to create material");
            Err(e.into_app_error())
        }
    }
}

/// Get material by ID
#[tauri::command]
#[instrument(skip(state), fields(user_id))]
pub async fn material_get(
    state: AppState<'_>,
    id: String,
    correlation_id: Option<String>,
) -> Result<
    ApiResponse<Option<crate::domains::inventory::domain::models::material::Material>>,
    crate::commands::AppError,
> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Technician);
    tracing::Span::current().record("user_id", ctx.user_id());
    let service = state.material_service.clone();

    match service.get_material(&id) {
        Ok(material) => {
            Ok(ApiResponse::success(material).with_correlation_id(Some(ctx.correlation_id.clone())))
        }
        Err(e) => {
            error!(error = %e, material_id = %id, "Failed to get material");
            Err(e.into_app_error())
        }
    }
}

/// Get material by SKU
#[tauri::command]
#[instrument(skip(state), fields(user_id))]
pub async fn material_get_by_sku(
    state: AppState<'_>,
    sku: String,
    correlation_id: Option<String>,
) -> Result<
    ApiResponse<Option<crate::domains::inventory::domain::models::material::Material>>,
    crate::commands::AppError,
> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Technician);
    tracing::Span::current().record("user_id", ctx.user_id());
    let service = state.material_service.clone();

    match service.get_material_by_sku(&sku) {
        Ok(material) => {
            Ok(ApiResponse::success(material).with_correlation_id(Some(ctx.correlation_id.clone())))
        }
        Err(e) => {
            error!(error = %e, sku = %sku, "Failed to get material by SKU");
            Err(e.into_app_error())
        }
    }
}

/// List materials with filtering
#[tauri::command]
#[instrument(skip(state), fields(user_id))]
pub async fn material_list(
    state: AppState<'_>,
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
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Technician);
    tracing::Span::current().record("user_id", ctx.user_id());
    let service = state.material_service.clone();

    // Parse Option<String> into Option<MaterialType> via serde so rename attributes are respected.
    let parsed_type: Option<MaterialType> = match material_type {
        Some(s) => serde_json::from_str(&format!("\"{}\"", s))
            .map(Some)
            .map_err(|_| {
                MaterialError::Validation(format!("Unknown material_type filter: {}", s))
                    .into_app_error()
            })?,
        None => None,
    };

    match service.list_materials(
        parsed_type,
        category,
        active_only.unwrap_or(true),
        limit,
        offset,
    ) {
        Ok(materials) => {
            Ok(ApiResponse::success(materials).with_correlation_id(Some(ctx.correlation_id.clone())))
        }
        Err(e) => {
            error!(error = %e, "Failed to list materials");
            Err(e.into_app_error())
        }
    }
}

/// Update material
#[tauri::command]
#[instrument(skip(state, request), fields(user_id))]
pub async fn material_update(
    state: AppState<'_>,
    id: String,
    request: CreateMaterialRequest,
    correlation_id: Option<String>,
) -> Result<
    ApiResponse<crate::domains::inventory::domain::models::material::Material>,
    crate::commands::AppError,
> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Technician);
    tracing::Span::current().record("user_id", ctx.user_id());
    let service = state.material_service.clone();

    match service.update_material(&id, request, Some(ctx.user_id().to_string())) {
        Ok(material) => {
            info!(material_id = %id, "Material updated");
            Ok(ApiResponse::success(material).with_correlation_id(Some(ctx.correlation_id.clone())))
        }
        Err(e) => {
            error!(error = %e, material_id = %id, "Failed to update material");
            Err(e.into_app_error())
        }
    }
}

/// Delete (soft-delete/archive) a material
#[tauri::command]
#[instrument(skip(state), fields(user_id))]
pub async fn material_delete(
    state: AppState<'_>,
    id: String,
    correlation_id: Option<String>,
) -> Result<ApiResponse<()>, crate::commands::AppError> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Supervisor);
    tracing::Span::current().record("user_id", ctx.user_id());
    let service = state.material_service.clone();

    match service.delete_material(&id, Some(ctx.user_id().to_string())) {
        Ok(()) => {
            info!(material_id = %id, "Material archived");
            Ok(ApiResponse::success(()).with_correlation_id(Some(ctx.correlation_id.clone())))
        }
        Err(e) => {
            error!(error = %e, material_id = %id, "Failed to delete material");
            Err(e.into_app_error())
        }
    }
}
