//! Task model - Represents a work task/intervention request
//!
//! This module defines the Task entity and related types for task management.

use crate::db::FromSqlRow;
use crate::models::common::{serialize_optional_timestamp, serialize_timestamp};

use rusqlite::Row;
use serde::{Deserialize, Serialize};
// Conditional import removed
use ts_rs::TS;

/// Task status enumeration
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
#[derive(TS)]
#[ts(export)]
pub enum TaskStatus {
    #[serde(rename = "draft")]
    #[default]
    Draft,
    #[serde(rename = "scheduled")]
    Scheduled,
    #[serde(rename = "in_progress")]
    InProgress,
    #[serde(rename = "completed")]
    Completed,
    #[serde(rename = "cancelled")]
    Cancelled,
    #[serde(rename = "on_hold")]
    OnHold,
    #[serde(rename = "pending")]
    Pending,
    #[serde(rename = "invalid")]
    Invalid,
    #[serde(rename = "archived")]
    Archived,
    #[serde(rename = "failed")]
    Failed,
    #[serde(rename = "overdue")]
    Overdue,
    #[serde(rename = "assigned")]
    Assigned,
    #[serde(rename = "paused")]
    Paused,
}

impl std::fmt::Display for TaskStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = match self {
            Self::Draft => "draft",
            Self::Scheduled => "scheduled",
            Self::InProgress => "in_progress",
            Self::Completed => "completed",
            Self::Cancelled => "cancelled",
            Self::OnHold => "on_hold",
            Self::Pending => "pending",
            Self::Invalid => "invalid",
            Self::Archived => "archived",
            Self::Failed => "failed",
            Self::Overdue => "overdue",
            Self::Assigned => "assigned",
            Self::Paused => "paused",
        };
        write!(f, "{}", s)
    }
}

impl std::str::FromStr for TaskStatus {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "draft" => Ok(Self::Draft),
            "scheduled" => Ok(Self::Scheduled),
            "in_progress" => Ok(Self::InProgress),
            "completed" => Ok(Self::Completed),
            "cancelled" => Ok(Self::Cancelled),
            "on_hold" => Ok(Self::OnHold),
            "pending" => Ok(Self::Pending),
            "invalid" => Ok(Self::Invalid),
            "archived" => Ok(Self::Archived),
            "failed" => Ok(Self::Failed),
            "overdue" => Ok(Self::Overdue),
            "assigned" => Ok(Self::Assigned),
            "paused" => Ok(Self::Paused),
            _ => Err(format!("Unknown task status: {}", s)),
        }
    }
}

/// Task priority enumeration
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
#[derive(TS)]
#[ts(export)]
pub enum TaskPriority {
    #[serde(rename = "low")]
    Low,
    #[serde(rename = "medium")]
    #[default]
    Medium,
    #[serde(rename = "high")]
    High,
    #[serde(rename = "urgent")]
    Urgent,
}

impl std::fmt::Display for TaskPriority {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = match self {
            Self::Low => "low",
            Self::Medium => "medium",
            Self::High => "high",
            Self::Urgent => "urgent",
        };
        write!(f, "{}", s)
    }
}

impl std::str::FromStr for TaskPriority {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "low" => Ok(Self::Low),
            "medium" => Ok(Self::Medium),
            "high" => Ok(Self::High),
            "urgent" => Ok(Self::Urgent),
            _ => Err(format!("Unknown task priority: {}", s)),
        }
    }
}

/// Sort order for queries
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[derive(TS)]
pub enum SortOrder {
    #[serde(rename = "asc")]
    Asc,
    #[serde(rename = "desc")]
    Desc,
}

impl std::fmt::Display for SortOrder {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = match self {
            Self::Asc => "asc",
            Self::Desc => "desc",
        };
        write!(f, "{}", s)
    }
}

/// Main Task entity
#[derive(Debug, Clone, Serialize, Deserialize)]
#[derive(TS)]
pub struct Task {
    // Identifiers
    pub id: String,
    pub task_number: String,

    // Basic information
    pub title: String,
    pub description: Option<String>,

    // Vehicle information
    pub vehicle_plate: Option<String>,
    pub vehicle_model: Option<String>,
    pub vehicle_year: Option<String>, // String to match frontend type
    pub vehicle_make: Option<String>,
    pub vin: Option<String>,

    // PPF specific
    pub ppf_zones: Option<Vec<String>>, // JSON array of PPF zones
    pub custom_ppf_zones: Option<Vec<String>>, // JSON array of custom PPF zones

    // Status and priority
    pub status: TaskStatus,
    pub priority: TaskPriority,

    // Assignment
    pub technician_id: Option<String>,
    #[serde(serialize_with = "serialize_optional_timestamp")]
    #[ts(type = "string | null")]
    pub assigned_at: Option<i64>,
    pub assigned_by: Option<String>,

