//! Task client integration module
//!
//! This module handles operations that integrate tasks with client data.

use crate::db::Database;
use crate::models::task::*;

use serde::Serialize;
use std::sync::Arc;
use tracing::debug;

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
    ) -> Result<TaskWithClientListResponse, String> {
        debug!("TaskClientIntegrationService: getting tasks with client data");

        let mut sql = r#"
            SELECT
                t.id, t.task_number, t.title, t.description, t.vehicle_plate, t.vehicle_model,
                t.vehicle_year, t.vehicle_make, t.vin, t.ppf_zones, t.custom_ppf_zones, t.status, t.priority, t.technician_id,
                t.assigned_at, t.assigned_by, t.scheduled_date, t.start_time, t.end_time,
                t.date_rdv, t.heure_rdv, t.template_id, t.workflow_id, t.workflow_status,
                t.current_workflow_step_id, t.started_at, t.completed_at, t.completed_steps,
                t.client_id, t.customer_name, t.customer_email, t.customer_phone, t.customer_address,
                t.external_id, t.lot_film, t.checklist_completed, t.notes, t.tags, t.estimated_duration, t.actual_duration,
                t.created_at, t.updated_at, t.creator_id, t.created_by, t.updated_by, t.deleted_at, t.deleted_by, t.synced, t.last_synced_at,
                c.id as client_id, c.name as client_name, c.email as client_email, c.phone as client_phone
            FROM tasks t
            LEFT JOIN clients c ON t.client_id = c.id
            WHERE t.deleted_at IS NULL
        "#.to_string();

        let mut params_vec = Vec::new();

        // Apply same filters as get_tasks method
        if let Some(status) = &query.status {
            sql.push_str(" AND t.status = ?");
            params_vec.push(status.to_string());
        }

        if let Some(technician_id) = &query.technician_id {
            sql.push_str(" AND t.technician_id = ?");
            params_vec.push(technician_id.clone());
        }

        if let Some(client_id) = &query.client_id {
            sql.push_str(" AND t.client_id = ?");
            params_vec.push(client_id.clone());
        }

        if let Some(search) = &query.search {
            sql.push_str(" AND (t.title LIKE ? OR t.description LIKE ? OR t.vehicle_plate LIKE ? OR t.customer_name LIKE ?)");
            let search_pattern = format!("%{}%", search);
            params_vec.push(search_pattern.clone());
            params_vec.push(search_pattern.clone());
            params_vec.push(search_pattern.clone());
            params_vec.push(search_pattern);
        }

        // Add ordering
        sql.push_str(" ORDER BY t.created_at DESC");

        // Add pagination
        let page = query.page.unwrap_or(1);
        let limit = query.limit.unwrap_or(20);
        let offset = (page - 1) * limit;

        sql.push_str(" LIMIT ? OFFSET ?");
        params_vec.push(limit.to_string());
        params_vec.push(offset.to_string());

        let conn = self.db.get_connection()?;
        let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
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
        let tasks_with_clients =
            tasks_with_clients.map_err(|e| format!("Failed to get tasks with clients: {}", e))?;

        // Get total count for pagination
        let mut count_sql = r#"
            SELECT COUNT(*)
            FROM tasks t
            LEFT JOIN clients c ON t.client_id = c.id
            WHERE t.deleted_at IS NULL
        "#
        .to_string();

        let mut count_params = Vec::new();

        // Apply same filters for count
        if let Some(status) = &query.status {
            count_sql.push_str(" AND t.status = ?");
            count_params.push(status.to_string());
        }

        if let Some(technician_id) = &query.technician_id {
            count_sql.push_str(" AND t.technician_id = ?");
            count_params.push(technician_id.clone());
        }

        if let Some(client_id) = &query.client_id {
            count_sql.push_str(" AND t.client_id = ?");
            count_params.push(client_id.clone());
        }

        if let Some(search) = &query.search {
            count_sql.push_str(" AND (t.title LIKE ? OR t.description LIKE ? OR t.vehicle_plate LIKE ? OR t.customer_name LIKE ?)");
            let search_pattern = format!("%{}%", search);
            count_params.push(search_pattern.clone());
            count_params.push(search_pattern.clone());
            count_params.push(search_pattern.clone());
            count_params.push(search_pattern);
        }

        let total_count: i64 = self
            .db
            .query_single_value(&count_sql, rusqlite::params_from_iter(count_params))
            .unwrap_or(0);

        let total_pages = ((total_count as f64) / (limit as f64)).ceil() as i32;

        let pagination = PaginationInfo {
            page,
            limit,
            total: total_count,
            total_pages,
        };

        Ok(TaskWithClientListResponse {
            data: tasks_with_clients,
            pagination,
        })
    }
}
