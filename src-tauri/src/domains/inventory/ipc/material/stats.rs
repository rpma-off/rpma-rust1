//! Statistics and reporting commands for material management.

use crate::commands::{ApiResponse, AppState};
use crate::resolve_context;
use crate::shared::contracts::auth::UserRole;
use tracing::{error, info, instrument};

use crate::shared::ipc::IntoDomainError;

/// Get material statistics
#[tauri::command]
#[instrument(skip(state), fields(user_id))]
pub async fn material_get_stats(
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> Result<
    ApiResponse<crate::domains::inventory::domain::models::material::MaterialStats>,
    crate::commands::AppError,
> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Technician);
    tracing::Span::current().record("user_id", ctx.user_id());
    let service = state.inventory_service.clone();

    match service.get_material_stats() {
        Ok(stats) => {
            Ok(ApiResponse::success(stats).with_correlation_id(Some(ctx.correlation_id.clone())))
        }
        Err(e) => {
            error!(error = %e, "Failed to get material stats");
            Err(e)
        }
    }
}

/// Get inventory statistics
#[tauri::command]
#[instrument(skip(state), fields(user_id))]
pub async fn inventory_get_stats(
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> Result<
    ApiResponse<crate::domains::inventory::domain::models::material::InventoryStats>,
    crate::commands::AppError,
> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Technician);
    tracing::Span::current().record("user_id", ctx.user_id());
    let service = state.inventory_service.clone();

    match service.get_inventory_stats() {
        Ok(stats) => {
            Ok(ApiResponse::success(stats).with_correlation_id(Some(ctx.correlation_id.clone())))
        }
        Err(e) => {
            error!(error = %e, "Failed to get inventory stats");
            Err(e)
        }
    }
}

/// Get low stock materials
#[tauri::command]
#[instrument(skip(state), fields(user_id))]
pub async fn material_get_low_stock_materials(
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> Result<
    ApiResponse<crate::domains::inventory::domain::models::material::LowStockMaterialsResponse>,
    crate::commands::AppError,
> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Technician);
    tracing::Span::current().record("user_id", ctx.user_id());
    let service = state.material_service.clone();

    match service.get_low_stock_materials() {
        Ok(materials) => {
            Ok(ApiResponse::success(materials).with_correlation_id(Some(ctx.correlation_id.clone())))
        }
        Err(e) => {
            error!(error = %e, "Failed to get low stock materials");
            Err(e.into_app_error())
        }
    }
}

/// Get expired materials
#[tauri::command]
#[instrument(skip(state), fields(user_id))]
pub async fn material_get_expired_materials(
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> Result<
    ApiResponse<Vec<crate::domains::inventory::domain::models::material::Material>>,
    crate::commands::AppError,
> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Technician);
    tracing::Span::current().record("user_id", ctx.user_id());
    let service = state.material_service.clone();

    match service.get_expired_materials() {
        Ok(materials) => {
            Ok(ApiResponse::success(materials).with_correlation_id(Some(ctx.correlation_id.clone())))
        }
        Err(e) => {
            error!(error = %e, "Failed to get expired materials");
            Err(e.into_app_error())
        }
    }
}

/// Get inventory movement summary
#[tauri::command]
#[instrument(skip(state), fields(user_id))]
pub async fn material_get_inventory_movement_summary(
    state: AppState<'_>,
    material_id: Option<String>,
    date_from: Option<String>,
    date_to: Option<String>,
    correlation_id: Option<String>,
) -> Result<
    ApiResponse<Vec<crate::domains::inventory::domain::models::material::InventoryMovementSummary>>,
    crate::commands::AppError,
> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Technician);
    tracing::Span::current().record("user_id", ctx.user_id());
    let service = state.material_service.clone();

    match service.get_inventory_movement_summary(
        material_id.as_deref(),
        date_from.as_deref(),
        date_to.as_deref(),
    ) {
        Ok(summary) => {
            Ok(ApiResponse::success(summary).with_correlation_id(Some(ctx.correlation_id.clone())))
        }
        Err(e) => {
            error!(error = %e, "Failed to get inventory movement summary");
            Err(e.into_app_error())
        }
    }
}

/// S-1 perf: aggregated dashboard — replaces 4 IPC calls (materials + stats + low_stock + expired) with 1.
#[tauri::command]
#[instrument(skip(state), fields(user_id))]
pub async fn inventory_get_dashboard_data(
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> Result<
    ApiResponse<crate::domains::inventory::domain::models::material::InventoryDashboardData>,
    crate::commands::AppError,
> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Technician);
    tracing::Span::current().record("user_id", ctx.user_id());
    let service = state.inventory_service.clone();

    match service.get_dashboard_data() {
        Ok(data) => {
            Ok(ApiResponse::success(data).with_correlation_id(Some(ctx.correlation_id.clone())))
        }
        Err(e) => {
            error!(error = %e, "Failed to get inventory dashboard data");
            Err(e)
        }
    }
}
