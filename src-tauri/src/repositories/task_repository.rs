//! Task repository implementation
//!
//! Provides consistent database access patterns for Task entities.

use crate::db::{Database, QueryBuilder};
use crate::repositories::base::{Repository, RepoResult, RepoError};
use crate::models::task::{
    PaginationInfo, SortOrder, Task, TaskListResponse, TaskQuery, TaskWithDetails,
};
use crate::repositories::base::PaginatedResult;
use async_trait::async_trait;
use rusqlite::params;
use std::sync::Arc;

/// Task repository for database operations
pub struct TaskRepository {
    db: Arc<Database>,
}

impl TaskRepository {
    /// Create a new TaskRepository
    pub fn new(db: Arc<Database>) -> Self {
        Self { db }
    }

    /// Find tasks with complex filtering and pagination
    pub async fn find_with_query(&self, query: TaskQuery) -> RepoResult<TaskListResponse> {
        let (sql, params) = self.build_task_query_sql(&query);

        // Execute query
        let tasks = self
            .db
            .query_as(&sql, rusqlite::params_from_iter(params))
            .map_err(|e| RepoError::Database(format!("Failed to query tasks: {}", e)))?;

        // Get total count
        let (count_sql, count_params) = self.build_count_query_sql(&query);
        let total_count: i64 = self
            .db
            .query_single_value(&count_sql, rusqlite::params_from_iter(count_params))
            .map_err(|e| RepoError::Database(format!("Failed to count tasks: {}", e)))?;

        let total_pages = ((total_count as f64) / (query.limit.unwrap_or(20) as f64)).ceil() as i32;

        let pagination = PaginationInfo {
            page: query.page.unwrap_or(1),
            limit: query.limit.unwrap_or(20),
            total: total_count,
            total_pages,
        };

        Ok(TaskListResponse {
            data: tasks
                .into_iter()
                .map(|task| TaskWithDetails { task })
                .collect(),
            pagination,
            statistics: None,
        })
    }

    /// Build SQL query for task retrieval
    fn build_task_query_sql(&self, query: &TaskQuery) -> (String, Vec<rusqlite::types::Value>) {
        let mut qb = QueryBuilder::new(
            r#"
            SELECT
                id, task_number, title, description, vehicle_plate, vehicle_model,
                vehicle_year, vehicle_make, vin, ppf_zones, custom_ppf_zones, status, priority, technician_id,
                assigned_at, assigned_by, scheduled_date, start_time, end_time,
                date_rdv, heure_rdv, template_id, workflow_id, workflow_status,
                current_workflow_step_id, started_at, completed_at, completed_steps,
                client_id, customer_name, customer_email, customer_phone, customer_address,
                external_id, lot_film, checklist_completed, notes, tags, estimated_duration, actual_duration,
                created_at, updated_at, creator_id, created_by, updated_by, deleted_at, deleted_by, synced, last_synced_at
            FROM tasks
            WHERE deleted_at IS NULL
            "#,
        );

        // Apply filters
        if let Some(status) = &query.status {
            qb = qb.and("status = ?").param(status.to_string());
        }

        if let Some(technician_id) = &query.technician_id {
            qb = qb.and("technician_id = ?").param(technician_id.clone());
        }

        if let Some(client_id) = &query.client_id {
            qb = qb.and("client_id = ?").param(client_id.clone());
        }

        if let Some(search) = &query.search {
            qb = qb
                .and("(title LIKE ? OR task_number LIKE ? OR customer_name LIKE ?)")
                .param(format!("%{}%", search))
                .param(format!("%{}%", search))
                .param(format!("%{}%", search));
        }

        // Apply sorting
        let sort_by = &query.sort_by;
        let sort_order = match query.sort_order {
            SortOrder::Asc => "asc",
            SortOrder::Desc => "desc",
        };
        qb = qb.order_by(sort_by, sort_order);

        // Apply pagination
        if let Some(limit) = query.limit {
            qb = qb.limit(limit as i64);
        }

        if let Some(page) = query.page {
            let offset = (page - 1) * query.limit.unwrap_or(20);
            qb = qb.offset(offset as i64);
        }

        qb.build()
    }

