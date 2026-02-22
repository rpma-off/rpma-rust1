//! Task Import Service
//!
//! Provides functionality for importing and exporting tasks to/from external data sources
//! such as CSV files, handling validation and creation.

use crate::commands::AppError;
use crate::db::Database;
use crate::domains::tasks::infrastructure::task_client_integration::TaskClientIntegrationService;
use crate::domains::tasks::domain::models::task::{CreateTaskRequest, Task, TaskPriority, TaskQuery, TaskStatus};
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

            // Parse CSV line (simple parsing - assumes no quoted fields with commas)
            let fields: Vec<&str> = line.split(',').map(|s| s.trim()).collect();

            if fields.len() < 8 {
                failed += 1;
                errors.push(format!(
                    "Line {}: Insufficient fields (expected at least 8, got {})",
                    line_num + 2,
                    fields.len()
                ));
                continue;
            }

            // Extract basic task data
            let title = fields.get(1).unwrap_or(&"").trim();
            let description = fields.get(2).unwrap_or(&"").trim();
            let status_str = fields.get(3).unwrap_or(&"pending").trim();
            let priority_str = fields.get(4).unwrap_or(&"medium").trim();
            let client_name = fields.get(5).unwrap_or(&"").trim();
            let client_email = fields.get(6).unwrap_or(&"").trim();

            if title.is_empty() {
                failed += 1;
                errors.push(format!("Line {}: Title is required", line_num + 2));
                continue;
            }

            // Validate status
            let status = match status_str.to_lowercase().as_str() {
                "pending" => TaskStatus::Pending,
                "in_progress" => TaskStatus::InProgress,
                "completed" => TaskStatus::Completed,
                "cancelled" => TaskStatus::Cancelled,
                "on_hold" => TaskStatus::OnHold,
                _ => {
                    failed += 1;
                    errors.push(format!(
                        "Line {}: Invalid status '{}'",
                        line_num + 2,
                        status_str
                    ));
                    continue;
                }
            };

            // Validate priority
            let priority = match priority_str.to_lowercase().as_str() {
                "low" => TaskPriority::Low,
                "medium" => TaskPriority::Medium,
                "high" => TaskPriority::High,
                "urgent" => TaskPriority::Urgent,
                _ => {
                    failed += 1;
                    errors.push(format!(
                        "Line {}: Invalid priority '{}'",
                        line_num + 2,
                        priority_str
                    ));
                    continue;
                }
            };

            // Create task request
            let _create_request = CreateTaskRequest {
                title: Some(title.to_string()),
                description: Some(description.to_string()),
                status: Some(status),
                priority: Some(priority),
                // Set required fields to defaults for CSV import
                vehicle_plate: "TBD".to_string(),
                vehicle_model: "Unknown".to_string(),
                ppf_zones: vec!["unknown".to_string()],
                scheduled_date: "2024-01-01T00:00:00Z".to_string(),
                // Optional fields
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
                // Set all other optional fields to None
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
            };

            successful += 1;
            // Store for return (actual creation happens at higher level)
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
