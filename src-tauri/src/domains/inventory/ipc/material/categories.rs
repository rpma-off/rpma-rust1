//! Category management commands for material inventory.

use crate::commands::{ApiResponse, AppState};
use crate::domains::inventory::infrastructure::material::CreateMaterialCategoryRequest;
use crate::resolve_context;
use crate::shared::contracts::auth::UserRole;
use tracing::{error, info, instrument};

use crate::shared::ipc::IntoDomainError;

/// Create material category
#[tauri::command]
#[instrument(skip(state, request), fields(user_id))]
pub async fn material_create_category(
    state: AppState<'_>,
    request: CreateMaterialCategoryRequest,
    correlation_id: Option<String>,
) -> Result<
    ApiResponse<crate::domains::inventory::domain::models::material::MaterialCategory>,
    crate::commands::AppError,
> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Supervisor);
    tracing::Span::current().record("user_id", ctx.user_id());
    let service = state.material_service.clone();

    match service.create_material_category(request, Some(ctx.user_id().to_string())) {
        Ok(category) => {
            info!(category_id = %category.id, "Material category created");
            Ok(ApiResponse::success(category).with_correlation_id(Some(ctx.correlation_id.clone())))
        }
        Err(e) => {
            error!(error = %e, "Failed to create material category");
            Err(e.into_app_error())
        }
    }
}

/// List material categories
#[tauri::command]
#[instrument(skip(state), fields(user_id))]
pub async fn material_list_categories(
    state: AppState<'_>,
    active_only: Option<bool>,
    limit: Option<i32>,
    offset: Option<i32>,
    correlation_id: Option<String>,
) -> Result<
    ApiResponse<Vec<crate::domains::inventory::domain::models::material::MaterialCategory>>,
    crate::commands::AppError,
> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Technician);
    tracing::Span::current().record("user_id", ctx.user_id());
    let service = state.material_service.clone();

    match service.list_material_categories(active_only.unwrap_or(true), limit, offset) {
        Ok(categories) => {
            Ok(ApiResponse::success(categories).with_correlation_id(Some(ctx.correlation_id.clone())))
        }
        Err(e) => {
            error!(error = %e, "Failed to list material categories");
            Err(e.into_app_error())
        }
    }
}
