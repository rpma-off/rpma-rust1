use std::sync::Arc;

use crate::db::Database;
use crate::shared::ipc::errors::AppError;

/// Facade for the Reports bounded context.
///
/// Provides report generation, PDF creation, and operational intelligence
/// with input validation and error mapping.
#[derive(Debug)]
pub struct ReportsFacade {
    db: Arc<Database>,
}

impl ReportsFacade {
    pub fn new(db: Arc<Database>) -> Self {
        Self { db }
    }

    pub fn is_ready(&self) -> bool {
        true
    }

    /// Access the underlying database connection for report queries.
    pub fn db(&self) -> &Arc<Database> {
        &self.db
    }

    /// Validate a report type parameter.
    pub fn validate_report_type(&self, report_type: &str) -> Result<(), AppError> {
        let valid_types = [
            "task", "client", "technician", "material", "geographic",
            "quality", "seasonal", "intelligence", "overview",
        ];
        if !valid_types.contains(&report_type) {
            return Err(AppError::Validation(format!(
                "Invalid report type: {}. Valid types: {}",
                report_type,
                valid_types.join(", ")
            )));
        }
        Ok(())
    }

    /// Map a raw report error into a structured AppError.
    pub fn map_report_error(&self, context: &str, error: &str) -> AppError {
        AppError::Internal(format!("Report error in {}: {}", context, error))
    }
}