    // Scheduling
    pub scheduled_date: Option<String>,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub date_rdv: Option<String>,
    pub heure_rdv: Option<String>,

    // Workflow
    pub template_id: Option<String>,
    pub workflow_id: Option<String>,
    pub workflow_status: Option<String>,
    pub current_workflow_step_id: Option<String>,
    #[serde(serialize_with = "serialize_optional_timestamp")]
    #[ts(type = "string | null")]
    pub started_at: Option<i64>,
    #[serde(serialize_with = "serialize_optional_timestamp")]
    #[ts(type = "string | null")]
    pub completed_at: Option<i64>,
    pub completed_steps: Option<String>,

    // Client information
    pub client_id: Option<String>,
    pub customer_name: Option<String>,
    pub customer_email: Option<String>,
    pub customer_phone: Option<String>,
    pub customer_address: Option<String>,

    // Additional fields
    pub external_id: Option<String>,
    pub lot_film: Option<String>,
    pub checklist_completed: bool,
    pub notes: Option<String>,
    pub tags: Option<String>,
    pub estimated_duration: Option<i32>,
    pub actual_duration: Option<i32>,

    // Audit fields
    #[serde(serialize_with = "serialize_timestamp")]
    #[ts(type = "string")]
    pub created_at: i64,
    #[serde(serialize_with = "serialize_timestamp")]
    #[ts(type = "string")]
    pub updated_at: i64,
    pub creator_id: Option<String>,
    pub created_by: Option<String>,
    pub updated_by: Option<String>,
    #[serde(serialize_with = "serialize_optional_timestamp")]
    #[ts(type = "string | null")]
    pub deleted_at: Option<i64>,
    pub deleted_by: Option<String>,
    pub synced: bool,
    #[serde(serialize_with = "serialize_optional_timestamp")]
    #[ts(type = "string | null")]
    pub last_synced_at: Option<i64>,
}

/// Task photo information
#[derive(Debug, Clone, Serialize, Deserialize)]
#[derive(TS)]
pub struct TaskPhoto {
    pub id: String,
    pub task_id: String,
    pub photo_type: String, // "before", "after", "during"
    pub file_path: String,
    pub file_size: i64,
    pub mime_type: String,
    pub url: String,
    pub description: Option<String>,
    pub taken_at: Option<i64>,
    pub created_at: i64,
}

/// Task with full details including related data
#[derive(Debug, Clone, Serialize, Deserialize)]
#[derive(TS)]
pub struct TaskWithDetails {
    #[serde(flatten)]
    pub task: Task,
}

/// Assignment status for task assignment validation
#[derive(Debug, Clone, Serialize, Deserialize)]
#[derive(TS)]
pub enum AssignmentStatus {
    #[serde(rename = "assigned")]
    Assigned,
    #[serde(rename = "available")]
    Available,
    #[serde(rename = "restricted")]
    Restricted,
    #[serde(rename = "unavailable")]
    Unavailable,
}

impl std::fmt::Display for AssignmentStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = match self {
            Self::Assigned => "assigned",
            Self::Available => "available",
            Self::Restricted => "restricted",
            Self::Unavailable => "unavailable",
        };
        write!(f, "{}", s)
    }
}

/// Availability status for task availability checks
#[derive(Debug, Clone, Serialize, Deserialize)]
#[derive(TS)]
pub enum AvailabilityStatus {
    #[serde(rename = "available")]
    Available,
    #[serde(rename = "unavailable")]
    Unavailable,
    #[serde(rename = "locked")]
    Locked,
    #[serde(rename = "scheduled_conflict")]
    ScheduledConflict,
    #[serde(rename = "material_unavailable")]
    MaterialUnavailable,
}

impl std::fmt::Display for AvailabilityStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = match self {
            Self::Available => "available",
            Self::Unavailable => "unavailable",
            Self::Locked => "locked",
            Self::ScheduledConflict => "scheduled_conflict",
            Self::MaterialUnavailable => "material_unavailable",
        };
        write!(f, "{}", s)
    }
}

/// Validation result for assignment changes
#[derive(Debug, Clone, Serialize, Deserialize)]
#[derive(TS)]
pub struct ValidationResult {
    pub is_valid: bool,
    pub warnings: Vec<String>,
    pub errors: Vec<String>,
}

/// Response for task assignment check
#[derive(Debug, Clone, Serialize, Deserialize)]
#[derive(TS)]
pub struct AssignmentCheckResponse {
    pub task_id: String,
    pub user_id: String,
    pub status: AssignmentStatus,
    pub reason: Option<String>,
}

