//! Unit tests for client service
//!
//! This module tests client CRUD operations, validation, and business rules.

use crate::commands::AppResult;
use crate::domains::clients::infrastructure::client::ClientService;
use crate::test_utils::{TestDataFactory, TestDatabase};
use crate::{test_client, test_db, test_intervention, test_task};

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_create_client_success() -> AppResult<()> {
        let test_db = test_db!();
        let service = ClientService::new(test_db.db());

        let client_request = test_client!(
            name: "Test Client Company".to_string(),
            email: Some("test@company.com".to_string()),
            phone: Some("555-123-4567".to_string()),
            address: Some("123 Business St".to_string())
        );

        let created_client = service
            .create_client_async(client_request, "test_user")
            .await?;

        assert_eq!(created_client.name, "Test Client Company");
        assert_eq!(created_client.email, Some("test@company.com".to_string()));
        assert_eq!(created_client.phone, Some("555-123-4567".to_string()));
        assert_eq!(created_client.address, Some("123 Business St".to_string()));
        assert!(created_client.is_active);
        assert!(created_client.id.is_some());
        assert_eq!(created_client.created_by, Some("test_user".to_string()));

        Ok(())
    }

    #[tokio::test]
    async fn test_create_client_minimal_fields() -> AppResult<()> {
        let test_db = test_db!();
        let service = ClientService::new(test_db.db());

        let client_request = test_client!(
            name: "Minimal Client".to_string(),
            email: None,
            phone: None,
            address: None
        );

        let created_client = service
            .create_client_async(client_request, "test_user")
            .await?;

        assert_eq!(created_client.name, "Minimal Client");
        assert_eq!(created_client.email, None);
        assert_eq!(created_client.phone, None);
        assert_eq!(created_client.address, None);
        assert!(created_client.is_active);

        Ok(())
    }

    #[tokio::test]
    async fn test_create_client_empty_name() {
        let test_db = test_db!();
        let service = ClientService::new(test_db.db());

        let client_request = test_client!(name: "".to_string());

        let result = service
            .create_client_async(client_request, "test_user")
            .await;
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Name is required"));
    }

    #[tokio::test]
    async fn test_create_client_invalid_email() {
        let test_db = test_db!();
        let service = ClientService::new(test_db.db());

        let client_request = test_client!(
            name: "Invalid Email Client".to_string(),
            email: Some("invalid-email".to_string())
        );

        let result = service
            .create_client_async(client_request, "test_user")
            .await;
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Invalid email"));
    }

    #[tokio::test]
    async fn test_create_client_duplicate_email() {
        let test_db = test_db!();
        let service = ClientService::new(test_db.db());

        let client1_request = test_client!(
            name: "Client One".to_string(),
            email: Some("duplicate@company.com".to_string())
        );

        let client2_request = test_client!(
            name: "Client Two".to_string(),
            email: Some("duplicate@company.com".to_string())
        );

        // Create first client
        service
            .create_client_async(client1_request, "test_user")
            .await
            .unwrap();

        // Try to create second client with same email
        let result = service
            .create_client_async(client2_request, "test_user")
            .await;
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Email already exists"));
    }

    #[tokio::test]
    async fn test_update_client_success() -> AppResult<()> {
        let test_db = test_db!();
        let service = ClientService::new(test_db.db());

        // Create initial client
        let client_request = test_client!(
            name: "Original Client".to_string(),
            email: Some("original@company.com".to_string())
        );
        let created_client = service
            .create_client_async(client_request, "test_user")
            .await?;

        // Update client
        let update_request = crate::domains::clients::domain::models::client::UpdateClientRequest {
            id: created_client.id,
            name: Some("Updated Client".to_string()),
            email: Some("updated@company.com".to_string()),
            phone: Some("555-987-6543".to_string()),
            address: Some("456 New Address".to_string()),
            company: Some("Updated Company".to_string()),
            notes: Some("Updated notes".to_string()),
            is_active: Some(true),
        };

        let updated_client = service
            .update_client_async(update_request, "test_user")
            .await?;

        assert_eq!(updated_client.name, "Updated Client");
        assert_eq!(
            updated_client.email,
            Some("updated@company.com".to_string())
        );
        assert_eq!(updated_client.phone, Some("555-987-6543".to_string()));
        assert_eq!(updated_client.address, Some("456 New Address".to_string()));
        assert_eq!(updated_client.company, Some("Updated Company".to_string()));
        assert_eq!(updated_client.notes, Some("Updated notes".to_string()));
        assert!(updated_client.is_active);
        assert_ne!(updated_client.updated_at, created_client.updated_at);

        Ok(())
    }

    #[tokio::test]
    async fn test_update_nonexistent_client() {
        let test_db = test_db!();
        let service = ClientService::new(test_db.db());

        let update_request = crate::domains::clients::domain::models::client::UpdateClientRequest {
            id: "nonexistent-id".to_string(),
            name: Some("Updated".to_string()),
            ..Default::default()
        };

        let result = service
            .update_client_async(update_request, "test_user")
            .await;
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("not found"));
    }

    #[tokio::test]
    async fn test_deactivate_client() -> AppResult<()> {
        let test_db = test_db!();
        let service = ClientService::new(test_db.db());

        // Create client
        let client_request = test_client!(name: "Client to Deactivate".to_string());
        let created_client = service
            .create_client_async(client_request, "test_user")
            .await?;

        // Deactivate client
        let update_request = crate::domains::clients::domain::models::client::UpdateClientRequest {
            id: created_client.id,
            is_active: Some(false),
            ..Default::default()
        };

        let deactivated_client = service
            .update_client_async(update_request, "test_user")
            .await?;
        assert!(!deactivated_client.is_active);

        // Verify client is not returned in active queries
        let active_clients = service.list_active_clients_async(100, 0).await?;
        assert!(!active_clients.iter().any(|c| c.id == created_client.id));

        Ok(())
    }

    #[tokio::test]
    async fn test_get_client_by_id() -> AppResult<()> {
        let test_db = test_db!();
        let service = ClientService::new(test_db.db());

        // Create client
        let client_request = test_client!(
            name: "Client for Get".to_string(),
            email: Some("get@company.com".to_string())
        );
        let created_client = service
            .create_client_async(client_request, "test_user")
            .await?;

        // Get client by ID
        let retrieved_client = service.get_client_by_id_async(&created_client.id).await?;
        assert!(retrieved_client.is_some());

        let client = retrieved_client.unwrap();
        assert_eq!(client.id, created_client.id);
        assert_eq!(client.name, "Client for Get");
        assert_eq!(client.email, Some("get@company.com".to_string()));

        Ok(())
    }

    #[tokio::test]
    async fn test_get_client_by_nonexistent_id() -> AppResult<()> {
        let test_db = test_db!();
        let service = ClientService::new(test_db.db());

        let retrieved_client = service.get_client_by_id_async("nonexistent-id").await?;
        assert!(retrieved_client.is_none());

        Ok(())
    }

    #[tokio::test]
    async fn test_get_client_by_email() -> AppResult<()> {
        let test_db = test_db!();
        let service = ClientService::new(test_db.db());

        // Create client
        let client_request = test_client!(
            name: "Email Search Client".to_string(),
            email: Some("email@company.com".to_string())
        );
        let created_client = service
            .create_client_async(client_request, "test_user")
            .await?;

        // Get client by email
        let retrieved_client = service
            .get_client_by_email_async("email@company.com")
            .await?;
        assert!(retrieved_client.is_some());

        let client = retrieved_client.unwrap();
        assert_eq!(client.id, created_client.id);
        assert_eq!(client.email, Some("email@company.com".to_string()));

        // Test with nonexistent email
        let not_found = service
            .get_client_by_email_async("nonexistent@company.com")
            .await?;
        assert!(not_found.is_none());

        Ok(())
    }

    #[tokio::test]
    async fn test_list_clients_empty() -> AppResult<()> {
        let test_db = test_db!();
        let service = ClientService::new(test_db.db());

        let clients = service.list_clients_async(10, 0).await?;
        assert!(clients.is_empty());

        Ok(())
    }

    #[tokio::test]
    async fn test_list_clients_with_data() -> AppResult<()> {
        let test_db = test_db!();
        let service = ClientService::new(test_db.db());

        // Create multiple clients
        for i in 1..=5 {
            let client_request = test_client!(
                name: format!("Client {}", i),
                email: Some(format!("client{}@company.com", i))
            );
            service
                .create_client_async(client_request, "test_user")
                .await?;
        }

        // List clients
        let clients = service.list_clients_async(10, 0).await?;
        assert_eq!(clients.len(), 5);

        // Test pagination
        let clients_page1 = service.list_clients_async(2, 0).await?;
        let clients_page2 = service.list_clients_async(2, 2).await?;
        assert_eq!(clients_page1.len(), 2);
        assert_eq!(clients_page2.len(), 2);

        // Verify pagination works (different client IDs)
        let page1_ids: Vec<String> = clients_page1.iter().map(|c| c.id.clone()).collect();
        let page2_ids: Vec<String> = clients_page2.iter().map(|c| c.id.clone()).collect();

        // Ensure no overlap between pages
        for id1 in &page1_ids {
            assert!(!page2_ids.contains(id1));
        }

        Ok(())
    }

    #[tokio::test]
    async fn test_list_active_clients_only() -> AppResult<()> {
        let test_db = test_db!();
        let service = ClientService::new(test_db.db());

        // Create multiple clients
        let mut client_ids = Vec::new();
        for i in 1..=3 {
            let client_request = test_client!(name: format!("Client {}", i));
            let client = service
                .create_client_async(client_request, "test_user")
                .await?;
            client_ids.push(client.id);
        }

        // Deactivate one client
        let deactivate_request = crate::domains::clients::domain::models::client::UpdateClientRequest {
            id: client_ids[1].clone(),
            is_active: Some(false),
            ..Default::default()
        };
        service
            .update_client_async(deactivate_request, "test_user")
            .await?;

        // List active clients only
        let active_clients = service.list_active_clients_async(10, 0).await?;
        assert_eq!(active_clients.len(), 2);

        // Verify the deactivated client is not included
        assert!(!active_clients.iter().any(|c| c.id == client_ids[1]));
        assert!(active_clients.iter().any(|c| c.id == client_ids[0]));
        assert!(active_clients.iter().any(|c| c.id == client_ids[2]));

        Ok(())
    }

    #[tokio::test]
    async fn test_search_clients_by_name() -> AppResult<()> {
        let test_db = test_db!();
        let service = ClientService::new(test_db.db());

        // Create clients with different names
        let client1_request = test_client!(name: "Important Business Corp".to_string());
        let client2_request = test_client!(name: "Regular Company".to_string());
        let client3_request = test_client!(name: "Another Important LLC".to_string());

        service
            .create_client_async(client1_request, "test_user")
            .await?;
        service
            .create_client_async(client2_request, "test_user")
            .await?;
        service
            .create_client_async(client3_request, "test_user")
            .await?;

        // Search for "Important"
        let results = service.search_clients_async("Important", 10, 0).await?;
        assert_eq!(results.len(), 2);

        // Verify all results contain the search term
        for client in &results {
            assert!(client.name.contains("Important"));
        }

        Ok(())
    }

    #[tokio::test]
    async fn test_search_clients_by_email() -> AppResult<()> {
        let test_db = test_db!();
        let service = ClientService::new(test_db.db());

        // Create clients with different emails
        let client1_request = test_client!(
            name: "Client One".to_string(),
            email: Some("important@company.com".to_string())
        );
        let client2_request = test_client!(
            name: "Client Two".to_string(),
            email: Some("regular@company.com".to_string())
        );

        service
            .create_client_async(client1_request, "test_user")
            .await?;
        service
            .create_client_async(client2_request, "test_user")
            .await?;

        // Search by email domain
        let results = service.search_clients_async("@company.com", 10, 0).await?;
        assert_eq!(results.len(), 2);

        // Search by specific email
        let results = service
            .search_clients_async("important@company.com", 10, 0)
            .await?;
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].email, Some("important@company.com".to_string()));

        Ok(())
    }

    #[tokio::test]
    async fn test_delete_client_success() -> AppResult<()> {
        let test_db = test_db!();
        let service = ClientService::new(test_db.db());

        // Create client
        let client_request = test_client!(name: "Client to Delete".to_string());
        let created_client = service
            .create_client_async(client_request, "test_user")
            .await?;

        // Delete client
        let result = service
            .delete_client_async(&created_client.id, "test_user")
            .await?;
        assert!(result);

        // Verify client is deleted
        let deleted_client = service.get_client_by_id_async(&created_client.id).await?;
        assert!(deleted_client.is_none());

        Ok(())
    }

    #[tokio::test]
    async fn test_delete_nonexistent_client() -> AppResult<()> {
        let test_db = test_db!();
        let service = ClientService::new(test_db.db());

        let result = service
            .delete_client_async("nonexistent-id", "test_user")
            .await?;
        assert!(!result);

        Ok(())
    }

    #[tokio::test]
    async fn test_delete_client_with_tasks() {
        let test_db = test_db!();
        let service = ClientService::new(test_db.db());

        // Create client
        let client_request = test_client!(name: "Client with Tasks".to_string());
        let created_client = service
            .create_client_async(client_request, "test_user")
            .await
            .unwrap();

        // Create a task associated with this client
        let task_service =
            crate::domains::tasks::infrastructure::task_crud::TaskCrudService::new(test_db.db());
        let task_request = test_task!(
            title: "Task for Client".to_string(),
            client_id: Some(created_client.id.clone())
        );

        task_service
            .create_task_async(task_request, "test_user")
            .await
            .unwrap();

        // Try to delete client (should fail due to associated tasks)
        let result = service
            .delete_client_async(&created_client.id, "test_user")
            .await;
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .contains("Cannot delete client with associated tasks"));

        Ok(())
    }

    #[tokio::test]
    async fn test_client_statistics() -> AppResult<()> {
        let test_db = test_db!();
        let service = ClientService::new(test_db.db());
        let task_service =
            crate::domains::tasks::infrastructure::task_crud::TaskCrudService::new(test_db.db());

        // Create clients
        let client1_request = test_client!(name: "Active Client".to_string());
        let client2_request = test_client!(name: "Inactive Client".to_string());

        let client1 = service
            .create_client_async(client1_request, "test_user")
            .await?;
        let client2 = service
            .create_client_async(client2_request, "test_user")
            .await?;

        // Create tasks for first client
        for i in 1..=3 {
            let task_request = test_task!(
                title: format!("Task {}", i),
                client_id: Some(client1.id.clone())
            );
            task_service
                .create_task_async(task_request, "test_user")
                .await?;
        }

        // Create task for second client
        let task_request = test_task!(
            title: "Task for inactive client".to_string(),
            client_id: Some(client2.id.clone())
        );
        task_service
            .create_task_async(task_request, "test_user")
            .await?;

        // Get statistics
        let stats = service.get_client_statistics_async().await?;

        assert_eq!(stats.total_clients, 2);
        assert_eq!(stats.active_clients, 2);
        assert_eq!(stats.total_tasks, 4);

        // Deactivate second client
        let deactivate_request = crate::domains::clients::domain::models::client::UpdateClientRequest {
            id: client2.id,
            is_active: Some(false),
            ..Default::default()
        };
        service
            .update_client_async(deactivate_request, "test_user")
            .await?;

        // Get updated statistics
        let updated_stats = service.get_client_statistics_async().await?;
        assert_eq!(updated_stats.active_clients, 1);

        Ok(())
    }
}
