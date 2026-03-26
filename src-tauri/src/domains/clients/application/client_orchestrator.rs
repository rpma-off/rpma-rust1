use crate::domains::clients::application::client_service::ClientService;
use crate::domains::clients::domain::models::{Client, ClientQuery, ClientWithTasks};
use crate::shared::services::cross_domain::{Task, TaskQuery, TaskService};
use std::sync::Arc;

pub struct ClientOrchestrator {
    client_service: Arc<ClientService>,
    task_service: Arc<TaskService>,
}

impl ClientOrchestrator {
    pub fn new(client_service: Arc<ClientService>, task_service: Arc<TaskService>) -> Self {
        Self {
            client_service,
            task_service,
        }
    }

    pub async fn get_client_with_tasks(&self, id: &str) -> Result<Option<ClientWithTasks>, String> {
        let client = self.client_service.get_client_async(id).await?;
        match client {
            Some(client) => {
                let task_query = TaskQuery {
                    client_id: Some(id.to_string()),
                    pagination: crate::shared::repositories::base::PaginationParams {
                        page: Some(1),
                        page_size: Some(1000),
                        sort_by: Some("created_at".to_string()),
                        sort_order: Some("desc".to_string()),
                    },
                    status: None,
                    technician_id: None,
                    priority: None,
                    search: None,
                    from_date: None,
                    to_date: None,
                };
                let tasks_response = self
                    .task_service
                    .get_tasks_async(task_query)
                    .await
                    .map_err(|e| e.to_string())?;
                let tasks: Vec<Task> = tasks_response.data.into_iter().map(|t| t.task).collect();
                Ok(Some(client_into_client_with_tasks(client, tasks)))
            }
            None => Ok(None),
        }
    }

    pub async fn get_clients_with_tasks(
        &self,
        filters: ClientQuery,
        limit_tasks: Option<i32>,
    ) -> Result<Vec<ClientWithTasks>, String> {
        let clients = self.client_service.get_clients_async(filters).await?;
        let task_limit = limit_tasks.unwrap_or(5);
        let mut clients_with_tasks = Vec::new();

        for client in clients.data {
            let task_query = TaskQuery {
                client_id: Some(client.id.clone()),
                pagination: crate::shared::repositories::base::PaginationParams {
                    page: Some(1),
                    page_size: Some(task_limit),
                    sort_by: Some("created_at".to_string()),
                    sort_order: Some("desc".to_string()),
                },
                status: None,
                technician_id: None,
                priority: None,
                search: None,
                from_date: None,
                to_date: None,
            };
            let tasks_response = self
                .task_service
                .get_tasks_async(task_query)
                .await
                .map_err(|e| e.to_string())?;
            let tasks: Vec<Task> = tasks_response.data.into_iter().map(|t| t.task).collect();
            clients_with_tasks.push(client_into_client_with_tasks(client, tasks));
        }
        Ok(clients_with_tasks)
    }
}

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
