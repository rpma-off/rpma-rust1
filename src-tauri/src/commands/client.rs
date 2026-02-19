//! Client CRUD commands for Tauri IPC

use crate::commands::{ApiResponse, AppError, AppState, ClientAction};
use crate::models::client::ClientWithTasks;
use crate::models::task::Task;
use crate::services::validation::ValidationService;
use serde::Deserialize;
use tracing::{debug, error, info, instrument, warn};

// Import authentication macros
use crate::authenticate;

/// Client request structure
#[derive(Deserialize, Debug)]
pub struct ClientCrudRequest {
    pub action: ClientAction,
    pub session_token: String,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

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

    // Determine required permission based on action
    let required_permission = match &action {
        ClientAction::Create { .. } => Some("create"),
        ClientAction::Update { .. } => Some("update"),
        ClientAction::Delete { .. } => Some("delete"),
        ClientAction::Get { .. }
        | ClientAction::GetWithTasks { .. }
        | ClientAction::List { .. }
        | ClientAction::ListWithTasks { .. }
        | ClientAction::Search { .. }
        | ClientAction::Stats => Some("read"),
    };

    // Validate action data before authentication
    let validator = ValidationService::new();
    let validated_action = match &action {
        ClientAction::Create { data } => {
            let validated_name = validator
                .sanitize_text_input(&data.name, "name", 100)
                .map_err(|e| AppError::Validation(format!("Name validation failed: {}", e)))?;
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
            // For tags, validate the JSON string
            let validated_tags = if let Some(tags_str) = &data.tags {
                // Parse JSON string to Vec<String>
                let tags: Vec<String> = serde_json::from_str(tags_str)
                    .map_err(|e| AppError::Validation(format!("Invalid tags JSON: {}", e)))?;
                let mut validated = Vec::new();
                for tag in tags {
                    let sanitized =
                        validator
                            .sanitize_text_input(&tag, "tag", 50)
                            .map_err(|e| {
                                AppError::Validation(format!("Tag validation failed: {}", e))
                            })?;
                    validated.push(sanitized);
                }
                // Serialize back to JSON string
                Some(serde_json::to_string(&validated).unwrap_or_default())
            } else {
                None
            };

            ClientAction::Create {
                data: crate::models::client::CreateClientRequest {
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
    if let Some(permission) = required_permission {
        if !crate::commands::auth_middleware::AuthMiddleware::can_perform_client_operation(
            &current_user.role,
            permission,
        ) {
            return Err(crate::commands::AppError::Authorization(format!(
                "Insufficient permissions to {} clients",
                permission
            )));
        }
    }

    let client_service = state.client_service.clone();

    let task_service = state.task_service.clone();

    // Add timeout wrapper for client operations to prevent hanging
    let result = tokio::time::timeout(
        std::time::Duration::from_secs(30), // 30 second timeout
        async {
            match validated_action {
                ClientAction::Create { data } => {
                    handle_client_creation(
                        client_service,
                        data,
                        &current_user.user_id,
                        Some(correlation_id.clone()),
                    )
                    .await
                }
                ClientAction::Get { id } => {
                    handle_client_retrieval(client_service, &id, Some(correlation_id.clone())).await
                }
                ClientAction::GetWithTasks { id } => {
                    handle_client_with_tasks_retrieval(
                        client_service,
                        task_service,
                        &id,
                        Some(correlation_id.clone()),
                    )
                    .await
                }
                ClientAction::Update { id, data } => {
                    handle_client_update(
                        client_service,
                        &id,
                        data,
                        &current_user.user_id,
                        Some(correlation_id.clone()),
                    )
                    .await
                }
                ClientAction::Delete { id } => {
                    handle_client_deletion(
                        client_service,
                        &id,
                        &current_user.user_id,
                        Some(correlation_id.clone()),
                    )
                    .await
                }
                ClientAction::List { filters } => {
                    handle_client_listing(client_service, filters, Some(correlation_id.clone()))
                        .await
                }
                ClientAction::ListWithTasks {
                    filters,
                    limit_tasks,
                } => {
                    handle_client_listing_with_tasks(
                        client_service,
                        task_service,
                        filters,
                        limit_tasks,
                        Some(correlation_id.clone()),
                    )
                    .await
                }
                ClientAction::Search { query, limit } => {
                    handle_client_search(
                        client_service,
                        &query,
                        limit,
                        Some(correlation_id.clone()),
                    )
                    .await
                }
                ClientAction::Stats => {
                    handle_client_statistics(client_service, Some(correlation_id.clone())).await
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
    client_service: std::sync::Arc<crate::services::ClientService>,
    data: crate::models::client::CreateClientRequest,
    user_id: &str,
    correlation_id: Option<String>,
) -> Result<ApiResponse<serde_json::Value>, AppError> {
    info!("Creating new client");

    let client = client_service
        .create_client_async(data, user_id)
        .await
        .map_err(|e| {
            error!("Failed to create client: {}", e);
            AppError::db_sanitized("create_client", &e)
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
    client_service: std::sync::Arc<crate::services::ClientService>,
    id: &str,
    correlation_id: Option<String>,
) -> Result<ApiResponse<serde_json::Value>, AppError> {
    debug!("Retrieving client with ID: {}", id);
    let client = client_service.get_client_async(id).await.map_err(|e| {
        error!("Failed to retrieve client {}: {}", id, e);
        AppError::db_sanitized("get_client", &e)
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
    client_service: std::sync::Arc<crate::services::ClientService>,
    task_service: std::sync::Arc<crate::services::TaskService>,
    id: &str,
    correlation_id: Option<String>,
) -> Result<ApiResponse<serde_json::Value>, AppError> {
    debug!("Retrieving client with tasks for ID: {}", id);
    let client = client_service.get_client_async(id).await.map_err(|e| {
        error!("Failed to retrieve client {}: {}", id, e);
        AppError::db_sanitized("get_client", &e)
    })?;

    match client {
        Some(client) => {
            // Get tasks for this client
            let task_query = crate::models::task::TaskQuery {
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
                sort_order: crate::models::task::SortOrder::Desc,
            };

            let tasks_response = task_service
                .get_tasks_async(task_query)
                .await
                .map_err(|e| {
                    error!("Failed to retrieve tasks for client {}: {}", id, e);
                    AppError::db_sanitized("get_tasks", &e)
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
    client_service: std::sync::Arc<crate::services::ClientService>,
    id: &str,
    data: crate::models::client::UpdateClientRequest,
    user_id: &str,
    correlation_id: Option<String>,
) -> Result<ApiResponse<serde_json::Value>, AppError> {
    info!("Updating client with ID: {}", id);
    let client = client_service
        .update_client_async(data, user_id)
        .await
        .map_err(|e| {
            error!("Failed to update client {}: {}", id, e);
            AppError::db_sanitized("update_client", &e)
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
    client_service: std::sync::Arc<crate::services::ClientService>,
    id: &str,
    user_id: &str,
    correlation_id: Option<String>,
) -> Result<ApiResponse<serde_json::Value>, AppError> {
    info!("Deleting client with ID: {}", id);
    client_service
        .delete_client_async(id, user_id)
        .await
        .map_err(|e| {
            error!("Failed to delete client {}: {}", id, e);
            AppError::db_sanitized("delete_client", &e)
        })?;
    info!("Client {} deleted successfully", id);
    Ok(ApiResponse::success(serde_json::json!({
        "type": "Deleted"
    }))
    .with_correlation_id(correlation_id.clone()))
}

/// Handle client listing
async fn handle_client_listing(
    client_service: std::sync::Arc<crate::services::ClientService>,
    filters: crate::models::client::ClientQuery,
    correlation_id: Option<String>,
) -> Result<ApiResponse<serde_json::Value>, AppError> {
    debug!("Listing clients with filters: {:?}", filters);
    let clients = client_service
        .get_clients_async(filters)
        .await
        .map_err(|e| {
            error!("Failed to list clients: {}", e);
            AppError::db_sanitized("list_clients", &e)
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
    client_service: std::sync::Arc<crate::services::ClientService>,
    task_service: std::sync::Arc<crate::services::TaskService>,
    filters: crate::models::client::ClientQuery,
    limit_tasks: Option<i32>,
    correlation_id: Option<String>,
) -> Result<ApiResponse<serde_json::Value>, AppError> {
    debug!(
        "Listing clients with tasks, filters: {:?}, limit_tasks: {:?}",
        filters, limit_tasks
    );
    let clients = client_service
        .get_clients_async(filters)
        .await
        .map_err(|e| {
            error!("Failed to list clients: {}", e);
            AppError::db_sanitized("list_clients", &e)
        })?;
    debug!("Retrieved {} clients", clients.data.len());

    let mut clients_with_tasks = Vec::new();
    let task_limit = limit_tasks.unwrap_or(5);

    for client in clients.data {
        // Get tasks for this client
        let task_query = crate::models::task::TaskQuery {
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
            sort_order: crate::models::task::SortOrder::Desc,
        };

        let tasks_response = task_service
            .get_tasks_async(task_query)
            .await
            .map_err(|e| {
                error!("Failed to retrieve tasks for client {}: {}", client.id, e);
                AppError::db_sanitized("get_tasks", &e)
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
    client_service: std::sync::Arc<crate::services::ClientService>,
    query: &str,
    limit: i32,
    correlation_id: Option<String>,
) -> Result<ApiResponse<serde_json::Value>, AppError> {
    debug!("Searching clients with query: {}, limit: {}", query, limit);
    let clients = client_service
        .search_clients_async(query, 1, limit)
        .await
        .map_err(|e| {
            error!("Failed to search clients: {}", e);
            AppError::db_sanitized("search_clients", &e)
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
    client_service: std::sync::Arc<crate::services::ClientService>,
    correlation_id: Option<String>,
) -> Result<ApiResponse<serde_json::Value>, AppError> {
    debug!("Retrieving client statistics");
    let stats = client_service.get_client_stats_async().await.map_err(|e| {
        error!("Failed to retrieve client statistics: {}", e);
        AppError::db_sanitized("get_client_stats", &e)
    })?;
    debug!("Client statistics retrieved: {:?}", stats);
    Ok(ApiResponse::success(serde_json::json!({
        "type": "Statistics",
        "data": stats
    }))
    .with_correlation_id(correlation_id.clone()))
}
