//! Calendar domain models — pure types with zero SQL dependencies.

use crate::db::FromSqlRow;
use rusqlite::Row;
use serde::{Deserialize, Serialize};
use std::str::FromStr;
use ts_rs::TS;

// ── Calendar task models ──────────────────────────────────────────────────────

/// Task status values mirrored for calendar display.
///
/// These variants must remain in sync with `tasks::domain::models::task::TaskStatus`.
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

/// CalendarTask represents a task with calendar-specific information.
/// Maps to the `calendar_tasks` SQL view.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct CalendarTask {
    pub id: String,
    pub task_number: String,
    pub title: String,
    pub status: CalendarTaskStatus,
    pub priority: CalendarTaskPriority,
    pub scheduled_date: String,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub vehicle_plate: Option<String>,
    pub vehicle_model: Option<String>,
    pub technician_id: Option<String>,
    pub technician_name: Option<String>,
    pub client_id: Option<String>,
    pub client_name: Option<String>,
    pub estimated_duration: Option<i32>,
    pub actual_duration: Option<i32>,
}

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

/// Date range filter for calendar queries.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct CalendarDateRange {
    pub start_date: String,
    pub end_date: String,
}

/// Calendar filter for tasks.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct CalendarFilter {
    pub date_range: CalendarDateRange,
    pub technician_ids: Option<Vec<String>>,
    pub statuses: Option<Vec<String>>,
}

/// Conflict detection result.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct ConflictDetection {
    pub has_conflict: bool,
    pub conflict_type: Option<String>,
    pub conflicting_tasks: Vec<CalendarTask>,
    pub message: Option<String>,
}

// ── Calendar event models ─────────────────────────────────────────────────────

/// Calendar event entity.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct CalendarEvent {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub start_datetime: String,
    pub end_datetime: String,
    pub all_day: bool,
    pub timezone: String,
    pub event_type: EventType,
    pub category: Option<String>,
    pub task_id: Option<String>,
    pub client_id: Option<String>,
    pub technician_id: Option<String>,
    pub location: Option<String>,
    pub meeting_link: Option<String>,
    pub is_virtual: bool,
    pub participants: Vec<EventParticipant>,
    pub is_recurring: bool,
    pub recurrence_rule: Option<String>,
    pub parent_event_id: Option<String>,
    pub reminders: Vec<i32>,
    pub status: EventStatus,
    pub color: Option<String>,
    pub tags: Vec<String>,
    pub notes: Option<String>,
    pub synced: bool,
    pub last_synced_at: Option<i64>,
    pub created_at: i64,
    pub updated_at: i64,
    pub created_by: Option<String>,
    pub updated_by: Option<String>,
    pub deleted_at: Option<i64>,
    pub deleted_by: Option<String>,
}

/// Calendar event type.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, TS)]
#[serde(rename_all = "lowercase")]
pub enum EventType {
    Meeting,
    Appointment,
    Task,
    Reminder,
    Other,
}

/// Calendar event status.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, TS)]
#[serde(rename_all = "lowercase")]
pub enum EventStatus {
    Confirmed,
    Tentative,
    Cancelled,
}

impl FromStr for EventType {
    type Err = String;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "meeting" => Ok(EventType::Meeting),
            "appointment" => Ok(EventType::Appointment),
            "task" => Ok(EventType::Task),
            "reminder" => Ok(EventType::Reminder),
            "other" => Ok(EventType::Other),
            _ => Err(format!("Unknown event type: {}", s)),
        }
    }
}

impl std::fmt::Display for EventType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            EventType::Meeting => write!(f, "meeting"),
            EventType::Appointment => write!(f, "appointment"),
            EventType::Task => write!(f, "task"),
            EventType::Reminder => write!(f, "reminder"),
            EventType::Other => write!(f, "other"),
        }
    }
}

impl FromStr for EventStatus {
    type Err = String;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "confirmed" => Ok(EventStatus::Confirmed),
            "tentative" => Ok(EventStatus::Tentative),
            "cancelled" => Ok(EventStatus::Cancelled),
            _ => Err(format!("Unknown event status: {}", s)),
        }
    }
}

