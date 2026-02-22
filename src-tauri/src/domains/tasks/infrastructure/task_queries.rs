//! Task queries module
//!
//! This module handles complex query building and task retrieval operations.

use crate::commands::{AppError, AppResult};
use crate::db::Database;
use crate::domains::tasks::infrastructure::task_constants::{
    apply_query_filters, calculate_offset, calculate_pagination, DEFAULT_PAGE_SIZE,
    SINGLE_TASK_TIMEOUT_SECS, TASK_LIST_TIMEOUT_SECS, TASK_QUERY_COLUMNS,
};
use crate::domains::tasks::domain::models::task::*;
use rusqlite::params;
use std::sync::Arc;

use uuid::Uuid;

/// Service for complex task queries and retrieval operations
#[derive(Debug)]
pub struct TaskQueriesService {
    db: Arc<Database>,
}

impl TaskQueriesService {
    /// Create a new TaskQueriesService instance
    pub fn new(db: Arc<Database>) -> Self {
        Self { db }
    }

    /// Get tasks with complex filtering and pagination (sync version)
    pub fn get_tasks_sync(&self, query: TaskQuery) -> Result<TaskListResponse, String> {
        let mut sql = format!(
            r#"
            SELECT{}
            FROM tasks
            WHERE deleted_at IS NULL
        "#,
            TASK_QUERY_COLUMNS
        )
        .to_string();

        let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

        // Apply filters using utility function
        let (filters, filter_params) = apply_query_filters(&query, None);
        sql.push_str(&filters);
        for param in filter_params {
            params_vec.push(Box::new(param));
        }

        // Add ordering
        sql.push_str(" ORDER BY created_at DESC");

        // Add pagination
        let page = query.page.unwrap_or(1);
        let limit = query.limit.unwrap_or(DEFAULT_PAGE_SIZE);
        let offset = calculate_offset(page, limit);

        sql.push_str(" LIMIT ? OFFSET ?");
        params_vec.push(Box::new(limit));
        params_vec.push(Box::new(offset));

        let conn = self.db.get_connection()?;
        let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;

        // Convert Box<dyn ToSql> to &dyn ToSql for parameter binding
        let params_refs: Vec<&dyn rusqlite::ToSql> =
            params_vec.iter().map(|p| p.as_ref()).collect();

        let tasks: Result<Vec<Task>, _> = stmt
            .query_map(&params_refs[..], |row| {
                Ok(Task {
                    id: row.get(0)?,
                    task_number: row.get(1)?,
                    title: row.get(2)?,
                    description: row.get(3)?,
                    vehicle_plate: row.get(4)?,
                    vehicle_model: row.get(5)?,
                    vehicle_year: row.get(6)?,
                    vehicle_make: row.get(7)?,
                    vin: row.get(8)?,
                    ppf_zones: row
                        .get::<_, Option<String>>(9)?
                        .and_then(|s| serde_json::from_str(&s).ok()),
                    custom_ppf_zones: row
                        .get::<_, Option<String>>(10)?
                        .and_then(|s| serde_json::from_str(&s).ok()),
                    status: row
                        .get::<_, String>(11)?
                        .parse::<TaskStatus>()
                        .unwrap_or(TaskStatus::Draft),
                    priority: row
                        .get::<_, String>(12)?
                        .parse::<TaskPriority>()
                        .unwrap_or(TaskPriority::Medium),
                    technician_id: row.get(13)?,
                    assigned_at: row.get(14)?,
                    assigned_by: row.get(15)?,
                    scheduled_date: row.get(16)?,
                    start_time: row.get(17)?,
                    end_time: row.get(18)?,
                    date_rdv: row.get(19)?,
                    heure_rdv: row.get(20)?,
                    template_id: row.get(21)?,
                    workflow_id: row.get(22)?,
                    workflow_status: row.get(23)?,
                    current_workflow_step_id: row.get(24)?,
                    started_at: row.get(25)?,
                    completed_at: row.get(26)?,
                    completed_steps: row.get(27)?,
                    client_id: row.get(28)?,
                    customer_name: row.get(29)?,
                    customer_email: row.get(30)?,
                    customer_phone: row.get(31)?,
                    customer_address: row.get(32)?,
                    external_id: row.get(33)?,
                    lot_film: row.get(34)?,
                    checklist_completed: row.get::<_, i32>(35)? != 0,
                    notes: row.get(36)?,
                    tags: row.get(37)?,
                    estimated_duration: row.get(38)?,
                    actual_duration: row.get(39)?,
                    created_at: row.get(40)?,
                    updated_at: row.get(41)?,
                    creator_id: row.get(42)?,
                    created_by: row.get(43)?,
                    updated_by: row.get(44)?,
                    deleted_at: row.get(45)?,
                    deleted_by: row.get(46)?,
                    synced: row.get::<_, i32>(47)? != 0,
                    last_synced_at: row.get(48)?,
                })
            })
            .map_err(|e| e.to_string())?
            .collect();
        let tasks = tasks.map_err(|e| format!("Failed to get tasks: {}", e))?;

        // Get total count for pagination
        let mut count_sql = "SELECT COUNT(*) FROM tasks WHERE deleted_at IS NULL".to_string();
        let mut count_params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

        // Apply same filters for count using utility function
        let (count_filters, count_filter_params) = apply_query_filters(&query, None);
        count_sql.push_str(&count_filters);
        for param in count_filter_params {
            count_params.push(Box::new(param));
        }

        let count_params_refs: Vec<&dyn rusqlite::ToSql> =
            count_params.iter().map(|p| p.as_ref()).collect();

        let total_count: i64 = match self
            .db
            .query_single_value(&count_sql, &count_params_refs[..])
        {
            Ok(count) => count,
            Err(e) => {
                tracing::error!("Failed to get total count: {}", e);
                0
            }
        };

        let pagination = calculate_pagination(total_count, Some(page), Some(limit));

        Ok(TaskListResponse {
            data: tasks
                .into_iter()
                .map(|task| TaskWithDetails { task })
                .collect(),
            pagination,
            statistics: None,
        })
    }

