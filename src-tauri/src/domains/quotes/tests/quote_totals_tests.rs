use super::*;
use crate::domains::quotes::domain::models::quote::*;
use crate::domains::quotes::infrastructure::quote_repository::QuoteRepository;
use crate::shared::contracts::auth::UserRole;
use crate::shared::repositories::cache::Cache;
use std::sync::Arc;

fn setup_service() -> (QuoteService, Arc<crate::db::Database>) {
    let db = Arc::new(crate::test_utils::setup_test_db_sync());
    let cache = Arc::new(Cache::new(100));
    let repo = Arc::new(QuoteRepository::new(db.clone(), cache));
    let event_bus = Arc::new(crate::shared::services::event_bus::InMemoryEventBus::new());
    let service = QuoteService::new(repo as Arc<dyn IQuoteRepository>, event_bus);

    let now = chrono::Utc::now().timestamp_millis();
    db.execute(
        r#"INSERT INTO clients (id, name, email, customer_type, total_tasks, active_tasks, completed_tasks, created_at, updated_at, synced)
           VALUES ('client-totals', 'Totals Client', 'totals@example.com', 'individual', 0, 0, 0, ?, ?, 0)"#,
        rusqlite::params![now, now],
    )
    .expect("insert test client");

    (service, db)
}

fn make_item_req(unit_price: i64, qty: f64, tax_rate: f64) -> CreateQuoteItemRequest {
    CreateQuoteItemRequest {
        kind: QuoteItemKind::Service,
        label: "Test item".to_string(),
        description: None,
        qty,
        unit_price,
        tax_rate: Some(tax_rate),
        material_id: None,
        position: Some(0),
    }
}

#[test]
fn test_rounding_line_total() {
    // qty=1.5, unit_price=333 cents → exact = 499.5 → rounded = 500
    let (service, _db) = setup_service();
    let req = CreateQuoteRequest {
        client_id: "client-totals".to_string(),
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
            label: "Rounded item".to_string(),
            description: None,
            qty: 1.5,
            unit_price: 333,
            tax_rate: None,
            material_id: None,
            position: Some(0),
        }],
    };
    let quote = service
        .create_quote(req, "test-user", &UserRole::Admin)
        .unwrap();
    // 1.5 * 333 = 499.5 → rounds to 500
    assert_eq!(quote.subtotal, 500);
}

#[test]
fn test_percentage_discount_rounds_correctly() {
    let (service, _db) = setup_service();
    let req = CreateQuoteRequest {
        client_id: "client-totals".to_string(),
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
        items: vec![make_item_req(10001, 1.0, 0.0)],
    };
    let quote = service
        .create_quote(req, "test-user", &UserRole::Admin)
        .unwrap();
    // Apply 10% discount: 10001 * 0.10 = 1000.1 → rounds to 1000
    let updated = service
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
    assert_eq!(updated.discount_amount, Some(1000));
    assert_eq!(updated.subtotal, 10001 - 1000);
}

#[test]
fn test_fixed_discount_capped_at_subtotal() {
    let (service, _db) = setup_service();
    let req = CreateQuoteRequest {
        client_id: "client-totals".to_string(),
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
        items: vec![make_item_req(1000, 1.0, 0.0)],
    };
    let quote = service
        .create_quote(req, "test-user", &UserRole::Admin)
        .unwrap();
    // discount_value > subtotal: capped at subtotal
    let updated = service
        .update_quote(
            &quote.id,
            UpdateQuoteRequest {
                valid_until: None,
                description: None,
                notes: None,
                terms: None,
                discount_type: Some("fixed".to_string()),
                discount_value: Some(99999), // way more than subtotal
                vehicle_plate: None,
                vehicle_make: None,
                vehicle_model: None,
                vehicle_year: None,
                vehicle_vin: None,
            },
            &UserRole::Admin,
        )
        .unwrap();
    assert_eq!(updated.subtotal, 0);
    assert_eq!(updated.total, 0);
}

#[test]
fn test_zero_items_all_totals_zero() {
    let (service, _db) = setup_service();
    let req = CreateQuoteRequest {
        client_id: "client-totals".to_string(),
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
    let quote = service
        .create_quote(req, "test-user", &UserRole::Admin)
        .unwrap();
    assert_eq!(quote.subtotal, 0);
    assert_eq!(quote.tax_total, 0);
    assert_eq!(quote.total, 0);
}
