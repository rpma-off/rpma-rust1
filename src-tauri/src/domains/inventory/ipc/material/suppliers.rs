//! Supplier management commands for material inventory.

use crate::commands::{ApiResponse, AppState};
use crate::domains::inventory::infrastructure::material::CreateSupplierRequest;
use crate::resolve_context;
use crate::shared::contracts::auth::UserRole;
use tracing::{error, info, instrument};

use crate::shared::ipc::IntoDomainError;

/// Create supplier
#[tauri::command]
#[instrument(skip(state, request), fields(user_id))]
pub async fn material_create_supplier(
    state: AppState<'_>,
    request: CreateSupplierRequest,
    correlation_id: Option<String>,
) -> Result<
    ApiResponse<crate::domains::inventory::domain::models::material::Supplier>,
    crate::commands::AppError,
> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Supervisor);
    tracing::Span::current().record("user_id", ctx.user_id());
    let service = state.material_service.clone();

    match service.create_supplier(request, Some(ctx.user_id().to_string())) {
        Ok(supplier) => {
            info!(supplier_id = %supplier.id, "Supplier created");
            Ok(ApiResponse::success(supplier).with_correlation_id(Some(ctx.correlation_id.clone())))
        }
        Err(e) => {
            error!(error = %e, "Failed to create supplier");
            Err(e.into_app_error())
        }
    }
}

/// List suppliers
#[tauri::command]
#[instrument(skip(state), fields(user_id))]
pub async fn material_list_suppliers(
    state: AppState<'_>,
    active_only: Option<bool>,
    preferred_only: Option<bool>,
    limit: Option<i32>,
    offset: Option<i32>,
    correlation_id: Option<String>,
) -> Result<
    ApiResponse<Vec<crate::domains::inventory::domain::models::material::Supplier>>,
    crate::commands::AppError,
> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Technician);
    tracing::Span::current().record("user_id", ctx.user_id());
    let service = state.material_service.clone();

    match service.list_suppliers(active_only.unwrap_or(true), preferred_only, limit, offset) {
        Ok(suppliers) => {
            Ok(ApiResponse::success(suppliers).with_correlation_id(Some(ctx.correlation_id.clone())))
        }
        Err(e) => {
            error!(error = %e, "Failed to list suppliers");
            Err(e.into_app_error())
        }
    }
}
