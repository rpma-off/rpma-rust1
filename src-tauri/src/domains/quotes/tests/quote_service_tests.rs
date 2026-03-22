//! Unit tests for `QuoteService`.

use super::*;
use crate::db::Database;
use crate::domains::quotes::infrastructure::quote_repository::QuoteRepository;
use crate::shared::contracts::auth::UserRole;
use crate::shared::repositories::cache::Cache;

fn setup_service() -> (QuoteService, Arc<Database>) {
    let db = Arc::new(crate::test_utils::setup_test_db_sync());
    let cache = Arc::new(Cache::new(100));
    let repo = Arc::new(QuoteRepository::new(db.clone(), cache));
    let event_bus = Arc::new(crate::shared::services::event_bus::InMemoryEventBus::new());
    let service = QuoteService::new(repo as Arc<dyn IQuoteRepository>, event_bus);

    // Insert test client
    let now = chrono::Utc::now().timestamp_millis();
    db.execute(
        r#"INSERT INTO clients (id, name, email, customer_type, total_tasks, active_tasks, completed_tasks, created_at, updated_at, synced)
           VALUES ('test-client', 'Test Client', 'test@example.com', 'individual', 0, 0, 0, ?, ?, 0)"#,
        rusqlite::params![now, now],
    )
    .expect("insert test client");

    (service, db)
}

async fn setup_service_async() -> (QuoteService, Arc<Database>) {
    let db = Arc::new(
        Database::new_in_memory()
            .await
            .expect("create in-memory db"),
    );
    let cache = Arc::new(Cache::new(100));
    let repo = Arc::new(QuoteRepository::new(db.clone(), cache));
    let event_bus = Arc::new(crate::shared::services::event_bus::InMemoryEventBus::new());
    let service = QuoteService::new(repo as Arc<dyn IQuoteRepository>, event_bus);

    let now = chrono::Utc::now().timestamp_millis();
    db.execute(
        r#"INSERT INTO clients (id, name, email, customer_type, total_tasks, active_tasks, completed_tasks, created_at, updated_at, synced)
           VALUES ('test-client', 'Test Client', 'test@example.com', 'individual', 0, 0, 0, ?, ?, 0)"#,
        rusqlite::params![now, now],
    )
    .expect("insert test client");

    (service, db)
}

fn make_quote_req(client_id: &str) -> CreateQuoteRequest {
    CreateQuoteRequest {
        client_id: client_id.to_string(),
        task_id: None,
        description: None,
        valid_until: None,
        notes: None,
        terms: None,
        discount_type: None,
        discount_value: None,
        vehicle_plate: None,
        vehicle_make: None,
        vehicle_model: None,
        vehicle_year: None,
        vehicle_vin: None,
        items: vec![],
    }
}

fn make_item(label: &str, unit_price: i64, qty: f64, tax_rate: f64) -> CreateQuoteItemRequest {
    CreateQuoteItemRequest {
        kind: QuoteItemKind::Service,
        label: label.to_string(),
        description: None,
        qty,
        unit_price,
        tax_rate: Some(tax_rate),
        material_id: None,
        position: Some(0),
    }
}

#[test]
fn test_create_quote_with_items_calculates_totals() {
    let (service, _db) = setup_service();

    let req = CreateQuoteRequest {
        client_id: "test-client".to_string(),
        task_id: None,
        description: None,
        valid_until: None,
        notes: None,
        terms: None,
        discount_type: None,
        discount_value: None,
        vehicle_plate: Some("ABC123".to_string()),
        vehicle_make: None,
        vehicle_model: None,
        vehicle_year: None,
        vehicle_vin: None,
        items: vec![
            CreateQuoteItemRequest {
                kind: QuoteItemKind::Service,
                label: "PPF Full Hood".to_string(),
                description: None,
                qty: 1.0,
                unit_price: 50000, // 500.00
                tax_rate: Some(20.0),
                material_id: None,
                position: Some(0),
            },
            CreateQuoteItemRequest {
                kind: QuoteItemKind::Material,
                label: "Film PPF".to_string(),
                description: None,
                qty: 2.0,
                unit_price: 10000, // 100.00
                tax_rate: Some(20.0),
                material_id: None,
                position: Some(1),
            },
        ],
    };

    let quote = service
        .create_quote(req, "test-user", &UserRole::Admin)
        .unwrap();
    assert_eq!(quote.items.len(), 2);
    // subtotal = 50000 + 2*10000 = 70000
    assert_eq!(quote.subtotal, 70000);
    // tax = 50000*0.2 + 20000*0.2 = 10000 + 4000 = 14000
    assert_eq!(quote.tax_total, 14000);
    assert_eq!(quote.total, 84000);
}

