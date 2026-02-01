//! Testing utilities for the RPMA intervention system
//!
//! This module provides common testing utilities, fixtures, and helpers
//! for writing unit and integration tests across the codebase.

use crate::commands::AppResult;
use crate::db::Database;
use crate::models::client::*;
use crate::models::intervention::*;
use crate::models::task::*;

use chrono::Utc;
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

        let db = Arc::new(Database::new(&db_path.to_string_lossy())?);

        // Initialize database schema
        db.init()?;

        // Apply all migrations
        let latest_version = crate::db::migrations::Database::get_latest_migration_version();
        db.migrate(latest_version)?;

        Ok(TestDatabase { temp_dir, db })
    }

    /// Get a reference to the database
    pub fn db(&self) -> Arc<Database> {
        self.db.clone()
    }
}

/// Test data factory for creating test fixtures
pub struct TestDataFactory;

impl TestDataFactory {
    /// Create a test task with default values
    pub fn create_test_task(overrides: Option<CreateTaskRequest>) -> CreateTaskRequest {
        let mut task = CreateTaskRequest {
            title: "Test Task".to_string(),
            description: Some("Test task description".to_string()),
            vehicle_plate: Some("ABC123".to_string()),
            vehicle_model: Some("Test Model".to_string()),
            vehicle_make: Some("Test Make".to_string()),
            vehicle_year: Some("2023".to_string()),
            vin: Some("1HGCM82633A004352".to_string()),
            ppf_zones: Some("front,rear".to_string()),
            custom_ppf_zones: None,
            status: "draft".to_string(),
            priority: "medium".to_string(),
            technician_id: None,
            scheduled_date: None,
            client_id: None,
            customer_name: Some("Test Customer".to_string()),
            customer_email: Some("test@example.com".to_string()),
            customer_phone: Some("555-1234".to_string()),
            customer_address: Some("123 Test St".to_string()),
            estimated_duration: Some(120),
            notes: Some("Test notes".to_string()),
            tags: Some("test,important".to_string()),
            workflow_id: None,
            template_id: None,
        };

        if let Some(overrides) = overrides {
            // Apply overrides - simplified for brevity
            if !overrides.title.is_empty() {
                task.title = overrides.title;
            }
            if overrides.description.is_some() {
                task.description = overrides.description;
            }
            if overrides.vehicle_plate.is_some() {
                task.vehicle_plate = overrides.vehicle_plate;
            }
            // Apply other overrides as needed...
        }

        task
    }

    /// Create a test client
    pub fn create_test_client(overrides: Option<CreateClientRequest>) -> CreateClientRequest {
        let mut client = CreateClientRequest {
            name: "Test Client".to_string(),
            email: Some("testclient@example.com".to_string()),
            phone: Some("555-5678".to_string()),
            address: Some("456 Client Ave".to_string()),
            company: None,
            notes: None,
            is_active: true,
        };

        if let Some(overrides) = overrides {
            if !overrides.name.is_empty() {
                client.name = overrides.name;
            }
            if overrides.email.is_some() {
                client.email = overrides.email;
            }
            if overrides.phone.is_some() {
                client.phone = overrides.phone;
            }
        }

        client
    }

