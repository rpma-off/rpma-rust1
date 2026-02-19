//! Task client integration module
//!
//! This module handles operations that integrate tasks with client data.

use crate::commands::AppError;
use crate::commands::AppResult;
use crate::db::Database;
use crate::models::task::*;
use crate::services::task_constants::{
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
        context.insert("page".to_string(), serde_json::json!(query.page));
        context.insert("limit".to_string(), serde_json::json!(query.limit));
        logger.debug("Getting tasks with client data", Some(context));

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

        // Apply same filters as get_tasks method using utility function
        let (filters, filter_params) = apply_query_filters(&query, Some("t."));
        sql.push_str(&filters);
        for param in filter_params {
            params_vec.push(param);
        }

        // Add ordering
        sql.push_str(" ORDER BY t.created_at DESC");

        // Add pagination
        let page = query.page.unwrap_or(1);
        let limit = query.limit.unwrap_or(DEFAULT_PAGE_SIZE);
        let offset = calculate_offset(page, limit);

        sql.push_str(" LIMIT ? OFFSET ?");
        params_vec.push(limit.to_string());
        params_vec.push(offset.to_string());

        let conn = self.db.get_connection()?;
        let mut stmt = conn.prepare(&sql)?;
        let tasks_with_clients: Result<Vec<TaskWithClient>, _> = stmt
            .query_map(rusqlite::params_from_iter(params_vec), |row| {
                // Parse task data
                let task = Task {
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
                    checklist_completed: row.get(35)?,
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
                    synced: row.get(47)?,
                    last_synced_at: row.get(48)?,
                };

                // Parse client data
                let client_info = if let Ok(client_id) = row.get::<_, String>(49) {
                    Some(ClientInfo {
                        id: client_id,
                        name: row.get(50)?,
                        email: row.get(51)?,
                        phone: row.get(52)?,
                    })
                } else {
                    None
                };

                Ok(TaskWithClient { task, client_info })
            })
            .map_err(|e| e.to_string())?
            .collect();
        let tasks_with_clients = tasks_with_clients
            .map_err(|e| AppError::Database(format!("Failed to get tasks with clients: {}", e)))?;

        // Get total count for pagination
        let mut count_sql = r#"
            SELECT COUNT(*)
            FROM tasks t
            LEFT JOIN clients c ON t.client_id = c.id
            WHERE t.deleted_at IS NULL
        "#
        .to_string();

        let mut count_params = Vec::new();

        // Apply same filters for count using utility function
        let (count_filters, count_filter_params) = apply_query_filters(&query, Some("t."));
        count_sql.push_str(&count_filters);
        for param in count_filter_params {
            count_params.push(param);
        }

        let total_count: i64 = self
            .db
            .query_single_value(&count_sql, rusqlite::params_from_iter(count_params))
            .unwrap_or(0);

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
}
