//! Unit tests for client service

use rpma_ppf_intervention::db::Database;
use rpma_ppf_intervention::models::CustomerType;
use rpma_ppf_intervention::services::client::{
    Address, ClientQuery, ClientService, CreateClientRequest, UpdateClientRequest,
};
use std::sync::Arc;
use tokio::runtime::Runtime;

#[cfg(test)]
mod tests {
    use super::*;

    fn setup_test_db() -> Database {
        let temp_file = tempfile::NamedTempFile::new().unwrap();
        let mut db = Database::new(temp_file.path()).unwrap();
        db.init().unwrap();
        db
    }

    #[test]
    fn test_client_creation() {
        let db = setup_test_db();
        let client_service = ClientService::new(Arc::new(db));

        let request = CreateClientRequest {
            name: "Test Client".to_string(),
            email: Some("test@example.com".to_string()),
            phone: Some("123-456-7890".to_string()),
            customer_type: CustomerType::Individual,
            address: Some(Address {
                street: Some("123 Test St".to_string()),
                city: Some("Test City".to_string()),
                state: Some("Test State".to_string()),
                zip: Some("12345".to_string()),
                country: Some("Test Country".to_string()),
            }),
            tax_id: None,
            company_name: None,
            contact_person: None,
            notes: Some("Test notes".to_string()),
            tags: Some(vec!["test".to_string(), "client".to_string()]),
        };

        let result = client_service.create_client(request, "test-user".to_string());
        assert!(result.is_ok(), "Client creation should succeed");

        let client = result.unwrap();
        assert_eq!(client.name, "Test Client");
        assert_eq!(client.email, Some("test@example.com".to_string()));
        assert_eq!(client.customer_type, CustomerType::Individual);
        assert_eq!(client.notes, Some("Test notes".to_string()));
    }

    #[test]
    fn test_client_creation_validation() {
        let db = setup_test_db();
        let client_service = ClientService::new(Arc::new(db));

        // Test empty name
        let invalid_request = CreateClientRequest {
            name: "".to_string(),
            email: Some("test@example.com".to_string()),
            phone: None,
            customer_type: CustomerType::Individual,
            address: None,
            tax_id: None,
            company_name: None,
            contact_person: None,
            notes: None,
            tags: None,
        };

        let result = client_service.create_client(invalid_request, "test-user".to_string());
        assert!(
            result.is_err(),
            "Client creation should fail with empty name"
        );
        assert!(result.unwrap_err().contains("Name is required"));

        // Test invalid email
        let invalid_email_request = CreateClientRequest {
            name: "Test Client".to_string(),
            email: Some("invalid-email".to_string()),
            phone: None,
            customer_type: CustomerType::Individual,
            address: None,
            tax_id: None,
            company_name: None,
            contact_person: None,
            notes: None,
            tags: None,
        };

        let result = client_service.create_client(invalid_email_request, "test-user".to_string());
        assert!(
            result.is_err(),
            "Client creation should fail with invalid email"
        );
        assert!(result.unwrap_err().contains("Invalid email format"));
    }

    #[test]
    fn test_client_retrieval() {
        let db = setup_test_db();
        let client_service = ClientService::new(Arc::new(db));

        // Create client first
        let create_request = CreateClientRequest {
            name: "Test Client".to_string(),
            email: Some("test@example.com".to_string()),
            phone: None,
            customer_type: CustomerType::Business,
            address: None,
            tax_id: None,
            company_name: Some("Test Company".to_string()),
            contact_person: None,
            notes: None,
            tags: None,
        };
        let created_client = client_service
            .create_client(create_request, "test-user".to_string())
            .unwrap();

        // Retrieve client
        let retrieved_client = client_service.get_client(&created_client.id).unwrap();
        assert!(
            retrieved_client.is_some(),
            "Client retrieval should succeed"
        );

        let client = retrieved_client.unwrap();
        assert_eq!(client.id, created_client.id);
        assert_eq!(client.name, "Test Client");
        assert_eq!(client.customer_type, CustomerType::Business);
    }

