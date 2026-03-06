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
        items: vec![],
    };

    let quote = service.create_quote(req, "test-user").unwrap();
    assert_eq!(quote.client_id, "test-client");
}

#[test]
fn test_update_forbidden_when_not_draft() {
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
        items: vec![],
    };

    let quote = service.create_quote(req, "test-user").unwrap();

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
fn test_mark_accepted_creates_task_when_no_task_id() {
    let (service, _db) = setup_service();

    let req = CreateQuoteRequest {
        client_id: "test-client".to_string(),
        task_id: None,
        valid_until: None,
        notes: Some("Test notes".to_string()),
        terms: None,
        vehicle_plate: Some("XYZ789".to_string()),
        vehicle_make: None,
        vehicle_model: None,
        vehicle_year: None,
        vehicle_vin: None,
        items: vec![],
    };

    let quote = service.create_quote(req, "test-user").unwrap();
    service.mark_sent(&quote.id).unwrap();

    let result = service.mark_accepted(&quote.id).unwrap();
    assert!(result.task_created.is_some());
    assert!(!result.task_created.unwrap().task_id.is_empty());
    assert_eq!(result.quote.status, QuoteStatus::Accepted);
}

#[test]
fn test_status_transitions() {
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
        items: vec![],
    };

    let quote = service.create_quote(req, "test-user").unwrap();
    assert_eq!(quote.status, QuoteStatus::Draft);

    // Cannot accept a draft directly
    let result = service.mark_accepted(&quote.id);
    assert!(result.is_err());

    // Can reject a draft
    let rejected = service.mark_rejected(&quote.id).unwrap();
    assert_eq!(rejected.status, QuoteStatus::Rejected);
}

#[test]
fn test_list_filters() {
    let (service, _db) = setup_service();

    // Create 3 quotes
    for _ in 0..3 {
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
            items: vec![],
        };
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
        items: vec![],
    };

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
