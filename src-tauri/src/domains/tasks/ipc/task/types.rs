//! Task IPC request/response types
//!
//! All DTO structs for task IPC commands live here, keeping `facade.rs`
//! focused purely on command dispatch logic.

use crate::domains::tasks::ipc::task_types::TaskFilter;
use serde::{Deserialize, Serialize};
use std::fmt::Debug;

/// Task CRUD request (dispatched by action enum)
#[derive(Deserialize, Debug)]
#[serde(deny_unknown_fields)]
pub struct TaskCrudRequest {
    pub action: crate::commands::TaskAction,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Request for editing a task
#[derive(Deserialize, Debug)]
#[serde(deny_unknown_fields)]
pub struct EditTaskRequest {
    pub task_id: String,
    pub data: crate::domains::tasks::domain::models::task::UpdateTaskRequest,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Request for adding a note to a task
#[derive(Deserialize, Debug)]
#[serde(deny_unknown_fields)]
pub struct AddTaskNoteRequest {
    pub task_id: String,
    pub note: String,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Request for sending a message related to a task
#[derive(Deserialize, Debug)]
#[serde(deny_unknown_fields)]
pub struct SendTaskMessageRequest {
    pub task_id: String,
    pub message: String,
    pub message_type: Option<String>, // "info", "warning", "urgent", etc.
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Request for delaying/rescheduling a task
#[derive(Deserialize, Debug)]
#[serde(deny_unknown_fields)]
pub struct DelayTaskRequest {
    pub task_id: String,
    pub new_scheduled_date: String, // New scheduled date
    pub reason: String,             // Reason for delay
    #[serde(default)]
    pub additional_notes: Option<String>, // Optional additional notes
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Request for reporting an issue with a task
#[derive(Deserialize, Debug)]
#[serde(deny_unknown_fields)]
pub struct ReportTaskIssueRequest {
    pub task_id: String,
    pub issue_type: String,
    pub description: String,
    pub severity: Option<String>, // "low", "medium", "high", "critical"
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Request for exporting tasks to CSV
#[derive(Deserialize, Debug)]
#[serde(deny_unknown_fields)]
pub struct ExportTasksCsvRequest {
    pub filter: Option<TaskFilter>,
    pub include_client_data: Option<bool>,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Request for bulk importing tasks
#[derive(Deserialize, Debug)]
#[serde(deny_unknown_fields)]
pub struct ImportTasksBulkRequest {
    pub csv_data: String,
    pub update_existing: Option<bool>,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Response for bulk import operation
#[derive(Serialize, Debug)]
pub struct BulkImportResponse {
    pub total_processed: u32,
    pub successful: u32,
    pub failed: u32,
    pub errors: Vec<String>,
    pub duplicates_skipped: u32,
}
