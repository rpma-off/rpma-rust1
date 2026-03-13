//! Stock and consumption commands for material management.

use crate::commands::{ApiResponse, AppState};
use crate::domains::inventory::infrastructure::material::{
    CreateInventoryTransactionRequest, RecordConsumptionRequest, UpdateStockRequest,
};
use crate::resolve_context;
use crate::shared::contracts::auth::UserRole;
use tracing::{error, info, instrument};

use crate::shared::ipc::IntoDomainError;

/// Update material stock
#[tauri::command]
#[instrument(skip(state, request), fields(user_id))]
pub async fn material_update_stock(
    state: AppState<'_>,
    request: UpdateStockRequest,
    correlation_id: Option<String>,
) -> Result<
    ApiResponse<crate::domains::inventory::domain::models::material::Material>,
    crate::commands::AppError,
> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Technician);
    tracing::Span::current().record("user_id", ctx.user_id());
    let service = state.material_service.clone();

    let adjusted_request = UpdateStockRequest {
        recorded_by: Some(ctx.user_id().to_string()),
        ..request
    };

    match service.update_stock(adjusted_request) {
        Ok(material) => {
            info!(material_id = %material.id, "Material stock updated");
            Ok(ApiResponse::success(material).with_correlation_id(Some(ctx.correlation_id.clone())))
        }
        Err(e) => {
            error!(error = %e, "Failed to update material stock");
            Err(e.into_app_error())
        }
    }
}

/// Adjust material stock with reason
#[tauri::command]
#[instrument(skip(state, request), fields(user_id))]
pub async fn material_adjust_stock(
    state: AppState<'_>,
    request: UpdateStockRequest,
    correlation_id: Option<String>,
) -> Result<
    ApiResponse<crate::domains::inventory::domain::models::material::Material>,
    crate::commands::AppError,
> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Technician);
    tracing::Span::current().record("user_id", ctx.user_id());
    let service = state.material_service.clone();

    let adjusted_request = UpdateStockRequest {
        recorded_by: Some(ctx.user_id().to_string()),
        ..request
    };

    match service.update_stock(adjusted_request) {
        Ok(material) => {
            info!(material_id = %material.id, "Material stock adjusted");
            Ok(ApiResponse::success(material).with_correlation_id(Some(ctx.correlation_id.clone())))
        }
        Err(e) => {
            error!(error = %e, "Failed to adjust material stock");
            Err(e.into_app_error())
        }
    }
}

/// Record material consumption
#[tauri::command]
#[instrument(skip(state, request), fields(user_id))]
pub async fn material_record_consumption(
    state: AppState<'_>,
    request: RecordConsumptionRequest,
    correlation_id: Option<String>,
) -> Result<
    ApiResponse<crate::domains::inventory::domain::models::material::MaterialConsumption>,
    crate::commands::AppError,
> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Technician);
    tracing::Span::current().record("user_id", ctx.user_id());
    let service = state.inventory_service.clone();

    let adjusted_request = RecordConsumptionRequest {
        recorded_by: Some(ctx.user_id().to_string()),
        ..request
    };

    match service.record_consumption(adjusted_request) {
        Ok(consumption) => {
            info!(consumption_id = %consumption.id, "Material consumption recorded");
            Ok(ApiResponse::success(consumption).with_correlation_id(Some(ctx.correlation_id.clone())))
        }
        Err(e) => {
            error!(error = %e, "Failed to record material consumption");
            Err(e)
        }
    }
}

/// Get material consumption for an intervention
#[tauri::command]
#[instrument(skip(state), fields(user_id))]
pub async fn material_get_intervention_consumption(
    state: AppState<'_>,
    intervention_id: String,
    correlation_id: Option<String>,
) -> Result<
    ApiResponse<Vec<crate::domains::inventory::domain::models::material::MaterialConsumption>>,
    crate::commands::AppError,
> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Technician);
    tracing::Span::current().record("user_id", ctx.user_id());
    let service = state.material_service.clone();

    match service.get_intervention_consumption(&intervention_id) {
        Ok(consumptions) => Ok(
            ApiResponse::success(consumptions).with_correlation_id(Some(ctx.correlation_id.clone()))
        ),
        Err(e) => {
            error!(error = %e, intervention_id = %intervention_id, "Failed to get intervention consumption");
            Err(e.into_app_error())
        }
    }
}

/// Get material consumption summary for an intervention
#[tauri::command]
#[instrument(skip(state), fields(user_id))]
pub async fn material_get_intervention_summary(
    state: AppState<'_>,
    intervention_id: String,
    correlation_id: Option<String>,
) -> Result<
    ApiResponse<crate::domains::inventory::domain::models::material::InterventionMaterialSummary>,
    crate::commands::AppError,
> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Technician);
    tracing::Span::current().record("user_id", ctx.user_id());
    let service = state.material_service.clone();

    match service.get_intervention_material_summary(&intervention_id) {
        Ok(summary) => {
            Ok(ApiResponse::success(summary).with_correlation_id(Some(ctx.correlation_id.clone())))
        }
        Err(e) => {
            error!(error = %e, intervention_id = %intervention_id, "Failed to get intervention material summary");
            Err(e.into_app_error())
        }
    }
}

/// Get consumption history for a material
#[tauri::command]
#[instrument(skip(state), fields(user_id))]
pub async fn material_get_consumption_history(
    state: AppState<'_>,
    material_id: String,
    limit: Option<i32>,
    offset: Option<i32>,
    correlation_id: Option<String>,
) -> Result<
    ApiResponse<Vec<crate::domains::inventory::domain::models::material::MaterialConsumption>>,
    crate::commands::AppError,
> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Technician);
    tracing::Span::current().record("user_id", ctx.user_id());
    let service = state.material_service.clone();

    match service.get_consumption_history(&material_id, limit, offset) {
        Ok(records) => {
            Ok(ApiResponse::success(records).with_correlation_id(Some(ctx.correlation_id.clone())))
        }
        Err(e) => {
            error!(error = %e, material_id = %material_id, "Failed to get consumption history");
            Err(e.into_app_error())
        }
    }
}

/// Create inventory transaction
#[tauri::command]
#[instrument(skip(state, request), fields(user_id))]
pub async fn material_create_inventory_transaction(
    state: AppState<'_>,
    request: CreateInventoryTransactionRequest,
    correlation_id: Option<String>,
) -> Result<
    ApiResponse<crate::domains::inventory::domain::models::material::InventoryTransaction>,
    crate::commands::AppError,
> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Technician);
    tracing::Span::current().record("user_id", ctx.user_id());
    let service = state.material_service.clone();

    match service.create_inventory_transaction(request, ctx.user_id()) {
        Ok(transaction) => {
            info!(transaction_id = %transaction.id, "Inventory transaction created");
            Ok(ApiResponse::success(transaction).with_correlation_id(Some(ctx.correlation_id.clone())))
        }
        Err(e) => {
            error!(error = %e, "Failed to create inventory transaction");
            Err(e.into_app_error())
        }
    }
}

/// Get transaction history for a material
#[tauri::command]
#[instrument(skip(state), fields(user_id))]
pub async fn material_get_transaction_history(
    state: AppState<'_>,
    material_id: String,
    limit: Option<i32>,
    offset: Option<i32>,
    correlation_id: Option<String>,
) -> Result<
    ApiResponse<Vec<crate::domains::inventory::domain::models::material::InventoryTransaction>>,
    crate::commands::AppError,
> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Technician);
    tracing::Span::current().record("user_id", ctx.user_id());
    let service = state.material_service.clone();

    match service.list_inventory_transactions_by_material(&material_id, None, limit, offset) {
        Ok(transactions) => Ok(
            ApiResponse::success(transactions).with_correlation_id(Some(ctx.correlation_id.clone()))
        ),
        Err(e) => {
            error!(error = %e, material_id = %material_id, "Failed to get transaction history");
            Err(e.into_app_error())
        }
    }
}
