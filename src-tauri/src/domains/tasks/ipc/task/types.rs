//! Task IPC request/response types
//!
//! All DTO structs for task IPC commands live here, keeping `facade.rs`
//! focused purely on command dispatch logic.

use crate::domains::tasks::ipc::task_types::TaskFilter;
use serde::{Deserialize, Serialize};
use std::fmt::Debug;

/// Task CRUD request (dispatched by action enum)
#[derive(Deserialize, Debug)]
pub struct TaskCrudRequest {
    pub action: crate::commands::TaskAction,
    pub session_token: String,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Request for editing a task
#[derive(Deserialize, Debug)]
pub struct EditTaskRequest {
    pub session_token: String,
    pub task_id: String,
    pub data: crate::domains::tasks::domain::models::task::UpdateTaskRequest,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Request for adding a note to a task
#[derive(Deserialize, Debug)]
pub struct AddTaskNoteRequest {
    pub session_token: String,
    pub task_id: String,
    pub note: String,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Request for sending a message related to a task
#[derive(Deserialize, Debug)]
pub struct SendTaskMessageRequest {
    pub session_token: String,
    pub task_id: String,
    pub message: String,
    pub message_type: Option<String>, // "info", "warning", "urgent", etc.
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Request for delaying/rescheduling a task
#[derive(Deserialize, Debug)]
pub struct DelayTaskRequest {
    pub session_token: String,
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
pub struct ReportTaskIssueRequest {
    pub session_token: String,
    pub task_id: String,
    pub issue_type: String,
    pub description: String,
    pub severity: Option<String>, // "low", "medium", "high", "critical"
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Request for exporting tasks to CSV
#[derive(Deserialize, Debug)]
pub struct ExportTasksCsvRequest {
    pub session_token: String,
    pub filter: Option<TaskFilter>,
    pub include_client_data: Option<bool>,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Request for bulk importing tasks
#[derive(Deserialize, Debug)]
pub struct ImportTasksBulkRequest {
    pub session_token: String,
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