/// Response for task availability check
#[derive(Debug, Clone, Serialize, Deserialize)]
#[derive(TS)]
pub struct AvailabilityCheckResponse {
    pub task_id: String,
    pub status: AvailabilityStatus,
    pub reason: Option<String>,
}

/// Request for creating a new task
#[derive(Debug, Clone, Serialize, Deserialize)]
#[derive(TS)]
pub struct CreateTaskRequest {
    // Required fields (matching migrate CreateTaskSchema)
    pub vehicle_plate: String,
    pub vehicle_model: String,
    pub ppf_zones: Vec<String>,
    pub scheduled_date: String,

    // Optional fields
    pub external_id: Option<String>,
    pub status: Option<TaskStatus>,
    pub technician_id: Option<String>,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub checklist_completed: Option<bool>,
    #[serde(alias = "note")]
    pub notes: Option<String>,

    // Additional fields for frontend compatibility
    pub title: Option<String>,
    pub vehicle_make: Option<String>,
    pub vehicle_year: Option<String>, // Standardized to string for consistency
    pub vin: Option<String>,
    pub date_rdv: Option<String>,
    pub heure_rdv: Option<String>,
    pub lot_film: Option<String>,
    pub customer_name: Option<String>,
    pub customer_email: Option<String>,
    pub customer_phone: Option<String>,
    pub customer_address: Option<String>,
    pub custom_ppf_zones: Option<Vec<String>>,
    pub template_id: Option<String>,
    pub workflow_id: Option<String>,
    pub task_number: Option<String>,
    pub creator_id: Option<String>,
    pub created_by: Option<String>,

    // Legacy fields for compatibility
    pub description: Option<String>,
    pub priority: Option<TaskPriority>,
    pub client_id: Option<String>,
    pub estimated_duration: Option<i32>,
    pub tags: Option<String>, // JSON string of tags
}

/// Request for updating a task
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[derive(TS)]
pub struct UpdateTaskRequest {
    pub id: Option<String>,
    pub title: Option<String>,
    pub description: Option<String>,
    pub priority: Option<TaskPriority>,
    pub status: Option<TaskStatus>,
    pub vehicle_plate: Option<String>,
    pub vehicle_model: Option<String>,
    pub vehicle_year: Option<String>, // String to match frontend type
    pub vehicle_make: Option<String>,
    pub vin: Option<String>,
    pub ppf_zones: Option<Vec<String>>,
    pub custom_ppf_zones: Option<Vec<String>>,
    pub client_id: Option<String>,
    pub customer_name: Option<String>,
    pub customer_email: Option<String>,
    pub customer_phone: Option<String>,
    pub customer_address: Option<String>,
    pub external_id: Option<String>,
    pub lot_film: Option<String>,
    pub checklist_completed: Option<bool>,
    pub scheduled_date: Option<String>,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub date_rdv: Option<String>,
    pub heure_rdv: Option<String>,
    pub template_id: Option<String>,
    pub workflow_id: Option<String>,
    pub estimated_duration: Option<i32>,
    pub notes: Option<String>,
    pub tags: Option<String>, // JSON string of tags
    pub technician_id: Option<String>,
}

/// Request for deleting a task
#[derive(Debug, Clone, Serialize, Deserialize)]
#[derive(TS)]
pub struct DeleteTaskRequest {
    pub id: String,
}

/// Query parameters for task listing
#[derive(Debug, Clone, Serialize, Deserialize)]
#[derive(TS)]
pub struct TaskQuery {
    pub page: Option<i32>,
    pub limit: Option<i32>,
    pub status: Option<TaskStatus>,
    pub technician_id: Option<String>,
    pub client_id: Option<String>,
    pub priority: Option<TaskPriority>,
    pub search: Option<String>,
    pub from_date: Option<String>,
    pub to_date: Option<String>,
    pub sort_by: String,
    pub sort_order: SortOrder,
}

impl Default for TaskQuery {
    fn default() -> Self {
        Self {
            page: Some(1),
            limit: Some(20),
            status: None,
            technician_id: None,
            client_id: None,
            priority: None,
            search: None,
            from_date: None,
            to_date: None,
            sort_by: "created_at".to_string(),
            sort_order: SortOrder::Desc,
        }
    }
}

/// Response for task listing with pagination
#[derive(Debug, Clone, Serialize, Deserialize)]
#[derive(TS)]
pub struct TaskListResponse {
    pub data: Vec<TaskWithDetails>,
    pub pagination: PaginationInfo,
    pub statistics: Option<TaskStatistics>,
}

/// Pagination information
#[derive(Debug, Clone, Serialize, Deserialize)]
#[derive(TS)]
pub struct PaginationInfo {
    pub page: i32,
    pub limit: i32,
    pub total: i64,
    pub total_pages: i32,
}

