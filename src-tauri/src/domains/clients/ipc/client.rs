//! Client CRUD commands for Tauri IPC

use crate::commands::{ApiResponse, AppError, AppState, ClientAction};
use crate::domains::clients::application::{
    required_permission, sanitize_client_action, ClientCrudRequest,
};
use crate::domains::clients::domain::models::client::ClientWithTasks;
use crate::domains::clients::ClientsFacade;
use crate::shared::services::cross_domain::Task;
use tracing::{debug, error, info, instrument, warn};

// Import authentication macros
use crate::authenticate;

/// Client CRUD operations
#[tauri::command]
#[instrument(skip(state))]
pub async fn client_crud(
    request: ClientCrudRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<serde_json::Value>, AppError> {
    // Initialize correlation context at command start
    let correlation_id = crate::commands::init_correlation_context(&request.correlation_id, None);

    let action = request.action;
    let session_token = request.session_token;
    info!(
        correlation_id = %correlation_id,
        "client_crud command received - action: {:?}",
        action
    );
    debug!(
        correlation_id = %correlation_id,
        "Client CRUD operation requested with action: {:?}, session_token length: {}",
        action,
        session_token.len()
    );

    // Determine required permission via application layer
    let permission = required_permission(&action);

            ClientAction::Create {
                data: crate::domains::clients::domain::models::client::CreateClientRequest {
                    name: validated_name,
                    email: validated_email,
                    phone: validated_phone,
                    customer_type: data.customer_type.clone(),
                    address_street: data.address_street.clone(),
                    address_city: data.address_city.clone(),
                    address_state: data.address_state.clone(),
                    address_zip: data.address_zip.clone(),
                    address_country: data.address_country.clone(),
                    tax_id: data.tax_id.clone(),
                    company_name: validated_company_name,
                    contact_person: validated_contact_person,
                    notes: validated_notes,
                    tags: validated_tags,
                },
            }
        }
        ClientAction::Update { id, data } => {
            let validated_name = match data.name.as_deref() {
                Some(name) => Some(
                    validator
                        .sanitize_text_input(name, "name", 100)
                        .map_err(|e| AppError::Validation(format!("Name validation failed: {}", e)))?,
                ),
                None => None,
            };
            let validated_email = validator
                .validate_client_email(data.email.as_deref())
                .map_err(|e| AppError::Validation(format!("Email validation failed: {}", e)))?;
            let validated_phone = validator
                .validate_phone(data.phone.as_deref())
                .map_err(|e| AppError::Validation(format!("Phone validation failed: {}", e)))?;
            let validated_company_name = validator
                .sanitize_optional_text(data.company_name.as_deref(), "company_name", 100)
                .map_err(|e| {
                    AppError::Validation(format!("Company name validation failed: {}", e))
                })?;
            let validated_contact_person = validator
                .sanitize_optional_text(data.contact_person.as_deref(), "contact_person", 100)
                .map_err(|e| {
                    AppError::Validation(format!("Contact person validation failed: {}", e))
                })?;
            let validated_notes = validator
                .sanitize_optional_text(data.notes.as_deref(), "notes", 1000)
                .map_err(|e| AppError::Validation(format!("Notes validation failed: {}", e)))?;
            let validated_tags = if let Some(tags_str) = &data.tags {
                let tags: Vec<String> = serde_json::from_str(tags_str)
                    .map_err(|e| AppError::Validation(format!("Invalid tags JSON: {}", e)))?;
                let mut validated = Vec::new();
                for tag in tags {
                    let sanitized = validator
                        .sanitize_text_input(&tag, "tag", 50)
                        .map_err(|e| AppError::Validation(format!("Tag validation failed: {}", e)))?;
                    validated.push(sanitized);
                }
                Some(serde_json::to_string(&validated).unwrap_or_default())
            } else {
                None
            };

            ClientAction::Update {
                id: id.clone(),
                data: crate::domains::clients::domain::models::client::UpdateClientRequest {
                    id: id.clone(),
                    name: validated_name,
                    email: validated_email,
                    phone: validated_phone,
                    customer_type: data.customer_type.clone(),
                    address_street: data.address_street.clone(),
                    address_city: data.address_city.clone(),
                    address_state: data.address_state.clone(),
                    address_zip: data.address_zip.clone(),
                    address_country: data.address_country.clone(),
                    tax_id: data.tax_id.clone(),
                    company_name: validated_company_name,
                    contact_person: validated_contact_person,
                    notes: validated_notes,
                    tags: validated_tags,
                },
            }
        }
        _ => action, // ClientAction doesn't implement Clone, so we can't clone
    };

    // Centralized authentication
    let current_user = authenticate!(&session_token, &state);

    // Update correlation context with user_id after authentication
    crate::commands::update_correlation_context_user(&current_user.user_id);

    // Rate limiting: 100 requests per minute per user for client operations
    let rate_limiter = state.auth_service.rate_limiter();
    let rate_limit_key = format!("client_ops:{}", current_user.user_id);
    if !rate_limiter
        .check_and_record(&rate_limit_key, 100, 60)
        .map_err(|e| AppError::internal_sanitized("rate_limit_check", &e))?
    {
        return Err(AppError::Validation(
            "Rate limit exceeded. Please try again later.".to_string(),
        ));
    }

    // Check specific permission if provided
    if let Some(perm) = permission {
        if !crate::shared::auth_middleware::AuthMiddleware::can_perform_client_operation(
            &current_user.role,
            perm,
        ) {
            return Err(crate::commands::AppError::Authorization(format!(
                "Insufficient permissions to {} clients",
                perm
            )));
        }
    }

    let client_service = state.client_service.clone();
    let clients_facade = ClientsFacade::new(client_service.clone());
    let task_service = state.task_service.clone();

    // Add timeout wrapper for client operations to prevent hanging
    let result = tokio::time::timeout(
        std::time::Duration::from_secs(30), // 30 second timeout
        async {
            match validated_action {
                ClientAction::Create { data } => {
                    handle_client_creation(
                        &clients_facade,
                        data,
                        &current_user.user_id,
                        Some(correlation_id.clone()),
                    )
                    .await
                }
                ClientAction::Get { id } => {
                    handle_client_retrieval(&clients_facade, &id, Some(correlation_id.clone()))
                        .await
                }
                ClientAction::GetWithTasks { id } => {
                    handle_client_with_tasks_retrieval(
                        &clients_facade,
                        task_service,
                        &id,
                        Some(correlation_id.clone()),
                    )
                    .await
                }
                ClientAction::Update { id, data } => {
                    handle_client_update(
                        &clients_facade,
                        &id,
                        data,
                        &current_user.user_id,
                        Some(correlation_id.clone()),
                    )
                    .await
                }
                ClientAction::Delete { id } => {
                    handle_client_deletion(
                        &clients_facade,
                        &id,
                        &current_user.user_id,
                        Some(correlation_id.clone()),
                    )
                    .await
                }
                ClientAction::List { filters } => {
                    handle_client_listing(&clients_facade, filters, Some(correlation_id.clone()))
                        .await
                }
                ClientAction::ListWithTasks {
                    filters,
                    limit_tasks,
                } => {
                    handle_client_listing_with_tasks(
                        &clients_facade,
                        task_service,
                        filters,
                        limit_tasks,
                        Some(correlation_id.clone()),
                    )
                    .await
                }
                ClientAction::Search { query, limit } => {
                    handle_client_search(
                        &clients_facade,
                        &query,
                        limit,
                        Some(correlation_id.clone()),
                    )
                    .await
                }
                ClientAction::Stats => {
                    handle_client_statistics(&clients_facade, Some(correlation_id.clone())).await
                }
            }
        },
    )
    .await;

    match result {
        Ok(response) => response,
        Err(_) => {
            error!("Client CRUD operation timed out after 30 seconds");
            Err(AppError::Database(
                "Client operation timed out - database may be locked. Please try again."
                    .to_string(),
            ))
        }
    }
}

