//! Task queries module
//!
//! This module handles complex query building and task retrieval operations.

use crate::commands::{AppError, AppResult};
use crate::db::{Database, FromSqlRow};
use crate::domains::tasks::domain::models::task::*;
use crate::domains::tasks::infrastructure::task_constants::{
    apply_query_filters, calculate_offset, calculate_pagination, DEFAULT_PAGE_SIZE,
    SINGLE_TASK_TIMEOUT_SECS, TASK_LIST_TIMEOUT_SECS, TASK_QUERY_COLUMNS,
};
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

    // DEBT: Duplicated filter logic — `get_tasks_sync` (83 lines) still rebuilds the same
    // filter SQL twice (once for the data query, once for the COUNT query).
    // Rationale: adding a filter requires updating two call-sites; easy to miss the count query.
    // Next step: unify data + count queries into a single `fn filtered_task_query(query) -> (sql, params)`
    // that returns both the data SQL and count SQL from one filter pass.
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
        let page = query.pagination.page();
        let limit = query.pagination.page_size();
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
                Task::from_row(row)
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
