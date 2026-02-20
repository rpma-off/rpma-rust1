//! Unit tests for task validation property-based tests
//!
//! Property-based tests for task validation using proptest to generate
//! comprehensive test cases for status transitions and validation rules.

use crate::domains::tasks::infrastructure::task_validation::TaskValidationService;
use crate::models::task::{Task, TaskPriority, TaskStatus};
use crate::{test_client, test_db, test_intervention, test_task};
use chrono::Utc;

use proptest::prelude::*;

#[cfg(test)]
mod tests {
    use super::*;

    fn create_validation_service() -> TaskValidationService {
        let test_db = test_db!();
        TaskValidationService::new(test_db.db())
    }

    proptest! {
        #![proptest_config(ProptestConfig::with_cases(200))]

        #[test]
        fn test_status_transition_properties(
            from_status in prop_oneof![
                TaskStatus::Draft,
                TaskStatus::Scheduled,
                TaskStatus::InProgress,
                TaskStatus::Paused,
                TaskStatus::Completed,
                TaskStatus::Cancelled
            ],
            to_status in prop_oneof![
                TaskStatus::Draft,
                TaskStatus::Scheduled,
                TaskStatus::InProgress,
                TaskStatus::Paused,
                TaskStatus::Completed,
                TaskStatus::Cancelled
            ]
        ) {
            let validation_service = create_validation_service();
            let task = test_task!(status: Some(from_status));

            let result = validation_service.validate_status_transition(&task, to_status);

            // Check if this is a valid transition based on business rules
            let is_valid_transition = match (from_status, to_status) {
                // Valid transitions
                (TaskStatus::Draft, TaskStatus::Scheduled) => true,
                (TaskStatus::Draft, TaskStatus::Cancelled) => true,
                (TaskStatus::Scheduled, TaskStatus::InProgress) => true,
                (TaskStatus::Scheduled, TaskStatus::Cancelled) => true,
                (TaskStatus::Scheduled, TaskStatus::Draft) => true,
                (TaskStatus::InProgress, TaskStatus::Completed) => true,
                (TaskStatus::InProgress, TaskStatus::Paused) => true,
                (TaskStatus::InProgress, TaskStatus::Cancelled) => true,
                (TaskStatus::Paused, TaskStatus::InProgress) => true,
                (TaskStatus::Paused, TaskStatus::Cancelled) => true,

                // Same status is always valid (no-op)
                (from, to) if from == to => true,

                // All other transitions are invalid
                _ => false,
            };

            if is_valid_transition {
                prop_assert!(result.is_ok(),
                    "Valid transition {:?} -> {:?} should succeed", from_status, to_status);
            } else {
                prop_assert!(result.is_err(),
                    "Invalid transition {:?} -> {:?} should fail", from_status, to_status);
            }
        }

        #[test]
        fn test_ppf_zone_validation(
            ppf_zones in prop::collection::vec(
                prop_oneof![
                    "front", "rear", "hood", "trunk", "roof",
                    "front_bumper", "rear_bumper", "left_side", "right_side",
                    "full_car", "invalid_zone"
                ],
                1..10
            )
        ) {
            let validation_service = create_validation_service();
            let task = test_task!(ppf_zones: ppf_zones.clone());

            let result = validation_service.validate_ppf_zones(&task);

            // Check if all zones are valid
            let has_invalid_zone = ppf_zones.iter().any(|zone| *zone == "invalid_zone");

            if has_invalid_zone {
                prop_assert!(result.is_err(), "Should fail with invalid PPF zone");
            } else if ppf_zones.is_empty() {
                prop_assert!(result.is_err(), "Should fail with empty PPF zones");
            } else {
                prop_assert!(result.is_ok(), "Should succeed with valid PPF zones: {:?}", ppf_zones);
            }
        }

        #[test]
        fn test_task_priority_validation(
            priority in prop_oneof![
                TaskPriority::Low,
                TaskPriority::Medium,
                TaskPriority::High,
                TaskPriority::Urgent
            ]
        ) {
            let validation_service = create_validation_service();
            let task = test_task!(priority: Some(priority));

            // All defined priorities should be valid
            let result = validation_service.validate_task_comprehensive(&task);
            prop_assert!(result.is_ok(), "Task with priority {:?} should be valid", priority);
        }

        #[test]
        fn test_vehicle_plate_validation(
            plate in prop::string::string_regex(r"[A-Z0-9]{1,10}")
        ) {
            let validation_service = create_validation_service();

            // Test with valid format
            if plate.len() >= 2 && plate.len() <= 8 {
                let task = test_task!(vehicle_plate: Some(plate.clone()));
                let result = validation_service.validate_task_comprehensive(&task);
                prop_assert!(result.is_ok(), "Valid plate {} should be accepted", plate);
            } else {
                // Test with invalid length
                let task = test_task!(vehicle_plate: Some(plate.clone()));
                let result = validation_service.validate_task_comprehensive(&task);
                prop_assert!(result.is_err(), "Invalid plate length {} should be rejected", plate.len());
            }
        }

        #[test]
        fn test_email_validation_properties(
            email in super::super::super::proptests::main::email_strategy()
        ) {
            let validation_service = create_validation_service();
            let task = test_task!(customer_email: Some(email.clone()));

            // Email strategy should generate valid emails
            let result = validation_service.validate_task_comprehensive(&task);

            // Should succeed for valid email format
            if email.contains('@') && email.len() <= 254 {
                prop_assert!(result.is_ok(), "Valid email {} should be accepted", email);
            } else {
                prop_assert!(result.is_err(), "Invalid email {} should be rejected", email);
            }
        }

        #[test]
        fn test_task_field_lengths(
            title in prop::string::string_regex(r".{1,500}"),
            description in prop::string::string_regex(r".{0,2000}"),
            notes in prop::string::string_regex(r".{0,1000}")
        ) {
            let validation_service = create_validation_service();

            let task = test_task!(
                title: Some(title.clone()),
                description: Some(description.clone()),
                notes: Some(notes.clone())
            );

            let result = validation_service.validate_task_comprehensive(&task);

            // Title should not be empty and not too long
            if title.trim().is_empty() || title.len() > 255 {
                prop_assert!(result.is_err(), "Invalid title should be rejected");
            } else if description.len() > 1000 || notes.len() > 500 {
                prop_assert!(result.is_err(), "Too long description/notes should be rejected");
            } else {
                prop_assert!(result.is_ok(), "Valid fields should be accepted");
            }
        }

        #[test]
        fn test_date_validation(
            days_offset in -30i64..=30i64
        ) {
            let validation_service = create_validation_service();
            let date = (chrono::Utc::now() + chrono::Duration::days(days_offset))
                .format("%Y-%m-%d").to_string();

            let task = test_task!(scheduled_date: date.clone());
            let result = validation_service.validate_task_comprehensive(&task);

            // Past dates should be rejected, future dates accepted
            if days_offset < 0 {
                prop_assert!(result.is_err(), "Past date {} should be rejected", date);
            } else {
                prop_assert!(result.is_ok(), "Future date {} should be accepted", date);
            }
        }

        #[test]
        fn test_phone_number_validation(
            phone in super::super::super::proptests::main::phone_strategy()
        ) {
            let validation_service = create_validation_service();
            let task = test_task!(customer_phone: Some(phone.clone()));

            let result = validation_service.validate_task_comprehensive(&task);

            // Phone strategy should generate valid formats
            prop_assert!(result.is_ok(), "Valid phone {} should be accepted", phone);
        }
    }

