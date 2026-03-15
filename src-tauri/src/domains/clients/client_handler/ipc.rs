//! Client IPC facade and Tauri command entry point.

use super::{
    Client, ClientQuery, ClientWithTasks, CreateClientRequest, UpdateClientRequest,
    required_permission, sanitize_client_action,
};
use crate::commands::{ApiResponse, AppError, AppState, ClientResponse};
use crate::shared::ipc::errors::AppError as IpcAppError;
use crate::shared::services::cross_domain::{SortOrder, Task, TaskQuery};
use std::sync::Arc;
use tracing::{debug, error, info, instrument, warn};

use super::service::ClientService;
use super::ClientCrudRequest;

// ── ClientsFacade ─────────────────────────────────────────────────────────────

/// Facade for the Clients bounded context.
#[derive(Debug)]
pub struct ClientsFacade {
    client_service: Arc<ClientService>,
}

impl ClientsFacade {
    pub fn new(client_service: Arc<ClientService>) -> Self {
        Self { client_service }
    }

    pub fn client_service(&self) -> &Arc<ClientService> {
        &self.client_service
    }

    pub fn validate_client_id(&self, client_id: &str) -> Result<(), IpcAppError> {
        if client_id.trim().is_empty() {
            return Err(IpcAppError::Validation("client_id is required".to_string()));
        }
        Ok(())
    }

    pub fn map_service_error(&self, context: &str, error: &str) -> IpcAppError {
        let normalized = error.to_lowercase();
        if normalized.contains("not found") {
            IpcAppError::NotFound(format!("{}: {}", context, error))
        } else if normalized.contains("permission")
            || normalized.contains("only update")
            || normalized.contains("only delete")
        {
            IpcAppError::Authorization(error.to_string())
        } else if normalized.contains("validation")
            || normalized.contains("invalid")
            || normalized.contains("required")
            || normalized.contains("cannot")
            || normalized.contains("must")
            || normalized.contains("already exists")
            || normalized.contains("too long")
            || normalized.contains("duplicate")
        {
            IpcAppError::Validation(error.to_string())
        } else {
            IpcAppError::db_sanitized(context, error)
        }
    }
}

// ── Helper ────────────────────────────────────────────────────────────────────

/// Combine a `Client` with its resolved task list.
///
/// Centralises field mapping so that adding/removing a field on `Client`
/// only requires a change in one place instead of two separate match arms.
pub(crate) fn client_into_client_with_tasks(client: Client, tasks: Vec<Task>) -> ClientWithTasks {
    ClientWithTasks {
        id: client.id,
        name: client.name,
        email: client.email,
        phone: client.phone,
        customer_type: client.customer_type,
        address_street: client.address_street,
        address_city: client.address_city,
        address_state: client.address_state,
        address_zip: client.address_zip,
        address_country: client.address_country,
        tax_id: client.tax_id,
        company_name: client.company_name,
        contact_person: client.contact_person,
        notes: client.notes,
        tags: client.tags,
        total_tasks: client.total_tasks,
        active_tasks: client.active_tasks,
        completed_tasks: client.completed_tasks,
        last_task_date: client.last_task_date,
        created_at: client.created_at,
        updated_at: client.updated_at,
        created_by: client.created_by,
        deleted_at: client.deleted_at,
        deleted_by: client.deleted_by,
        synced: client.synced,
        last_synced_at: client.last_synced_at,
        tasks: Some(tasks),
    }
}

// ── IPC Command ───────────────────────────────────────────────────────────────