/// Handle client creation
async fn handle_client_creation(
    clients_facade: &ClientsFacade,
    data: crate::domains::clients::domain::models::client::CreateClientRequest,
    user_id: &str,
    correlation_id: Option<String>,
) -> Result<ApiResponse<serde_json::Value>, AppError> {
    info!("Creating new client");

    let client = clients_facade
        .client_service()
        .create_client_async(data, user_id)
        .await
        .map_err(|e| {
            error!("Failed to create client: {}", e);
            clients_facade.map_service_error("create_client", &e)
        })?;
    info!("Client created successfully with ID: {}", client.id);

    Ok(ApiResponse::success(serde_json::json!({
        "type": "Created",
        "data": client
    }))
    .with_correlation_id(correlation_id.clone()))
}

/// Handle client retrieval
async fn handle_client_retrieval(
    clients_facade: &ClientsFacade,
    id: &str,
    correlation_id: Option<String>,
) -> Result<ApiResponse<serde_json::Value>, AppError> {
    clients_facade.validate_client_id(id)?;
    debug!("Retrieving client with ID: {}", id);
    let client = clients_facade
        .client_service()
        .get_client_async(id)
        .await
        .map_err(|e| {
            error!("Failed to retrieve client {}: {}", id, e);
            clients_facade.map_service_error("get_client", &e)
        })?;

    match client {
        Some(client) => {
            debug!("Client {} found", id);
            Ok(ApiResponse::success(serde_json::json!({
                "type": "Found",
                "data": client
            }))
            .with_correlation_id(correlation_id.clone()))
        }
        None => {
            warn!("Client {} not found", id);
            Ok(ApiResponse::success(serde_json::json!({
                "type": "NotFound"
            }))
            .with_correlation_id(correlation_id.clone()))
        }
    }
}

