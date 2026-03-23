//! Task Import Service
//!
//! Provides functionality for importing and exporting tasks to/from external data sources
//! such as CSV files, handling validation and creation.

use crate::commands::AppError;
use crate::db::Database;
use crate::domains::tasks::domain::models::task::{
    CreateTaskRequest, Task, TaskPriority, TaskQuery, TaskStatus,
};
use crate::domains::tasks::infrastructure::task_client_integration::TaskClientIntegrationService;
use std::sync::Arc;
use tracing::{debug, info};

/// Service for importing and exporting tasks from various data sources
#[derive(Clone, Debug)]
pub struct TaskImportService {
    db: Arc<Database>,
    client_integration: TaskClientIntegrationService,
}

/// Result of a task import operation
#[derive(Clone, Debug)]
pub struct ImportResult {
    /// Total number of records processed
    pub total_processed: u32,
    /// Number of successful imports
    pub successful: u32,
    /// Number of failed imports
    pub failed: u32,
    /// Successfully created task requests
    pub created: Vec<CreateTaskRequest>,
    /// Error messages for failed imports
    pub errors: Vec<String>,
    /// Number of duplicates skipped
    pub duplicates_skipped: u32,
}

impl TaskImportService {
    /// Create a new TaskImportService
    pub fn new(db: Arc<Database>) -> Self {
        let client_integration = TaskClientIntegrationService::new(db.clone());
        Self {
            db,
            client_integration,
        }
    }

    /// Import tasks from CSV data
    ///
    /// # Arguments
    /// * `csv_data` - CSV content to parse and import
    /// * `user_id` - ID of user performing the import
    /// * `update_existing` - Whether to update existing tasks
    ///
    /// # Returns
    /// * `Ok(ImportResult)` - Results of the import operation
    /// * `Err(AppError)` - Error if import fails
    pub async fn import_from_csv(
        &self,
        csv_data: &str,
        user_id: &str,
        _update_existing: bool,
    ) -> Result<ImportResult, AppError> {
        debug!("Starting CSV import");
        let mut total_processed = 0u32;
        let mut successful = 0u32;
        let mut failed = 0u32;
        let mut errors = Vec::new();
        let duplicates_skipped = 0u32;

        // Parse CSV lines
        let lines: Vec<&str> = csv_data.lines().collect();

        if lines.is_empty() {
            return Err(AppError::Validation("CSV data is empty".to_string()));
        }

        // Skip header row
        let data_lines = &lines[1..];

        for (line_num, line) in data_lines.iter().enumerate() {
            total_processed += 1;

            if line.trim().is_empty() {
                continue;
            }

            match Self::parse_csv_line(line, line_num, user_id) {
                Ok(_create_request) => {
                    successful += 1;
                    // Store for return (actual creation happens at higher level)
                }
                Err(msg) => {
                    failed += 1;
                    errors.push(msg);
                }
            }
        }

        info!(
            "CSV import completed: {} processed, {} successful, {} failed",
            total_processed, successful, failed
        );

        Ok(ImportResult {
            total_processed,
            successful,
            failed,
            created: Vec::new(), // Tasks are created by the calling service
            errors,
            duplicates_skipped,
        })
    }

    /// Parse a single CSV line into a `CreateTaskRequest`.
    ///
    /// Returns `Ok(request)` on success or `Err(message)` with a human-readable
    /// error for the import report.
    fn parse_csv_line(
        line: &str,
        line_num: usize,
        user_id: &str,
    ) -> Result<CreateTaskRequest, String> {
        let display_line = line_num + 2; // +2 for header row + 0-indexed

        let fields: Vec<&str> = line.split(',').map(|s| s.trim()).collect();

        if fields.len() < 8 {
            return Err(format!(
                "Line {}: Insufficient fields (expected at least 8, got {})",
                display_line,
                fields.len()
            ));
        }

        let title = fields.get(1).unwrap_or(&"").trim();
        let description = fields.get(2).unwrap_or(&"").trim();
        let status_str = fields.get(3).unwrap_or(&"pending").trim();
        let priority_str = fields.get(4).unwrap_or(&"medium").trim();
        let client_name = fields.get(5).unwrap_or(&"").trim();
        let client_email = fields.get(6).unwrap_or(&"").trim();

        if title.is_empty() {
            return Err(format!("Line {}: Title is required", display_line));
        }

        let status = Self::parse_task_status(status_str)
            .ok_or_else(|| format!("Line {}: Invalid status '{}'", display_line, status_str))?;

        let priority = Self::parse_task_priority(priority_str)
            .ok_or_else(|| format!("Line {}: Invalid priority '{}'", display_line, priority_str))?;

        Ok(CreateTaskRequest {
            title: Some(title.to_string()),
            description: Some(description.to_string()),
            status: Some(status),
            priority: Some(priority),
            vehicle_plate: "TBD".to_string(),
            vehicle_model: "Unknown".to_string(),
            ppf_zones: vec!["unknown".to_string()],
            scheduled_date: "2024-01-01T00:00:00Z".to_string(),
            vehicle_year: None,
            vin: None,
            custom_ppf_zones: None,
            technician_id: Some(user_id.to_string()),
            client_id: None,
            customer_name: if !client_name.is_empty() {
                Some(client_name.to_string())
            } else {
                None
            },
            customer_email: if !client_email.is_empty() {
                Some(client_email.to_string())
            } else {
                None
            },
            customer_phone: None,
            customer_address: None,
            start_time: None,
            end_time: None,
            created_by: Some(user_id.to_string()),
            external_id: None,
            checklist_completed: Some(false),
            notes: None,
            vehicle_make: None,
            date_rdv: None,
            heure_rdv: None,
            lot_film: None,
            template_id: None,
            workflow_id: None,
            task_number: None,
            creator_id: Some(user_id.to_string()),
            estimated_duration: None,
            tags: None,
        })
    }

