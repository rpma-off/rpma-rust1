//! Calendar event commands for Tauri IPC

use crate::commands::{ApiResponse, AppError, AppState};
use crate::domains::calendar::domain::models::calendar::*;
use crate::domains::calendar::domain::models::calendar_event::*;

use crate::domains::calendar::application::{
    CheckConflictsRequest, CreateEventRequest, DeleteEventRequest, GetCalendarTasksRequest,
    GetEventByIdRequest, GetEventsForTaskRequest, GetEventsForTechnicianRequest,
    ScheduleTaskRequest, UpdateEventRequest,
};
use crate::domains::calendar::infrastructure::calendar::CalendarService;
use crate::domains::calendar::infrastructure::calendar_event_service::CalendarEventService;
use tracing::{error, info, instrument};

// Import authentication macros
use crate::authenticate;

/// Get calendar tasks with filtering
#[tauri::command]
#[instrument(skip(state))]
pub async fn calendar_get_tasks(
    request: GetCalendarTasksRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Vec<CalendarTask>>, AppError> {
    let session_token = request.session_token;
    let correlation_id = request
        .correlation_id
        .unwrap_or_else(crate::logging::correlation::generate_correlation_id);
    crate::commands::init_correlation_context(&Some(correlation_id.clone()), None);

    info!(
        "calendar_get_tasks command received - correlation_id: {}",
        correlation_id
    );

    // Authentication
    let current_user = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);

    // Rate limiting: 200 requests per minute per user for calendar operations
    let rate_limiter = state.auth_service.rate_limiter();
    let rate_limit_key = format!("calendar_ops:{}", current_user.user_id);
    if !rate_limiter
        .check_and_record(&rate_limit_key, 200, 60)
        .map_err(|e| AppError::internal_sanitized("rate_limit_check", &e))?
    {
        return Err(AppError::Validation(
            "Rate limit exceeded. Please try again later.".to_string(),
        ));
    }

    let calendar_service = CalendarService::new(state.db.clone());

    match calendar_service
        .get_tasks(request.date_range, request.technician_ids, request.statuses)
        .await
    {
        Ok(tasks) => {
            info!("Successfully retrieved {} calendar tasks", tasks.len());
            Ok(ApiResponse::success(tasks).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!("Failed to get calendar tasks: {}", e);
            Err(AppError::internal_sanitized("get_calendar_tasks", &e))
        }
    }
}

/// Get a single event by ID
#[tauri::command]
#[instrument(skip(state))]
pub async fn get_event_by_id(
    request: GetEventByIdRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Option<CalendarEvent>>, AppError> {
    let session_token = request.session_token;
    let correlation_id = request
        .correlation_id
        .unwrap_or_else(crate::logging::correlation::generate_correlation_id);
    crate::commands::init_correlation_context(&Some(correlation_id.clone()), None);

    info!(
        "get_event_by_id command received - id: {}, correlation_id: {}",
        request.id, correlation_id
    );

    // Authentication
    let current_user = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);

    // Rate limiting
    let rate_limiter = state.auth_service.rate_limiter();
    let rate_limit_key = format!("calendar_ops:{}", current_user.user_id);
    if !rate_limiter
        .check_and_record(&rate_limit_key, 200, 60)
        .map_err(|e| AppError::internal_sanitized("rate_limit_check", &e))?
    {
        return Err(AppError::Validation(
            "Rate limit exceeded. Please try again later.".to_string(),
        ));
    }

    let calendar_service = CalendarEventService::new(state.db.clone());

    match calendar_service.get_event_by_id(request.id).await {
        Ok(event) => {
            if event.is_some() {
                info!("Successfully retrieved calendar event");
            } else {
                info!("Calendar event not found");
            }
            Ok(ApiResponse::success(event).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!("Failed to get calendar event by ID: {}", e);
            Err(AppError::internal_sanitized("get_calendar_event", &e))
        }
    }
}

/// Create a new calendar event
#[tauri::command]
#[instrument(skip(state))]
pub async fn create_event(
    request: CreateEventRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<CalendarEvent>, AppError> {
    let session_token = request.session_token;
    let correlation_id = request
        .correlation_id
        .unwrap_or_else(crate::logging::correlation::generate_correlation_id);
    crate::commands::init_correlation_context(&Some(correlation_id.clone()), None);

    info!(
        "create_event command received - title: {}, correlation_id: {}",
        request.event_data.title, correlation_id
    );

    // Authentication
    let current_user = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);

    // Rate limiting
    let rate_limiter = state.auth_service.rate_limiter();
    let rate_limit_key = format!("calendar_ops:{}", current_user.user_id);
    if !rate_limiter
        .check_and_record(&rate_limit_key, 200, 60)
        .map_err(|e| AppError::internal_sanitized("rate_limit_check", &e))?
    {
        return Err(AppError::Validation(
            "Rate limit exceeded. Please try again later.".to_string(),
        ));
    }

    let calendar_service = CalendarEventService::new(state.db.clone());

    match calendar_service
        .create_event(request.event_data, Some(current_user.user_id))
        .await
    {
        Ok(event) => {
            info!("Successfully created calendar event with ID: {}", event.id);
            Ok(ApiResponse::success(event).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!("Failed to create calendar event: {}", e);
            Err(e)
        }
    }
}

/// Update an existing calendar event
#[tauri::command]
#[instrument(skip(state))]
pub async fn update_event(
    request: UpdateEventRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Option<CalendarEvent>>, AppError> {
    let session_token = request.session_token;
    let correlation_id = request
        .correlation_id
        .unwrap_or_else(crate::logging::correlation::generate_correlation_id);
    crate::commands::init_correlation_context(&Some(correlation_id.clone()), None);

    info!(
        "update_event command received - id: {}, correlation_id: {}",
        request.id, correlation_id
    );

    // Authentication
    let current_user = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);

    // Rate limiting
    let rate_limiter = state.auth_service.rate_limiter();
    let rate_limit_key = format!("calendar_ops:{}", current_user.user_id);
    if !rate_limiter
        .check_and_record(&rate_limit_key, 200, 60)
        .map_err(|e| AppError::internal_sanitized("rate_limit_check", &e))?
    {
        return Err(AppError::Validation(
            "Rate limit exceeded. Please try again later.".to_string(),
        ));
    }

    let calendar_service = CalendarEventService::new(state.db.clone());

    match calendar_service
        .update_event(request.id, request.event_data, Some(current_user.user_id))
        .await
    {
        Ok(event) => {
            if event.is_some() {
                info!("Successfully updated calendar event");
            } else {
                info!("Calendar event not found for update");
            }
            Ok(ApiResponse::success(event).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!("Failed to update calendar event: {}", e);
            Err(e)
        }
    }
}

/// Delete a calendar event
#[tauri::command]
#[instrument(skip(state))]
pub async fn delete_event(
    request: DeleteEventRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<bool>, AppError> {
    let session_token = request.session_token;
    let correlation_id = request
        .correlation_id
        .unwrap_or_else(crate::logging::correlation::generate_correlation_id);
    crate::commands::init_correlation_context(&Some(correlation_id.clone()), None);

    info!(
        "delete_event command received - id: {}, correlation_id: {}",
        request.id, correlation_id
    );

    // Authentication
    let current_user = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);

    // Rate limiting
    let rate_limiter = state.auth_service.rate_limiter();
    let rate_limit_key = format!("calendar_ops:{}", current_user.user_id);
    if !rate_limiter
        .check_and_record(&rate_limit_key, 200, 60)
        .map_err(|e| AppError::internal_sanitized("rate_limit_check", &e))?
    {
        return Err(AppError::Validation(
            "Rate limit exceeded. Please try again later.".to_string(),
        ));
    }

    let calendar_service = CalendarEventService::new(state.db.clone());

    match calendar_service.delete_event(request.id).await {
        Ok(deleted) => {
            if deleted {
                info!("Successfully deleted calendar event");
            } else {
                info!("Calendar event not found for deletion");
            }
            Ok(ApiResponse::success(deleted).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!("Failed to delete calendar event: {}", e);
            Err(AppError::internal_sanitized("delete_calendar_event", &e))
        }
    }
}

/// Get events for a specific technician
#[tauri::command]
#[instrument(skip(state))]
pub async fn get_events_for_technician(
    request: GetEventsForTechnicianRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Vec<CalendarEvent>>, AppError> {
    let session_token = request.session_token;
    let correlation_id = request
        .correlation_id
        .unwrap_or_else(crate::logging::correlation::generate_correlation_id);
    crate::commands::init_correlation_context(&Some(correlation_id.clone()), None);

    info!(
        "get_events_for_technician command received - technician_id: {}, correlation_id: {}",
        request.technician_id, correlation_id
    );

    // Authentication
    let current_user = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);

    // Rate limiting
    let rate_limiter = state.auth_service.rate_limiter();
    let rate_limit_key = format!("calendar_ops:{}", current_user.user_id);
    if !rate_limiter
        .check_and_record(&rate_limit_key, 200, 60)
        .map_err(|e| AppError::internal_sanitized("rate_limit_check", &e))?
    {
        return Err(AppError::Validation(
            "Rate limit exceeded. Please try again later.".to_string(),
        ));
    }

    let calendar_service = CalendarEventService::new(state.db.clone());

    match calendar_service
        .get_events_for_technician(request.technician_id)
        .await
    {
        Ok(events) => {
            info!(
                "Successfully retrieved {} events for technician",
                events.len()
            );
            Ok(ApiResponse::success(events).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!("Failed to get events for technician: {}", e);
            Err(AppError::internal_sanitized("get_technician_events", &e))
        }
    }
}

/// Get events linked to a specific task
#[tauri::command]
#[instrument(skip(state))]
pub async fn get_events_for_task(
    request: GetEventsForTaskRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Vec<CalendarEvent>>, AppError> {
    let session_token = request.session_token;
    let correlation_id = request
        .correlation_id
        .unwrap_or_else(crate::logging::correlation::generate_correlation_id);
    crate::commands::init_correlation_context(&Some(correlation_id.clone()), None);

    info!(
        "get_events_for_task command received - task_id: {}, correlation_id: {}",
        request.task_id, correlation_id
    );

    // Authentication
    let current_user = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);

    // Rate limiting
    let rate_limiter = state.auth_service.rate_limiter();
    let rate_limit_key = format!("calendar_ops:{}", current_user.user_id);
    if !rate_limiter
        .check_and_record(&rate_limit_key, 200, 60)
        .map_err(|e| AppError::internal_sanitized("rate_limit_check", &e))?
    {
        return Err(AppError::Validation(
            "Rate limit exceeded. Please try again later.".to_string(),
        ));
    }

    let calendar_service = CalendarEventService::new(state.db.clone());

    match calendar_service.get_events_for_task(request.task_id).await {
        Ok(events) => {
            info!("Successfully retrieved {} events for task", events.len());
            Ok(ApiResponse::success(events).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!("Failed to get events for task: {}", e);
            Err(AppError::internal_sanitized("get_task_events", &e))
        }
    }
}

/// Get events within a date range
#[tauri::command]
#[instrument(skip(state))]
pub async fn get_events(
    start_date: String,
    end_date: String,
    technician_id: Option<String>,
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<
    ApiResponse<Vec<crate::domains::calendar::domain::models::calendar_event::CalendarEvent>>,
    AppError,
> {
    let correlation_id =
        correlation_id.unwrap_or_else(crate::logging::correlation::generate_correlation_id);
    crate::commands::init_correlation_context(&Some(correlation_id.clone()), None);

    info!(
        "get_events command received - date_range: {} to {}, technician: {:?}, correlation_id: {}",
        start_date, end_date, technician_id, correlation_id
    );

    // Authentication
    let current_user = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);

    // Rate limiting
    let rate_limiter = state.auth_service.rate_limiter();
    let rate_limit_key = format!("calendar_ops:{}", current_user.user_id);
    if !rate_limiter
        .check_and_record(&rate_limit_key, 200, 60)
        .map_err(|e| AppError::internal_sanitized("rate_limit_check", &e))?
    {
        return Err(AppError::Validation(
            "Rate limit exceeded. Please try again later.".to_string(),
        ));
    }

    let calendar_service =
        crate::domains::calendar::infrastructure::calendar_event_service::CalendarEventService::new(
            state.db.clone(),
        );

    match calendar_service
        .get_events_in_range(start_date, end_date, technician_id)
        .await
    {
        Ok(events) => {
            info!("Successfully retrieved {} events", events.len());
            Ok(ApiResponse::success(events).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!("Failed to get events: {}", e);
            Err(AppError::internal_sanitized("get_events", &e))
        }
    }
}

/// Check for scheduling conflicts
#[tauri::command]
#[instrument(skip(state))]
pub async fn calendar_check_conflicts(
    request: CheckConflictsRequest,
    state: AppState<'_>,
) -> Result<
    ApiResponse<crate::domains::calendar::domain::models::calendar::ConflictDetection>,
    AppError,
> {
    let session_token = request.session_token;
    let correlation_id = request
        .correlation_id
        .unwrap_or_else(crate::logging::correlation::generate_correlation_id);
    crate::commands::init_correlation_context(&Some(correlation_id.clone()), None);

    info!(
        "calendar_check_conflicts command received - task_id: {}, new_date: {}, correlation_id: {}",
        request.task_id, request.new_date, correlation_id
    );

    // Authentication
    let current_user = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);

    // Rate limiting: 200 requests per minute per user for calendar operations
    let rate_limiter = state.auth_service.rate_limiter();
    let rate_limit_key = format!("calendar_ops:{}", current_user.user_id);
    if !rate_limiter
        .check_and_record(&rate_limit_key, 200, 60)
        .map_err(|e| AppError::internal_sanitized("rate_limit_check", &e))?
    {
        return Err(AppError::Validation(
            "Rate limit exceeded. Please try again later.".to_string(),
        ));
    }

    let calendar_service = CalendarService::new(state.db.clone());

    match calendar_service
        .check_conflicts(
            request.task_id,
            request.new_date,
            request.new_start,
            request.new_end,
        )
        .await
    {
        Ok(conflicts) => {
            info!("Conflict check completed");
            Ok(ApiResponse::success(conflicts).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!("Failed to check conflicts: {}", e);
            Err(AppError::internal_sanitized(
                "check_scheduling_conflicts",
                &e,
            ))
        }
    }
}

/// Schedule a task - updates both task and calendar event atomically with conflict checking
#[tauri::command]
#[instrument(skip(state))]
pub async fn calendar_schedule_task(
    request: ScheduleTaskRequest,
    state: AppState<'_>,
) -> Result<
    ApiResponse<crate::domains::calendar::domain::models::calendar::ConflictDetection>,
    AppError,
> {
    let session_token = request.session_token;
    let correlation_id = request
        .correlation_id
        .unwrap_or_else(crate::logging::correlation::generate_correlation_id);
    crate::commands::init_correlation_context(&Some(correlation_id.clone()), None);

    info!(
        "calendar_schedule_task command received - task_id: {}, new_date: {}, correlation_id: {}",
        request.task_id, request.new_date, correlation_id
    );

    // Authentication
    let current_user = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);

    // Rate limiting
    let rate_limiter = state.auth_service.rate_limiter();
    let rate_limit_key = format!("calendar_ops:{}", current_user.user_id);
    if !rate_limiter
        .check_and_record(&rate_limit_key, 200, 60)
        .map_err(|e| AppError::internal_sanitized("rate_limit_check", &e))?
    {
        return Err(AppError::Validation(
            "Rate limit exceeded. Please try again later.".to_string(),
        ));
    }

    let calendar_service = CalendarService::new(state.db.clone());

    let force = request.force.unwrap_or(false);

    // Delegate the force/no-force routing entirely to the service layer
    match calendar_service
        .schedule_task_with_options(
            request.task_id.clone(),
            request.new_date,
            request.new_start,
            request.new_end,
            &current_user.user_id,
            force,
        )
        .await
    {
        Ok(result) => {
            if result.has_conflict {
                // Surface conflicts as a structured Validation error so the
                // frontend error-handler can present them consistently.
                info!("Task {} has scheduling conflicts", request.task_id);
                let msg = result.message.unwrap_or_else(|| {
                    format!(
                        "Scheduling conflict: {} task(s) overlap",
                        result.conflicting_tasks.len()
                    )
                });
                return Err(AppError::Validation(msg));
            }
            info!(
                "Task {} scheduled successfully{}",
                request.task_id,
                if force { " (force mode)" } else { "" }
            );
            Ok(ApiResponse::success(result).with_correlation_id(Some(correlation_id.clone())))
        }
        Err(e) => {
            error!("Failed to schedule task: {}", e);
            Err(AppError::internal_sanitized("schedule_task", &e))
        }
    }
}