#[test]
fn test_create_quote_with_missing_client_returns_validation() {
    let (service, _db) = setup_service();

    let req = CreateQuoteRequest {
        client_id: "missing-client".to_string(),
        task_id: None,
        description: None,
        valid_until: None,
        notes: None,
        terms: None,
        discount_type: None,
        discount_value: None,
        vehicle_plate: None,
        vehicle_make: None,
        vehicle_model: None,
        vehicle_year: None,
        vehicle_vin: None,
        items: vec![],
    };

    let result = service.create_quote(req, "test-user", &UserRole::Admin);
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("introuvable"));
}

#[test]
fn test_create_quote_with_existing_client_succeeds() {
    let (service, _db) = setup_service();

    let req = make_quote_req("test-client");
    let quote = service
        .create_quote(req, "test-user", &UserRole::Admin)
        .unwrap();
    assert_eq!(quote.client_id, "test-client");
}

#[test]
fn test_update_forbidden_when_not_draft() {
    let (service, _db) = setup_service();

    let req = make_quote_req("test-client");
    let quote = service
        .create_quote(req, "test-user", &UserRole::Admin)
        .unwrap();

    // Need items to mark as sent
    service
        .add_item(
            &quote.id,
            make_item("PPF", 10000, 1.0, 20.0),
            &UserRole::Admin,
        )
        .unwrap();

    // Mark as sent
    service.mark_sent(&quote.id, &UserRole::Admin).unwrap();

    // Try to update - should fail
    let result = service.update_quote(
        &quote.id,
        UpdateQuoteRequest {
            valid_until: None,
            description: None,
            notes: Some("new notes".to_string()),
            terms: None,
            discount_type: None,
            discount_value: None,
            vehicle_plate: None,
            vehicle_make: None,
            vehicle_model: None,
            vehicle_year: None,
            vehicle_vin: None,
        },
        &UserRole::Admin,
    );
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("draft"));
}

#[tokio::test]
async fn test_mark_accepted_from_sent_succeeds() {
    let (service, _db) = setup_service_async().await;

    let req = make_quote_req("test-client");
    let quote = service
        .create_quote(req, "test-user", &UserRole::Admin)
        .unwrap();

    // Add item and mark sent first
    service
        .add_item(
            &quote.id,
            make_item("PPF", 10000, 1.0, 20.0),
            &UserRole::Admin,
        )
        .unwrap();
    service.mark_sent(&quote.id, &UserRole::Admin).unwrap();

    let result = service
        .mark_accepted(&quote.id, "accepting-user", &UserRole::Admin)
        .unwrap();
    assert_eq!(result.quote.status, QuoteStatus::Accepted);
}

#[test]
fn test_status_transitions() {
    let (service, _db) = setup_service();

    let req = make_quote_req("test-client");
    let quote = service
        .create_quote(req, "test-user", &UserRole::Admin)
        .unwrap();
    assert_eq!(quote.status, QuoteStatus::Draft);

    // Cannot accept a draft directly
    let result = service.mark_accepted(&quote.id, "test-user", &UserRole::Admin);
    assert!(result.is_err());

    // Cannot reject a draft (changed behavior: only from Sent now)
    let result = service.mark_rejected(&quote.id, "test-user", &UserRole::Admin);
    assert!(result.is_err());
    let err = result.unwrap_err();
    assert!(
        err.contains("envoyé"),
        "Expected 'envoyé' in error, got: {}",
        err
    );
}