    #[test]
    fn test_comprehensive_validation_combinations() {
        let validation_service = create_validation_service();

        // Test combinations of valid and invalid fields
        let test_cases = vec![
            // All valid
            (true, true, true, true, true, "All fields valid"),
            // Invalid title
            (false, true, true, true, true, "Invalid title"),
            // Invalid email
            (true, false, true, true, true, "Invalid email"),
            // Invalid vehicle plate
            (true, true, false, true, true, "Invalid plate"),
            // Invalid PPF zones
            (true, true, true, false, true, "Invalid PPF zones"),
            // Invalid date
            (true, true, true, true, false, "Invalid date"),
        ];

        for (valid_title, valid_email, valid_plate, valid_ppf, valid_date, description) in
            test_cases
        {
            let task = test_task!(
                title: Some(if valid_title { "Valid Title" } else { "" }.to_string()),
                customer_email: Some(if valid_email { "valid@example.com" } else { "invalid-email" }.to_string()),
                vehicle_plate: Some(if valid_plate { "ABC123" } else { "INVALID-@#$%" }.to_string()),
                ppf_zones: if valid_ppf { vec!["front"] } else { vec![] },
                scheduled_date: if valid_date { "2025-12-31" } else { "2020-01-01" }.to_string()
            );

            let result = validation_service.validate_task_comprehensive(&task);

            if valid_title && valid_email && valid_plate && valid_ppf && valid_date {
                assert!(result.is_ok(), "Should succeed: {}", description);
            } else {
                assert!(result.is_err(), "Should fail: {}", description);
            }
        }
    }

