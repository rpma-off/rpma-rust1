//! # Task Service Module
//!
//! This module provides the main entry point for all task-related operations in the RPMA backend.
//! It follows a clean architecture pattern by orchestrating operations across specialized service modules.
//!
//! ## Architecture
//!
//! The TaskService acts as a facade that delegates to focused, single-responsibility services:
//!
//! - `TaskCrudService` - Core CRUD operations (create, read, update, delete)
//! - `TaskQueriesService` - Complex querying and filtering operations
//! - `TaskStatisticsService` - Statistical calculations and analytics
//! - `TaskClientIntegrationService` - Client relationship management
//!
//! ## Usage
//!
//! ```rust
//! use crate::services::task::TaskService;
//!
//! let task_service = TaskService::new(database_connection);
//!
//! // Create a new task
//! let task = task_service.create_task_async(create_request, "user-123").await?;
//!
//! // Get tasks with filtering
//! let tasks = task_service.get_tasks_async(query).await?;
//!
//! // Get statistics
//! let stats = task_service.get_task_statistics()?;
//! ```
//!
//! ## Error Handling
//!
//! All methods return `AppResult<T>` where the error is a structured `AppError`
//! suitable for API responses. Internal errors are logged but not exposed to clients.

use crate::commands::AppResult;
use crate::db::Database;
use crate::models::task::*;
use crate::services::task_client_integration::TaskClientIntegrationService;
use crate::services::task_constants::convert_to_app_error;
use crate::services::task_crud::TaskCrudService;
use crate::services::task_queries::TaskQueriesService;
use crate::services::task_statistics::TaskStatisticsService;
use crate::services::task_validation::{validate_status_transition, TaskValidationService};

use std::sync::Arc;

/// Re-export types from specialized modules for backward compatibility
pub use crate::services::task_client_integration::TaskWithClientListResponse;
pub use crate::services::task_statistics::TaskStatistics;

/// Main task service that orchestrates all task operations
///
/// This service provides a unified interface for task management while maintaining
/// separation of concerns through delegation to specialized services.
///
/// # Thread Safety
///
/// The service is not thread-safe by itself. Create separate instances for
/// different threads or use appropriate synchronization primitives.
#[derive(Debug)]
pub struct TaskService {
    /// Handles core CRUD operations (create, read, update, delete)
    crud: TaskCrudService,
    /// Handles complex querying and filtering operations
    queries: TaskQueriesService,
    /// Handles statistical calculations and analytics
    statistics: TaskStatisticsService,
    /// Handles client relationship management and integration
    client_integration: TaskClientIntegrationService,
    /// Handles task validation and assignment checks
    validation: TaskValidationService,
}

impl TaskService {
    /// Create a new TaskService instance
    ///
    /// Initializes all specialized service modules with the provided database connection.
    ///
    /// # Arguments
    /// * `db` - Database connection pool wrapped in Arc for thread-safe sharing
    ///
    /// # Returns
    /// A new TaskService instance ready for use
    ///
    /// # Example
    /// ```rust
    /// use std::sync::Arc;
    /// use crate::db::Database;
    /// use crate::services::task::TaskService;
    ///
    /// let database = Arc::new(Database::new(connection_pool));
    /// let task_service = TaskService::new(database);
    /// ```
    pub fn new(db: Arc<Database>) -> Self {
        Self {
            crud: TaskCrudService::new(db.clone()),
            queries: TaskQueriesService::new(db.clone()),
            statistics: TaskStatisticsService::new(db.clone()),
            client_integration: TaskClientIntegrationService::new(db.clone()),
            validation: TaskValidationService::new(db),
        }
    }

    /// Create a new task (async version)
    ///
    /// Creates a new task with all required fields and associates it with the specified user.
    /// Performs validation, client creation if needed, and ensures data consistency.
    ///
    /// # Arguments
    /// * `req` - Task creation request containing all task details
    /// * `user_id` - ID of the user creating the task (for audit trails)
    ///
    /// # Returns
    /// * `Ok(Task)` - The created task with generated ID and timestamps
    /// * `Err(String)` - Error message if creation fails
    ///
    /// # Business Rules
    /// - Task number must be unique
    /// - Client ID must reference an existing client (if provided)
    /// - All required fields must be present and valid
    /// - User must have appropriate permissions
    pub async fn create_task_async(
        &self,
        req: CreateTaskRequest,
        user_id: &str,
    ) -> AppResult<Task> {
        self.crud.create_task_async(req, user_id).await
    }

    /// Update an existing task (async version)
    ///
    /// Updates a task with the provided changes. Only non-null fields in the request
    /// will be updated. Performs validation and ensures data consistency.
    ///
    /// # Arguments
    /// * `req` - Update request containing task ID and fields to modify
    ///
    /// # Returns
    /// * `Ok(Task)` - The updated task with new values and timestamps
    /// * `Err(String)` - Error message if update fails
    ///
    /// # Business Rules
    /// - Task must exist
    /// - Task ID in request must match existing task
    /// - Status transitions must follow business rules
    /// - User must have appropriate permissions
    pub async fn update_task_async(
        &self,
        req: UpdateTaskRequest,
        user_id: &str,
    ) -> AppResult<Task> {
        self.crud.update_task_async(req, user_id).await
    }

