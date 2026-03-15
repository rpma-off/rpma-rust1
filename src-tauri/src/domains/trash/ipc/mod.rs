//! IPC handlers for the `trash` domain (ADR-018: thin IPC layer).

use crate::commands::{AppResult, AppState};
use crate::domains::trash::domain::models::trash::{DeletedItem, EntityType};
use crate::resolve_context;
use crate::shared::contracts::auth::UserRole;

#[tauri::command]
pub async fn list_trash(
    entity_type: EntityType,
    limit: i64,
    offset: i64,
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> AppResult<Vec<DeletedItem>> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Supervisor);
    state.trash_service.list_deleted(entity_type, limit, offset, &ctx).await
}

#[tauri::command]
pub async fn restore_entity(
    entity_type: EntityType,
    id: String,
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> AppResult<()> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Supervisor);
    state.trash_service.restore(entity_type, id, &ctx).await
}

#[tauri::command]
pub async fn hard_delete_entity(
    entity_type: EntityType,
    id: String,
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> AppResult<()> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Admin);
    state.trash_service.hard_delete(entity_type, id, &ctx).await
}

#[tauri::command]
pub async fn empty_trash(
    entity_type: Option<EntityType>,
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> AppResult<u64> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Admin);
    state.trash_service.empty_trash(entity_type, &ctx).await
}
