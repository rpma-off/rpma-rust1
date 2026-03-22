//! User CRUD commands for Tauri IPC

use crate::domains::users::application::UserResponse;
use crate::domains::users::domain::{CreateUserRequest, UpdateUserRequest, UserAction};
use crate::domains::users::{UsersCommand, UsersDomainResponse, UsersFacade, UsersServices};
use crate::resolve_context;
use crate::shared::app_state::AppState;
use crate::shared::ipc::{ApiResponse, AppError};
use serde::Deserialize;
use tracing::{debug, info, instrument};

use ts_rs::TS;

/// TODO: document
#[derive(Deserialize, Debug, TS)]
#[serde(deny_unknown_fields)]
#[ts(export)]
pub struct BootstrapFirstAdminRequest {
    pub user_id: String,
}

/// User request structure
#[derive(Deserialize, Debug, TS)]
#[serde(deny_unknown_fields)]
#[ts(export)]
pub struct UserCrudRequest {
    pub action: UserAction,
}

/// User CRUD operations
/// ADR-018: Thin IPC layer
#[tauri::command]
#[instrument(skip(state, request))]
pub async fn user_crud(
    request: UserCrudRequest,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<UserResponse>, AppError> {
    let action = request.action;
    debug!("User CRUD operation requested with action: {:?}", action);

    let ctx = resolve_context!(&state, &correlation_id);

    let facade = UsersFacade::new();
    let services = UsersServices {
        account_manager: state.auth_service.clone()
            as std::sync::Arc<dyn crate::shared::contracts::user_account::UserAccountManager>,
        user_service: state.user_service.clone(),
        event_bus: state.event_bus.clone(),
    };

    let domain_response = facade
        .execute(UsersCommand::Crud(action), &ctx, &services)
        .await?;
    let response = match domain_response {
        UsersDomainResponse::Crud(payload) => payload,
        _ => {
            return Err(AppError::Internal(
                "Unexpected users facade response".to_string(),
            ))
        }
    };

    Ok(ApiResponse::success(response).with_correlation_id(Some(ctx.correlation_id)))
}

/// Bootstrap first admin user - only works if no admin exists
#[tauri::command]
#[instrument(skip(state, request), fields(user_id = %request.user_id))]
pub async fn bootstrap_first_admin(
    request: BootstrapFirstAdminRequest,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    let user_id = request.user_id.trim().to_string();
    let facade = UsersFacade::new();
    let ctx = resolve_context!(&state, &correlation_id);
    let services = UsersServices {
        account_manager: state.auth_service.clone()
            as std::sync::Arc<dyn crate::shared::contracts::user_account::UserAccountManager>,
        user_service: state.user_service.clone(),
        event_bus: state.event_bus.clone(),
    };
    info!("Attempting to bootstrap first admin for user: {}", user_id);
    let response = facade
        .execute(
            UsersCommand::BootstrapFirstAdmin {
                user_id: user_id.clone(),
            },
            &ctx,
            &services,
        )
        .await?;
    match response {
        UsersDomainResponse::BootstrapMessage(message) => {
            info!("Bootstrap completed for user: {}", user_id);
            // Update the in-memory session store so RBAC reflects admin role immediately
            if let Ok(mut session) = state.session_store.get() {
                session.role = crate::domains::auth::domain::models::auth::UserRole::Admin;
                state.session_store.set(session);
            }
            Ok(ApiResponse::success(message).with_correlation_id(Some(ctx.correlation_id)))
        }
        _ => Err(AppError::Internal(
            "Unexpected users facade response".to_string(),
        )),
    }
}

/// Check if any admin users exist in the system.
///
/// This is a pre-authentication bootstrap check — no session is required.
/// Delegates to `UsersFacade` via `UsersCommand::HasAdmins`; the facade
/// branch does not inspect the context, so an unauthenticated context is safe.
#[tauri::command]
#[instrument(skip(state))]
pub async fn has_admins(
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> Result<ApiResponse<bool>, AppError> {
    let corr = crate::commands::init_correlation_context(&correlation_id, None);
    // Intentionally unauthenticated: this is a pre-login bootstrap check.
    // UsersCommand::HasAdmins does not inspect the context.
    let ctx = crate::shared::context::RequestContext::unauthenticated(corr.clone());
    let facade = UsersFacade::new();
    let services = UsersServices {
        account_manager: state.auth_service.clone()
            as std::sync::Arc<dyn crate::shared::contracts::user_account::UserAccountManager>,
        user_service: state.user_service.clone(),
        event_bus: state.event_bus.clone(),
    };
    match facade.execute(UsersCommand::HasAdmins, &ctx, &services).await? {
        UsersDomainResponse::HasAdmins(v) => {
            Ok(ApiResponse::success(v).with_correlation_id(Some(corr)))
        }
        _ => Err(AppError::Internal("Unexpected response from has_admins".to_string())),
    }
}

/// TODO: document
#[tracing::instrument(skip(state))]
#[tauri::command]
pub async fn get_users(
    page: i32,
    page_size: i32,
    search: Option<String>,
    role: Option<String>,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<serde_json::Value>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);

    let pagination = crate::shared::repositories::base::PaginationParams {
        page: Some(page),
        page_size: Some(page_size),
        sort_by: None,
        sort_order: None,
    };
    let limit = Some(pagination.page_size());
    let offset = Some(pagination.offset());

    match execute_user_action(
        UserAction::List {
            limit,
            offset,
            search,
            role_filter: role,
        },
        &ctx,
        state,
    )
    .await?
    {
        UserResponse::List(users) => {
            let total = users.data.len();
            Ok(ApiResponse::success(serde_json::json!({
                "users": users.data,
                "total": total,
                "page": page,
                "page_size": page_size
            }))
        .with_correlation_id(Some(ctx.correlation_id)))
        }
        _ => Err(AppError::Internal("Unexpected response".to_string())),
    }
}

/// TODO: document
#[tracing::instrument(skip(state))]
#[tauri::command]
pub async fn create_user(
    user_data: CreateUserRequest,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<serde_json::Value>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);

    match execute_user_action(UserAction::Create { data: user_data }, &ctx, state).await? {
        UserResponse::Created(user) => Ok(ApiResponse::success(serde_json::json!(user))
            .with_correlation_id(Some(ctx.correlation_id))),
        _ => Err(AppError::Internal("Failed to create user".to_string())),
    }
}

