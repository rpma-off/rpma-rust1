mod core;
mod export;
pub mod generation;
mod search;
mod utils;

// Re-export main command functions for backward compatibility
pub use core::*;
pub use search::*;

// Create wrapper commands for Tauri registration
#[tauri::command]
pub async fn get_entity_counts(
    session_token: String,
    state: crate::commands::AppState<'_>,
) -> crate::commands::AppResult<serde_json::Value> {
    generation::entity_counts::get_entity_counts(session_token, state).await
}

#[tauri::command]
pub async fn export_report_data(
    report_type: crate::models::reports::ReportType,
    format: crate::models::reports::ExportFormat,
    date_range: crate::models::reports::DateRange,
    filters: crate::models::reports::ReportFilters,
    session_token: String,
    state: crate::commands::AppState<'_>,
) -> crate::commands::AppResult<crate::models::reports::ExportResult> {
    export::data_export::export_report_data(
        report_type,
        format,
        date_range,
        filters,
        session_token,
        state,
    )
    .await
}

#[tauri::command]
pub async fn export_intervention_report(
    intervention_id: String,
    session_token: String,
    state: crate::commands::AppState<'_>,
) -> crate::commands::AppResult<crate::models::reports::InterventionReportResult> {
    export::intervention_export::export_intervention_report(intervention_id, session_token, state)
        .await
}

#[tauri::command]
pub async fn save_intervention_report(
    intervention_id: String,
    file_path: String,
    session_token: String,
    state: crate::commands::AppState<'_>,
) -> crate::commands::AppResult<String> {
    export::intervention_export::save_intervention_report(
        intervention_id,
        file_path,
        session_token,
        state,
    )
    .await
}

#[tauri::command]
pub async fn get_report_status(
    job_id: String,
    session_token: String,
    state: crate::commands::AppState<'_>,
) -> crate::commands::AppResult<Option<crate::services::report_jobs::ReportJob>> {
    generation::background_jobs::get_report_job_status(job_id, session_token, state).await
}

#[tauri::command]
pub async fn cancel_report(
    job_id: String,
    session_token: String,
    state: crate::commands::AppState<'_>,
) -> crate::commands::AppResult<bool> {
    generation::background_jobs::cancel_report_job(job_id, session_token, state).await
}
