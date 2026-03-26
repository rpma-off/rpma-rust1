//! Client IPC handlers — thin Tauri command entry points (ADR-018).

use crate::domains::clients::application::client_input_validator::{
    sanitize_create_request, sanitize_update_request,
};
use crate::domains::clients::application::client_service::{ClientService, ClientStats};
use crate::domains::clients::application::ClientOrchestrator;
use crate::domains::clients::domain::models::{
    Client, ClientListResponse, ClientQuery, ClientWithTasks, CreateClientRequest,
    UpdateClientRequest,
};
use crate::commands::{ApiResponse, AppError, AppState};
use tracing::instrument;

// ── Individual thin handlers (ADR-018) ────────────────────────────────────────

/// Shared preamble: rate-limit check + RBAC permission check.
fn check_client_access(
    state: &AppState<'_>,
    user_id: &str,
    role: &crate::shared::contracts::auth::UserRole,
    permission: &str,
) -> Result<(), AppError> {
    let rate_limiter = state.auth_service.rate_limiter();
    ClientService::check_client_access(&rate_limiter, user_id, role, permission)
}

/// Create a new client.
#[tauri::command]
#[instrument(skip(state))]
pub async fn client_create(
    data: CreateClientRequest,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<Client>, AppError> {
    let ctx = crate::resolve_context!(&state, &correlation_id);
    check_client_access(&state, ctx.user_id(), &ctx.auth.role, "create")?;
    let sanitized = sanitize_create_request(data)?;
    let client = state
        .client_service
        .create_client_async(sanitized, ctx.user_id())
        .await
        .map_err(|e| ClientService::map_service_error("create_client", e.as_str()))?;
    Ok(ApiResponse::success_with_correlation(
        client,
        Some(ctx.correlation_id),
    ))
}

/// Get a single client by ID.
#[tauri::command]
#[instrument(skip(state))]
pub async fn client_get(
    id: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<Option<Client>>, AppError> {
    let ctx = crate::resolve_context!(&state, &correlation_id);
    check_client_access(&state, ctx.user_id(), &ctx.auth.role, "read")?;
    ClientService::validate_client_id(&id)?;
    let client = state
        .client_service
        .get_client_async(&id)
        .await
        .map_err(|e| ClientService::map_service_error("get_client", e.as_str()))?;
    Ok(ApiResponse::success_with_correlation(
        client,
        Some(ctx.correlation_id),
    ))
}

/// Get a single client with its associated tasks.
#[tauri::command]
#[instrument(skip(state))]
pub async fn client_get_with_tasks(
    id: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<Option<ClientWithTasks>>, AppError> {
    let ctx = crate::resolve_context!(&state, &correlation_id);
    check_client_access(&state, ctx.user_id(), &ctx.auth.role, "read")?;
    ClientService::validate_client_id(&id)?;

    let orchestrator =
        ClientOrchestrator::new(state.client_service.clone(), state.task_service.clone());
    let client_with_tasks = orchestrator
        .get_client_with_tasks(&id)
        .await
        .map_err(|e| ClientService::map_service_error("get_client_with_tasks", &e))?;

    Ok(ApiResponse::success_with_correlation(
        client_with_tasks,
        Some(ctx.correlation_id),
    ))
}

/// Update an existing client.
#[tauri::command]
#[instrument(skip(state))]
pub async fn client_update(
    id: String,
    data: UpdateClientRequest,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<Client>, AppError> {
    let ctx = crate::resolve_context!(&state, &correlation_id);
    check_client_access(&state, ctx.user_id(), &ctx.auth.role, "update")?;
    ClientService::validate_client_id(&id)?;
    let sanitized = sanitize_update_request(id.clone(), data)?;
    let client = state
        .client_service
        .update_client_async(sanitized, ctx.user_id())
        .await
        .map_err(|e| ClientService::map_service_error("update_client", e.as_str()))?;
    Ok(ApiResponse::success_with_correlation(
        client,
        Some(ctx.correlation_id),
    ))
}

/// Delete a client by ID.
#[tauri::command]
#[instrument(skip(state))]
pub async fn client_delete(
    id: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<()>, AppError> {
    let ctx = crate::resolve_context!(&state, &correlation_id);
    check_client_access(&state, ctx.user_id(), &ctx.auth.role, "delete")?;
    ClientService::validate_client_id(&id)?;
    state
        .client_service
        .delete_client_async(&id, ctx.user_id())
        .await
        .map_err(|e| ClientService::map_service_error("delete_client", e.as_str()))?;
    Ok(ApiResponse::success_with_correlation(
        (),
        Some(ctx.correlation_id),
    ))
}

/// List clients with optional filters and pagination.
#[tauri::command]
#[instrument(skip(state))]
pub async fn client_list(
    filters: ClientQuery,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<ClientListResponse>, AppError> {
    let ctx = crate::resolve_context!(&state, &correlation_id);
    check_client_access(&state, ctx.user_id(), &ctx.auth.role, "read")?;
    let clients = state
        .client_service
        .get_clients_async(filters)
        .await
        .map_err(|e| ClientService::map_service_error("list_clients", e.as_str()))?;
    Ok(ApiResponse::success_with_correlation(
        clients,
        Some(ctx.correlation_id),
    ))
}

/// List clients with their associated tasks.
#[tauri::command]
#[instrument(skip(state))]
pub async fn client_list_with_tasks(
    filters: ClientQuery,
    limit_tasks: Option<i32>,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<Vec<ClientWithTasks>>, AppError> {
    let ctx = crate::resolve_context!(&state, &correlation_id);
    check_client_access(&state, ctx.user_id(), &ctx.auth.role, "read")?;

    let orchestrator =
        ClientOrchestrator::new(state.client_service.clone(), state.task_service.clone());
    let clients_with_tasks = orchestrator
        .get_clients_with_tasks(filters, limit_tasks)
        .await
        .map_err(|e| ClientService::map_service_error("list_clients_with_tasks", &e))?;

    Ok(ApiResponse::success_with_correlation(
        clients_with_tasks,
        Some(ctx.correlation_id),
    ))
}

/// Search clients by query string.
#[tauri::command]
#[instrument(skip(state))]
pub async fn client_search(
    query: String,
    limit: i32,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<Vec<Client>>, AppError> {
    let ctx = crate::resolve_context!(&state, &correlation_id);
    check_client_access(&state, ctx.user_id(), &ctx.auth.role, "read")?;
    let clients = state
        .client_service
        .search_clients_async(&query, 1, limit)
        .await
        .map_err(|e| ClientService::map_service_error("search_clients", e.as_str()))?;
    Ok(ApiResponse::success_with_correlation(
        clients,
        Some(ctx.correlation_id),
    ))
}

/// Get client statistics (counts by type, etc.).
#[tauri::command]
#[instrument(skip(state))]
pub async fn client_get_stats(
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<ClientStats>, AppError> {
    let ctx = crate::resolve_context!(&state, &correlation_id);
    check_client_access(&state, ctx.user_id(), &ctx.auth.role, "read")?;
    let stats = state
        .client_service
        .get_client_stats_async()
        .await
        .map_err(|e| ClientService::map_service_error("get_client_stats", e.as_str()))?;
    Ok(ApiResponse::success_with_correlation(
        stats,
        Some(ctx.correlation_id),
    ))
}
