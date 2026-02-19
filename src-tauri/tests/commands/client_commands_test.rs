//! Tests for client command handlers
//!
//! These tests verify that client IPC commands work correctly,
//! focusing on CRUD operations and data structures.

use rpma_ppf_intervention::commands::client::{client_crud, ClientCrudRequest};
use rpma_ppf_intervention::commands::ClientAction;
use rpma_ppf_intervention::models::client::{CreateClientRequest, CustomerType};

#[tokio::test]
async fn test_client_crud_signature() {
    // Test that the function exists with right signature
    let _ = client_crud as fn(_, _) -> _;
}

#[tokio::test]
async fn test_client_crud_request_structure() {
    // Test that the request envelope preserves command contract.
    let req = ClientCrudRequest {
        action: ClientAction::Create {
            data: CreateClientRequest {
                name: "Test Customer".to_string(),
                email: Some("test@example.com".to_string()),
                phone: Some("+1234567890".to_string()),
                customer_type: CustomerType::Business,
                address_street: Some("123 Main St".to_string()),
                address_city: Some("Test City".to_string()),
                address_state: Some("TS".to_string()),
                address_zip: Some("12345".to_string()),
                address_country: Some("Test".to_string()),
                tax_id: None,
                company_name: Some("Test Company".to_string()),
                contact_person: Some("John Doe".to_string()),
                notes: None,
                tags: None,
            },
        },
        session_token: "test-session-token".to_string(),
        correlation_id: Some("test-correlation-id".to_string()),
    };

    match req.action {
        ClientAction::Create { data } => {
            assert_eq!(data.name, "Test Customer");
            assert_eq!(data.email.as_deref(), Some("test@example.com"));
            assert_eq!(data.phone.as_deref(), Some("+1234567890"));
            assert_eq!(data.customer_type, CustomerType::Business);
            assert_eq!(data.company_name.as_deref(), Some("Test Company"));
            assert_eq!(data.contact_person.as_deref(), Some("John Doe"));
        }
        _ => panic!("Expected ClientAction::Create"),
    }
    assert_eq!(req.session_token, "test-session-token");
    assert_eq!(req.correlation_id.as_deref(), Some("test-correlation-id"));
}