    #[test]
    fn test_client_update() {
        let db = setup_test_db();
        let client_service = ClientService::new(Arc::new(db));

        // Create client first
        let create_request = CreateClientRequest {
            name: "Original Name".to_string(),
            email: Some("original@example.com".to_string()),
            phone: None,
            customer_type: CustomerType::Individual,
            address: None,
            tax_id: None,
            company_name: None,
            contact_person: None,
            notes: None,
            tags: None,
        };
        let created_client = client_service
            .create_client(create_request, "test-user".to_string())
            .unwrap();

        // Update client
        let update_request = UpdateClientRequest {
            id: created_client.id.clone(),
            name: Some("Updated Name".to_string()),
            email: Some("updated@example.com".to_string()),
            phone: Some("987-654-3210".to_string()),
            customer_type: Some(CustomerType::Business),
            address: Some(Address {
                street: Some("456 Updated St".to_string()),
                city: Some("Updated City".to_string()),
                state: None,
                zip: None,
                country: None,
            }),
            tax_id: None,
            company_name: Some("Updated Company".to_string()),
            contact_person: None,
            notes: Some("Updated notes".to_string()),
            tags: Some(vec!["updated".to_string()]),
        };
        let update_result = client_service.update_client(update_request, "test-user".to_string());
        assert!(update_result.is_ok(), "Client update should succeed");

        let updated_client = update_result.unwrap();
        assert_eq!(updated_client.name, "Updated Name");
        assert_eq!(
            updated_client.email,
            Some("updated@example.com".to_string())
        );
        assert_eq!(updated_client.phone, Some("987-654-3210".to_string()));
        assert_eq!(updated_client.customer_type, CustomerType::Business);
        assert_eq!(updated_client.notes, Some("Updated notes".to_string()));
    }

    #[test]
    fn test_client_deletion() {
        let db = setup_test_db();
        let client_service = ClientService::new(Arc::new(db));

        // Create client first
        let create_request = CreateClientRequest {
            name: "Test Client".to_string(),
            email: None,
            phone: None,
            customer_type: CustomerType::Individual,
            address: None,
            tax_id: None,
            company_name: None,
            contact_person: None,
            notes: None,
            tags: None,
        };
        let created_client = client_service
            .create_client(create_request, "test-user".to_string())
            .unwrap();

        // Delete client
        let delete_result =
            client_service.delete_client(&created_client.id, "test-user".to_string());
        assert!(delete_result.is_ok(), "Client deletion should succeed");

        // Verify client is soft deleted
        let retrieved_client = client_service.get_client(&created_client.id).unwrap();
        assert!(
            retrieved_client.is_none(),
            "Deleted client should not be retrievable"
        );
    }

    #[test]
    fn test_client_listing() {
        let db = setup_test_db();
        let client_service = ClientService::new(Arc::new(db));

        // Create multiple clients
        for i in 1..=5 {
            let create_request = CreateClientRequest {
                name: format!("Client {}", i),
                email: Some(format!("client{}@example.com", i)),
                phone: None,
                customer_type: if i % 2 == 0 {
                    CustomerType::Business
                } else {
                    CustomerType::Individual
                },
                address: None,
                tax_id: None,
                company_name: None,
                contact_person: None,
                notes: None,
                tags: None,
            };
            client_service
                .create_client(create_request, "test-user".to_string())
                .unwrap();
        }

        // List all clients
        let query = ClientQuery::default();
        let result = client_service.get_clients(query);
        assert!(result.is_ok(), "Client listing should succeed");

        let response = result.unwrap();
        assert_eq!(response.data.len(), 5, "Should return all 5 clients");
        assert_eq!(response.pagination.total, 5, "Total should be 5");
    }

