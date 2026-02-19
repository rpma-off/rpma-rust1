//! Entity counting functionality
//!
//! This module provides implementations for retrieving entity counts
//! used in dashboard and data explorer functionality.

use crate::authenticate;
use crate::commands::{AppError, AppResult, AppState};
use tracing::{info, instrument};

/// Get entity counts for dashboard
#[instrument(skip(state))]
pub async fn get_entity_counts(
    session_token: String,
    state: AppState<'_>,
) -> AppResult<serde_json::Value> {
    info!("Getting entity counts for Data Explorer");

    let _current_user = authenticate!(&session_token, &state);
    let db = &state.db;

    let mut counts = serde_json::Map::new();

    // Get task count
    let task_count = db
        .count_rows("tasks")
        .map_err(|e| AppError::Database(format!("Failed to count tasks: {}", e)))?;
    counts.insert(
        "tasks".to_string(),
        serde_json::Value::Number(task_count.into()),
    );

    // Get client count
    let client_count = db
        .count_rows("clients")
        .map_err(|e| AppError::Database(format!("Failed to count clients: {}", e)))?;
    counts.insert(
        "clients".to_string(),
        serde_json::Value::Number(client_count.into()),
    );

    // Get intervention count (steps table)
    let intervention_count = db
        .count_rows("steps")
        .map_err(|e| AppError::Database(format!("Failed to count interventions: {}", e)))?;
    counts.insert(
        "interventions".to_string(),
        serde_json::Value::Number(intervention_count.into()),
    );

    info!(
        "Entity counts retrieved: tasks={}, clients={}, interventions={}",
        task_count, client_count, intervention_count
    );

    Ok(serde_json::Value::Object(counts))
}
