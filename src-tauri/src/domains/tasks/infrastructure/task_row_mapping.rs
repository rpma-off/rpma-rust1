//! Row-to-domain mapping for Task entities.
//!
//! This module contains all `rusqlite::Row` → domain-model conversions for the
//! tasks domain.  Keeping these conversions in the infrastructure layer satisfies
//! ADR-002: the domain model no longer carries a direct `rusqlite` dependency.

use crate::db::FromSqlRow;
use crate::domains::tasks::domain::models::task::{Task, TaskHistory, TaskPriority, TaskStatus};
use rusqlite::Row;

/// Map a `rusqlite::Row` to a full `Task` entity.
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

/// Map a `rusqlite::Row` to a `TaskHistory` entry.
impl FromSqlRow for TaskHistory {
    fn from_row(row: &Row) -> rusqlite::Result<Self> {
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
