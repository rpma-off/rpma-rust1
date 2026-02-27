use crate::db::Database;
use crate::domains::clients::domain::models::client::{CreateClientRequest, CustomerType};
use crate::domains::clients::infrastructure::client::ClientService;
use crate::domains::clients::ClientsFacade;
use crate::shared::ipc::errors::AppError;
use std::sync::Arc;

#[tokio::test]
async fn validate_client_id_rejects_empty_string() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = Arc::new(ClientService::new_with_db(db));
    let facade = ClientsFacade::new(service);
    let err = facade.validate_client_id("").unwrap_err();
    assert!(matches!(err, AppError::Validation(_)));
}

#[tokio::test]
async fn validate_client_id_rejects_whitespace_only() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = Arc::new(ClientService::new_with_db(db));
    let facade = ClientsFacade::new(service);
    let err = facade.validate_client_id("   ").unwrap_err();
    assert!(matches!(err, AppError::Validation(_)));
}

#[tokio::test]
async fn validate_create_request_rejects_empty_name() {
    let req = CreateClientRequest {
        name: "".to_string(),
        email: Some("test@example.com".to_string()),
        phone: None,
        customer_type: CustomerType::Individual,
        address_street: None,
        address_city: None,
        address_state: None,
        address_zip: None,
        address_country: None,
        tax_id: None,
        company_name: None,
        contact_person: None,
        notes: None,
        tags: None,
    };
    let result = CreateClientRequest::validate(&req);
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("required"));
}

#[tokio::test]
async fn validate_create_request_rejects_name_too_long() {
    let req = CreateClientRequest {
        name: "a".repeat(101),
        email: None,
        phone: None,
        customer_type: CustomerType::Individual,
        address_street: None,
        address_city: None,
        address_state: None,
        address_zip: None,
        address_country: None,
        tax_id: None,
        company_name: None,
        contact_person: None,
        notes: None,
        tags: None,
    };
    let result = CreateClientRequest::validate(&req);
    assert!(result.is_err());
}

#[tokio::test]
async fn validate_create_request_rejects_invalid_email() {
    let req = CreateClientRequest {
        name: "Test Client".to_string(),
        email: Some("not-an-email".to_string()),
        phone: None,
        customer_type: CustomerType::Individual,
        address_street: None,
        address_city: None,
        address_state: None,
        address_zip: None,
        address_country: None,
        tax_id: None,
        company_name: None,
        contact_person: None,
        notes: None,
        tags: None,
    };
    let result = CreateClientRequest::validate(&req);
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("email"));
}

#[tokio::test]
async fn create_client_rejects_duplicate_email() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = ClientService::new_with_db(db);

    let req = CreateClientRequest {
        name: "First Client".to_string(),
        email: Some("dup@example.com".to_string()),
        phone: None,
        customer_type: CustomerType::Individual,
        address_street: None,
        address_city: None,
        address_state: None,
        address_zip: None,
        address_country: None,
        tax_id: None,
        company_name: None,
        contact_person: None,
        notes: None,
        tags: None,
    };

    // First creation should succeed
    let first = service.create_client(req.clone(), "user-1").await;
    assert!(first.is_ok(), "First client creation should succeed");
    let created = first.unwrap();
    assert_eq!(created.name, "First Client");
    assert_eq!(created.email.as_deref(), Some("dup@example.com"));

    // Second creation with the same email should fail
    let second_req = CreateClientRequest {
        name: "Second Client".to_string(),
        ..req
    };
    let second = service.create_client(second_req, "user-1").await;
    assert!(second.is_err(), "Duplicate email should be rejected");
    assert!(
        second.unwrap_err().contains("already exists"),
        "Error should mention duplicate"
    );
}