    /// Create a test intervention
    pub fn create_test_intervention(overrides: Option<Intervention>) -> Intervention {
        let mut intervention = Intervention {
            id: uuid::Uuid::new_v4().to_string(),
            task_id: uuid::Uuid::new_v4().to_string(),
            task_number: format!("TASK-{:04}", rand::random::<u16>()),
            status: InterventionStatus::Pending,
            vehicle_plate: "XYZ789".to_string(),
            vehicle_model: Some("Intervention Model".to_string()),
            vehicle_make: Some("Intervention Make".to_string()),
            vehicle_year: Some(2023),
            vehicle_color: Some("Blue".to_string()),
            vehicle_vin: Some("2HGCM82633A004352".to_string()),
            client_id: Some(uuid::Uuid::new_v4().to_string()),
            client_name: Some("Test Client".to_string()),
            client_email: Some("client@example.com".to_string()),
            client_phone: Some("555-9999".to_string()),
            technician_id: Some(uuid::Uuid::new_v4().to_string()),
            technician_name: Some("Test Technician".to_string()),
            intervention_type: "ppf".to_string(),
            current_step: 0,
            completion_percentage: 0.0,
            ppf_zones_config: Some("full".to_string()),
            ppf_zones_extended: None,
            film_type: Some("premium".to_string()),
            film_brand: Some("TestFilm".to_string()),
            film_model: Some("Premium-100".to_string()),
            scheduled_at: Some(Utc::now().timestamp_millis()),
            started_at: None,
            completed_at: None,
            paused_at: None,
            estimated_duration: Some(180),
            actual_duration: None,
            weather_condition: None,
            lighting_condition: None,
            work_location: None,
            temperature_celsius: None,
            humidity_percentage: None,
            start_location_lat: None,
            start_location_lon: None,
            start_location_accuracy: None,
            end_location_lat: None,
            end_location_lon: None,
            end_location_accuracy: None,
            customer_satisfaction: None,
            quality_score: None,
            final_observations: None,
            customer_signature: None,
            customer_comments: None,
            metadata: None,
            notes: Some("Test intervention notes".to_string()),
            special_instructions: None,
            device_info: None,
            app_version: Some("1.0.0".to_string()),
            synced: 0,
            last_synced_at: None,
            sync_error: None,
            created_at: Utc::now().timestamp_millis(),
            updated_at: Utc::now().timestamp_millis(),
            created_by: Some("test_user".to_string()),
            updated_by: Some("test_user".to_string()),
        };

        if let Some(overrides) = overrides {
            // Apply overrides - simplified for brevity
            if !overrides.task_id.is_empty() {
                intervention.task_id = overrides.task_id;
            }
            if !overrides.vehicle_plate.is_empty() {
                intervention.vehicle_plate = overrides.vehicle_plate;
            }
            if overrides.status != InterventionStatus::Pending {
                intervention.status = overrides.status;
            }
        }

        intervention
    }

    /// Create a test intervention step
    pub fn create_test_step(
        intervention_id: &str,
        step_number: i32,
        overrides: Option<InterventionStep>,
    ) -> InterventionStep {
        let mut step = InterventionStep {
            id: uuid::Uuid::new_v4().to_string(),
            intervention_id: intervention_id.to_string(),
            step_number,
            step_name: format!("Test Step {}", step_number),
            step_description: Some(format!("Description for test step {}", step_number)),
            step_status: InterventionStepStatus::Pending,
            photo_requirements: Some(vec!["before".to_string(), "after".to_string()]),
            quality_checks: Some(vec!["surface_clean".to_string(), "no_bubbles".to_string()]),
            validation_rules: None,
            estimated_duration: Some(30),
            actual_duration: None,
            started_at: None,
            completed_at: None,
            photos_taken: 0,
            location_lat: None,
            location_lon: None,
            location_accuracy: None,
            notes: Some(format!("Notes for test step {}", step_number)),
            metadata: None,
            created_at: Utc::now().timestamp_millis(),
            updated_at: Utc::now().timestamp_millis(),
            created_by: "test_user".to_string(),
            updated_by: "test_user".to_string(),
            synced: 0,
            last_synced_at: None,
            sync_error: None,
        };

        if let Some(overrides) = overrides {
            if !overrides.id.is_empty() {
                step.id = overrides.id;
            }
            if overrides.step_number != step_number {
                step.step_number = overrides.step_number;
            }
            if overrides.step_status != InterventionStepStatus::Pending {
                step.step_status = overrides.step_status;
            }
        }

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
    Arc::new(Database::new(":memory:").expect("Failed to create mock database"))
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
        assert_eq!(task.title, "Test Task");
        assert_eq!(task.status, "draft");
        assert_eq!(task.priority, "medium");

        let client = TestDataFactory::create_test_client(None);
        assert_eq!(client.name, "Test Client");
        assert!(client.is_active);

        let intervention = TestDataFactory::create_test_intervention(None);
        assert_eq!(intervention.intervention_type, "ppf");
        assert_eq!(intervention.status, InterventionStatus::Pending);
    }

    #[test]
    fn test_macros() {
        let task = test_task!(title: "Custom Task".to_string(), priority: "high".to_string());
        assert_eq!(task.title, "Custom Task");
        assert_eq!(task.priority, "high");

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
