use crate::commands::{AppError, AppResult};
use crate::db::Database;
use crate::domains::reports::domain::models::intervention_report::InterventionReport;
use chrono::{Datelike, Utc};
use rusqlite::params;
use std::sync::Arc;

/// Repository for persisting and querying intervention reports.
pub struct ReportRepository {
    db: Arc<Database>,
}

impl ReportRepository {
    pub fn new(db: Arc<Database>) -> Self {
        Self { db }
    }

    /// Generate the next report number in INT-YYYY-NNNN format.
    pub fn generate_report_number(&self) -> AppResult<String> {
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

    /// Save a new intervention report record.
    pub fn save(&self, report: &InterventionReport) -> AppResult<()> {
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

    /// Find a report by its ID.
    pub fn find_by_id(&self, id: &str) -> AppResult<Option<InterventionReport>> {
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

    /// Find a report by intervention ID (returns the latest one).
    pub fn find_by_intervention_id(
        &self,
        intervention_id: &str,
    ) -> AppResult<Option<InterventionReport>> {
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

    /// List all reports, ordered by creation date (newest first).
    pub fn list(&self, limit: i32, offset: i32) -> AppResult<Vec<InterventionReport>> {
        self.db
            .query_multiple(
                "SELECT id, intervention_id, report_number, generated_at, technician_id, technician_name, file_path, file_name, file_size, format, status, created_at, updated_at
                 FROM intervention_reports ORDER BY created_at DESC LIMIT ?1 OFFSET ?2",
                params![limit, offset],
                |row| Self::row_to_report(row),
            )
            .map_err(|e| AppError::Database(format!("Failed to list reports: {}", e)))
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
}