#[tokio::test]
async fn test_mark_rejected_from_sent_succeeds() {
    let (service, _db) = setup_service_async().await;

    let req = make_quote_req("test-client");
    let quote = service
        .create_quote(req, "test-user", &UserRole::Admin)
        .unwrap();

    // Add item, mark sent, then reject
    service
        .add_item(
            &quote.id,
            make_item("PPF", 10000, 1.0, 20.0),
            &UserRole::Admin,
        )
        .unwrap();
    service.mark_sent(&quote.id, &UserRole::Admin).unwrap();

    let rejected = service
        .mark_rejected(&quote.id, "test-user", &UserRole::Admin)
        .unwrap();
    assert_eq!(rejected.status, QuoteStatus::Rejected);
}

#[test]
fn test_mark_sent_with_no_items_fails() {
    let (service, _db) = setup_service();

    let req = make_quote_req("test-client");
    let quote = service
        .create_quote(req, "test-user", &UserRole::Admin)
        .unwrap();

    // Try to send empty quote
    let result = service.mark_sent(&quote.id, &UserRole::Admin);
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("sans lignes"));
}

#[test]
fn test_mark_sent_with_zero_total_fails() {
    let (service, _db) = setup_service();

    let req = CreateQuoteRequest {
        client_id: "test-client".to_string(),
        task_id: None,
        description: None,
        valid_until: None,
        notes: None,
        terms: None,
        discount_type: None,
        discount_value: None,
        vehicle_plate: None,
        vehicle_make: None,
        vehicle_model: None,
        vehicle_year: None,
        vehicle_vin: None,
        items: vec![CreateQuoteItemRequest {
            kind: QuoteItemKind::Service,
            label: "Free item".to_string(),
            description: None,
            qty: 1.0,
            unit_price: 0, // zero price
            tax_rate: None,
            material_id: None,
            position: Some(0),
        }],
    };

    let quote = service
        .create_quote(req, "test-user", &UserRole::Admin)
        .unwrap();
    let result = service.mark_sent(&quote.id, &UserRole::Admin);
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("total nul"));
}

#[test]
fn test_mark_expired_from_draft_succeeds() {
    let (service, _db) = setup_service();

    let req = make_quote_req("test-client");
    let quote = service
        .create_quote(req, "test-user", &UserRole::Admin)
        .unwrap();

    let expired = service.mark_expired(&quote.id, &UserRole::Admin).unwrap();
    assert_eq!(expired.status, QuoteStatus::Expired);
}

#[tokio::test]
async fn test_mark_expired_from_accepted_fails() {
    let (service, _db) = setup_service_async().await;

    let req = make_quote_req("test-client");
    let quote = service
        .create_quote(req, "test-user", &UserRole::Admin)
        .unwrap();
    service
        .add_item(
            &quote.id,
            make_item("PPF", 10000, 1.0, 20.0),
            &UserRole::Admin,
        )
        .unwrap();
    service.mark_sent(&quote.id, &UserRole::Admin).unwrap();
    service
        .mark_accepted(&quote.id, "user", &UserRole::Admin)
        .unwrap();

    let result = service.mark_expired(&quote.id, &UserRole::Admin);
    assert!(result.is_err());
}

#[test]
fn test_soft_delete_preserves_data() {
    let (service, db) = setup_service();

    let req = make_quote_req("test-client");
    let quote = service
        .create_quote(req, "test-user", &UserRole::Admin)
        .unwrap();
    let quote_id = quote.id.clone();

    // Delete (soft)
    let deleted = service.delete_quote(&quote_id, &UserRole::Admin).unwrap();
    assert!(deleted);

    // Not visible via service
    let found = service.get_quote(&quote_id).unwrap();
    assert!(found.is_none());

    // But exists in DB with deleted_at set
    let row_exists: i64 = db
        .query_single_value(
            "SELECT COUNT(*) FROM quotes WHERE id = ? AND deleted_at IS NOT NULL",
            rusqlite::params![quote_id],
        )
        .unwrap();
    assert_eq!(row_exists, 1);
}

