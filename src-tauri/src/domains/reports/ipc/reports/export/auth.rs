//! Authentication and authorization logic for report exports
//!
//! This module handles user authentication, session validation,
//! and permission checks for various export operations.

use crate::authenticate;
use crate::commands::{AppResult, AppState};
use crate::shared::contracts::auth::UserRole;
use crate::domains::reports::domain::models::reports::ReportType;

/// Check if user has permission to export a specific report type
pub fn check_export_permissions(
    report_type: &ReportType,
    current_user: &crate::shared::contracts::auth::UserSession,
) -> AppResult<()> {
    match report_type {
        ReportType::Tasks => {
            // Technicians can export their own tasks
            let can_view_all = matches!(current_user.role, UserRole::Admin | UserRole::Supervisor);
            if !can_view_all {
                return Err(crate::commands::errors::AppError::Authorization(
                    "You can only export your own task reports".to_string(),
                ));
            }
        }
        ReportType::Technicians
        | ReportType::Clients
        | ReportType::Quality
        | ReportType::Materials
        | ReportType::Geographic
        | ReportType::Seasonal
        | ReportType::OperationalIntelligence => {
            if !matches!(current_user.role, UserRole::Admin | UserRole::Supervisor) {
                return Err(crate::commands::errors::AppError::Authorization(
                    "Only admins and supervisors can export this report type".to_string(),
                ));
            }
        }
        ReportType::Overview | ReportType::DataExplorer => {
            // Overview and data explorer reports are generally accessible
        }
    }
    Ok(())
}

/// Check if user can access a specific intervention for export
pub fn check_intervention_export_permissions(
    intervention_technician_id: Option<String>,
    current_user: &crate::shared::contracts::auth::UserSession,
) -> AppResult<()> {
    // Check permissions (technician can only access their own interventions)
    if !matches!(current_user.role, UserRole::Admin | UserRole::Supervisor)
        && intervention_technician_id != Some(current_user.user_id.clone())
    {
        return Err(crate::commands::errors::AppError::Authorization(
            "You can only export reports for your own interventions".to_string(),
        ));
    }
    Ok(())
}

/// Authenticate user for export operations
pub async fn authenticate_for_export(
    session_token: &str,
    state: &AppState<'_>,
) -> AppResult<crate::shared::contracts::auth::UserSession> {
    let current_user = authenticate!(session_token, state);
    Ok(current_user)
}
