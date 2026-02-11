//! Testing utilities for the RPMA intervention system
//!
//! This module provides common testing utilities, fixtures, and helpers
//! for writing unit and integration tests across the codebase.

use crate::commands::AppResult;
use crate::db::Database;
use crate::models::client::*;
use crate::models::intervention::*;
use crate::models::step::*;
use crate::models::task::*;

use chrono::Utc;
use rusqlite::params;
use std::sync::Arc;
use tempfile::TempDir;

/// Test database fixture that provides a clean in-memory database for each test
pub struct TestDatabase {
    pub temp_dir: TempDir,
    pub db: Arc<Database>,
}

impl TestDatabase {
    /// Create a new test database with fresh schema
    pub fn new() -> AppResult<Self> {
        let temp_dir = tempfile::tempdir().map_err(|e| e.to_string())?;
        let db_path = temp_dir.path().join("test.db");

        let db = Arc::new(Database::new(
            db_path.as_path(),
            "test_encryption_key_32_bytes_long!",
        )?);

        // Initialize database schema
        db.init()?;

        // Apply all migrations
        let latest_version = crate::db::Database::get_latest_migration_version();
        db.migrate(latest_version)?;

        let now = Utc::now().timestamp_millis();
        db.execute(
            r#"
            INSERT OR IGNORE INTO users
            (id, email, username, password_hash, full_name, role, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
            params![
                "test_user",
                "test_user@example.com",
                "test_user",
                "test_password_hash",
                "Test User",
                "technician",
                1,
                now,
                now
            ],
        )?;

        Ok(TestDatabase { temp_dir, db })
    }

    /// Get a reference to the database
    pub fn db(&self) -> Arc<Database> {
        self.db.clone()
    }
}

/// Create an async in-memory database for tests
pub async fn setup_test_db() -> Database {
    Database::new_in_memory()
        .await
        .expect("Failed to create in-memory database")
}

/// Create a synchronous in-memory database for legacy tests
///
/// Prefer using `setup_test_db` in async tests to avoid runtime creation here.
pub fn setup_test_db_sync() -> Database {
    match tokio::runtime::Handle::try_current() {
        Ok(handle) => handle
            .block_on(Database::new_in_memory())
            .expect("Failed to create in-memory database"),
        Err(_) => tokio::runtime::Runtime::new()
            .expect("Failed to create tokio runtime")
            .block_on(Database::new_in_memory())
            .expect("Failed to create in-memory database"),
    }
}

/// Test data factory for creating test fixtures
pub struct TestDataFactory;

impl TestDataFactory {
    /// Create a test task with default values
    pub fn create_test_task(overrides: Option<CreateTaskRequest>) -> CreateTaskRequest {
        if let Some(overrides) = overrides {
            return overrides;
        }

        CreateTaskRequest {
            // Required fields
            vehicle_plate: "ABC123".to_string(),
            vehicle_model: "Test Model".to_string(),
            ppf_zones: vec!["front".to_string(), "rear".to_string()],
            scheduled_date: "2025-01-15".to_string(),

            // Optional fields
            external_id: None,
            status: Some(TaskStatus::Draft),
            technician_id: None,
            start_time: None,
            end_time: None,
            checklist_completed: Some(false),
            notes: Some("Test notes".to_string()),

            title: Some("Test Task".to_string()),
            vehicle_make: Some("Test Make".to_string()),
            vehicle_year: Some("2023".to_string()),
            vin: Some("1HGCM82633A004352".to_string()),
            date_rdv: None,
            heure_rdv: None,
            lot_film: None,
            customer_name: Some("Test Customer".to_string()),
            customer_email: Some("test@example.com".to_string()),
            customer_phone: Some("555-1234".to_string()),
            customer_address: Some("123 Test St".to_string()),
            custom_ppf_zones: None,
            template_id: None,
            workflow_id: None,
            task_number: None,
            creator_id: Some("test_user".to_string()),
            created_by: Some("test_user".to_string()),

            // Legacy fields
            description: Some("Test task description".to_string()),
            priority: Some(TaskPriority::Medium),
            client_id: None,
            estimated_duration: Some(120),
            tags: Some("test,important".to_string()),
        }
    }