#[test]
fn test_duplicate_creates_new_draft_with_items() {
    let (service, _db) = setup_service();

    let req = CreateQuoteRequest {
        client_id: "test-client".to_string(),
        task_id: None,
        description: None,
        valid_until: None,
        notes: Some("Original notes".to_string()),
        terms: None,
        discount_type: None,
        discount_value: None,
        vehicle_plate: Some("ABC123".to_string()),
        vehicle_make: None,
        vehicle_model: None,
        vehicle_year: None,
        vehicle_vin: None,
        items: vec![
            make_item("PPF Hood", 50000, 1.0, 20.0),
            make_item("Film", 10000, 2.0, 20.0),
        ],
    };

    let original = service
        .create_quote(req, "test-user", &UserRole::Admin)
        .unwrap();
    let dup = service
        .duplicate_quote(&original.id, "test-user", &UserRole::Admin)
        .unwrap();

    assert_ne!(dup.id, original.id);
    assert_ne!(dup.quote_number, original.quote_number);
    assert_eq!(dup.status, QuoteStatus::Draft);
    assert_eq!(dup.client_id, original.client_id);
    assert_eq!(dup.items.len(), original.items.len());
    assert_eq!(dup.subtotal, original.subtotal);
    assert_eq!(dup.total, original.total);
    assert!(dup.task_id.is_none()); // unlinked
}

#[test]
fn test_list_filters() {
    let (service, _db) = setup_service();

    // Create 3 quotes
    for _ in 0..3 {
        let req = make_quote_req("test-client");
        service
            .create_quote(req, "test-user", &UserRole::Admin)
            .unwrap();
    }

    let list = service
        .list_quotes(&QuoteQuery {
            client_id: Some("test-client".to_string()),
            ..Default::default()
        })
        .unwrap();

    assert_eq!(list.total, 3);
    assert_eq!(list.data.len(), 3);
}

#[test]
fn test_discount_calculation_percentage() {
    let (service, _db) = setup_service();

    let req = CreateQuoteRequest {
        client_id: "test-client".to_string(),
        task_id: None,
        description: None,
        valid_until: None,
        notes: None,
        terms: None,
        discount_type: None,
        discount_value: None,
        vehicle_plate: None,
        vehicle_make: None,
        vehicle_model: None,
        vehicle_year: None,
        vehicle_vin: None,
        items: vec![CreateQuoteItemRequest {
            kind: QuoteItemKind::Service,
            label: "PPF Service".to_string(),
            description: None,
            qty: 1.0,
            unit_price: 10000, // $100.00
            tax_rate: Some(20.0),
            material_id: None,
            position: Some(0),
        }],
    };

    let quote = service
        .create_quote(req, "test-user", &UserRole::Admin)
        .unwrap();
    // subtotal = 10000
    assert_eq!(quote.subtotal, 10000);

    // Apply 10% discount
    let updated = service
        .update_quote(
            &quote.id,
            UpdateQuoteRequest {
                valid_until: None,
                description: None,
                notes: None,
                terms: None,
                discount_type: Some("percentage".to_string()),
                discount_value: Some(10), // 10%
                vehicle_plate: None,
                vehicle_make: None,
                vehicle_model: None,
                vehicle_year: None,
                vehicle_vin: None,
            },
            &UserRole::Admin,
        )
        .unwrap();

    // subtotal after 10% discount = 9000
    assert_eq!(updated.subtotal, 9000);
    // discount_amount = 1000
    assert_eq!(updated.discount_amount, Some(1000));
    // tax = 20% on 9000 = 1800
    assert_eq!(updated.tax_total, 1800);
    // total = 9000 + 1800 = 10800
    assert_eq!(updated.total, 10800);
}