    /// Get a single task by ID (sync version for internal use)
    pub fn get_task_sync(&self, id: &str) -> Result<Option<Task>, String> {
        // Determine whether to query by id (UUID) or task_number
        let (column, value) = if Uuid::parse_str(id).is_ok() {
            ("id", id)
        } else {
            ("task_number", id)
        };

        let sql = format!(
            r#"
            SELECT{}
            FROM tasks WHERE {} = ? AND deleted_at IS NULL
            "#,
            TASK_QUERY_COLUMNS, column
        );

        self.db
            .query_single_as::<Task>(&sql, params![value])
            .map_err(|e| format!("Failed to get task: {}", e))
    }

    /// Get a single task by ID (async version)
    pub async fn get_task_async(&self, id: &str) -> Result<Option<Task>, String> {
        use tokio::time::{timeout, Duration};

        let db = self.db.clone();
        let id = id.to_string();

        let result = timeout(
            Duration::from_secs(SINGLE_TASK_TIMEOUT_SECS),
            tokio::task::spawn_blocking(move || {
                let service = TaskQueriesService { db };
                service.get_task_sync(&id)
            }),
        )
        .await;

        match result {
            Ok(Ok(task)) => Ok(task?),
            Ok(Err(e)) => Err(format!("Task retrieval failed: {}", e)),
            Err(_timeout) => Err("Task retrieval timeout".to_string()),
        }
    }

    /// Get tasks with complex filtering (async version)
    pub async fn get_tasks_async(&self, query: TaskQuery) -> Result<TaskListResponse, String> {
        use tokio::time::{timeout, Duration};

        let start_time = std::time::Instant::now();
        let db = self.db.clone();

        let result = timeout(
            Duration::from_secs(TASK_LIST_TIMEOUT_SECS),
            tokio::task::spawn_blocking(move || {
                let service = TaskQueriesService { db };
                service.get_tasks_sync(query)
            }),
        )
        .await;

        match result {
            Ok(Ok(response)) => {
                let total_time = start_time.elapsed();
                tracing::debug!(
                    "Task async query completed successfully in {:?}",
                    total_time
                );
                Ok(response?)
            }
            Ok(Err(e)) => {
                let total_time = start_time.elapsed();
                tracing::error!("Task sync query failed after {:?}: {}", total_time, e);
                Err(format!("Task list retrieval failed: {}", e))
            }
            Err(_timeout) => {
                let total_time = start_time.elapsed();
                tracing::error!("Task query timed out after {:?}", total_time);
                Err("Task list timeout".to_string())
            }
        }
    }

    /// Get all tasks assigned to a specific user
    ///
    /// Retrieves tasks assigned to a user with optional filtering by status and date range.
    ///
    /// # Arguments
    /// * `user_id` - The user ID to get assigned tasks for
    /// * `status_filter` - Optional status filter
    /// * `date_from` - Optional start date filter (YYYY-MM-DD format)
    /// * `date_to` - Optional end date filter (YYYY-MM-DD format)
    ///
    /// # Returns
    /// * `Ok(Vec<Task>)` - List of tasks assigned to the user
    /// * `Err(String)` - Error occurred during query
    pub fn get_user_assigned_tasks(
        &self,
        user_id: &str,
        status_filter: Option<TaskStatus>,
        date_from: Option<&str>,
        date_to: Option<&str>,
    ) -> AppResult<Vec<Task>> {
        let mut sql = format!(
            r#"
            SELECT{}
            FROM tasks
            WHERE technician_id = ? AND deleted_at IS NULL
        "#,
            TASK_QUERY_COLUMNS
        )
        .to_string();

        let mut params_vec = vec![user_id.to_string()];

        // Add status filter if provided
        if let Some(status) = &status_filter {
            sql.push_str(" AND status = ?");
            params_vec.push(status.to_string());
        }

        // Add date range filter if provided
        if let Some(from_date) = date_from {
            sql.push_str(" AND scheduled_date >= ?");
            params_vec.push(from_date.to_string());
        }

        if let Some(to_date) = date_to {
            sql.push_str(" AND scheduled_date <= ?");
            params_vec.push(to_date.to_string());
        }

        // Order by scheduled date, then priority
        sql.push_str(" ORDER BY scheduled_date DESC, priority DESC, created_at DESC");

        let params: Vec<&dyn rusqlite::ToSql> = params_vec
            .iter()
            .map(|s| s as &dyn rusqlite::ToSql)
            .collect();

        self.db
            .query_as::<Task>(&sql, params.as_slice())
            .map_err(|e| AppError::Database(format!("Failed to get user assigned tasks: {}", e)))
    }
}
