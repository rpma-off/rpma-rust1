//! Unit tests for `QuoteService`.

use super::*;
use crate::db::Database;
use crate::domains::quotes::infrastructure::quote_repository::QuoteRepository;
use crate::shared::repositories::cache::Cache;

fn setup_service() -> (QuoteService, Arc<Database>) {
    let db = Arc::new(crate::test_utils::setup_test_db_sync());
    let cache = Arc::new(Cache::new(100));
    let repo = Arc::new(QuoteRepository::new(db.clone(), cache));
    let event_bus = Arc::new(crate::shared::services::event_system::InMemoryEventBus::new());
    let service = QuoteService::new(repo, db.clone(), event_bus);

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

fn make_quote_req(client_id: &str) -> CreateQuoteRequest {
    CreateQuoteRequest {
        client_id: client_id.to_string(),
        task_id: None,
        valid_until: None,
        notes: None,
        terms: None,
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
        valid_until: None,
        notes: None,
        terms: None,
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

    let quote = service.create_quote(req, "test-user").unwrap();
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
        valid_until: None,
        notes: None,
        terms: None,
        vehicle_plate: None,
        vehicle_make: None,
        vehicle_model: None,
        vehicle_year: None,
        vehicle_vin: None,
        items: vec![],
    };

    let result = service.create_quote(req, "test-user");
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("Client introuvable"));
}

#[test]
fn test_create_quote_with_existing_client_succeeds() {
    let (service, _db) = setup_service();

    let req = make_quote_req("test-client");
    let quote = service.create_quote(req, "test-user").unwrap();
    assert_eq!(quote.client_id, "test-client");
}

#[test]
fn test_update_forbidden_when_not_draft() {
    let (service, _db) = setup_service();

    let req = make_quote_req("test-client");
    let quote = service.create_quote(req, "test-user").unwrap();

    // Need items to mark as sent
    service
        .add_item(&quote.id, make_item("PPF", 10000, 1.0, 20.0))
        .unwrap();

    // Mark as sent
    service.mark_sent(&quote.id).unwrap();

    // Try to update - should fail
    let result = service.update_quote(
        &quote.id,
        UpdateQuoteRequest {
            valid_until: None,
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
    );
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("draft"));
}

#[test]
fn test_mark_accepted_from_sent_succeeds() {
    let (service, _db) = setup_service();

    let req = make_quote_req("test-client");
    let quote = service.create_quote(req, "test-user").unwrap();

    // Add item and mark sent first
    service
        .add_item(&quote.id, make_item("PPF", 10000, 1.0, 20.0))
        .unwrap();
    service.mark_sent(&quote.id).unwrap();

    let result = service.mark_accepted(&quote.id, "accepting-user").unwrap();
    assert_eq!(result.quote.status, QuoteStatus::Accepted);
}

#[test]
fn test_status_transitions() {
    let (service, _db) = setup_service();

    let req = make_quote_req("test-client");
    let quote = service.create_quote(req, "test-user").unwrap();
    assert_eq!(quote.status, QuoteStatus::Draft);

    // Cannot accept a draft directly
    let result = service.mark_accepted(&quote.id, "test-user");
    assert!(result.is_err());

    // Cannot reject a draft (changed behavior: only from Sent now)
    let result = service.mark_rejected(&quote.id, "test-user");
    assert!(result.is_err());
    let err = result.unwrap_err();
    assert!(
        err.contains("envoyé"),
        "Expected 'envoyé' in error, got: {}",
        err
    );
}

#[test]
fn test_mark_rejected_from_sent_succeeds() {
    let (service, _db) = setup_service();

    let req = make_quote_req("test-client");
    let quote = service.create_quote(req, "test-user").unwrap();

    // Add item, mark sent, then reject
    service
        .add_item(&quote.id, make_item("PPF", 10000, 1.0, 20.0))
        .unwrap();
    service.mark_sent(&quote.id).unwrap();

    let rejected = service.mark_rejected(&quote.id, "test-user").unwrap();
    assert_eq!(rejected.status, QuoteStatus::Rejected);
}