#[test]
fn test_discount_calculation_fixed() {
    let (service, _db) = setup_service();

    let req = CreateQuoteRequest {
        client_id: "test-client".to_string(),
        task_id: None,
        description: None,
        valid_until: None,
        notes: None,
        terms: None,
        discount_type: None,
        discount_value: None,
        vehicle_plate: None,
        vehicle_make: None,
        vehicle_model: None,
        vehicle_year: None,
        vehicle_vin: None,
        items: vec![CreateQuoteItemRequest {
            kind: QuoteItemKind::Service,
            label: "PPF Service".to_string(),
            description: None,
            qty: 1.0,
            unit_price: 10000, // $100.00
            tax_rate: Some(20.0),
            material_id: None,
            position: Some(0),
        }],
    };

    let quote = service
        .create_quote(req, "test-user", &UserRole::Admin)
        .unwrap();
    // subtotal = 10000
    assert_eq!(quote.subtotal, 10000);

    // Apply $5 fixed discount
    let updated = service
        .update_quote(
            &quote.id,
            UpdateQuoteRequest {
                valid_until: None,
                description: None,
                notes: None,
                terms: None,
                discount_type: Some("fixed".to_string()),
                discount_value: Some(500), // $5.00
                vehicle_plate: None,
                vehicle_make: None,
                vehicle_model: None,
                vehicle_year: None,
                vehicle_vin: None,
            },
            &UserRole::Admin,
        )
        .unwrap();

    // subtotal after $5 discount = 9500
    assert_eq!(updated.subtotal, 9500);
    // discount_amount = 500
    assert_eq!(updated.discount_amount, Some(500));
    // tax = 20% on 9500 = 1900
    assert_eq!(updated.tax_total, 1900);
    // total = 9500 + 1900 = 11400
    assert_eq!(updated.total, 11400);
}

#[test]
fn test_discount_validation_percentage_over_100() {
    let (service, _db) = setup_service();

    let req = make_quote_req("test-client");
    let quote = service
        .create_quote(req, "test-user", &UserRole::Admin)
        .unwrap();

    // Try to apply 150% discount - should fail
    let result = service.update_quote(
        &quote.id,
        UpdateQuoteRequest {
            valid_until: None,
            description: None,
            notes: None,
            terms: None,
            discount_type: Some("percentage".to_string()),
            discount_value: Some(150), // 150% - should fail
            vehicle_plate: None,
            vehicle_make: None,
            vehicle_model: None,
            vehicle_year: None,
            vehicle_vin: None,
        },
        &UserRole::Admin,
    );

    assert!(result.is_err());
    assert!(result.unwrap_err().contains("exceed 100%"));
}

#[test]
fn test_remove_discount() {
    let (service, _db) = setup_service();

    let req = CreateQuoteRequest {
        client_id: "test-client".to_string(),
        task_id: None,
        description: None,
        valid_until: None,
        notes: None,
        terms: None,
        discount_type: None,
        discount_value: None,
        vehicle_plate: None,
        vehicle_make: None,
        vehicle_model: None,
        vehicle_year: None,
        vehicle_vin: None,
        items: vec![CreateQuoteItemRequest {
            kind: QuoteItemKind::Service,
            label: "PPF Service".to_string(),
            description: None,
            qty: 1.0,
            unit_price: 10000,
            tax_rate: Some(20.0),
            material_id: None,
            position: Some(0),
        }],
    };

    let quote = service
        .create_quote(req, "test-user", &UserRole::Admin)
        .unwrap();

    // Apply 10% discount
    let discounted = service
        .update_quote(
            &quote.id,
            UpdateQuoteRequest {
                valid_until: None,
                description: None,
                notes: None,
                terms: None,
                discount_type: Some("percentage".to_string()),
                discount_value: Some(10),
                vehicle_plate: None,
                vehicle_make: None,
                vehicle_model: None,
                vehicle_year: None,
                vehicle_vin: None,
            },
            &UserRole::Admin,
        )
        .unwrap();

    assert_eq!(discounted.subtotal, 9000);
    assert_eq!(discounted.discount_amount, Some(1000));

    // Remove discount
    let no_discount = service
        .update_quote(
            &quote.id,
            UpdateQuoteRequest {
                valid_until: None,
                description: None,
                notes: None,
                terms: None,
                discount_type: None,
                discount_value: Some(0),
                vehicle_plate: None,
                vehicle_make: None,
                vehicle_model: None,
                vehicle_year: None,
                vehicle_vin: None,
            },
            &UserRole::Admin,
        )
        .unwrap();

    // Should return to original values
    assert_eq!(no_discount.subtotal, 10000);
    assert_eq!(no_discount.discount_amount, Some(0));
    assert_eq!(no_discount.tax_total, 2000);
    assert_eq!(no_discount.total, 12000);
}

