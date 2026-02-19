//! Search commands
//!
//! This module contains commands for searching across different entities
//! and filtering data.

use crate::authenticate;
use crate::commands::{AppError, AppResult, AppState};
use crate::models::reports::*;
use crate::services::reports::search_service::SearchReportService;
use tracing::{info, instrument};

/// Search tasks

#[tauri::command]
#[instrument(skip(state))]
pub async fn search_tasks(
    query: String,
    filters: SearchFilters,
    limit: Option<i32>,
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> AppResult<Vec<SearchResult>> {
    let _correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let current_user = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);

    info!("Searching tasks with query: {}", query);

    SearchReportService::search_tasks(
        &query,
        &filters,
        limit.unwrap_or(50),
        &session_token,
        &state,
    )
    .await
}

/// Search clients

#[tauri::command]
#[instrument(skip(state))]
pub async fn search_clients(
    query: String,
    filters: SearchFilters,
    limit: Option<i32>,
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> AppResult<Vec<SearchResult>> {
    let _correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let current_user = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);

    info!("Searching clients with query: {}", query);

    SearchReportService::search_clients(
        &query,
        &filters,
        limit.unwrap_or(50),
        &session_token,
        &state,
    )
    .await
}

/// Search interventions

#[tauri::command]
#[instrument(skip(state))]
pub async fn search_interventions(
    query: String,
    filters: SearchFilters,
    limit: Option<i32>,
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> AppResult<Vec<SearchResult>> {
    let _correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let current_user = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);

    info!("Searching interventions with query: {}", query);

    SearchReportService::search_interventions(
        &query,
        &filters,
        limit.unwrap_or(50),
        &session_token,
        &state,
    )
    .await
}

/// General search records function that delegates to specific search functions

#[tauri::command]
#[instrument(skip(state))]
pub async fn search_records(
    query: String,
    entity_type: String,
    _date_range: Option<DateRange>,
    filters: Option<SearchFilters>,
    limit: u64,
    _offset: u64,
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> AppResult<SearchResponse> {
    let _correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    info!(
        "Search records requested: query='{}', entity_type='{}'",
        query, entity_type
    );

    let current_user = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);

    let search_filters = filters.unwrap_or_default();

    match entity_type.as_str() {
        "tasks" => {
            let results = search_tasks(
                query,
                search_filters,
                Some(limit as i32),
                session_token,
                correlation_id.clone(),
                state,
            )
            .await?;
            let total_count = results.len() as u64;
            Ok(SearchResponse {
                results,
                total_count,
                has_more: false,
            })
        }
        "clients" => {
            let results = search_clients(
                query,
                search_filters,
                Some(limit as i32),
                session_token,
                correlation_id.clone(),
                state,
            )
            .await?;
            let total_count = results.len() as u64;
            Ok(SearchResponse {
                results,
                total_count,
                has_more: false,
            })
        }
        "interventions" => {
            let results = search_interventions(
                query,
                search_filters,
                Some(limit as i32),
                session_token,
                correlation_id.clone(),
                state,
            )
            .await?;
            let total_count = results.len() as u64;
            Ok(SearchResponse {
                results,
                total_count,
                has_more: false,
            })
        }
        _ => Err(AppError::Validation(format!(
            "Unsupported entity type: {}",
            entity_type
        ))),
    }
}
