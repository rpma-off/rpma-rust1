use crate::db::FromSqlRow;
use crate::models::task::{TaskPriority, TaskStatus};
use serde::{Deserialize, Serialize};
// Conditional import removed
use ts_rs::TS;

use rusqlite::Row;

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
    pub status: TaskStatus,
    pub priority: TaskPriority,

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
                .parse::<TaskStatus>()
                .unwrap_or(TaskStatus::Draft),
            priority: row
                .get::<_, String>(4)?
                .parse::<TaskPriority>()
                .unwrap_or(TaskPriority::Medium),
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
