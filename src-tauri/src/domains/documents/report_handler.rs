//! Flattened handler for Reports within Documents domain.
//!
//! Each handler authenticates the caller via `resolve_context!`, then
//! delegates to `DocumentsFacade` for all repository operations.

use std::sync::Arc;
use chrono::{Utc, Datelike};
use rusqlite::params;
use tracing::{debug, info, instrument};

use crate::commands::{ApiResponse, AppError, AppState};
use crate::db::Database;
use crate::shared::contracts::auth::UserRole;
use crate::resolve_context;
use crate::shared::services::document_storage::DocumentStorageService;
use super::report_export as report_export_service;
use super::report_pdf::InterventionPdfReport;
use super::models::*;
use super::facade::DocumentsFacade;

// ── Report Repository ───────────────────────────────────────────────────────

pub struct ReportRepository {
    db: Arc<Database>,
}

impl ReportRepository {
    pub fn new(db: Arc<Database>) -> Self {
        Self { db }
    }

    fn row_to_report(row: &rusqlite::Row<'_>) -> rusqlite::Result<InterventionReport> {
        let generated_at_str: String = row.get(3)?;
        let generated_at = chrono::DateTime::parse_from_rfc3339(&generated_at_str)
            .map(|dt| dt.with_timezone(&Utc))
            .unwrap_or_else(|_| Utc::now());

        let file_size: Option<i64> = row.get(8)?;

        Ok(InterventionReport {
            id: row.get(0)?,
            intervention_id: row.get(1)?,
            report_number: row.get(2)?,
            generated_at,
            technician_id: row.get(4)?,
            technician_name: row.get(5)?,
            file_path: row.get(6)?,
            file_name: row.get(7)?,
            file_size: file_size.map(|s| s as u64),
            format: row.get(9)?,
            status: row.get(10)?,
            created_at: row.get(11)?,
            updated_at: row.get(12)?,
        })
    }

    pub fn generate_report_number(&self) -> Result<String, AppError> {
        let year = Utc::now().year();
        let prefix = format!("INT-{}-", year);

        let count: i32 = self
            .db
            .query_single_value(
                "SELECT COUNT(*) FROM intervention_reports WHERE report_number LIKE ?1",
                params![format!("{}%", prefix)],
            )
            .map_err(|e| AppError::Database(format!("Failed to count reports: {}", e)))?;

        let next_number = count + 1;
        Ok(format!("INT-{}-{:04}", year, next_number))
    }

    pub fn save(&self, report: &InterventionReport) -> Result<(), AppError> {
        self.db
            .execute(
                "INSERT INTO intervention_reports (id, intervention_id, report_number, generated_at, technician_id, technician_name, file_path, file_name, file_size, format, status, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
                params![
                    report.id,
                    report.intervention_id,
                    report.report_number,
                    report.generated_at.to_rfc3339(),
                    report.technician_id,
                    report.technician_name,
                    report.file_path,
                    report.file_name,
                    report.file_size.map(|s| s as i64),
                    report.format,
                    report.status,
                    report.created_at,
                    report.updated_at,
                ],
            )
            .map_err(|e| AppError::Database(format!("Failed to save report: {}", e)))?;

        Ok(())
    }

