//! Search commands
//!
//! This module contains commands for searching across different entities
//! and filtering data.

use crate::commands::{AppError, AppResult, AppState};
use crate::models::reports::*;
use tracing::{info, instrument};

/// Search tasks

#[tauri::command]
#[instrument(skip(_state))]
pub async fn search_tasks(
    query: String,
    filters: SearchFilters,
    limit: Option<i32>,
    session_token: String,
    _state: AppState<'_>,
) -> AppResult<Vec<SearchResult>> {
    info!("Searching tasks with query: {}", query);

    // TODO: Implement search service
    // crate::services::reports::search_service::SearchReportService::search_tasks(
    //     &query,
    //     &filters,
    //     limit.unwrap_or(50),
    //     &session_token,
    //     &state,
    // )
    Err(AppError::NotImplemented("Search functionality not yet implemented".to_string()))
}

/// Search clients

#[tauri::command]
#[instrument(skip(_state))]
pub async fn search_clients(
    query: String,
    filters: SearchFilters,
    limit: Option<i32>,
    session_token: String,
    _state: AppState<'_>,
) -> AppResult<Vec<SearchResult>> {
    info!("Searching clients with query: {}", query);

    // TODO: Implement search service
    Err(AppError::NotImplemented("Search functionality not yet implemented".to_string()))
}

/// Search interventions

#[tauri::command]
#[instrument(skip(_state))]
pub async fn search_interventions(
    query: String,
    filters: SearchFilters,
    limit: Option<i32>,
    session_token: String,
    _state: AppState<'_>,
) -> AppResult<Vec<SearchResult>> {
    info!("Searching interventions with query: {}", query);

    // TODO: Implement search service
    Err(AppError::NotImplemented("Search functionality not yet implemented".to_string()))
}

/// General search records function that delegates to specific search functions

#[tauri::command]
#[instrument(skip(state))]
pub async fn search_records(
    query: String,
    entity_type: String,
    date_range: Option<DateRange>,
    filters: Option<SearchFilters>,
    limit: u64,
    offset: u64,
    session_token: String,
    state: AppState<'_>,
) -> AppResult<SearchResponse> {
    info!("Search records requested: query='{}', entity_type='{}'", query, entity_type);

    let search_filters = filters.unwrap_or_default();

    match entity_type.as_str() {
        "tasks" => {
            let results = search_tasks(query, search_filters, Some(limit as i32), session_token, state).await?;
            let total_count = results.len() as u64;
            Ok(SearchResponse {
                results,
                total_count,
                has_more: false,
            })
        }
        "clients" => {
            let results = search_clients(query, search_filters, Some(limit as i32), session_token, state).await?;
            let total_count = results.len() as u64;
            Ok(SearchResponse {
                results,
                total_count,
                has_more: false,
            })
        }
        "interventions" => {
            let results = search_interventions(query, search_filters, Some(limit as i32), session_token, state).await?;
            let total_count = results.len() as u64;
            Ok(SearchResponse {
                results,
                total_count,
                has_more: false,
            })
        }
        _ => Err(AppError::Validation(format!("Unsupported entity type: {}", entity_type))),
    }
}