/// Task statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
#[derive(TS)]
pub struct TaskStatistics {
    #[ts(type = "number")]
    pub total_tasks: i64,
    #[ts(type = "number")]
    pub draft_tasks: i64,
    #[ts(type = "number")]
    pub scheduled_tasks: i64,
    #[ts(type = "number")]
    pub in_progress_tasks: i64,
    #[ts(type = "number")]
    pub completed_tasks: i64,
    #[ts(type = "number")]
    pub cancelled_tasks: i64,
    #[ts(type = "number")]
    pub on_hold_tasks: i64,
    #[ts(type = "number")]
    pub pending_tasks: i64,
    #[ts(type = "number")]
    pub invalid_tasks: i64,
    #[ts(type = "number")]
    pub archived_tasks: i64,
    #[ts(type = "number")]
    pub failed_tasks: i64,
    #[ts(type = "number")]
    pub overdue_tasks: i64,
    #[ts(type = "number")]
    pub assigned_tasks: i64,
    #[ts(type = "number")]
    pub paused_tasks: i64,
}

/// Validation implementation for CreateTaskRequest
impl CreateTaskRequest {
    pub fn validate(&self) -> Result<(), String> {
        // Validate required fields
        if self.vehicle_plate.trim().is_empty() {
            return Err("Vehicle plate is required and cannot be empty".to_string());
        }

        if self.vehicle_model.trim().is_empty() {
            return Err("Vehicle model is required and cannot be empty".to_string());
        }

        if self.ppf_zones.is_empty() {
            return Err("PPF zones are required and cannot be empty".to_string());
        }
        for zone in &self.ppf_zones {
            if zone.trim().is_empty() {
                return Err("PPF zone cannot be empty".to_string());
            }
            if zone.len() > 100 {
                return Err("PPF zone must be 100 characters or less".to_string());
            }
        }

        if self.scheduled_date.trim().is_empty() {
            return Err("Scheduled date is required and cannot be empty".to_string());
        }

        // Validate optional fields
        if let Some(ref title) = self.title {
            if title.trim().is_empty() {
                return Err("Title cannot be empty if provided".to_string());
            }
            if title.len() > 100 {
                return Err("Title must be 100 characters or less".to_string());
            }
        }

        if let Some(ref desc) = self.description {
            if desc.len() > 1000 {
                return Err("Description must be 1000 characters or less".to_string());
            }
        }

        if let Some(ref year_str) = self.vehicle_year {
            if let Ok(year) = year_str.parse::<i32>() {
                if !(1900..=2100).contains(&year) {
                    return Err("Vehicle year must be between 1900 and 2100".to_string());
                }
            } else {
                return Err("Vehicle year must be a valid number".to_string());
            }
        }

        // Validate email format if provided
        if let Some(ref email) = self.customer_email {
            if !email.contains('@') || !email.contains('.') {
                return Err("Customer email must be a valid email address".to_string());
            }
        }

        Ok(())
    }
}

/// Conversion implementations for database operations
impl FromSqlRow for Task {
    fn from_row(row: &Row) -> Result<Self, rusqlite::Error> {
        Ok(Task {
            id: row.get(0)?,
            task_number: row.get(1)?,
            title: row.get(2)?,
            description: row.get(3)?,
            vehicle_plate: row.get(4)?,
            vehicle_model: row.get(5)?,
            vehicle_year: row.get(6)?, // Keep as TEXT/string
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
            checklist_completed: row.get::<_, i32>(35)? != 0,
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
            synced: row.get::<_, i32>(47)? != 0,
            last_synced_at: row.get(48)?,
        })
    }
}

/// Task history entry - tracks status changes
#[derive(Debug, Clone, Serialize, Deserialize)]
#[derive(TS)]
pub struct TaskHistory {
    pub id: String,
    pub task_id: String,
    pub old_status: Option<String>,
    pub new_status: String,
    pub reason: Option<String>,
    pub changed_at: i64,
    pub changed_by: Option<String>,
}

impl TaskHistory {
    pub fn new(
        task_id: String,
        old_status: Option<String>,
        new_status: String,
        reason: Option<String>,
        changed_by: Option<String>,
    ) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            task_id,
            old_status,
            new_status,
            reason,
            changed_at: chrono::Utc::now().timestamp(),
            changed_by,
        }
    }

    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            task_id: row.get("task_id")?,
            old_status: row.get("old_status")?,
            new_status: row.get("new_status")?,
            reason: row.get("reason")?,
            changed_at: row.get("changed_at")?,
            changed_by: row.get("changed_by")?,
        })
    }
}

impl FromSqlRow for TaskHistory {
    fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Self::from_row(row)
    }
}