/// Client CRUD operations
/// ADR-018: Thin IPC layer
#[tauri::command]
#[instrument(skip(state))]
pub async fn client_crud(
    request: ClientCrudRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<ClientResponse>, AppError> {
    let ctx = crate::resolve_context!(&state, &request.correlation_id);
    let correlation_id = ctx.correlation_id.clone();
    let action = request.action;
    info!(correlation_id = %correlation_id, "client_crud command received - action: {:?}", action);
    let permission = required_permission(&action);
    let validated_action = sanitize_client_action(action)?;
    let rate_limiter = state.auth_service.rate_limiter();
    let rate_limit_key = format!("client_ops:{}", ctx.user_id());
    if !rate_limiter
        .check_and_record(&rate_limit_key, 100, 60)
        .map_err(|e| AppError::internal_sanitized("rate_limit_check", &e))?
    {
        return Err(AppError::Validation(
            "Rate limit exceeded. Please try again later.".to_string(),
        ));
    }
    if let Some(perm) = permission {
        if !crate::shared::auth_middleware::AuthMiddleware::can_perform_client_operation(
            &ctx.auth.role,
            perm,
        ) {
            return Err(AppError::Authorization(format!(
                "Insufficient permissions to {} clients",
                perm
            )));
        }
    }
    let client_service = state.client_service.clone();
    let clients_facade = ClientsFacade::new(client_service.clone());
    let task_service = state.task_service.clone();
    let result = tokio::time::timeout(
        std::time::Duration::from_secs(30),
        async {
            match validated_action {
                crate::commands::ClientAction::Create { data } => handle_client_creation(&clients_facade, data, ctx.user_id(), Some(correlation_id.clone())).await,
                crate::commands::ClientAction::Get { id } => handle_client_retrieval(&clients_facade, &id, Some(correlation_id.clone())).await,
                crate::commands::ClientAction::GetWithTasks { id } => handle_client_with_tasks_retrieval(&clients_facade, task_service, &id, Some(correlation_id.clone())).await,
                crate::commands::ClientAction::Update { id, data } => handle_client_update(&clients_facade, &id, data, ctx.user_id(), Some(correlation_id.clone())).await,
                crate::commands::ClientAction::Delete { id } => handle_client_deletion(&clients_facade, &id, ctx.user_id(), Some(correlation_id.clone())).await,
                crate::commands::ClientAction::List { filters } => handle_client_listing(&clients_facade, filters, Some(correlation_id.clone())).await,
                crate::commands::ClientAction::ListWithTasks { filters, limit_tasks } => handle_client_listing_with_tasks(&clients_facade, task_service, filters, limit_tasks, Some(correlation_id.clone())).await,
                crate::commands::ClientAction::Search { query, limit } => handle_client_search(&clients_facade, &query, limit, Some(correlation_id.clone())).await,
                crate::commands::ClientAction::Stats => handle_client_statistics(&clients_facade, Some(correlation_id.clone())).await,
            }
        },
    ).await;
    match result {
        Ok(response) => response,
        Err(_) => {
            error!("Client CRUD operation timed out after 30 seconds");
            Err(AppError::Database(
                "Client operation timed out - database may be locked. Please try again.".to_string(),
            ))
        }
    }
}

// ── Handler helpers ───────────────────────────────────────────────────────────

async fn handle_client_creation(
    facade: &ClientsFacade,
    data: CreateClientRequest,
    user_id: &str,
    correlation_id: Option<String>,
) -> Result<ApiResponse<ClientResponse>, AppError> {
    info!("Creating new client");
    let client = facade.client_service().create_client_async(data, user_id).await
        .map_err(|e| { error!("Failed to create client: {}", e); facade.map_service_error("create_client", &e) })?;
    info!("Client created successfully with ID: {}", client.id);
    Ok(ApiResponse::success(ClientResponse::Created(client)).with_correlation_id(correlation_id))
}

async fn handle_client_retrieval(
    facade: &ClientsFacade,
    id: &str,
    correlation_id: Option<String>,
) -> Result<ApiResponse<ClientResponse>, AppError> {
    facade.validate_client_id(id)?;
    debug!("Retrieving client with ID: {}", id);
    let client = facade.client_service().get_client_async(id).await
        .map_err(|e| { error!("Failed to retrieve client {}: {}", id, e); facade.map_service_error("get_client", &e) })?;
    match client {
        Some(client) => Ok(ApiResponse::success(ClientResponse::Found(client)).with_correlation_id(correlation_id)),
        None => { warn!("Client {} not found", id); Ok(ApiResponse::success(ClientResponse::NotFound).with_correlation_id(correlation_id)) }
    }
}

async fn handle_client_with_tasks_retrieval(
    facade: &ClientsFacade,
    task_service: Arc<crate::shared::services::cross_domain::TaskService>,
    id: &str,
    correlation_id: Option<String>,
) -> Result<ApiResponse<ClientResponse>, AppError> {
    facade.validate_client_id(id)?;
    let client = facade.client_service().get_client_async(id).await
        .map_err(|e| facade.map_service_error("get_client", &e))?;
    match client {
        Some(client) => {
            let task_query = TaskQuery {
                client_id: Some(id.to_string()),
                page: Some(1),
                limit: Some(1000),
                status: None,
                technician_id: None,
                priority: None,
                search: None,
                from_date: None,
                to_date: None,
                sort_by: "created_at".to_string(),
                sort_order: SortOrder::Desc,
            };
            let tasks_response = task_service.get_tasks_async(task_query).await
                .map_err(|e| facade.map_service_error("get_tasks", &e.to_string()))?;
            let tasks: Vec<Task> = tasks_response.data.into_iter().map(|t| t.task).collect();
            let client_with_tasks = client_into_client_with_tasks(client, tasks);
            Ok(ApiResponse::success(ClientResponse::FoundWithTasks(client_with_tasks)).with_correlation_id(correlation_id))
        }
        None => { warn!("Client {} not found", id); Ok(ApiResponse::success(ClientResponse::NotFound).with_correlation_id(correlation_id)) }
    }
}

async fn handle_client_update(
    facade: &ClientsFacade,
    id: &str,
    data: UpdateClientRequest,
    user_id: &str,
    correlation_id: Option<String>,
) -> Result<ApiResponse<ClientResponse>, AppError> {
    facade.validate_client_id(id)?;
    info!("Updating client with ID: {}", id);
    let client = facade.client_service().update_client_async(data, user_id).await
        .map_err(|e| facade.map_service_error("update_client", &e))?;
    Ok(ApiResponse::success(ClientResponse::Updated(client)).with_correlation_id(correlation_id))
}

async fn handle_client_deletion(
    facade: &ClientsFacade,
    id: &str,
    user_id: &str,
    correlation_id: Option<String>,
) -> Result<ApiResponse<ClientResponse>, AppError> {
    facade.validate_client_id(id)?;
    info!("Deleting client with ID: {}", id);
    facade.client_service().delete_client_async(id, user_id).await
        .map_err(|e| facade.map_service_error("delete_client", &e))?;
    Ok(ApiResponse::success(ClientResponse::Deleted).with_correlation_id(correlation_id))
}

async fn handle_client_listing(
    facade: &ClientsFacade,
    filters: ClientQuery,
    correlation_id: Option<String>,
) -> Result<ApiResponse<ClientResponse>, AppError> {
    debug!("Listing clients with filters: {:?}", filters);
    let clients = facade.client_service().get_clients_async(filters).await
        .map_err(|e| facade.map_service_error("list_clients", &e))?;
    Ok(ApiResponse::success(ClientResponse::List(clients)).with_correlation_id(correlation_id))
}

async fn handle_client_listing_with_tasks(
    facade: &ClientsFacade,
    task_service: Arc<crate::shared::services::cross_domain::TaskService>,
    filters: ClientQuery,
    limit_tasks: Option<i32>,
    correlation_id: Option<String>,
) -> Result<ApiResponse<ClientResponse>, AppError> {
    let clients = facade.client_service().get_clients_async(filters).await
        .map_err(|e| facade.map_service_error("list_clients", &e))?;
    let task_limit = limit_tasks.unwrap_or(5);
    let mut clients_with_tasks = Vec::new();
    for client in clients.data {
        let task_query = TaskQuery {
            client_id: Some(client.id.clone()),
            page: Some(1), limit: Some(task_limit), status: None,
            technician_id: None, priority: None, search: None,
            from_date: None, to_date: None,
            sort_by: "created_at".to_string(), sort_order: SortOrder::Desc,
        };
        let tasks_response = task_service.get_tasks_async(task_query).await
            .map_err(|e| facade.map_service_error("get_tasks", &e.to_string()))?;
        let tasks: Vec<Task> = tasks_response.data.into_iter().map(|t| t.task).collect();
        clients_with_tasks.push(client_into_client_with_tasks(client, tasks));
    }
    Ok(ApiResponse::success(ClientResponse::ListWithTasks { data: clients_with_tasks }).with_correlation_id(correlation_id))
}

async fn handle_client_search(
    facade: &ClientsFacade,
    query: &str,
    limit: i32,
    correlation_id: Option<String>,
) -> Result<ApiResponse<ClientResponse>, AppError> {
    let clients = facade.client_service().search_clients_async(query, 1, limit).await
        .map_err(|e| facade.map_service_error("search_clients", &e))?;
    Ok(ApiResponse::success(ClientResponse::SearchResults { data: clients }).with_correlation_id(correlation_id))
}

async fn handle_client_statistics(
    facade: &ClientsFacade,
    correlation_id: Option<String>,
) -> Result<ApiResponse<ClientResponse>, AppError> {
    let stats = facade.client_service().get_client_stats_async().await
        .map_err(|e| facade.map_service_error("get_client_stats", &e))?;
    Ok(ApiResponse::success(ClientResponse::Stats(stats)).with_correlation_id(correlation_id))
}