    /// Get tasks with complex filtering (async version)
    ///
    /// Retrieves a paginated list of tasks with optional filtering and sorting.
    /// Supports complex queries for dashboard and management views.
    ///
    /// # Arguments
    /// * `query` - Query parameters for filtering, pagination, and sorting
    ///
    /// # Returns
    /// * `Ok(TaskListResponse)` - Paginated list of tasks matching criteria
    /// * `Err(AppError)` - Error if query fails
    ///
    /// # Query Capabilities
    /// - Status filtering (pending, in_progress, completed, etc.)
    /// - Date range filtering
    /// - Technician assignment filtering
    /// - Text search across multiple fields
    /// - Pagination with configurable page size
    pub async fn get_tasks_async(&self, query: TaskQuery) -> AppResult<TaskListResponse> {
        self.queries.get_tasks_async(query).await
            .map_err(convert_to_app_error)
    }

    pub async fn get_task_async(&self, id: &str) -> AppResult<Option<Task>> {
        self.queries.get_task_async(id).await
            .map_err(convert_to_app_error)
    }

    /// Delete a task (async version)
    ///
    /// Soft-deletes a task by marking it as deleted. The task remains in the database
    /// for audit purposes but is excluded from normal queries.
    ///
    /// # Arguments
    /// * `id` - Unique task identifier to delete
    ///
    /// # Returns
    /// * `Ok(())` - Task successfully marked as deleted
    /// * `Err(String)` - Error message if deletion fails
    ///
    /// # Business Rules
    /// - Task must exist and not already be deleted
    /// - User must have appropriate permissions
    /// - Related records may be affected based on business rules
    pub async fn delete_task_async(&self, id: &str, user_id: &str) -> AppResult<()> {
        self.crud.delete_task_async(id, user_id).await
    }

    /// Get tasks with associated client information
    ///
    /// Retrieves tasks with full client details for relationship management.
    /// Useful for client dashboards and detailed task views.
    ///
    /// # Arguments
    /// * `query` - Query parameters for filtering tasks
    ///
    /// # Returns
    /// * `Ok(TaskWithClientListResponse)` - Tasks with embedded client information
    /// * `Err(AppError)` - Error if query fails
    ///
    /// # Performance Notes
    /// This method performs JOIN operations and may be slower than basic task queries.
    /// Use appropriate indexing and consider pagination for large datasets.
    pub fn get_tasks_with_clients(
        &self,
        query: TaskQuery,
    ) -> AppResult<TaskWithClientListResponse> {
        self.client_integration.get_tasks_with_clients(query)
    }

    /// Get comprehensive task statistics
    ///
    /// Calculates various metrics about the task system including counts by status,
    /// priority distributions, and performance indicators.
    ///
    /// # Returns
    /// * `Ok(TaskStatistics)` - Complete statistics overview
    /// * `Err(AppError)` - Error if calculation fails
    ///
    /// # Included Metrics
    /// - Total task counts by status
    /// - Priority distributions
    /// - Completion rates
    /// - Average durations
    /// - Overdue task counts
    pub fn get_task_statistics(&self) -> AppResult<TaskStatistics> {
        self.statistics.get_task_statistics()
            .map_err(convert_to_app_error)
    }

    pub fn get_completion_rate(&self, days: i32) -> AppResult<f64> {
        self.statistics.get_completion_rate(days)
            .map_err(convert_to_app_error)
    }

    pub fn get_average_duration_by_status(&self) -> AppResult<Vec<(String, f64)>> {
        self.statistics.get_average_duration_by_status()
            .map_err(convert_to_app_error)
    }

    pub fn get_priority_distribution(&self) -> AppResult<Vec<(String, i64)>> {
        self.statistics.get_priority_distribution()
            .map_err(convert_to_app_error)
    }

    /// Check if a user can be assigned to a task
    ///
    /// Validates assignment eligibility including permissions, qualifications,
    /// and workload capacity.
    ///
    /// # Arguments
    /// * `task_id` - The task to check assignment for
    /// * `user_id` - The user to check assignment eligibility for
    ///
    /// # Returns
    /// * `Ok(true)` - User can be assigned to the task
    /// * `Ok(false)` - User cannot be assigned to the task
    /// * `Err(AppError)` - Error occurred during validation
    pub fn check_task_assignment(&self, task_id: &str, user_id: &str) -> AppResult<bool> {
        self.validation
            .check_assignment_eligibility(task_id, user_id)
            .map_err(convert_to_app_error)
    }

    /// Check if a task is available for assignment
    ///
    /// Validates task availability including scheduling conflicts and resource availability.
    ///
    /// # Arguments
    /// * `task_id` - The task to check availability for
    ///
    /// # Returns
    /// * `Ok(true)` - Task is available for assignment
    /// * `Ok(false)` - Task is not available for assignment
    /// * `Err(AppError)` - Error occurred during validation
    pub fn check_task_availability(&self, task_id: &str) -> AppResult<bool> {
        self.validation.check_task_availability(task_id)
            .map_err(convert_to_app_error)
    }