    pub fn find_by_id(&self, id: &str) -> Result<Option<InterventionReport>, AppError> {
        let conn = self
            .db
            .get_connection()
            .map_err(|e| AppError::Database(format!("Failed to get connection: {}", e)))?;

        let result = conn
            .query_row(
                "SELECT id, intervention_id, report_number, generated_at, technician_id, technician_name, file_path, file_name, file_size, format, status, created_at, updated_at
                 FROM intervention_reports WHERE id = ?1",
                params![id],
                |row| Self::row_to_report(row),
            );

        match result {
            Ok(report) => Ok(Some(report)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(AppError::Database(format!("Failed to query report: {}", e))),
        }
    }

    pub fn find_by_intervention_id(
        &self,
        intervention_id: &str,
    ) -> Result<Option<InterventionReport>, AppError> {
        let conn = self
            .db
            .get_connection()
            .map_err(|e| AppError::Database(format!("Failed to get connection: {}", e)))?;

        let result = conn
            .query_row(
                "SELECT id, intervention_id, report_number, generated_at, technician_id, technician_name, file_path, file_name, file_size, format, status, created_at, updated_at
                 FROM intervention_reports WHERE intervention_id = ?1 ORDER BY created_at DESC LIMIT 1",
                params![intervention_id],
                |row| Self::row_to_report(row),
            );

        match result {
            Ok(report) => Ok(Some(report)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(AppError::Database(format!("Failed to query report: {}", e))),
        }
    }

    pub fn list(&self, limit: i32, offset: i32) -> Result<Vec<InterventionReport>, AppError> {
        self.db
            .query_multiple(
                "SELECT id, intervention_id, report_number, generated_at, technician_id, technician_name, file_path, file_name, file_size, format, status, created_at, updated_at
                 FROM intervention_reports ORDER BY created_at DESC LIMIT ?1 OFFSET ?2",
                params![limit, offset],
                |row| Self::row_to_report(row),
            )
            .map_err(|e| AppError::Database(format!("Failed to list reports: {}", e)))
    }
}

// ── IPC Commands ─────────────────────────────────────────────────────────────

/// ADR-018: Thin IPC layer
#[tauri::command]
#[instrument(skip(state))]
pub async fn reports_get_capabilities(
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<ReportCapabilities>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    debug!("Getting report capabilities");

    let capabilities = ReportCapabilities {
        version: "1.0.0".to_string(),
        status: "active".to_string(),
        available_exports: vec!["intervention_pdf".to_string(), "csv".to_string()],
    };
    
    Ok(ApiResponse::success(capabilities).with_correlation_id(Some(ctx.correlation_id)))
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn report_generate(
    state: AppState<'_>,
    intervention_id: String,
    correlation_id: Option<String>,
) -> Result<ApiResponse<InterventionReport>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Technician);
    let current_user = ctx.auth.to_user_session();
    let facade = DocumentsFacade::new(state.photo_service.clone(), state.db.clone());

    // 1. Fetch intervention data
    let intervention_data = report_export_service::get_intervention_with_details(
        &intervention_id,
        &state.db,
        Some(&state.intervention_service),
        Some(&state.client_service),
    )
    .await?;

    // 2. Check export permissions
    report_export_service::check_intervention_export_permissions(
        intervention_data.intervention.technician_id.clone(),
        &current_user,
    )?;

    // 3. Generate report number
    let report_number = facade.generate_report_number()?;

    // 4. Generate PDF file
    let file_name = DocumentStorageService::generate_filename(
        &format!("report_{}", report_number.replace('-', "_")),
        "pdf",
    );
    let output_path = DocumentStorageService::get_document_path(&state.app_data_dir, &file_name);

    let pdf_report =
        InterventionPdfReport::new(
            intervention_data.intervention.clone(),
            intervention_data.workflow_steps.clone(),
            intervention_data.photos.clone(),
            Vec::new(),
            intervention_data.client.clone(),
        );
    pdf_report.generate(&output_path).await?;

    // 5. Get file size
    let file_size = tokio::fs::metadata(&output_path)
        .await
        .map(|m| m.len())
        .ok();

    // 6. Create report entity
    let now = Utc::now();
    let now_millis = now.timestamp_millis();
    let report = InterventionReport {
        id: crate::shared::utils::uuid::generate_uuid_string(),
        intervention_id: intervention_id.to_string(),
        report_number: report_number.clone(),
        generated_at: now,
        technician_id: current_user.user_id.clone().into(),
        technician_name: current_user.username.clone().into(),
        file_path: Some(output_path.to_string_lossy().to_string()),
        file_name: Some(file_name),
        file_size,
        format: "pdf".to_string(),
        status: "generated".to_string(),
        created_at: now_millis,
        updated_at: now_millis,
    };

    // 7. Persist to database
    facade.save_report(&report)?;

    info!(
        report_number = %report.report_number,
        intervention_id = %intervention_id,
        "Intervention report generated"
    );

    Ok(ApiResponse::success(report).with_correlation_id(Some(ctx.correlation_id)))
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn report_get(
    state: AppState<'_>,
    report_id: String,
    correlation_id: Option<String>,
) -> Result<ApiResponse<Option<InterventionReport>>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    let facade = DocumentsFacade::new(state.photo_service.clone(), state.db.clone());
    let report = facade.get_report(&report_id)?;
    Ok(ApiResponse::success(report).with_correlation_id(Some(ctx.correlation_id)))
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn report_get_by_intervention(
    state: AppState<'_>,
    intervention_id: String,
    correlation_id: Option<String>,
) -> Result<ApiResponse<Option<InterventionReport>>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    let facade = DocumentsFacade::new(state.photo_service.clone(), state.db.clone());
    let report = facade.get_report_by_intervention(&intervention_id)?;
    Ok(ApiResponse::success(report).with_correlation_id(Some(ctx.correlation_id)))
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn report_list(
    state: AppState<'_>,
    limit: Option<i32>,
    offset: Option<i32>,
    correlation_id: Option<String>,
) -> Result<ApiResponse<Vec<InterventionReport>>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    let facade = DocumentsFacade::new(state.photo_service.clone(), state.db.clone());
    let reports = facade.list_reports(limit.unwrap_or(crate::shared::constants::DEFAULT_USER_LIST_SIZE as i32), offset.unwrap_or(0))?;
    Ok(ApiResponse::success(reports).with_correlation_id(Some(ctx.correlation_id)))
}