    #[test]
    fn test_technician_workload_edge_cases() {
        let validation_service = create_validation_service();

        // Create technicians with different workload levels
        let test_cases = vec![
            (0, true, "No tasks should have capacity"),
            (5, true, "Few tasks should have capacity"),
            (10, true, "Moderate tasks should have capacity"),
            (15, false, "Many tasks should exceed capacity"),
            (20, false, "Too many tasks should exceed capacity"),
        ];

        for (task_count, should_have_capacity, description) in test_cases {
            let technician_id = uuid::Uuid::new_v4().to_string();
            let conn = validation_service
                .db
                .get_connection()
                .expect("Failed to get connection");

            // Create technician
            conn.execute(
                "INSERT INTO users (id, username, email, first_name, last_name, password_hash, role, created_at, updated_at) 
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                [
                    technician_id.clone(),
                    format!("tech_{}", task_count),
                    format!("tech{}@example.com", task_count),
                    "Test".to_string(),
                    "Technician".to_string(),
                    "hashed_password".to_string(),
                    "technician".to_string(),
                    chrono::Utc::now().to_string(),
                    chrono::Utc::now().to_string(),
                ],
            ).expect("Failed to create technician");

            // Create tasks for this technician
            for i in 0..task_count {
                conn.execute(
                    "INSERT INTO tasks (id, vehicle_plate, vehicle_model, ppf_zones, scheduled_date, technician_id, status, created_at, updated_at) 
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                    [
                        uuid::Uuid::new_v4().to_string(),
                        format!("PLATE{}", i),
                        "Test Model".to_string(),
                        "front,rear".to_string(),
                        chrono::Utc::now().to_string(),
                        technician_id.clone(),
                        "scheduled".to_string(),
                        chrono::Utc::now().to_string(),
                        chrono::Utc::now().to_string(),
                    ],
                ).expect("Failed to create test task");
            }

            let result = validation_service.check_workload_capacity(&technician_id);

            if should_have_capacity {
                assert!(result.is_ok(), "Should have capacity: {}", description);
            } else {
                assert!(result.is_err(), "Should not have capacity: {}", description);
            }
        }
    }

    #[test]
    fn test_validation_error_messages() {
        let validation_service = create_validation_service();

        // Test specific error messages for different validation failures
        let test_cases = vec![
            (
                test_task!(title: None),
                vec!["title", "required"],
                "Missing title should mention title",
            ),
            (
                test_task!(customer_email: Some("invalid-email")),
                vec!["email", "invalid"],
                "Invalid email should mention email",
            ),
            (
                test_task!(vehicle_plate: Some("INVALID-@#$%")),
                vec!["plate", "invalid"],
                "Invalid plate should mention plate",
            ),
            (
                test_task!(ppf_zones: vec!["invalid_zone"]),
                vec!["ppf", "zone", "invalid"],
                "Invalid PPF zone should mention zone",
            ),
            (
                test_task!(scheduled_date: "2020-01-01".to_string()),
                vec!["date", "past"],
                "Past date should mention date",
            ),
        ];

        for (task, expected_keywords, description) in test_cases {
            let result = validation_service.validate_task_comprehensive(&task);
            assert!(result.is_err(), "Should fail: {}", description);

            let error = result.unwrap_err().to_lowercase();
            for keyword in expected_keywords {
                assert!(
                    error.contains(keyword),
                    "Error '{}' should contain keyword '{}' for {}",
                    error,
                    keyword,
                    description
                );
            }
        }
    }
}