impl std::fmt::Display for EventStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            EventStatus::Confirmed => write!(f, "confirmed"),
            EventStatus::Tentative => write!(f, "tentative"),
            EventStatus::Cancelled => write!(f, "cancelled"),
        }
    }
}

/// Event participant.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct EventParticipant {
    pub id: String,
    pub name: String,
    pub email: Option<String>,
    pub status: ParticipantStatus,
}

/// Participant attendance status.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, TS)]
#[serde(rename_all = "lowercase")]
pub enum ParticipantStatus {
    Accepted,
    Declined,
    Tentative,
    NeedsAction,
}

/// Input for creating a calendar event.
#[derive(Debug, Clone, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct CreateEventInput {
    pub title: String,
    pub description: Option<String>,
    pub start_datetime: String,
    pub end_datetime: String,
    pub all_day: Option<bool>,
    pub timezone: Option<String>,
    pub event_type: Option<EventType>,
    pub category: Option<String>,
    pub task_id: Option<String>,
    pub client_id: Option<String>,
    pub technician_id: Option<String>,
    pub location: Option<String>,
    pub meeting_link: Option<String>,
    pub is_virtual: Option<bool>,
    pub participants: Option<Vec<EventParticipant>>,
    pub reminders: Option<Vec<i32>>,
    pub color: Option<String>,
    pub tags: Option<Vec<String>>,
    pub notes: Option<String>,
}

/// Input for updating a calendar event.
#[derive(Debug, Clone, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct UpdateEventInput {
    pub title: Option<String>,
    pub description: Option<String>,
    pub start_datetime: Option<String>,
    pub end_datetime: Option<String>,
    pub all_day: Option<bool>,
    pub timezone: Option<String>,
    pub event_type: Option<EventType>,
    pub category: Option<String>,
    pub task_id: Option<String>,
    pub client_id: Option<String>,
    pub location: Option<String>,
    pub meeting_link: Option<String>,
    pub is_virtual: Option<bool>,
    pub participants: Option<Vec<EventParticipant>>,
    pub status: Option<EventStatus>,
    pub reminders: Option<Vec<i32>>,
    pub color: Option<String>,
    pub tags: Option<Vec<String>>,
    pub notes: Option<String>,
}

impl FromSqlRow for CalendarEvent {
    fn from_row(row: &Row) -> Result<Self, rusqlite::Error> {
        Ok(CalendarEvent {
            id: row.get(0)?,
            title: row.get(1)?,
            description: row.get(2)?,
            start_datetime: row.get(3)?,
            end_datetime: row.get(4)?,
            all_day: row.get::<_, i32>(5)? != 0,
            timezone: row.get(6)?,
            event_type: row
                .get::<_, String>(7)?
                .parse::<EventType>()
                .unwrap_or(EventType::Meeting),
            category: row.get(8)?,
            task_id: row.get(9)?,
            client_id: row.get(10)?,
            technician_id: row.get(11)?,
            location: row.get(12)?,
            meeting_link: row.get(13)?,
            is_virtual: row.get::<_, i32>(14)? != 0,
            participants: row
                .get::<_, Option<String>>(15)?
                .and_then(|s| serde_json::from_str(&s).ok())
                .unwrap_or_default(),
            is_recurring: row.get::<_, i32>(16)? != 0,
            recurrence_rule: row.get(17)?,
            parent_event_id: row.get(18)?,
            reminders: row
                .get::<_, Option<String>>(19)?
                .and_then(|s| serde_json::from_str(&s).ok())
                .unwrap_or_default(),
            status: row
                .get::<_, String>(20)?
                .parse::<EventStatus>()
                .unwrap_or(EventStatus::Confirmed),
            color: row.get(21)?,
            tags: row
                .get::<_, Option<String>>(22)?
                .and_then(|s| serde_json::from_str(&s).ok())
                .unwrap_or_default(),
            notes: row.get(23)?,
            synced: row.get::<_, i32>(24)? != 0,
            last_synced_at: row.get(25)?,
            created_at: row.get(26)?,
            updated_at: row.get(27)?,
            created_by: row.get(28)?,
            updated_by: row.get(29)?,
            deleted_at: row.get(30)?,
            deleted_by: row.get(31)?,
        })
    }
}
