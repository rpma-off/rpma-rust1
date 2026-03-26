//! IPC helpers and all Tauri #[command] functions for the calendar domain.

use super::*;
use crate::commands::{ApiResponse, AppError, AppState};
use crate::resolve_context;
use crate::shared::context::RequestContext;

use tracing::{info, instrument};

fn calendar_context(
    state: &AppState<'_>,
    correlation_id: &Option<String>,
) -> Result<RequestContext, AppError> {
    let ctx = resolve_context!(state, correlation_id);
    Ok(ctx)
}

fn facade(state: &AppState<'_>) -> CalendarFacade {
    CalendarFacade::new(
        state.calendar_service.clone(),
        state.calendar_event_repository.clone(),
        state.auth_service.rate_limiter(),
    )
}

// ── IPC commands ──────────────────────────────────────────────────────────────

/// ADR-018: Thin IPC layer
#[tauri::command]
#[instrument(skip(state))]
pub async fn calendar_get_tasks(
    request: GetCalendarTasksRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Vec<CalendarTask>>, AppError> {
    let ctx = calendar_context(&state, &request.correlation_id)?;
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

#[tauri::command]
#[instrument(skip(state))]
pub async fn get_event_by_id(
    request: GetEventByIdRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Option<CalendarEvent>>, AppError> {
    let ctx = calendar_context(&state, &request.correlation_id)?;
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

#[tauri::command]
#[instrument(skip(state))]
pub async fn create_event(
    request: CreateEventRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<CalendarEvent>, AppError> {
    let ctx = calendar_context(&state, &request.correlation_id)?;
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

#[tauri::command]
#[instrument(skip(state))]
pub async fn update_event(
    request: UpdateEventRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Option<CalendarEvent>>, AppError> {
    let ctx = calendar_context(&state, &request.correlation_id)?;
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

#[tauri::command]
#[instrument(skip(state))]
pub async fn delete_event(
    request: DeleteEventRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<bool>, AppError> {
    let ctx = calendar_context(&state, &request.correlation_id)?;
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

#[tauri::command]
#[instrument(skip(state))]
pub async fn get_events_for_technician(
    request: GetEventsForTechnicianRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Vec<CalendarEvent>>, AppError> {
    let ctx = calendar_context(&state, &request.correlation_id)?;
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

#[tauri::command]
#[instrument(skip(state))]
pub async fn get_events_for_task(
    request: GetEventsForTaskRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Vec<CalendarEvent>>, AppError> {
    let ctx = calendar_context(&state, &request.correlation_id)?;
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

#[tauri::command]
#[instrument(skip(state))]
pub async fn get_events(
    start_date: String,
    end_date: String,
    technician_id: Option<String>,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<Vec<CalendarEvent>>, AppError> {
    let ctx = calendar_context(&state, &correlation_id)?;
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

#[tauri::command]
#[instrument(skip(state))]
pub async fn calendar_check_conflicts(
    request: CheckConflictsRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<ConflictDetection>, AppError> {
    let ctx = calendar_context(&state, &request.correlation_id)?;
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

#[tauri::command]
#[instrument(skip(state))]
pub async fn calendar_schedule_task(
    request: ScheduleTaskRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<ConflictDetection>, AppError> {
    let ctx = calendar_context(&state, &request.correlation_id)?;
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
            Ok(ApiResponse::success(result).with_correlation_id(Some(ctx.correlation_id)))
        }
        _ => Err(AppError::Internal(
            "Unexpected calendar facade response".to_string(),
        )),
    }
}
