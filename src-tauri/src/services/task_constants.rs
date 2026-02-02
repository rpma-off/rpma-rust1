//! Task service constants and utilities
//!
//! This module contains shared constants and utilities used across task-related services.

use crate::commands::AppError;
use crate::models::task::{PaginationInfo, TaskPriority, TaskQuery, TaskStatus};

/// Timeout duration for single task operations (in seconds)
pub const SINGLE_TASK_TIMEOUT_SECS: u64 = 5;

/// Timeout duration for task list operations (in seconds)
pub const TASK_LIST_TIMEOUT_SECS: u64 = 30;

/// Default page size for paginated queries
pub const DEFAULT_PAGE_SIZE: i32 = 20;

/// Maximum title length in characters
pub const MAX_TITLE_LENGTH: usize = 100;

/// Maximum description length in characters
pub const MAX_DESCRIPTION_LENGTH: usize = 1000;

/// Minimum valid vehicle year
pub const MIN_VEHICLE_YEAR: i32 = 1900;

/// Maximum valid vehicle year
pub const MAX_VEHICLE_YEAR: i32 = 2100;

/// Date format string for task numbers (YYYYMMDD)
pub const TASK_NUMBER_DATE_FORMAT: &str = "%Y%m%d";

/// Column list for SELECT queries on tasks table
///
/// This constant provides the complete list of columns that should be selected
/// when querying tasks, ensuring consistency across all query methods.
///
/// Usage:
/// ```ignore
/// let sql = format!("SELECT {} FROM tasks WHERE deleted_at IS NULL", TASK_QUERY_COLUMNS);
/// ```
pub const TASK_QUERY_COLUMNS: &str = r#"
    id, task_number, title, description, vehicle_plate, vehicle_model,
    vehicle_year, vehicle_make, vin, ppf_zones, custom_ppf_zones, status, priority, technician_id,
    assigned_at, assigned_by, scheduled_date, start_time, end_time,
    date_rdv, heure_rdv, template_id, workflow_id, workflow_status,
    current_workflow_step_id, started_at, completed_at, completed_steps,
    client_id, customer_name, customer_email, customer_phone, customer_address,
    external_id, lot_film, checklist_completed, notes, tags, estimated_duration, actual_duration,
    created_at, updated_at, creator_id, created_by, updated_by, deleted_at, deleted_by, synced, last_synced_at
"#;

/// Column list for SELECT queries on tasks table with table alias prefix
///
/// This is the same as TASK_QUERY_COLUMNS but with each column prefixed with "t."
/// for use in JOIN queries.
pub const TASK_QUERY_COLUMNS_ALIASED: &str = r#"
    t.id, t.task_number, t.title, t.description, t.vehicle_plate, t.vehicle_model,
    t.vehicle_year, t.vehicle_make, t.vin, t.ppf_zones, t.custom_ppf_zones, t.status, t.priority, t.technician_id,
    t.assigned_at, t.assigned_by, t.scheduled_date, t.start_time, t.end_time,
    t.date_rdv, t.heure_rdv, t.template_id, t.workflow_id, t.workflow_status,
    t.current_workflow_step_id, t.started_at, t.completed_at, t.completed_steps,
    t.client_id, t.customer_name, t.customer_email, t.customer_phone, t.customer_address,
    t.external_id, t.lot_film, t.checklist_completed, t.notes, t.tags, t.estimated_duration, t.actual_duration,
    t.created_at, t.updated_at, t.creator_id, t.created_by, t.updated_by, t.deleted_at, t.deleted_by, t.synced, t.last_synced_at
"#;

/// Convert a string error to an AppError, inferring the appropriate error type
///
/// This helper function converts String errors from database operations,
/// validations, or other sources into appropriate AppError types.
///
/// # Arguments
/// * `error` - The error message as a string
///
/// # Returns
/// AppError with appropriate error type (Database, Validation, or Internal)
///
/// # Example
/// ```rust
/// let result: AppResult<Task> = database_operation()
///     .map_err(|e| convert_to_app_error(format!("Failed to get task: {}", e)));
/// ```
pub fn convert_to_app_error(error: String) -> AppError {
    // Database operation errors
    if error.contains("Failed to get")
        || error.contains("Failed to query")
        || error.contains("Failed to insert")
        || error.contains("Failed to update")
        || error.contains("Failed to delete")
        || error.contains("Database operation failed")
        || error.contains("query")
        || error.contains("execute")
        || error.contains("prepare")
    {
        return AppError::Database(error);
    }

    // Validation errors
    if error.contains("validation")
        || error.contains("invalid")
        || error.contains("cannot")
        || error.contains("must be")
    {
        return AppError::Validation(error);
    }

    // Default to internal error for unknown types
    AppError::Internal(error)
}

