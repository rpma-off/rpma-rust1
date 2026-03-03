//! Calendar event commands for Tauri IPC

use crate::commands::{ApiResponse, AppError, AppState};
use crate::domains::calendar::application::{
    CheckConflictsRequest, CreateEventRequest, DeleteEventRequest, GetCalendarTasksRequest,
    GetEventByIdRequest, GetEventsForTaskRequest, GetEventsForTechnicianRequest,
    ScheduleTaskRequest, UpdateEventRequest,
};
use crate::domains::calendar::domain::models::calendar::*;
use crate::domains::calendar::domain::models::calendar_event::*;
use crate::domains::calendar::{CalendarCommand, CalendarFacade, CalendarResponse};
use crate::shared::auth_middleware::AuthMiddleware;
use crate::shared::ipc::CommandContext;
use tracing::{info, instrument};

async fn calendar_context(
    session_token: &str,
    state: &AppState<'_>,
    correlation_id: &Option<String>,
) -> Result<CommandContext, AppError> {
    let ctx =
        AuthMiddleware::authenticate_command(session_token, state, None, correlation_id).await?;

    let rate_limiter = state.auth_service.rate_limiter();
    let rate_limit_key = format!("calendar_ops:{}", ctx.session.user_id);
    if !rate_limiter
        .check_and_record(&rate_limit_key, 200, 60)
        .map_err(|e| AppError::internal_sanitized("rate_limit_check", &e))?
    {
        return Err(AppError::Validation(
            "Rate limit exceeded. Please try again later.".to_string(),
        ));
    }

    Ok(ctx)
}

fn facade(state: &AppState<'_>) -> CalendarFacade {
    let service =
        crate::domains::calendar::infrastructure::calendar::CalendarService::new(state.db.clone());
    CalendarFacade::new(std::sync::Arc::new(service), state.db.clone())
}

