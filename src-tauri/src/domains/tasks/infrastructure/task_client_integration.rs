//! Task client integration module
//!
//! This module handles operations that integrate tasks with client data.

use crate::commands::AppError;
use crate::commands::AppResult;
use crate::db::{Database, FromSqlRow};
use crate::domains::tasks::domain::models::task::*;
use crate::domains::tasks::infrastructure::task_constants::{
    apply_query_filters, calculate_offset, calculate_pagination, DEFAULT_PAGE_SIZE,
    TASK_QUERY_COLUMNS_ALIASED,
};

use serde::Serialize;
use std::sync::Arc;

/// Client information for task queries
#[derive(Debug, Serialize)]
pub struct ClientInfo {
    pub id: String,
    pub name: String,
    pub email: Option<String>,
    pub phone: Option<String>,
}

/// Task with associated client information
#[derive(Debug, Serialize)]
pub struct TaskWithClient {
    pub task: Task,
    pub client_info: Option<ClientInfo>,
}

/// Response for tasks with client data
#[derive(Debug, Serialize)]
pub struct TaskWithClientListResponse {
    pub data: Vec<TaskWithClient>,
    pub pagination: PaginationInfo,
}

/// Service for task-client integration operations
#[derive(Debug, Clone)]
pub struct TaskClientIntegrationService {
    db: Arc<Database>,
}

impl TaskClientIntegrationService {
    /// Create a new TaskClientIntegrationService instance
    pub fn new(db: Arc<Database>) -> Self {
        Self { db }
    }

    /// Get tasks with associated client information
    pub fn get_tasks_with_clients(
        &self,
        query: TaskQuery,
    ) -> AppResult<TaskWithClientListResponse> {
        use crate::logging::{LogDomain, ServiceLogger};
        use std::collections::HashMap;

        // Create logger with correlation context from thread-local storage
        let logger = ServiceLogger::new(LogDomain::Task);

        let mut context = HashMap::new();
        context.insert("page".to_string(), serde_json::json!(query.pagination.page));
        context.insert(
            "limit".to_string(),
            serde_json::json!(query.pagination.page_size),
        );
        logger.debug("Getting tasks with client data", Some(context));

        let (sql, params_vec) = Self::build_tasks_with_clients_query(&query);

        let conn = self.db.get_connection()?;
        let mut stmt = conn.prepare(&sql)?;
        let tasks_with_clients: Result<Vec<TaskWithClient>, _> = stmt
            .query_map(rusqlite::params_from_iter(&params_vec), |row| {
                let task = Task::from_row(row)?;
                let client_info = Self::map_client_info_from_row(row)?;
                Ok(TaskWithClient { task, client_info })
            })
            .map_err(|e| e.to_string())?
            .collect();
        let tasks_with_clients = tasks_with_clients
            .map_err(|e| AppError::Database(format!("Failed to get tasks with clients: {}", e)))?;

        let total_count = self.count_tasks_with_clients(&query);
        let page = query.pagination.page();
        let limit = query.pagination.page_size();
        let pagination = calculate_pagination(total_count, Some(page), Some(limit));

        // Log successful retrieval
        let mut log_context = HashMap::new();
        log_context.insert(
            "task_count".to_string(),
            serde_json::json!(tasks_with_clients.len()),
        );
        log_context.insert("page".to_string(), serde_json::json!(page));
        log_context.insert("total_count".to_string(), serde_json::json!(total_count));
        logger.info(
            "Tasks with client data retrieved successfully",
            Some(log_context),
        );

        Ok(TaskWithClientListResponse {
            data: tasks_with_clients,
            pagination,
        })
    }

    /// Build the SELECT query and parameter list for `get_tasks_with_clients`.
    fn build_tasks_with_clients_query(query: &TaskQuery) -> (String, Vec<String>) {
        let mut sql = format!(
            r#"
            SELECT{},
                c.id as client_id, c.name as client_name, c.email as client_email, c.phone as client_phone
            FROM tasks t
            LEFT JOIN clients c ON t.client_id = c.id
            WHERE t.deleted_at IS NULL
        "#,
            TASK_QUERY_COLUMNS_ALIASED
        ).to_string();

        let mut params_vec = Vec::new();

        let (filters, filter_params) = apply_query_filters(query, Some("t."));
        sql.push_str(&filters);
        for param in filter_params {
            params_vec.push(param);
        }

        sql.push_str(" ORDER BY t.created_at DESC");

        let page = query.pagination.page();
        let limit = query.pagination.page_size();
        let offset = calculate_offset(page, limit);

        sql.push_str(" LIMIT ? OFFSET ?");
        params_vec.push(limit.to_string());
        params_vec.push(offset.to_string());

        (sql, params_vec)
    }

    /// Extract optional `ClientInfo` from columns appended after the task columns.
    fn map_client_info_from_row(row: &rusqlite::Row<'_>) -> Result<Option<ClientInfo>, rusqlite::Error> {
        if let Ok(client_id) = row.get::<_, String>(49) {
            Ok(Some(ClientInfo {
                id: client_id,
                name: row.get(50)?,
                email: row.get(51)?,
                phone: row.get(52)?,
            }))
        } else {
            Ok(None)
        }
    }

    /// Return the total count of tasks matching the query filters (for pagination).
    fn count_tasks_with_clients(&self, query: &TaskQuery) -> i64 {
        let mut count_sql = r#"
            SELECT COUNT(*)
            FROM tasks t
            LEFT JOIN clients c ON t.client_id = c.id
            WHERE t.deleted_at IS NULL
        "#
        .to_string();

        let mut count_params = Vec::new();

        let (count_filters, count_filter_params) = apply_query_filters(query, Some("t."));
        count_sql.push_str(&count_filters);
        for param in count_filter_params {
            count_params.push(param);
        }

        self.db
            .query_single_value(&count_sql, rusqlite::params_from_iter(count_params))
            .unwrap_or(0)
    }
}