/// Handle client retrieval with tasks
async fn handle_client_with_tasks_retrieval(
    clients_facade: &ClientsFacade,
    task_service: std::sync::Arc<crate::shared::services::cross_domain::TaskService>,
    id: &str,
    correlation_id: Option<String>,
) -> Result<ApiResponse<serde_json::Value>, AppError> {
    clients_facade.validate_client_id(id)?;
    debug!("Retrieving client with tasks for ID: {}", id);
    let client = clients_facade
        .client_service()
        .get_client_async(id)
        .await
        .map_err(|e| {
            error!("Failed to retrieve client {}: {}", id, e);
            clients_facade.map_service_error("get_client", &e)
        })?;

    match client {
        Some(client) => {
            // Get tasks for this client
            let task_query = crate::shared::services::cross_domain::TaskQuery {
                client_id: Some(id.to_string()),
                page: Some(1),
                limit: Some(1000), // Get all tasks for this client
                status: None,
                technician_id: None,
                priority: None,
                search: None,
                from_date: None,
                to_date: None,
                sort_by: "created_at".to_string(),
                sort_order: crate::shared::services::cross_domain::SortOrder::Desc,
            };

            let tasks_response = task_service
                .get_tasks_async(task_query)
                .await
                .map_err(|e| {
                    error!("Failed to retrieve tasks for client {}: {}", id, e);
                    clients_facade.map_service_error("get_tasks", &e)
                })?;

            let tasks: Vec<Task> = tasks_response.data.into_iter().map(|t| t.task).collect();
            let task_count = tasks.len();

            // Construct ClientWithTasks
            let client_with_tasks = ClientWithTasks {
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
            };

            debug!("Client {} with {} tasks found", id, task_count);
            Ok(ApiResponse::success(serde_json::json!({
                "type": "FoundWithTasks",
                "data": client_with_tasks
            }))
            .with_correlation_id(correlation_id.clone()))
        }
        None => {
            warn!("Client {} not found", id);
            Ok(ApiResponse::success(serde_json::json!({
                "type": "NotFound"
            }))
            .with_correlation_id(correlation_id.clone()))
        }
    }
}

/// Handle client update
async fn handle_client_update(
    clients_facade: &ClientsFacade,
    id: &str,
    data: crate::domains::clients::domain::models::client::UpdateClientRequest,
    user_id: &str,
    correlation_id: Option<String>,
) -> Result<ApiResponse<serde_json::Value>, AppError> {
    clients_facade.validate_client_id(id)?;
    info!("Updating client with ID: {}", id);
    let client = clients_facade
        .client_service()
        .update_client_async(data, user_id)
        .await
        .map_err(|e| {
            error!("Failed to update client {}: {}", id, e);
            clients_facade.map_service_error("update_client", &e)
        })?;
    info!("Client {} updated successfully", id);

    Ok(ApiResponse::success(serde_json::json!({
        "type": "Updated",
        "data": client
    }))
    .with_correlation_id(correlation_id.clone()))
}

/// Handle client deletion
async fn handle_client_deletion(
    clients_facade: &ClientsFacade,
    id: &str,
    user_id: &str,
    correlation_id: Option<String>,
) -> Result<ApiResponse<serde_json::Value>, AppError> {
    clients_facade.validate_client_id(id)?;
    info!("Deleting client with ID: {}", id);
    clients_facade
        .client_service()
        .delete_client_async(id, user_id)
        .await
        .map_err(|e| {
            error!("Failed to delete client {}: {}", id, e);
            clients_facade.map_service_error("delete_client", &e)
        })?;
    info!("Client {} deleted successfully", id);
    Ok(ApiResponse::success(serde_json::json!({
        "type": "Deleted"
    }))
    .with_correlation_id(correlation_id.clone()))
}

