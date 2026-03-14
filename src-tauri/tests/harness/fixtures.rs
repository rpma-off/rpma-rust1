//! Test data factories for common domain entities.
//!
//! Provides minimal, valid fixture objects for the most frequently
//! tested domain entities.  Every factory function accepts a
//! discriminator string so callers can create multiple distinct
//! instances in the same test without ID collisions.
//!
//! # Usage
//!
//! ```rust,no_run
//! use harness::fixtures;
//!
//! let client_req  = fixtures::client_fixture("acme");
//! let task_req    = fixtures::task_fixture("PLATE-001");
//! let unique      = fixtures::unique_id();
//! ```

use rpma_ppf_intervention::shared::services::cross_domain::{
    CreateClientRequest, CreateTaskRequest, CustomerType, TaskStatus,
};
use uuid::Uuid;

// ── Identifiers ──────────────────────────────────────────────────────

/// Return a new random UUID string suitable for use as a test entity ID.
pub fn unique_id() -> String {
    Uuid::new_v4().to_string()
}

// ── Client ───────────────────────────────────────────────────────────

/// Build a minimal, valid [`CreateClientRequest`] identified by `name`.
///
/// All optional fields are set to `None` so callers can override only
/// what matters for their test.
pub fn client_fixture(name: &str) -> CreateClientRequest {
    CreateClientRequest {
        name: name.to_string(),
        email: Some(format!(
            "{}@test.rpma",
            name.to_lowercase().replace(' ', "-")
        )),
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
    }
}

// ── Task ─────────────────────────────────────────────────────────────

/// Build a minimal, valid [`CreateTaskRequest`] for the given vehicle `plate`.
///
/// Status defaults to `Pending`.  All optional fields that are not
/// critical for basic task creation are set to `None`.
pub fn task_fixture(plate: &str) -> CreateTaskRequest {
    CreateTaskRequest {
        vehicle_plate: plate.to_string(),
        vehicle_model: "Test Model".to_string(),
        ppf_zones: vec!["hood".to_string()],
        scheduled_date: chrono::Utc::now().format("%Y-%m-%d").to_string(),
        external_id: None,
        status: Some(TaskStatus::Pending),
        technician_id: None,
        start_time: None,
        end_time: None,
        checklist_completed: Some(false),
        notes: None,
        title: Some(format!("Test task — {plate}")),
        vehicle_make: Some("Test Make".to_string()),
        vehicle_year: Some("2025".to_string()),
        vin: None,
        date_rdv: None,
        heure_rdv: None,
        lot_film: None,
        customer_name: None,
        customer_email: None,
        customer_phone: None,
        customer_address: None,
        custom_ppf_zones: None,
        template_id: None,
        workflow_id: None,
        task_number: None,
        creator_id: None,
        created_by: Some("test-harness".to_string()),
        description: None,
        priority: None,
        client_id: None,
        estimated_duration: Some(60),
        tags: None,
    }
}