    /// Build SQL query for count
    fn build_count_query_sql(&self, query: &TaskQuery) -> (String, Vec<rusqlite::types::Value>) {
        let mut qb = QueryBuilder::new("SELECT COUNT(*) FROM tasks WHERE deleted_at IS NULL");

        // Apply same filters
        if let Some(status) = &query.status {
            qb = qb.and("status = ?").param(status.to_string());
        }

        if let Some(technician_id) = &query.technician_id {
            qb = qb.and("technician_id = ?").param(technician_id.clone());
        }

        if let Some(client_id) = &query.client_id {
            qb = qb.and("client_id = ?").param(client_id.clone());
        }

        if let Some(search) = &query.search {
            qb = qb
                .and("(title LIKE ? OR task_number LIKE ? OR customer_name LIKE ?)")
                .param(format!("%{}%", search))
                .param(format!("%{}%", search))
                .param(format!("%{}%", search));
        }

        qb.build()
    }
}

#[async_trait]
impl Repository<Task, String> for TaskRepository {
    async fn find_by_id(&self, id: String) -> RepoResult<Option<Task>> {
        self.db.query_single_as(
            r#"
            SELECT
                id, task_number, title, description, vehicle_plate, vehicle_model,
                vehicle_year, vehicle_make, vin, ppf_zones, custom_ppf_zones, status, priority, technician_id,
                assigned_at, assigned_by, scheduled_date, start_time, end_time,
                date_rdv, heure_rdv, template_id, workflow_id, workflow_status,
                current_workflow_step_id, started_at, completed_at, completed_steps,
                client_id, customer_name, customer_email, customer_phone, customer_address,
                external_id, lot_film, checklist_completed, notes, tags, estimated_duration, actual_duration,
                created_at, updated_at, creator_id, created_by, updated_by, deleted_at, deleted_by, synced, last_synced_at
            FROM tasks
            WHERE id = ? AND deleted_at IS NULL
            "#,
            params![id]
        ).map_err(|e| RepoError::Database(format!("Failed to find task by id: {}", e)))
    }

    async fn find_all(&self) -> RepoResult<Vec<Task>> {
        self.db.query_as(
            r#"
            SELECT
                id, task_number, title, description, vehicle_plate, vehicle_model,
                vehicle_year, vehicle_make, vin, ppf_zones, custom_ppf_zones, status, priority, technician_id,
                assigned_at, assigned_by, scheduled_date, start_time, end_time,
                date_rdv, heure_rdv, template_id, workflow_id, workflow_status,
                current_workflow_step_id, started_at, completed_at, completed_steps,
                client_id, customer_name, customer_email, customer_phone, customer_address,
                external_id, lot_film, checklist_completed, notes, tags, estimated_duration, actual_duration,
                created_at, updated_at, creator_id, created_by, updated_by, deleted_at, deleted_by, synced, last_synced_at
            FROM tasks
            WHERE deleted_at IS NULL
            ORDER BY created_at DESC
            "#,
            []
        ).map_err(|e| RepoError::Database(format!("Failed to find all tasks: {}", e)))
    }

    async fn save(&self, _entity: Task) -> RepoResult<Task> {
        // For tasks, save operations should go through the TaskService which handles
        // complex business logic, validation, and audit trails.
        // The repository layer is primarily for queries.
        Err(RepoError::Validation("Task save operations must be performed through TaskService for proper validation and business logic".to_string()))
    }

    async fn delete_by_id(&self, id: String) -> RepoResult<bool> {
        let rows_affected = self.db.execute(
            "UPDATE tasks SET deleted_at = (unixepoch() * 1000), updated_at = (unixepoch() * 1000) WHERE id = ? AND deleted_at IS NULL",
            params![id]
        ).map_err(|e| RepoError::Database(format!("Failed to delete task: {}", e)))?;

        Ok(rows_affected > 0)
    }

    async fn exists_by_id(&self, id: String) -> RepoResult<bool> {
        let count: i64 = self
            .db
            .query_single_value(
                "SELECT COUNT(*) FROM tasks WHERE id = ? AND deleted_at IS NULL",
                params![id],
            )
            .map_err(|e| RepoError::Database(format!("Failed to check task existence: {}", e)))?;

        Ok(count > 0)
    }
}