/// Calculate pagination information from total count and query parameters
///
/// # Arguments
/// * `total_count` - Total number of records matching query
/// * `page` - Current page number (1-indexed)
/// * `limit` - Number of records per page
///
/// # Returns
/// PaginationInfo with page, limit, total, and total_pages
///
/// # Example
/// ```rust
/// let pagination = calculate_pagination(100, Some(2), Some(20));
/// assert_eq!(pagination.page, 2);
/// assert_eq!(pagination.limit, 20);
/// assert_eq!(pagination.total, 100);
/// assert_eq!(pagination.total_pages, 5);
/// ```
pub fn calculate_pagination(
    total_count: i64,
    page: Option<i32>,
    limit: Option<i32>,
) -> PaginationInfo {
    let page = page.unwrap_or(1);
    let limit = limit.unwrap_or(DEFAULT_PAGE_SIZE);
    let total_pages = ((total_count as f64) / (limit as f64)).ceil() as i32;

    PaginationInfo {
        page,
        limit,
        total: total_count,
        total_pages,
    }
}

/// Calculate offset from page and limit for SQL queries
///
/// # Arguments
/// * `page` - Current page number (1-indexed)
/// * `limit` - Number of records per page
///
/// # Returns
/// Offset value for SQL LIMIT/OFFSET clause
///
/// # Example
/// ```rust
/// let offset = calculate_offset(2, 20);
/// assert_eq!(offset, 20);
/// ```
pub fn calculate_offset(page: i32, limit: i32) -> i32 {
    (page - 1) * limit
}

/// Apply query filters to a SQL WHERE clause
///
/// Builds filter conditions for task queries based on TaskQuery parameters.
/// Supports filtering by status, technician_id, client_id, and search.
///
/// # Arguments
/// * `query` - The TaskQuery containing filter criteria
/// * `table_prefix` - Optional table alias prefix (e.g., "t." for JOIN queries)
///
/// # Returns
/// A tuple containing:
/// - SQL WHERE clause conditions (empty string if no filters)
/// - Vector of parameter values for prepared statements
///
/// # Example
/// ```rust,ignore
/// let (filters, params) = apply_query_filters(&query, Some("t."));
/// let sql = format!("SELECT * FROM tasks WHERE deleted_at IS NULL{} ORDER BY created_at DESC", filters);
/// ```
pub fn apply_query_filters(query: &TaskQuery, table_prefix: Option<&str>) -> (String, Vec<String>) {
    let mut conditions: Vec<String> = Vec::new();
    let mut params: Vec<String> = Vec::new();
    let prefix = table_prefix.unwrap_or("");

    if let Some(status) = &query.status {
        conditions.push(format!("{}status = ?", prefix));
        params.push(status.to_string());
    }

    if let Some(technician_id) = &query.technician_id {
        conditions.push(format!("{}technician_id = ?", prefix));
        params.push(technician_id.clone());
    }

    if let Some(client_id) = &query.client_id {
        conditions.push(format!("{}client_id = ?", prefix));
        params.push(client_id.clone());
    }

    if let Some(search) = &query.search {
        conditions.push(format!(
            "({}title LIKE ? OR {}description LIKE ? OR {}vehicle_plate LIKE ? OR {}customer_name LIKE ?)",
            prefix, prefix, prefix, prefix
        ));
        let search_pattern = format!("%{}%", search);
        params.push(search_pattern.clone());
        params.push(search_pattern.clone());
        params.push(search_pattern.clone());
        params.push(search_pattern);
    }

    let filter_clause = if conditions.is_empty() {
        String::new()
    } else {
        format!(" AND {}", conditions.join(" AND "))
    };

    (filter_clause, params)
}