/// TODO: document
#[tracing::instrument(skip(state))]
#[tauri::command]
pub async fn update_user(
    user_id: String,
    user_data: UpdateUserRequest,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<serde_json::Value>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);

    match execute_user_action(
        UserAction::Update {
            id: user_id,
            data: user_data,
        },
        &ctx,
        state,
    )
    .await?
    {
        UserResponse::Updated(user) => Ok(ApiResponse::success(serde_json::json!(user))
            .with_correlation_id(Some(ctx.correlation_id))),
        _ => Err(AppError::Internal("Failed to update user".to_string())),
    }
}

/// TODO: document
#[tracing::instrument(skip(state))]
#[tauri::command]
pub async fn update_user_status(
    user_id: String,
    is_active: bool,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<()>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);

    // Construct a partial update carrying only the status flag.
    // All other fields are left as None so they are not overwritten.
    let update_data = UpdateUserRequest {
        email: None,
        first_name: None,
        last_name: None,
        role: None,
        is_active: Some(is_active),
    };

    match execute_user_action(
        UserAction::Update {
            id: user_id,
            data: update_data,
        },
        &ctx,
        state,
    )
    .await?
    {
        UserResponse::Updated(_) => {
            Ok(ApiResponse::success(()).with_correlation_id(Some(ctx.correlation_id)))
        }
        _ => Err(AppError::Internal(
            "Failed to update user status".to_string(),
        )),
    }
}

/// TODO: document
#[tracing::instrument(skip(state))]
#[tauri::command]
pub async fn delete_user(
    user_id: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<()>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);

    match execute_user_action(UserAction::Delete { id: user_id }, &ctx, state).await? {
        UserResponse::Deleted => {
            Ok(ApiResponse::success(()).with_correlation_id(Some(ctx.correlation_id)))
        }
        _ => Err(AppError::Internal("Failed to delete user".to_string())),
    }
}

async fn execute_user_action(
    action: UserAction,
    ctx: &crate::shared::context::RequestContext,
    state: AppState<'_>,
) -> Result<UserResponse, AppError> {
    let facade = UsersFacade::new();
    let services = UsersServices {
        account_manager: state.auth_service.clone()
            as std::sync::Arc<dyn crate::shared::contracts::user_account::UserAccountManager>,
        user_service: state.user_service.clone(),
        event_bus: state.event_bus.clone(),
    };

    let domain_response = facade
        .execute(UsersCommand::Crud(action), ctx, &services)
        .await?;

    match domain_response {
        UsersDomainResponse::Crud(payload) => Ok(payload),
        _ => Err(AppError::Internal(
            "Unexpected users facade response".to_string(),
        )),
    }
}
