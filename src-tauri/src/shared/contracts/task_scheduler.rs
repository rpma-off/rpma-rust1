//! Shared contract for scheduling tasks across bounded contexts.
//!
//! Domains that need to reschedule a task (e.g. tasks application layer)
//! depend on this trait rather than on the calendar domain's concrete service.

use async_trait::async_trait;

use crate::shared::ipc::errors::AppError;

/// Port for rescheduling a task to a new date/time slot.
#[async_trait]
pub trait TaskScheduler: Send + Sync {
    async fn schedule_task(
        &self,
        task_id: String,
        new_date: String,
        new_start: Option<String>,
        new_end: Option<String>,
        user_id: &str,
    ) -> Result<(), AppError>;
}