    /// Get all tasks assigned to a specific user
    ///
    /// Retrieves tasks assigned to a user with optional filtering by status and date range.
    ///
    /// # Arguments
    /// * `user_id` - The user ID to get assigned tasks for
    /// * `status_filter` - Optional status filter
    /// * `date_from` - Optional start date filter
    /// * `date_to` - Optional end date filter
    ///
    /// # Returns
    /// * `Ok(Vec<Task>)` - List of tasks assigned to the user
    /// * `Err(AppError)` - Error occurred during query
    pub fn get_user_assigned_tasks(
        &self,
        user_id: &str,
        status_filter: Option<TaskStatus>,
        date_from: Option<&str>,
        date_to: Option<&str>,
    ) -> AppResult<Vec<Task>> {
        self.queries
            .get_user_assigned_tasks(user_id, status_filter, date_from, date_to)
    }

    /// Validate a task assignment change
    ///
    /// Checks for conflicts when reassigning tasks between users.
    ///
    /// # Arguments
    /// * `task_id` - The task being reassigned
    /// * `old_user_id` - Current assignee (None if unassigned)
    /// * `new_user_id` - New assignee
    ///
    /// # Returns
    /// * `Ok(Vec<String>)` - List of validation warnings/conflicts (empty if valid)
    /// * `Err(AppError)` - Error occurred during validation
    pub fn validate_task_assignment_change(
        &self,
        task_id: &str,
        old_user_id: Option<&str>,
        new_user_id: &str,
    ) -> AppResult<Vec<String>> {
        self.validation
            .validate_assignment_change(task_id, old_user_id, new_user_id)
            .map_err(convert_to_app_error)
    }

    /// Check for scheduling conflicts
    pub fn check_schedule_conflicts(
        &self,
        user_id: &str,
        scheduled_date: Option<String>,
        duration: &Option<i32>,
    ) -> AppResult<bool> {
        self.validation
            .check_schedule_conflicts(user_id, scheduled_date, duration)
            .map_err(convert_to_app_error)
    }

    /// Check if task dependencies are satisfied
    pub fn check_dependencies_satisfied(&self, task_id: &str) -> AppResult<bool> {
        self.validation.check_dependencies_satisfied(task_id)
            .map_err(convert_to_app_error)
    }

    /// Validate task assignment eligibility
    pub fn validate_assignment(&self, task_id: &str, user_id: &str) -> AppResult<bool> {
        self.validation.check_assignment_eligibility(task_id, user_id)
            .map_err(convert_to_app_error)
    }

    /// Validate status transition
    ///
    /// Delegates to the centralized validation logic in task_validation module.
    /// See [`validate_status_transition`] for the complete transition rules.
    pub fn validate_status_transition(
        &self,
        current: &TaskStatus,
        new: &TaskStatus,
    ) -> Result<(), String> {
        validate_status_transition(current, new)
    }

    /// Validate task availability
    pub fn validate_availability(&self, task_id: &str) -> AppResult<bool> {
        self.validation.check_task_availability(task_id)
            .map_err(convert_to_app_error)
    }

    /// Apply role-based filters to task query
    pub fn apply_role_based_filters(
        &self,
        filter: &mut crate::commands::task_types::TaskFilter,
        session: &crate::models::auth::UserSession,
    ) {
        use crate::models::auth::UserRole;

        match session.role {
            UserRole::Admin => {
                // Admin can see all tasks
            }
            UserRole::Supervisor => {
                // Supervisor can see tasks in their regions/departments
                // TODO: Add region filtering when UserSession has region field
            }
            UserRole::Technician => {
                // Technician can only see their assigned tasks
                filter.assigned_to = Some(session.user_id.clone());
            }
            UserRole::Viewer => {
                // Viewer has limited access
                filter.assigned_to = Some(session.user_id.clone());
            }
        }
    }

    /// Import tasks from CSV
    pub async fn import_from_csv(
        &self,
        csv_data: &str,
        user_id: &str,
        update_existing: bool,
    ) -> Result<crate::services::task_import::ImportResult, crate::commands::AppError> {
        use crate::services::task_import::TaskImportService;
        let import_service = TaskImportService::new(self.crud.db.clone());
        import_service.import_from_csv(csv_data, user_id, update_existing).await
    }

    /// Export tasks to CSV
    pub fn export_to_csv(
        &self,
        tasks: &[crate::services::task_import::TaskWithClientInfo],
        include_client_data: bool,
    ) -> Result<String, crate::commands::AppError> {
        use crate::services::task_import::TaskImportService;
        let import_service = TaskImportService::new(self.crud.db.clone());
        import_service.export_to_csv(tasks, include_client_data)
    }

    /// Get tasks for export
    pub fn get_tasks_for_export(
        &self,
        query: TaskQuery,
    ) -> Result<Vec<crate::services::task_import::TaskWithClientInfo>, crate::commands::AppError> {
        use crate::services::task_import::TaskImportService;
        let import_service = TaskImportService::new(self.crud.db.clone());
        import_service.get_tasks_for_export(query)
    }
}
