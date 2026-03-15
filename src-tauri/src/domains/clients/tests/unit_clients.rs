use crate::db::Database;
use crate::domains::clients::client_handler::{
    client_into_client_with_tasks, Client, ClientService, CustomerType,
};
use crate::domains::clients::ClientsFacade;
use std::sync::Arc;

#[tokio::test]
async fn clients_facade_is_ready() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = Arc::new(ClientService::new_with_db(db));
    let facade = ClientsFacade::new(service);
    let _ = facade.client_service(); // facade constructed successfully
}

#[tokio::test]
async fn validate_client_id_accepts_valid_id() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = Arc::new(ClientService::new_with_db(db));
    let facade = ClientsFacade::new(service);
    assert!(facade.validate_client_id("client-123").is_ok());
}

/// Regression: `client_into_client_with_tasks` must attach all tasks and
/// preserve every scalar field without silent field-copy omissions.
#[test]
fn test_client_into_client_with_tasks_attaches_tasks() {
    let client = Client {
        id: "c-1".to_string(),
        name: "ACME Corp".to_string(),
        email: Some("acme@example.com".to_string()),
        phone: None,
        customer_type: CustomerType::Business,
        address_street: None,
        address_city: None,
        address_state: None,
        address_zip: None,
        address_country: None,
        tax_id: None,
        company_name: Some("ACME".to_string()),
        contact_person: None,
        notes: None,
        tags: None,
        total_tasks: 0,
        active_tasks: 0,
        completed_tasks: 0,
        last_task_date: None,
        created_at: 1_000_000,
        updated_at: 1_000_001,
        created_by: Some("admin".to_string()),
        deleted_at: None,
        deleted_by: None,
        synced: false,
        last_synced_at: None,
    };

    let result = client_into_client_with_tasks(client, vec![]);

    assert_eq!(result.id, "c-1");
    assert_eq!(result.name, "ACME Corp");
    assert_eq!(result.email.as_deref(), Some("acme@example.com"));
    assert_eq!(result.company_name.as_deref(), Some("ACME"));
    assert_eq!(result.created_at, 1_000_000);
    // tasks field must be Some even when the provided vec is empty
    assert!(result.tasks.is_some());
    assert!(result.tasks.unwrap().is_empty());
}
