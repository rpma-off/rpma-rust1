use std::fmt;
use std::sync::Arc;

use crate::domains::calendar::infrastructure::calendar::CalendarService;
use crate::shared::ipc::errors::AppError;

/// Facade for the Calendar bounded context.
///
/// Provides scheduling, conflict detection, and calendar event management
/// with input validation and error mapping.
pub struct CalendarFacade {
    calendar_service: Arc<CalendarService>,
}

impl fmt::Debug for CalendarFacade {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("CalendarFacade").finish()
    }
}

impl CalendarFacade {
    pub fn new(calendar_service: Arc<CalendarService>) -> Self {
        Self { calendar_service }
    }

    pub fn is_ready(&self) -> bool {
        true
    }

    /// Access the underlying calendar service.
    pub fn calendar_service(&self) -> &Arc<CalendarService> {
        &self.calendar_service
    }

    /// Validate date range parameters for calendar queries.
    pub fn validate_date_range(&self, start_date: &str, end_date: &str) -> Result<(), AppError> {
        if start_date.trim().is_empty() || end_date.trim().is_empty() {
            return Err(AppError::Validation(
                "Both start_date and end_date are required".to_string(),
            ));
        }
        if start_date > end_date {
            return Err(AppError::Validation(
                "start_date must be before end_date".to_string(),
            ));
        }
        Ok(())
    }
}
