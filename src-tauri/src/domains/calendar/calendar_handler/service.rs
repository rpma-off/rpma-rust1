//! CalendarService — business logic for scheduling and conflict detection.
//! Also contains the TaskScheduler contract implementation.

use super::*;
use crate::commands::AppError;
use crate::db::Database;
use crate::domains::calendar::models::*;
use crate::shared::services::validation::ValidationService;
use std::sync::Arc;

/// Business logic for calendar scheduling and conflict detection.
pub struct CalendarService {
    pub(super) repo: CalendarRepository,
}

impl CalendarService {
    pub fn new(db: Arc<Database>) -> Self {
        Self {
            repo: CalendarRepository::new(db),
        }
    }

    pub async fn get_tasks(
        &self,
        date_range: CalendarDateRange,
        technician_ids: Option<Vec<String>>,
        statuses: Option<Vec<String>>,
    ) -> Result<Vec<CalendarTask>, AppError> {
        self.repo
            .get_tasks(&date_range, technician_ids.as_deref(), statuses.as_deref())
    }

    pub async fn check_conflicts(
        &self,
        task_id: String,
        new_date: String,
        new_start: Option<String>,
        new_end: Option<String>,
    ) -> Result<ConflictDetection, AppError> {
        let validator = ValidationService::new();
        let task_id = validator
            .validate_required_trimmed(&task_id, "task_id is required")
            .map_err(|err| AppError::Validation(err.to_string()))?;
        let new_date = validator
            .validate_required_trimmed(&new_date, "new_date is required")
            .map_err(|err| AppError::Validation(err.to_string()))?;

        let technician_id = self.repo.get_technician_for_task(&task_id)?;

        let tech_id = match technician_id {
            Some(id) => id,
            None => {
                return Ok(ConflictDetection {
                    has_conflict: false,
                    conflict_type: None,
                    conflicting_tasks: vec![],
                    message: None,
                });
            }
        };
        let conflicts = self.repo.find_conflicting_tasks(
            &tech_id,
            &new_date,
            &task_id,
            new_start.as_deref(),
            new_end.as_deref(),
        )?;

        let has_conflict = !conflicts.is_empty();
        let message = if has_conflict {
            let details: Vec<String> = conflicts
                .iter()
                .map(|c| {
                    let time_range = match (&c.start_time, &c.end_time) {
                        (Some(s), Some(e)) => format!("{}-{}", s, e),
                        (Some(s), None) => format!("{}-?", s),
                        _ => "all day".to_string(),
                    };
                    format!("'{}' ({})", c.title, time_range)
                })
                .collect();
            Some(format!(
                "Technician has {} conflicting task(s) on {}: {}",
                conflicts.len(),
                new_date,
                details.join(", ")
            ))
        } else {
            None
        };

        Ok(ConflictDetection {
            has_conflict,
            conflict_type: if has_conflict {
                Some("time_overlap".to_string())
            } else {
                None
            },
            conflicting_tasks: conflicts,
            message,
        })
    }

    pub async fn schedule_task(
        &self,
        task_id: String,
        new_date: String,
        new_start: Option<String>,
        new_end: Option<String>,
        user_id: &str,
    ) -> Result<(), AppError> {
        let validator = ValidationService::new();
        let task_id = validator
            .validate_required_trimmed(&task_id, "task_id is required")
            .map_err(|err| AppError::Validation(err.to_string()))?;
        let new_date = validator
            .validate_required_date_format(
                &new_date,
                "new_date is required",
                "new_date must be in YYYY-MM-DD format",
            )
            .map_err(|err| AppError::Validation(err.to_string()))?;
        self.repo.upsert_schedule(
            &task_id,
            &new_date,
            new_start.as_deref(),
            new_end.as_deref(),
            user_id,
        )
    }

    pub async fn schedule_task_with_conflict_check(
        &self,
        task_id: String,
        new_date: String,
        new_start: Option<String>,
        new_end: Option<String>,
        user_id: &str,
    ) -> Result<ConflictDetection, AppError> {
        let conflicts = self
            .check_conflicts(
                task_id.clone(),
                new_date.clone(),
                new_start.clone(),
                new_end.clone(),
            )
            .await?;

        if conflicts.has_conflict {
            return Ok(conflicts);
        }

        self.schedule_task(task_id, new_date, new_start, new_end, user_id)
            .await?;

        Ok(ConflictDetection {
            has_conflict: false,
            conflict_type: None,
            conflicting_tasks: vec![],
            message: None,
        })
    }

    pub async fn schedule_task_with_options(
        &self,
        task_id: String,
        new_date: String,
        new_start: Option<String>,
        new_end: Option<String>,
        user_id: &str,
        force: bool,
    ) -> Result<ConflictDetection, AppError> {
        if force {
            self.schedule_task(task_id, new_date, new_start, new_end, user_id)
                .await?;
            Ok(ConflictDetection {
                has_conflict: false,
                conflict_type: None,
                conflicting_tasks: vec![],
                message: None,
            })
        } else {
            self.schedule_task_with_conflict_check(task_id, new_date, new_start, new_end, user_id)
                .await
        }
    }
}

// ── TaskScheduler contract implementation ────────────────────────────────────

#[async_trait::async_trait]
impl crate::shared::contracts::task_scheduler::TaskScheduler for CalendarService {
    async fn schedule_task(
        &self,
        task_id: String,
        new_date: String,
        new_start: Option<String>,
        new_end: Option<String>,
        user_id: &str,
    ) -> Result<(), crate::shared::ipc::errors::AppError> {
        CalendarService::schedule_task(self, task_id, new_date, new_start, new_end, user_id).await
    }
}
