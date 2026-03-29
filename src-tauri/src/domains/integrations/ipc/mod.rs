//! IPC handlers for the `integrations` domain (ADR-018: thin IPC layer).
//!
//! Handlers MUST:
//!   - receive `correlation_id: Option<String>`
//!   - call `resolve_context!` as the first line
//!   - delegate immediately to the service layer
//!   - contain no business logic

use crate::commands::{AppResult, AppState};
use crate::domains::integrations::domain::models::integrations::{
    CreateIntegrationRequest, IntegrationConfig, TestIntegrationResponse, UpdateIntegrationRequest,
};
use crate::resolve_context;
use crate::shared::contracts::auth::UserRole;

#[tauri::command]
pub async fn list_integrations(
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> AppResult<Vec<IntegrationConfig>> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Admin);
    state.integrations_service.list(&ctx).await
}

#[tauri::command]
pub async fn get_integrations(
    id: String,
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> AppResult<IntegrationConfig> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Admin);
    state.integrations_service.get(&id, &ctx).await
}

#[tauri::command]
pub async fn create_integration(
    request: CreateIntegrationRequest,
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> AppResult<IntegrationConfig> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Admin);
    state.integrations_service.create(&ctx, request).await
}

#[tauri::command]
pub async fn update_integration(
    id: String,
    request: UpdateIntegrationRequest,
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> AppResult<IntegrationConfig> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Admin);
    state.integrations_service.update(&ctx, &id, request).await
}

#[tauri::command]
pub async fn test_integration(
    id: String,
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> AppResult<TestIntegrationResponse> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Admin);
    state.integrations_service.test_connection(&ctx, &id).await
}

#[tauri::command]
pub async fn retry_dead_letter_integrations(
    id: String,
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> AppResult<usize> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Admin);
    state
        .integrations_service
        .retry_dead_letters(&ctx, &id)
        .await
}

#[tauri::command]
pub async fn delete_integration(
    id: String,
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> AppResult<IntegrationConfig> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Admin);
    state.integrations_service.delete(&ctx, &id).await
}