/// Handle client listing
async fn handle_client_listing(
    clients_facade: &ClientsFacade,
    filters: crate::domains::clients::domain::models::client::ClientQuery,
    correlation_id: Option<String>,
) -> Result<ApiResponse<serde_json::Value>, AppError> {
    debug!("Listing clients with filters: {:?}", filters);
    let clients = clients_facade
        .client_service()
        .get_clients_async(filters)
        .await
        .map_err(|e| {
            error!("Failed to list clients: {}", e);
            clients_facade.map_service_error("list_clients", &e)
        })?;
    debug!("Retrieved {} clients", clients.data.len());
    Ok(ApiResponse::success(serde_json::json!({
        "type": "List",
        "data": clients
    }))
    .with_correlation_id(correlation_id.clone()))
}

/// Handle client listing with tasks
async fn handle_client_listing_with_tasks(
    clients_facade: &ClientsFacade,
    task_service: std::sync::Arc<crate::shared::services::cross_domain::TaskService>,
    filters: crate::domains::clients::domain::models::client::ClientQuery,
    limit_tasks: Option<i32>,
    correlation_id: Option<String>,
) -> Result<ApiResponse<serde_json::Value>, AppError> {
    debug!(
        "Listing clients with tasks, filters: {:?}, limit_tasks: {:?}",
        filters, limit_tasks
    );
    let clients = clients_facade
        .client_service()
        .get_clients_async(filters)
        .await
        .map_err(|e| {
            error!("Failed to list clients: {}", e);
            clients_facade.map_service_error("list_clients", &e)
        })?;
    debug!("Retrieved {} clients", clients.data.len());

    let mut clients_with_tasks = Vec::new();
    let task_limit = limit_tasks.unwrap_or(5);

    for client in clients.data {
        // Get tasks for this client
        let task_query = crate::shared::services::cross_domain::TaskQuery {
            client_id: Some(client.id.clone()),
            page: Some(1),
            limit: Some(task_limit),
            status: None,
            technician_id: None,
            priority: None,
            search: None,
            from_date: None,
            to_date: None,
            sort_by: "created_at".to_string(),
            sort_order: crate::shared::services::cross_domain::SortOrder::Desc,
        };

        let tasks_response = task_service
            .get_tasks_async(task_query)
            .await
            .map_err(|e| {
                error!("Failed to retrieve tasks for client {}: {}", client.id, e);
                clients_facade.map_service_error("get_tasks", &e)
            })?;

        let tasks: Vec<Task> = tasks_response.data.into_iter().map(|t| t.task).collect();

        let client_with_tasks = ClientWithTasks {
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
        };

        clients_with_tasks.push(client_with_tasks);
    }

    debug!("Retrieved clients with tasks: {}", clients_with_tasks.len());
    Ok(ApiResponse::success(serde_json::json!({
        "type": "ListWithTasks",
        "data": clients_with_tasks
    }))
    .with_correlation_id(correlation_id.clone()))
}

/// Handle client search
async fn handle_client_search(
    clients_facade: &ClientsFacade,
    query: &str,
    limit: i32,
    correlation_id: Option<String>,
) -> Result<ApiResponse<serde_json::Value>, AppError> {
    debug!("Searching clients with query: {}, limit: {}", query, limit);
    let clients = clients_facade
        .client_service()
        .search_clients_async(query, 1, limit)
        .await
        .map_err(|e| {
            error!("Failed to search clients: {}", e);
            clients_facade.map_service_error("search_clients", &e)
        })?;
    debug!("Found {} clients matching query", clients.len());
    Ok(ApiResponse::success(serde_json::json!({
        "type": "SearchResults",
        "data": clients
    }))
    .with_correlation_id(correlation_id.clone()))
}

/// Handle client statistics
async fn handle_client_statistics(
    clients_facade: &ClientsFacade,
    correlation_id: Option<String>,
) -> Result<ApiResponse<serde_json::Value>, AppError> {
    debug!("Retrieving client statistics");
    let stats = clients_facade
        .client_service()
        .get_client_stats_async()
        .await
        .map_err(|e| {
            error!("Failed to retrieve client statistics: {}", e);
            clients_facade.map_service_error("get_client_stats", &e)
        })?;
    debug!("Client statistics retrieved: {:?}", stats);
    Ok(ApiResponse::success(serde_json::json!({
        "type": "Statistics",
        "data": stats
    }))
    .with_correlation_id(correlation_id.clone()))
}