    #[test]
    fn test_client_search() {
        let db = setup_test_db();
        let client_service = ClientService::new(Arc::new(db));

        // Create clients
        let create_request1 = CreateClientRequest {
            name: "John Doe".to_string(),
            email: Some("john@example.com".to_string()),
            phone: None,
            customer_type: CustomerType::Individual,
            address: None,
            tax_id: None,
            company_name: None,
            contact_person: None,
            notes: Some("Regular customer".to_string()),
            tags: None,
        };
        client_service
            .create_client(create_request1, "test-user".to_string())
            .unwrap();

        let create_request2 = CreateClientRequest {
            name: "Jane Smith".to_string(),
            email: Some("jane@example.com".to_string()),
            phone: None,
            customer_type: CustomerType::Business,
            address: None,
            tax_id: None,
            company_name: Some("Smith Corp".to_string()),
            contact_person: None,
            notes: None,
            tags: None,
        };
        client_service
            .create_client(create_request2, "test-user".to_string())
            .unwrap();

        // Search for "John"
        let search_result = client_service.search_clients("John", 1, 10);
        assert!(search_result.is_ok(), "Client search should succeed");
        let clients = search_result.unwrap();
        assert_eq!(clients.len(), 1, "Should find 1 client matching 'John'");
        assert_eq!(clients[0].name, "John Doe");
    }

    #[test]
    fn test_client_stats() {
        let db = setup_test_db();
        let client_service = ClientService::new(Arc::new(db));

        // Create clients
        for i in 1..=3 {
            let create_request = CreateClientRequest {
                name: format!("Client {}", i),
                email: None,
                phone: None,
                customer_type: if i == 1 {
                    CustomerType::Business
                } else {
                    CustomerType::Individual
                },
                address: None,
                tax_id: None,
                company_name: if i == 1 {
                    Some("Company".to_string())
                } else {
                    None
                },
                contact_person: None,
                notes: None,
                tags: None,
            };
            client_service
                .create_client(create_request, "test-user".to_string())
                .unwrap();
        }

        // Get stats
        let stats_result = client_service.get_client_stats();
        assert!(stats_result.is_ok(), "Client stats should succeed");

        let stats = stats_result.unwrap();
        assert_eq!(stats.total_clients, 3, "Should have 3 total clients");
        assert_eq!(
            stats.individual_clients, 2,
            "Should have 2 individual clients"
        );
        assert_eq!(stats.business_clients, 1, "Should have 1 business client");
    }

    #[tokio::test]
    async fn test_client_creation_async() {
        let db = setup_test_db();
        let client_service = ClientService::new(Arc::new(db));

        let request = CreateClientRequest {
            name: "Async Test Client".to_string(),
            email: Some("async@example.com".to_string()),
            phone: None,
            customer_type: CustomerType::Individual,
            address: None,
            tax_id: None,
            company_name: None,
            contact_person: None,
            notes: None,
            tags: None,
        };

        let result = client_service
            .create_client_async(request, "test-user")
            .await;
        assert!(result.is_ok(), "Async client creation should succeed");

        let client = result.unwrap();
        assert_eq!(client.name, "Async Test Client");
        assert_eq!(client.email, Some("async@example.com".to_string()));
    }

    #[tokio::test]
    async fn test_client_retrieval_async() {
        let db = setup_test_db();
        let client_service = ClientService::new(Arc::new(db));

        // Create client first
        let create_request = CreateClientRequest {
            name: "Async Client".to_string(),
            email: None,
            phone: None,
            customer_type: CustomerType::Individual,
            address: None,
            tax_id: None,
            company_name: None,
            contact_person: None,
            notes: None,
            tags: None,
        };
        let created_client = client_service
            .create_client_async(create_request, "test-user")
            .await
            .unwrap();

        // Retrieve client async
        let retrieved_client = client_service
            .get_client_async(&created_client.id)
            .await
            .unwrap();
        assert!(
            retrieved_client.is_some(),
            "Async client retrieval should succeed"
        );

        let client = retrieved_client.unwrap();
        assert_eq!(client.id, created_client.id);
        assert_eq!(client.name, "Async Client");
    }
}
