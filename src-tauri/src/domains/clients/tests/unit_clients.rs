use crate::db::Database;
use crate::domains::clients::client_handler::{
    client_into_client_with_tasks, Client, ClientService, CreateClientRequest, CustomerType,
};
use crate::domains::clients::client_handler::ClientsFacade;
use crate::shared::services::event_bus::InMemoryEventBus;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;

#[tokio::test]
async fn clients_facade_is_ready() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    #[allow(deprecated)]
    let service = Arc::new(ClientService::new_with_db(db));
    let facade = ClientsFacade::new(service);
    let _ = facade.client_service(); // facade constructed successfully
}

#[tokio::test]
async fn validate_client_id_accepts_valid_id() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    #[allow(deprecated)]
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

// ── Event publishing tests ────────────────────────────────────────────────────

/// A minimal event handler that counts ClientCreated events.
struct ClientEventCounter {
    created: Arc<AtomicUsize>,
    deactivated: Arc<AtomicUsize>,
}

#[async_trait::async_trait]
impl crate::shared::services::event_bus::EventHandler for ClientEventCounter {
    fn interested_events(&self) -> Vec<&'static str> {
        vec!["ClientCreated", "ClientDeactivated"]
    }

    async fn handle(
        &self,
        event: &crate::shared::services::domain_event::DomainEvent,
    ) -> Result<(), String> {
        use crate::shared::services::domain_event::DomainEvent;
        match event {
            DomainEvent::ClientCreated { .. } => {
                self.created.fetch_add(1, Ordering::SeqCst);
            }
            DomainEvent::ClientDeactivated { .. } => {
                self.deactivated.fetch_add(1, Ordering::SeqCst);
            }
            _ => {}
        }
        Ok(())
    }
}

#[tokio::test]
async fn test_create_client_publishes_client_created_event() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let event_bus = Arc::new(InMemoryEventBus::new());
    let created_counter = Arc::new(AtomicUsize::new(0));
    let counter = ClientEventCounter {
        created: created_counter.clone(),
        deactivated: Arc::new(AtomicUsize::new(0)),
    };
    event_bus.register_handler(counter);

    let cache = Arc::new(crate::shared::repositories::cache::Cache::new(256));
    let repo = Arc::new(crate::domains::clients::client_handler::repository::ClientRepository::new(
        db,
        cache,
    ));
    let service = ClientService::new(repo, event_bus);

    let req = CreateClientRequest {
        name: "Event Test Client".to_string(),
        email: Some("event@example.com".to_string()),
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

    let result = service.create_client(req, "user-1").await;
    assert!(result.is_ok(), "create_client must succeed");

    // Allow the async handler task to run.
    tokio::time::sleep(std::time::Duration::from_millis(50)).await;
    assert_eq!(
        created_counter.load(Ordering::SeqCst),
        1,
        "ClientCreated event must be published once"
    );
}

#[tokio::test]
async fn test_create_business_client_without_company_name_returns_error() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let event_bus = Arc::new(InMemoryEventBus::new());
    let cache = Arc::new(crate::shared::repositories::cache::Cache::new(256));
    let repo = Arc::new(crate::domains::clients::client_handler::repository::ClientRepository::new(
        db,
        cache,
    ));
    let service = ClientService::new(repo, event_bus);

    let req = CreateClientRequest {
        name: "Business Without Company".to_string(),
        email: None,
        phone: None,
        customer_type: CustomerType::Business,
        address_street: None,
        address_city: None,
        address_state: None,
        address_zip: None,
        address_country: None,
        tax_id: None,
        company_name: None,         // missing — required for business
        contact_person: Some("Alice".to_string()),
        notes: None,
        tags: None,
    };

    let result = service.create_client(req, "user-1").await;
    assert!(result.is_err(), "business client without company_name must be rejected");
    assert!(
        result.unwrap_err().contains("Company name"),
        "error message must mention Company name"
    );
}

#[tokio::test]
async fn test_create_business_client_without_contact_person_returns_error() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let event_bus = Arc::new(InMemoryEventBus::new());
    let cache = Arc::new(crate::shared::repositories::cache::Cache::new(256));
    let repo = Arc::new(crate::domains::clients::client_handler::repository::ClientRepository::new(
        db,
        cache,
    ));
    let service = ClientService::new(repo, event_bus);

    let req = CreateClientRequest {
        name: "Business Without Contact".to_string(),
        email: None,
        phone: None,
        customer_type: CustomerType::Business,
        address_street: None,
        address_city: None,
        address_state: None,
        address_zip: None,
        address_country: None,
        tax_id: None,
        company_name: Some("ACME Ltd".to_string()),
        contact_person: None,       // missing — required for business
        notes: None,
        tags: None,
    };

    let result = service.create_client(req, "user-1").await;
    assert!(result.is_err(), "business client without contact_person must be rejected");
    assert!(
        result.unwrap_err().contains("Contact person"),
        "error message must mention Contact person"
    );
}