/// Get calendar tasks with filtering
#[tauri::command]
#[instrument(skip(state))]
pub async fn calendar_get_tasks(
    request: GetCalendarTasksRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Vec<CalendarTask>>, AppError> {
    let ctx = calendar_context(&request.session_token, &state, &request.correlation_id).await?;
    info!("calendar_get_tasks command received");

    match facade(&state)
        .execute(
            CalendarCommand::GetTasks {
                date_range: request.date_range,
                technician_ids: request.technician_ids,
                statuses: request.statuses,
            },
            &ctx,
        )
        .await?
    {
        CalendarResponse::Tasks(tasks) => {
            Ok(ApiResponse::success(tasks).with_correlation_id(Some(ctx.correlation_id)))
        }
        _ => Err(AppError::Internal(
            "Unexpected calendar facade response".to_string(),
        )),
    }
}

/// Get a single event by ID
#[tauri::command]
#[instrument(skip(state))]
pub async fn get_event_by_id(
    request: GetEventByIdRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Option<CalendarEvent>>, AppError> {
    let ctx = calendar_context(&request.session_token, &state, &request.correlation_id).await?;
    info!("get_event_by_id command received");

    match facade(&state)
        .execute(CalendarCommand::GetEventById { id: request.id }, &ctx)
        .await?
    {
        CalendarResponse::OptionalEvent(event) => {
            Ok(ApiResponse::success(event).with_correlation_id(Some(ctx.correlation_id)))
        }
        _ => Err(AppError::Internal(
            "Unexpected calendar facade response".to_string(),
        )),
    }
}

/// Create a new calendar event
#[tauri::command]
#[instrument(skip(state))]
pub async fn create_event(
    request: CreateEventRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<CalendarEvent>, AppError> {
    let ctx = calendar_context(&request.session_token, &state, &request.correlation_id).await?;
    info!("create_event command received");

    match facade(&state)
        .execute(
            CalendarCommand::CreateEvent {
                event_data: request.event_data,
            },
            &ctx,
        )
        .await?
    {
        CalendarResponse::Event(event) => {
            Ok(ApiResponse::success(event).with_correlation_id(Some(ctx.correlation_id)))
        }
        _ => Err(AppError::Internal(
            "Unexpected calendar facade response".to_string(),
        )),
    }
}

/// Update an existing calendar event
#[tauri::command]
#[instrument(skip(state))]
pub async fn update_event(
    request: UpdateEventRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Option<CalendarEvent>>, AppError> {
    let ctx = calendar_context(&request.session_token, &state, &request.correlation_id).await?;
    info!("update_event command received");

    match facade(&state)
        .execute(
            CalendarCommand::UpdateEvent {
                id: request.id,
                event_data: request.event_data,
            },
            &ctx,
        )
        .await?
    {
        CalendarResponse::OptionalEvent(event) => {
            Ok(ApiResponse::success(event).with_correlation_id(Some(ctx.correlation_id)))
        }
        _ => Err(AppError::Internal(
            "Unexpected calendar facade response".to_string(),
        )),
    }
}

/// Delete a calendar event
#[tauri::command]
#[instrument(skip(state))]
pub async fn delete_event(
    request: DeleteEventRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<bool>, AppError> {
    let ctx = calendar_context(&request.session_token, &state, &request.correlation_id).await?;
    info!("delete_event command received");

    match facade(&state)
        .execute(CalendarCommand::DeleteEvent { id: request.id }, &ctx)
        .await?
    {
        CalendarResponse::Deleted(deleted) => {
            Ok(ApiResponse::success(deleted).with_correlation_id(Some(ctx.correlation_id)))
        }
        _ => Err(AppError::Internal(
            "Unexpected calendar facade response".to_string(),
        )),
    }
}

/// Get events for a specific technician
#[tauri::command]
#[instrument(skip(state))]
pub async fn get_events_for_technician(
    request: GetEventsForTechnicianRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Vec<CalendarEvent>>, AppError> {
    let ctx = calendar_context(&request.session_token, &state, &request.correlation_id).await?;
    info!("get_events_for_technician command received");

    match facade(&state)
        .execute(
            CalendarCommand::GetEventsForTechnician {
                technician_id: request.technician_id,
            },
            &ctx,
        )
        .await?
    {
        CalendarResponse::Events(events) => {
            Ok(ApiResponse::success(events).with_correlation_id(Some(ctx.correlation_id)))
        }
        _ => Err(AppError::Internal(
            "Unexpected calendar facade response".to_string(),
        )),
    }
}

/// Get events linked to a specific task
#[tauri::command]
#[instrument(skip(state))]
pub async fn get_events_for_task(
    request: GetEventsForTaskRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Vec<CalendarEvent>>, AppError> {
    let ctx = calendar_context(&request.session_token, &state, &request.correlation_id).await?;
    info!("get_events_for_task command received");

    match facade(&state)
        .execute(
            CalendarCommand::GetEventsForTask {
                task_id: request.task_id,
            },
            &ctx,
        )
        .await?
    {
        CalendarResponse::Events(events) => {
            Ok(ApiResponse::success(events).with_correlation_id(Some(ctx.correlation_id)))
        }
        _ => Err(AppError::Internal(
            "Unexpected calendar facade response".to_string(),
        )),
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
) -> Result<ApiResponse<Vec<CalendarEvent>>, AppError> {
    let ctx = calendar_context(&session_token, &state, &correlation_id).await?;
    info!("get_events command received");

    match facade(&state)
        .execute(
            CalendarCommand::GetEventsInRange {
                start_date,
                end_date,
                technician_id,
            },
            &ctx,
        )
        .await?
    {
        CalendarResponse::Events(events) => {
            Ok(ApiResponse::success(events).with_correlation_id(Some(ctx.correlation_id)))
        }
        _ => Err(AppError::Internal(
            "Unexpected calendar facade response".to_string(),
        )),
    }
}

/// Check for scheduling conflicts
#[tauri::command]
#[instrument(skip(state))]
pub async fn calendar_check_conflicts(
    request: CheckConflictsRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<ConflictDetection>, AppError> {
    let ctx = calendar_context(&request.session_token, &state, &request.correlation_id).await?;
    info!("calendar_check_conflicts command received");

    match facade(&state)
        .execute(
            CalendarCommand::CheckConflicts {
                task_id: request.task_id,
                new_date: request.new_date,
                new_start: request.new_start,
                new_end: request.new_end,
            },
            &ctx,
        )
        .await?
    {
        CalendarResponse::Conflict(conflicts) => {
            Ok(ApiResponse::success(conflicts).with_correlation_id(Some(ctx.correlation_id)))
        }
        _ => Err(AppError::Internal(
            "Unexpected calendar facade response".to_string(),
        )),
    }
}

/// Schedule a task - updates both task and calendar event atomically with conflict checking
#[tauri::command]
#[instrument(skip(state))]
pub async fn calendar_schedule_task(
    request: ScheduleTaskRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<ConflictDetection>, AppError> {
    let ctx = calendar_context(&request.session_token, &state, &request.correlation_id).await?;
    info!("calendar_schedule_task command received");

    match facade(&state)
        .execute(
            CalendarCommand::ScheduleTask {
                task_id: request.task_id,
                new_date: request.new_date,
                new_start: request.new_start,
                new_end: request.new_end,
                force: request.force.unwrap_or(false),
            },
            &ctx,
        )
        .await?
    {
        CalendarResponse::Conflict(result) => {
            if result.has_conflict {
                let msg = result.message.unwrap_or_else(|| {
                    format!(
                        "Scheduling conflict: {} task(s) overlap",
                        result.conflicting_tasks.len()
                    )
                });
                return Err(AppError::Validation(msg));
            }
            Ok(ApiResponse::success(result).with_correlation_id(Some(ctx.correlation_id)))
        }
        _ => Err(AppError::Internal(
            "Unexpected calendar facade response".to_string(),
        )),
    }
}