#[test]
fn test_quote_number_uses_max_not_count() {
    let (service, _db) = setup_service();

    // Create and delete (soft) a quote
    let req = make_quote_req("test-client");
    let q1 = service
        .create_quote(req, "test-user", &UserRole::Admin)
        .unwrap();
    assert_eq!(q1.quote_number, "DEV-00001");

    service.delete_quote(&q1.id, &UserRole::Admin).unwrap();

    // Next quote should be DEV-00002, not DEV-00001 (COUNT vs MAX)
    let req2 = make_quote_req("test-client");
    let q2 = service
        .create_quote(req2, "test-user", &UserRole::Admin)
        .unwrap();
    assert_eq!(q2.quote_number, "DEV-00002");
}

// ── Transaction boundary regression tests ───────────────────────────────────

/// Regression: `create_quote` must persist quote row AND items in a single
/// atomic transaction.  After a successful call the quote and all its items
/// must be readable from the database.
#[test]
fn test_create_quote_and_items_are_atomic() {
    let (service, db) = setup_service();

    let req = CreateQuoteRequest {
        client_id: "test-client".to_string(),
        task_id: None,
        description: None,
        valid_until: None,
        notes: None,
        terms: None,
        discount_type: None,
        discount_value: None,
        vehicle_plate: None,
        vehicle_make: None,
        vehicle_model: None,
        vehicle_year: None,
        vehicle_vin: None,
        items: vec![
            make_item("Service A", 5000, 1.0, 20.0),
            make_item("Service B", 3000, 2.0, 20.0),
        ],
    };

    let quote = service
        .create_quote(req, "test-user", &UserRole::Admin)
        .unwrap();

    // Both the quote row and its items must exist in the DB.
    let item_count: i64 = db
        .query_single_value(
            "SELECT COUNT(*) FROM quote_items WHERE quote_id = ?",
            rusqlite::params![quote.id],
        )
        .expect("query item count");
    assert_eq!(
        item_count, 2,
        "both items must be persisted atomically with the quote"
    );

    let quote_row_count: i64 = db
        .query_single_value(
            "SELECT COUNT(*) FROM quotes WHERE id = ?",
            rusqlite::params![quote.id],
        )
        .expect("query quote count");
    assert_eq!(quote_row_count, 1, "quote row must be persisted");
}