#[test]
fn test_mark_sent_with_no_items_fails() {
    let (service, _db) = setup_service();

    let req = make_quote_req("test-client");
    let quote = service.create_quote(req, "test-user").unwrap();

    // Try to send empty quote
    let result = service.mark_sent(&quote.id);
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("sans lignes"));
}

#[test]
fn test_mark_sent_with_zero_total_fails() {
    let (service, _db) = setup_service();

    let req = CreateQuoteRequest {
        client_id: "test-client".to_string(),
        task_id: None,
        valid_until: None,
        notes: None,
        terms: None,
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

    let quote = service.create_quote(req, "test-user").unwrap();
    let result = service.mark_sent(&quote.id);
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("total nul"));
}

#[test]
fn test_mark_expired_from_draft_succeeds() {
    let (service, _db) = setup_service();

    let req = make_quote_req("test-client");
    let quote = service.create_quote(req, "test-user").unwrap();

    let expired = service.mark_expired(&quote.id).unwrap();
    assert_eq!(expired.status, QuoteStatus::Expired);
}

#[test]
fn test_mark_expired_from_accepted_fails() {
    let (service, _db) = setup_service();

    let req = make_quote_req("test-client");
    let quote = service.create_quote(req, "test-user").unwrap();
    service
        .add_item(&quote.id, make_item("PPF", 10000, 1.0, 20.0))
        .unwrap();
    service.mark_sent(&quote.id).unwrap();
    service.mark_accepted(&quote.id, "user").unwrap();

    let result = service.mark_expired(&quote.id);
    assert!(result.is_err());
}

#[test]
fn test_soft_delete_preserves_data() {
    let (service, db) = setup_service();

    let req = make_quote_req("test-client");
    let quote = service.create_quote(req, "test-user").unwrap();
    let quote_id = quote.id.clone();

    // Delete (soft)
    let deleted = service.delete_quote(&quote_id).unwrap();
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
        valid_until: None,
        notes: Some("Original notes".to_string()),
        terms: None,
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

    let original = service.create_quote(req, "test-user").unwrap();
    let dup = service.duplicate_quote(&original.id, "test-user").unwrap();

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
        service.create_quote(req, "test-user").unwrap();
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
        valid_until: None,
        notes: None,
        terms: None,
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

    let quote = service.create_quote(req, "test-user").unwrap();
    // subtotal = 10000
    assert_eq!(quote.subtotal, 10000);

    // Apply 10% discount
    let updated = service
        .update_quote(
            &quote.id,
            UpdateQuoteRequest {
                valid_until: None,
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
        valid_until: None,
        notes: None,
        terms: None,
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

    let quote = service.create_quote(req, "test-user").unwrap();
    // subtotal = 10000
    assert_eq!(quote.subtotal, 10000);

    // Apply $5 fixed discount
    let updated = service
        .update_quote(
            &quote.id,
            UpdateQuoteRequest {
                valid_until: None,
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
    let quote = service.create_quote(req, "test-user").unwrap();

    // Try to apply 150% discount - should fail
    let result = service.update_quote(
        &quote.id,
        UpdateQuoteRequest {
            valid_until: None,
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
        valid_until: None,
        notes: None,
        terms: None,
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

    let quote = service.create_quote(req, "test-user").unwrap();

    // Apply 10% discount
    let discounted = service
        .update_quote(
            &quote.id,
            UpdateQuoteRequest {
                valid_until: None,
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
    let q1 = service.create_quote(req, "test-user").unwrap();
    assert_eq!(q1.quote_number, "DEV-00001");

    service.delete_quote(&q1.id).unwrap();

    // Next quote should be DEV-00002, not DEV-00001 (COUNT vs MAX)
    let req2 = make_quote_req("test-client");
    let q2 = service.create_quote(req2, "test-user").unwrap();
    assert_eq!(q2.quote_number, "DEV-00002");
}
