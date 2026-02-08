use crate::commands::AppError;
use crate::db::Database;
use crate::models::calendar::*;
use std::sync::Arc;

pub struct CalendarService {
    db: Arc<Database>,
}

impl CalendarService {
    pub fn new(db: Arc<Database>) -> Self {
        Self { db }
    }

    pub async fn get_tasks(
        &self,
        date_range: CalendarDateRange,
        technician_ids: Option<Vec<String>>,
        statuses: Option<Vec<String>>,
    ) -> Result<Vec<CalendarTask>, AppError> {
        let conn = self
            .db
            .get_connection()
            .map_err(|e| AppError::Database(e.to_string()))?;

        let mut sql =
            String::from("SELECT * FROM calendar_tasks WHERE scheduled_date BETWEEN ?1 AND ?2");

        let mut params: Vec<Box<dyn rusqlite::ToSql>> = vec![
            Box::new(date_range.start_date.clone()),
            Box::new(date_range.end_date.clone()),
        ];

        // Add technician filter
        if let Some(tech_ids) = &technician_ids {
            if !tech_ids.is_empty() {
                let placeholders = tech_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
                sql.push_str(&format!(" AND technician_id IN ({})", placeholders));
                for id in tech_ids {
                    params.push(Box::new(id.clone()));
                }
            }
        }

        // Add status filter
        if let Some(statuses) = &statuses {
            if !statuses.is_empty() {
                let placeholders = statuses.iter().map(|_| "?").collect::<Vec<_>>().join(",");
                sql.push_str(&format!(" AND status IN ({})", placeholders));
                for status in statuses {
                    params.push(Box::new(status.clone()));
                }
            }
        }

        sql.push_str(" ORDER BY scheduled_date, start_time");

        let mut stmt = conn
            .prepare(&sql)
            .map_err(|e| AppError::Database(e.to_string()))?;

        let tasks = stmt
            .query_map(rusqlite::params_from_iter(params), |row| {
                Ok(CalendarTask {
                    id: row.get(0)?,
                    task_number: row.get(1)?,
                    title: row.get(2)?,
                    status: row
                        .get::<_, String>(3)?
                        .parse::<crate::models::task::TaskStatus>()
                        .unwrap_or(crate::models::task::TaskStatus::Draft),
                    priority: row
                        .get::<_, String>(4)?
                        .parse::<crate::models::task::TaskPriority>()
                        .unwrap_or(crate::models::task::TaskPriority::Medium),
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
            })
            .map_err(|e| AppError::Database(e.to_string()))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| AppError::Database(e.to_string()))?;

        Ok(tasks)
    }

    pub async fn check_conflicts(
        &self,
        task_id: String,
        new_date: String,
        new_start: Option<String>,
        new_end: Option<String>,
    ) -> Result<ConflictDetection, AppError> {
        let conn = self
            .db
            .get_connection()
            .map_err(|e| AppError::Database(e.to_string()))?;

        // Get technician for this task
        let technician_id: Option<String> = conn
            .query_row(
                "SELECT technician_id FROM tasks WHERE id = ?1",
                [&task_id],
                |row| row.get(0),
            )
            .map_err(|e| AppError::Database(e.to_string()))?;

        if technician_id.is_none() {
            return Ok(ConflictDetection {
                has_conflict: false,
                conflict_type: None,
                conflicting_tasks: vec![],
                message: None,
            });
        }

        let tech_id = technician_id.unwrap();

        // Find overlapping tasks for same technician
        let mut sql = String::from(
            "SELECT * FROM calendar_tasks 
             WHERE technician_id = ?1 
             AND scheduled_date = ?2 
             AND id != ?3
             AND status NOT IN ('completed', 'cancelled')",
        );

        // Add time overlap check if times provided
        if new_start.is_some() && new_end.is_some() {
            sql.push_str(
                " AND (
                    (start_time < ?5 AND end_time > ?4) OR
                    (start_time >= ?4 AND start_time < ?5)
                )",
            );
        }

        let mut stmt = conn
            .prepare(&sql)
            .map_err(|e| AppError::Database(e.to_string()))?;

        let conflicts: Vec<CalendarTask> = if let (Some(start), Some(end)) = (&new_start, &new_end)
        {
            stmt.query_map([&tech_id, &new_date, &task_id, start, end], |row| {
                Ok(CalendarTask {
                    id: row.get(0)?,
                    task_number: row.get(1)?,
                    title: row.get(2)?,
                    status: row
                        .get::<_, String>(3)?
                        .parse::<crate::models::task::TaskStatus>()
                        .unwrap_or(crate::models::task::TaskStatus::Draft),
                    priority: row
                        .get::<_, String>(4)?
                        .parse::<crate::models::task::TaskPriority>()
                        .unwrap_or(crate::models::task::TaskPriority::Medium),
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
            })?
            .collect::<Result<Vec<_>, _>>()?
        } else {
            stmt.query_map([&tech_id, &new_date, &task_id], |row| {
                Ok(CalendarTask {
                    id: row.get(0)?,
                    task_number: row.get(1)?,
                    title: row.get(2)?,
                    status: row
                        .get::<_, String>(3)?
                        .parse::<crate::models::task::TaskStatus>()
                        .unwrap_or(crate::models::task::TaskStatus::Draft),
                    priority: row
                        .get::<_, String>(4)?
                        .parse::<crate::models::task::TaskPriority>()
                        .unwrap_or(crate::models::task::TaskPriority::Medium),
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
            })?
            .collect::<Result<Vec<_>, _>>()?
        };

        let has_conflict = !conflicts.is_empty();

        Ok(ConflictDetection {
            has_conflict,
            conflict_type: if has_conflict {
                Some("time_overlap".to_string())
            } else {
                None
            },
            conflicting_tasks: conflicts.clone(),
            message: if has_conflict {
                Some(format!(
                    "Technician has {} conflicting task(s) on this date",
                    conflicts.len()
                ))
            } else {
                None
            },
        })
    }
}