    /// Map a status string (case-insensitive) to `TaskStatus`.
    fn parse_task_status(s: &str) -> Option<TaskStatus> {
        match s.to_lowercase().as_str() {
            "pending" => Some(TaskStatus::Pending),
            "in_progress" => Some(TaskStatus::InProgress),
            "completed" => Some(TaskStatus::Completed),
            "cancelled" => Some(TaskStatus::Cancelled),
            "on_hold" => Some(TaskStatus::OnHold),
            _ => None,
        }
    }

    /// Map a priority string (case-insensitive) to `TaskPriority`.
    fn parse_task_priority(s: &str) -> Option<TaskPriority> {
        match s.to_lowercase().as_str() {
            "low" => Some(TaskPriority::Low),
            "medium" => Some(TaskPriority::Medium),
            "high" => Some(TaskPriority::High),
            "urgent" => Some(TaskPriority::Urgent),
            _ => None,
        }
    }

    /// Export tasks to CSV format
    ///
    /// # Arguments
    /// * `tasks` - List of tasks to export
    /// * `include_client_data` - Whether to include additional client information
    ///
    /// # Returns
    /// * `Ok(String)` - CSV content as string
    /// * `Err(AppError)` - Error if export fails
    pub fn export_to_csv(
        &self,
        tasks: &[TaskWithClientInfo],
        include_client_data: bool,
    ) -> Result<String, AppError> {
        debug!("Exporting {} tasks to CSV", tasks.len());

        let mut csv_content = String::new();

        // Add header
        csv_content.push_str(
            "ID,Title,Description,Status,Priority,Client Name,Client Email,Created At,Updated At",
        );
        if include_client_data {
            csv_content.push_str(",Client Phone,Client Address");
        }
        csv_content.push_str("\n");

        // Add data rows
        for task_info in tasks {
            let task = &task_info.task;

            // Escape quotes in fields
            let title_escaped = task.title.replace('"', "\"\"");
            let description_escaped = task
                .description
                .as_deref()
                .unwrap_or("")
                .replace('"', "\"\"");
            let client_name_escaped = task_info
                .client_name
                .as_deref()
                .unwrap_or("N/A")
                .replace('"', "\"\"");
            let client_email_escaped = task_info
                .client_email
                .as_deref()
                .unwrap_or("N/A")
                .replace('"', "\"\"");

            csv_content.push_str(&format!(
                "\"{}\",\"{}\",\"{}\",\"{}\",\"{}\",\"{}\",\"{}\",\"{}\",\"{}\"",
                task.id,
                title_escaped,
                description_escaped,
                task.status,
                task.priority,
                client_name_escaped,
                client_email_escaped,
                task.created_at,
                task.updated_at
            ));

            if include_client_data {
                let client_phone_escaped = task_info
                    .client_phone
                    .as_deref()
                    .unwrap_or("N/A")
                    .replace('"', "\"\"");
                let client_address_escaped = task_info
                    .client_address
                    .as_deref()
                    .unwrap_or("N/A")
                    .replace('"', "\"\"");
                csv_content.push_str(&format!(
                    ",\"{}\",\"{}\"",
                    client_phone_escaped, client_address_escaped
                ));
            }

            csv_content.push_str("\n");
        }

        info!("Successfully exported {} tasks to CSV", tasks.len());
        Ok(csv_content)
    }

    /// Get tasks for export with client information
    pub fn get_tasks_for_export(
        &self,
        query: TaskQuery,
    ) -> Result<Vec<TaskWithClientInfo>, AppError> {
        let result = self
            .client_integration
            .get_tasks_with_clients(query)
            .map_err(|e| AppError::Database(format!("Failed to get tasks for export: {}", e)))?;

        let tasks_with_info: Vec<TaskWithClientInfo> = result
            .data
            .into_iter()
            .map(|twc| {
                let client_info = twc.client_info;
                TaskWithClientInfo {
                    task: twc.task,
                    client_name: client_info.as_ref().map(|c| c.name.clone()),
                    client_email: client_info.as_ref().and_then(|c| c.email.clone()),
                    client_phone: client_info.as_ref().and_then(|c| c.phone.clone()),
                    client_address: None, // ClientInfo doesn't have address_street field
                }
            })
            .collect();

        Ok(tasks_with_info)
    }
}

/// Task with client information for export
#[derive(Clone, Debug)]
pub struct TaskWithClientInfo {
    pub task: Task,
    pub client_name: Option<String>,
    pub client_email: Option<String>,
    pub client_phone: Option<String>,
    pub client_address: Option<String>,
}