/// Regression: `convert_to_task` must update both `task_id` and `status` in a
/// single atomic transaction.  After a successful call both fields must reflect
/// the new values.
#[tokio::test]
async fn test_convert_to_task_is_atomic() {
    let (service, db) = setup_service_async().await;

    // Create a quote and advance it to Accepted.
    let req = make_quote_req("test-client");
    let quote = service
        .create_quote(req, "test-user", &UserRole::Admin)
        .unwrap();
    service
        .add_item(
            &quote.id,
            make_item("PPF Hood", 50000, 1.0, 20.0),
            &UserRole::Admin,
        )
        .unwrap();
    service.mark_sent(&quote.id, &UserRole::Admin).unwrap();
    service
        .mark_accepted(&quote.id, "test-user", &UserRole::Admin)
        .unwrap();

    let task_id = "task-uuid-001";
    let task_number = "T-00001";
    // Seed the task row so the FK constraint on quotes.task_id is satisfied.
    {
        let now = chrono::Utc::now().timestamp_millis();
        db.execute(
            r#"INSERT INTO tasks (id, task_number, title, vehicle_plate, vehicle_model, ppf_zones, scheduled_date, status, priority, created_at, updated_at, synced)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)"#,
            rusqlite::params![task_id, task_number, "Seed task", "AA-000-AA", "Model X", r#"["front"]"#, "2025-01-01", "draft", "medium", now, now],
        ).expect("seed task row");
    }
    let result = service
        .convert_to_task(
            &quote.id,
            task_id,
            task_number,
            "conversion-user",
            &UserRole::Admin,
        )
        .unwrap();

    // Both status and task_id must be updated together.
    assert_eq!(
        result.quote.status,
        QuoteStatus::Converted,
        "status must be Converted"
    );
    assert_eq!(
        result.quote.task_id.as_deref(),
        Some(task_id),
        "task_id must be linked"
    );

    // Verify directly from the database so there is no dependency on the
    // returned DTO being accurate.
    let (db_status, db_task_id): (String, Option<String>) = db
        .get_connection()
        .expect("connection")
        .query_row(
            "SELECT status, task_id FROM quotes WHERE id = ?",
            rusqlite::params![quote.id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .expect("query quote row");

    assert_eq!(db_status, "converted", "DB status must be 'converted'");
    assert_eq!(
        db_task_id.as_deref(),
        Some(task_id),
        "DB task_id must be set"
    );
}

#[tokio::test]
async fn test_convert_to_task_emits_event_with_current_actor() {
    use crate::shared::services::domain_event::DomainEvent;
    use crate::shared::services::event_bus::EventHandler;
    use async_trait::async_trait;
    use std::sync::Mutex;

    struct CaptureHandler {
        converted_by: Arc<Mutex<Option<String>>>,
    }

    #[async_trait]
    impl EventHandler for CaptureHandler {
        async fn handle(&self, event: &DomainEvent) -> Result<(), String> {
            if let DomainEvent::QuoteConverted { converted_by, .. } = event {
                let mut slot = self.converted_by.lock().expect("capture mutex");
                *slot = Some(converted_by.clone());
            }
            Ok(())
        }

        fn interested_events(&self) -> Vec<&'static str> {
            vec![DomainEvent::QUOTE_CONVERTED]
        }
    }

    let db = Arc::new(
        Database::new_in_memory()
            .await
            .expect("create in-memory db"),
    );
    let cache = Arc::new(Cache::new(100));
    let repo = Arc::new(QuoteRepository::new(db.clone(), cache));
    let event_bus = Arc::new(crate::shared::services::event_bus::InMemoryEventBus::new());
    let captured_actor = Arc::new(Mutex::new(None));
    event_bus.register_handler(CaptureHandler {
        converted_by: captured_actor.clone(),
    });
    let service = QuoteService::new(repo as Arc<dyn IQuoteRepository>, event_bus);

    let now = chrono::Utc::now().timestamp_millis();
    db.execute(
        r#"INSERT INTO clients (id, name, email, customer_type, total_tasks, active_tasks, completed_tasks, created_at, updated_at, synced)
           VALUES ('test-client', 'Test Client', 'test@example.com', 'individual', 0, 0, 0, ?, ?, 0)"#,
        rusqlite::params![now, now],
    )
    .expect("insert test client");

    let req = make_quote_req("test-client");
    let quote = service
        .create_quote(req, "quote-creator", &UserRole::Admin)
        .expect("create quote");
    service
        .add_item(
            &quote.id,
            make_item("PPF Hood", 50000, 1.0, 20.0),
            &UserRole::Admin,
        )
        .expect("add item");
    service
        .mark_sent(&quote.id, &UserRole::Admin)
        .expect("mark sent");
    service
        .mark_accepted(&quote.id, "acceptor-user", &UserRole::Admin)
        .expect("mark accepted");

    let task_id = "task-uuid-actor-001";
    let task_number = "T-00099";
    db.execute(
        r#"INSERT INTO tasks (id, task_number, title, vehicle_plate, vehicle_model, ppf_zones, scheduled_date, status, priority, created_at, updated_at, synced)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)"#,
        rusqlite::params![task_id, task_number, "Seed task", "AA-000-AA", "Model X", r#"["front"]"#, "2025-01-01", "draft", "medium", now, now],
    )
    .expect("seed task row");

    service
        .convert_to_task(
            &quote.id,
            task_id,
            task_number,
            "conversion-actor-user",
            &UserRole::Admin,
        )
        .expect("convert to task");

    tokio::time::sleep(std::time::Duration::from_millis(100)).await;

    let actor = captured_actor
        .lock()
        .expect("capture mutex")
        .clone()
        .expect("quote converted event actor");
    assert_eq!(actor, "conversion-actor-user");
}