    /// Create a test client
    pub fn create_test_client(overrides: Option<CreateClientRequest>) -> CreateClientRequest {
        if let Some(overrides) = overrides {
            return overrides;
        }

        CreateClientRequest {
            name: "Test Client".to_string(),
            email: Some("testclient@example.com".to_string()),
            phone: Some("555-5678".to_string()),
            customer_type: CustomerType::Individual,
            address_street: Some("456 Client Ave".to_string()),
            address_city: Some("Test City".to_string()),
            address_state: Some("Test State".to_string()),
            address_zip: Some("12345".to_string()),
            address_country: Some("Test Country".to_string()),
            tax_id: None,
            company_name: None,
            contact_person: None,
            notes: None,
            tags: None,
        }
    }

    /// Create a test intervention
    pub fn create_test_intervention(overrides: Option<Intervention>) -> Intervention {
        if let Some(overrides) = overrides {
            return overrides;
        }

        let task_id = uuid::Uuid::new_v4().to_string();
        let task_number = format!("TASK-{:04}", rand::random::<u16>());
        let mut intervention = Intervention::new(task_id, task_number, "XYZ789".to_string());

        intervention.status = InterventionStatus::Pending;
        intervention.vehicle_model = Some("Intervention Model".to_string());
        intervention.vehicle_make = Some("Intervention Make".to_string());
        intervention.vehicle_year = Some(2023);
        intervention.vehicle_color = Some("Blue".to_string());
        intervention.vehicle_vin = Some("2HGCM82633A004352".to_string());
        intervention.client_id = Some(uuid::Uuid::new_v4().to_string());
        intervention.client_name = Some("Test Client".to_string());
        intervention.client_email = Some("client@example.com".to_string());
        intervention.client_phone = Some("555-9999".to_string());
        intervention.technician_id = Some(uuid::Uuid::new_v4().to_string());
        intervention.technician_name = Some("Test Technician".to_string());
        intervention.intervention_type = InterventionType::Ppf;
        intervention.current_step = 0;
        intervention.completion_percentage = 0.0;
        intervention.ppf_zones_config = Some(vec!["full".to_string()]);
        intervention.ppf_zones_extended = None;
        intervention.film_type = Some(crate::models::common::FilmType::Premium);
        intervention.film_brand = Some("TestFilm".to_string());
        intervention.film_model = Some("Premium-100".to_string());
        intervention.scheduled_at = crate::models::common::TimestampString::now();
        intervention.started_at = crate::models::common::TimestampString::new(None);
        intervention.completed_at = crate::models::common::TimestampString::new(None);
        intervention.paused_at = crate::models::common::TimestampString::new(None);
        intervention.estimated_duration = Some(180);
        intervention.actual_duration = None;
        intervention.weather_condition = None;
        intervention.lighting_condition = None;
        intervention.work_location = None;
        intervention.temperature_celsius = None;
        intervention.humidity_percentage = None;
        intervention.start_location_lat = None;
        intervention.start_location_lon = None;
        intervention.start_location_accuracy = None;
        intervention.end_location_lat = None;
        intervention.end_location_lon = None;
        intervention.end_location_accuracy = None;
        intervention.customer_satisfaction = None;
        intervention.quality_score = None;
        intervention.final_observations = None;
        intervention.customer_signature = None;
        intervention.customer_comments = None;
        intervention.metadata = None;
        intervention.notes = Some("Test intervention notes".to_string());
        intervention.special_instructions = None;
        intervention.device_info = None;
        intervention.app_version = Some("1.0.0".to_string());
        intervention.synced = false;
        intervention.last_synced_at = None;
        intervention.sync_error = None;
        intervention.created_at = crate::models::common::now();
        intervention.updated_at = crate::models::common::now();
        intervention.created_by = Some("test_user".to_string());
        intervention.updated_by = Some("test_user".to_string());

        intervention
    }

