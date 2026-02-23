use crate::db::FromSqlRow;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use rusqlite::Row;

/// Task status values mirrored for calendar display.
///
/// These variants must remain in sync with `tasks::domain::models::task::TaskStatus`.
/// A calendar view should not depend on the tasks bounded context directly.
#[derive(Debug, Clone, Serialize, Deserialize, Default, TS)]
#[serde(rename_all = "snake_case")]
pub enum CalendarTaskStatus {
    #[default]
    Draft,
    Scheduled,
    InProgress,
    Completed,
    Cancelled,
    OnHold,
    Pending,
    Invalid,
    Archived,
    Failed,
    Overdue,
    Assigned,
    Paused,
}

impl std::str::FromStr for CalendarTaskStatus {
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
            _ => Err(format!("unknown status: {s}")),
        }
    }
}

/// Task priority values mirrored for calendar display.
///
/// These variants must remain in sync with `tasks::domain::models::task::TaskPriority`.
#[derive(Debug, Clone, Serialize, Deserialize, Default, TS)]
#[serde(rename_all = "snake_case")]
pub enum CalendarTaskPriority {
    Low,
    #[default]
    Medium,
    High,
    Urgent,
}

impl std::str::FromStr for CalendarTaskPriority {
    type Err = String;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "low" => Ok(Self::Low),
            "medium" => Ok(Self::Medium),
            "high" => Ok(Self::High),
            "urgent" => Ok(Self::Urgent),
            _ => Err(format!("unknown priority: {s}")),
        }
    }
}

/// CalendarTask represents a task with calendar-specific information
/// Maps to the calendar_tasks SQL View
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct CalendarTask {
    // Identifiers
    pub id: String,
    pub task_number: String,

    // Basic information
    pub title: String,

    // Status and priority
    pub status: CalendarTaskStatus,
    pub priority: CalendarTaskPriority,

    // Scheduling
    pub scheduled_date: String,
    pub start_time: Option<String>,
    pub end_time: Option<String>,

    // Vehicle information
    pub vehicle_plate: Option<String>,
    pub vehicle_model: Option<String>,

    // Assignment
    pub technician_id: Option<String>,
    pub technician_name: Option<String>,

    // Client information
    pub client_id: Option<String>,
    pub client_name: Option<String>,

    // Duration
    pub estimated_duration: Option<i32>,
    pub actual_duration: Option<i32>,
}

/// Date range filter for calendar queries
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct CalendarDateRange {
    pub start_date: String,
    pub end_date: String,
}

/// Calendar filter for tasks
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct CalendarFilter {
    pub date_range: CalendarDateRange,
    pub technician_ids: Option<Vec<String>>,
    pub statuses: Option<Vec<String>>,
}

/// Conflict detection result
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct ConflictDetection {
    pub has_conflict: bool,
    pub conflict_type: Option<String>,
    pub conflicting_tasks: Vec<CalendarTask>,
    pub message: Option<String>,
}

/// Conversion implementations for database operations
impl FromSqlRow for CalendarTask {
    fn from_row(row: &Row) -> Result<Self, rusqlite::Error> {
        Ok(CalendarTask {
            id: row.get(0)?,
            task_number: row.get(1)?,
            title: row.get(2)?,
            status: row
                .get::<_, String>(3)?
                .parse::<CalendarTaskStatus>()
                .unwrap_or(CalendarTaskStatus::Draft),
            priority: row
                .get::<_, String>(4)?
                .parse::<CalendarTaskPriority>()
                .unwrap_or(CalendarTaskPriority::Medium),
            scheduled_date: row.get(5)?,
            start_time: row.get(6)?,
            end_time: row.get(7)?,
            vehicle_plate: row.get(8)?,
            vehicle_model: row.get(9)?,
            technician_id: row.get(10)?,
            technician_name: row.get(11)?,
            client_id: row.get(12)?,
            client_name: row.get(13)?,
            estimated_duration: row.get(14)?,
            actual_duration: row.get(15)?,
        })
    }
}