    /// Create a test intervention step
    pub fn create_test_step(
        intervention_id: &str,
        step_number: i32,
        overrides: Option<InterventionStep>,
    ) -> InterventionStep {
        if let Some(overrides) = overrides {
            return overrides;
        }

        let mut step = InterventionStep::new(
            intervention_id.to_string(),
            step_number,
            format!("Test Step {}", step_number),
            StepType::Inspection,
        );
        step.description = Some(format!("Description for test step {}", step_number));
        step.step_status = StepStatus::Pending;
        step.quality_checkpoints =
            Some(vec!["surface_clean".to_string(), "no_bubbles".to_string()]);
        step.is_mandatory = true;
        step.requires_photos = true;
        step.min_photos_required = 1;
        step.max_photos_allowed = 5;
        step.estimated_duration_seconds = Some(30 * 60);
        step.notes = Some(format!("Notes for test step {}", step_number));
        step
    }
}

/// Macro for creating test database fixtures
#[macro_export]
macro_rules! test_db {
    () => {
        $crate::test_utils::TestDatabase::new().expect("Failed to create test database")
    };
}

/// Macro for creating test tasks with custom values
#[macro_export]
macro_rules! test_task {
    ($($field:ident: $value:expr),*) => {{
        let mut task = $crate::test_utils::TestDataFactory::create_test_task(None);
        $(
            task.$field = $value;
        )*
        task
    }};
}

/// Macro for creating test clients with custom values
#[macro_export]
macro_rules! test_client {
    ($($field:ident: $value:expr),*) => {{
        let mut client = $crate::test_utils::TestDataFactory::create_test_client(None);
        $(
            client.$field = $value;
        )*
        client
    }};
}

/// Macro for creating test interventions with custom values
#[macro_export]
macro_rules! test_intervention {
    ($($field:ident: $value:expr),*) => {{
        let mut intervention = $crate::test_utils::TestDataFactory::create_test_intervention(None);
        $(
            intervention.$field = $value;
        )*
        intervention
    }};
}

/// Assert that two results match
pub fn assert_result_eq<T: PartialEq + std::fmt::Debug>(
    result1: &Result<T, String>,
    result2: &Result<T, String>,
) {
    match (result1, result2) {
        (Ok(val1), Ok(val2)) => assert_eq!(val1, val2),
        (Err(err1), Err(err2)) => assert_eq!(err1, err2),
        _ => panic!("Results don't match: {:?} vs {:?}", result1, result2),
    }
}

/// Assert that a result contains an error with a specific message
pub fn assert_error_contains(result: &Result<String, String>, expected_message: &str) {
    match result {
        Err(msg) if msg.contains(expected_message) => (),
        Err(msg) => panic!(
            "Expected error containing '{}', but got: '{}'",
            expected_message, msg
        ),
        Ok(_) => panic!("Expected error, but got Ok"),
    }
}

/// Helper to create a mock database connection for testing
pub fn create_mock_db() -> Arc<Database> {
    // This would typically create an in-memory SQLite database
    // or a mock implementation of the Database trait
    let db = Database::new(":memory:", "test_encryption_key_32_bytes_long!")
        .expect("Failed to create mock database");
    db.init().expect("Failed to initialize mock database");
    Arc::new(db)
}

/// Helper to count rows in a table
pub fn count_table_rows(db: &Database, table_name: &str) -> AppResult<i64> {
    let conn = db.get_connection()?;
    let count: i64 = conn
        .query_row(&format!("SELECT COUNT(*) FROM {}", table_name), [], |row| {
            row.get(0)
        })
        .map_err(|e| e.to_string())?;

    Ok(count)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_test_database_creation() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let row_count = count_table_rows(&test_db.db, "tasks").expect("Failed to count rows");
        assert_eq!(row_count, 0, "Test database should start empty");
    }

    #[test]
    fn test_test_data_factory() {
        let task = TestDataFactory::create_test_task(None);
        assert_eq!(task.title.as_deref(), Some("Test Task"));
        assert_eq!(task.status, Some(TaskStatus::Draft));
        assert_eq!(task.priority, Some(TaskPriority::Medium));

        let client = TestDataFactory::create_test_client(None);
        assert_eq!(client.name, "Test Client");

        let intervention = TestDataFactory::create_test_intervention(None);
        assert_eq!(intervention.intervention_type, InterventionType::Ppf);
        assert_eq!(intervention.status, InterventionStatus::Pending);
    }

    #[test]
    fn test_macros() {
        let task = test_task!(
            title: Some("Custom Task".to_string()),
            priority: Some(TaskPriority::High)
        );
        assert_eq!(task.title.as_deref(), Some("Custom Task"));
        assert_eq!(task.priority, Some(TaskPriority::High));

        let client =
            test_client!(name: "Custom Client".to_string(), phone: Some("555-0000".to_string()));
        assert_eq!(client.name, "Custom Client");
        assert_eq!(client.phone, Some("555-0000".to_string()));
    }

    #[test]
    fn test_assertions() {
        let result1: Result<String, String> = Ok("test".to_string());
        let result2: Result<String, String> = Ok("test".to_string());
        assert_result_eq(&result1, &result2);

        let error_result: Result<String, String> = Err("test error".to_string());
        assert_error_contains(&error_result, "test error");
    }
}
