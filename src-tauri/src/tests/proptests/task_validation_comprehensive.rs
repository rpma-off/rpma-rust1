//! Property-based tests for task validation
//!
//! These tests use random inputs to ensure task validation is robust
//! and handles all edge cases correctly.

use proptest::prelude::*;
use rpma_ppf_intervention::models::task::{CreateTaskRequest, Task, TaskPriority, TaskStatus};
use rpma_ppf_intervention::services::task_validation::TaskValidationError;

prop_compose! {
    fn arb_task_priority() -> TaskPriority {
        prop_oneof![
            Just(TaskPriority::Low),
            Just(TaskPriority::Normal),
            Just(TaskPriority::High),
            Just(TaskPriority::Critical),
        ]
    }
}

prop_compose! {
    fn arb_valid_status() -> TaskStatus {
        prop_oneof![
            Just(TaskStatus::Draft),
            Just(TaskStatus::Pending),
            Just(TaskStatus::InProgress),
        ]
    }
}

prop_compose! {
    fn arb_invalid_status() -> TaskStatus {
        prop_oneof![
            Just(TaskStatus::Completed),
            Just(TaskStatus::Cancelled),
            Just(TaskStatus::OnHold),
        ]
    }
}

prop_compose! {
    fn arb_create_task_request(
        title: String,
        description: Option<String>,
        priority: TaskPriority,
    ) -> CreateTaskRequest {
        CreateTaskRequest {
            title,
            description,
            priority,
            status: TaskStatus::Pending,
            client_id: "test-client".to_string(),
            ppf_zone: "ZONE-001".to_string(),
            estimated_duration_hours: Some(1.0),
            scheduled_date: None,
            assigned_technician_id: None,
        }
    }
}

proptest! {
    #[test]
    fn test_validate_title_rejects_empty_string(title in "\\s*") {
        let request = CreateTaskRequest {
            title,
            description: Some("Valid description".to_string()),
            priority: TaskPriority::Normal,
            status: TaskStatus::Pending,
            client_id: "test-client".to_string(),
            ppf_zone: "ZONE-001".to_string(),
            estimated_duration_hours: Some(1.0),
            scheduled_date: None,
            assigned_technician_id: None,
        };

        let result = rpma_ppf_intervention::services::task_validation::validate_create_task_request(&request);

        prop_assert!(result.is_err());
        prop_assert!(matches!(result.unwrap_err(), TaskValidationError::InvalidTitle(_)));
    }

    #[test]
    fn test_validate_title_accepts_valid_titles(title in "[a-zA-Z0-9\\s\\-_,.]{1,100}") {
        let request = CreateTaskRequest {
            title: title.clone(),
            description: Some("Valid description".to_string()),
            priority: TaskPriority::Normal,
            status: TaskStatus::Pending,
            client_id: "test-client".to_string(),
            ppf_zone: "ZONE-001".to_string(),
            estimated_duration_hours: Some(1.0),
            scheduled_date: None,
            assigned_technician_id: None,
        };

        let result = rpma_ppf_intervention::services::task_validation::validate_create_task_request(&request);

        prop_assert!(result.is_ok(), "Failed for valid title: {}", title);
    }

    #[test]
    fn test_validate_title_rejects_too_long(title in ".{101,}") {
        let request = CreateTaskRequest {
            title,
            description: Some("Valid description".to_string()),
            priority: TaskPriority::Normal,
            status: TaskStatus::Pending,
            client_id: "test-client".to_string(),
            ppf_zone: "ZONE-001".to_string(),
            estimated_duration_hours: Some(1.0),
            scheduled_date: None,
            assigned_technician_id: None,
        };

        let result = rpma_ppf_intervention::services::task_validation::validate_create_task_request(&request);

        prop_assert!(result.is_err());
        prop_assert!(matches!(result.unwrap_err(), TaskValidationError::InvalidTitle(_)));
    }

    #[test]
    fn test_validate_description_accepts_optional_none() {
        let request = CreateTaskRequest {
            title: "Valid Title".to_string(),
            description: None,
            priority: TaskPriority::Normal,
            status: TaskStatus::Pending,
            client_id: "test-client".to_string(),
            ppf_zone: "ZONE-001".to_string(),
            estimated_duration_hours: Some(1.0),
            scheduled_date: None,
            assigned_technician_id: None,
        };

        let result = rpma_ppf_intervention::services::task_validation::validate_create_task_request(&request);
        prop_assert!(result.is_ok());
    }

    #[test]
    fn test_validate_description_rejects_too_long(description in ".{1001,}") {
        let request = CreateTaskRequest {
            title: "Valid Title".to_string(),
            description: Some(description),
            priority: TaskPriority::Normal,
            status: TaskStatus::Pending,
            client_id: "test-client".to_string(),
            ppf_zone: "ZONE-001".to_string(),
            estimated_duration_hours: Some(1.0),
            scheduled_date: None,
            assigned_technician_id: None,
        };

        let result = rpma_ppf_intervention::services::task_validation::validate_create_task_request(&request);

        prop_assert!(result.is_err());
        prop_assert!(matches!(result.unwrap_err(), TaskValidationError::InvalidDescription(_)));
    }

    #[test]
    fn test_validate_estimated_duration_accepts_positive_values(duration in 0.1_f64..=1000.0) {
        let request = CreateTaskRequest {
            title: "Valid Title".to_string(),
            description: None,
            priority: TaskPriority::Normal,
            status: TaskStatus::Pending,
            client_id: "test-client".to_string(),
            ppf_zone: "ZONE-001".to_string(),
            estimated_duration_hours: Some(duration),
            scheduled_date: None,
            assigned_technician_id: None,
        };

        let result = rpma_ppf_intervention::services::task_validation::validate_create_task_request(&request);
        prop_assert!(result.is_ok());
    }

    #[test]
    fn test_validate_estimated_duration_rejects_zero_or_negative(duration in -1000.0..=0.0) {
        let request = CreateTaskRequest {
            title: "Valid Title".to_string(),
            description: None,
            priority: TaskPriority::Normal,
            status: TaskStatus::Pending,
            client_id: "test-client".to_string(),
            ppf_zone: "ZONE-001".to_string(),
            estimated_duration_hours: Some(duration),
            scheduled_date: None,
            assigned_technician_id: None,
        };

        let result = rpma_ppf_intervention::services::task_validation::validate_create_task_request(&request);

        prop_assert!(result.is_err());
        prop_assert!(matches!(result.unwrap_err(), TaskValidationError::InvalidDuration(_)));
    }

    #[test]
    fn test_validate_ppf_zone_accepts_valid_format(zone in "[A-Z]{3,4}-\\d{3}") {
        let request = CreateTaskRequest {
            title: "Valid Title".to_string(),
            description: None,
            priority: TaskPriority::Normal,
            status: TaskStatus::Pending,
            client_id: "test-client".to_string(),
            ppf_zone: zone.clone(),
            estimated_duration_hours: Some(1.0),
            scheduled_date: None,
            assigned_technician_id: None,
        };

        let result = rpma_ppf_intervention::services::task_validation::validate_create_task_request(&request);
        prop_assert!(result.is_ok(), "Failed for valid PPF zone: {}", zone);
    }

    #[test]
    fn test_validate_ppf_zone_rejects_invalid_format(zone in "[a-z0-9]{1,}") {
        let request = CreateTaskRequest {
            title: "Valid Title".to_string(),
            description: None,
            priority: TaskPriority::Normal,
            status: TaskStatus::Pending,
            client_id: "test-client".to_string(),
            ppf_zone: zone.clone(),
            estimated_duration_hours: Some(1.0),
            scheduled_date: None,
            assigned_technician_id: None,
        };

        let result = rpma_ppf_intervention::services::task_validation::validate_create_task_request(&request);

        prop_assert!(result.is_err());
        prop_assert!(matches!(result.unwrap_err(), TaskValidationError::InvalidPpfZone(_)));
    }

    #[test]
    fn test_validate_client_id_rejects_empty(client_id in "\\s*") {
        let request = CreateTaskRequest {
            title: "Valid Title".to_string(),
            description: None,
            priority: TaskPriority::Normal,
            status: TaskStatus::Pending,
            client_id,
            ppf_zone: "ZONE-001".to_string(),
            estimated_duration_hours: Some(1.0),
            scheduled_date: None,
            assigned_technician_id: None,
        };

        let result = rpma_ppf_intervention::services::task_validation::validate_create_task_request(&request);

        prop_assert!(result.is_err());
        prop_assert!(matches!(result.unwrap_err(), TaskValidationError::InvalidClientId(_)));
    }

    #[test]
    fn test_roundtrip_validation(request in arb_create_task_request(
        "[a-zA-Z0-9\\s]{1,50}",
        prop::option::of("[a-zA-Z0-9\\s]{1,200}"),
        arb_task_priority()
    )) {
        // If we can create it, it should validate
        let result = rpma_ppf_intervention::services::task_validation::validate_create_task_request(&request);
        prop_assert!(result.is_ok(), "Validation failed for: {:?}", request);
    }

    #[test]
    fn test_invalid_status_for_new_task(
        title in "Valid Task Title",
        priority in arb_task_priority(),
        status in arb_invalid_status()
    ) {
        let request = CreateTaskRequest {
            title,
            description: None,
            priority,
            status,
            client_id: "test-client".to_string(),
            ppf_zone: "ZONE-001".to_string(),
            estimated_duration_hours: Some(1.0),
            scheduled_date: None,
            assigned_technician_id: None,
        };

        let result = rpma_ppf_intervention::services::task_validation::validate_create_task_request(&request);

        prop_assert!(result.is_err());
        prop_assert!(matches!(result.unwrap_err(), TaskValidationError::InvalidStatusTransition(_, _)));
    }

    #[test]
    fn test_future_date_accepts_future_dates(days in 1i64..=365) {
        use chrono::{Utc, Duration};

        let future_date = Utc::now().date_naive() + Duration::days(days);

        let request = CreateTaskRequest {
            title: "Valid Title".to_string(),
            description: None,
            priority: TaskPriority::Normal,
            status: TaskStatus::Pending,
            client_id: "test-client".to_string(),
            ppf_zone: "ZONE-001".to_string(),
            estimated_duration_hours: Some(1.0),
            scheduled_date: Some(future_date),
            assigned_technician_id: None,
        };

        let result = rpma_ppf_intervention::services::task_validation::validate_create_task_request(&request);
        prop_assert!(result.is_ok());
    }

    #[test]
    fn test_past_date_rejects_past_dates(days in -365i64..=-1) {
        use chrono::{Utc, Duration};

        let past_date = Utc::now().date_naive() + Duration::days(days);

        let request = CreateTaskRequest {
            title: "Valid Title".to_string(),
            description: None,
            priority: TaskPriority::Normal,
            status: TaskStatus::Pending,
            client_id: "test-client".to_string(),
            ppf_zone: "ZONE-001".to_string(),
            estimated_duration_hours: Some(1.0),
            scheduled_date: Some(past_date),
            assigned_technician_id: None,
        };

        let result = rpma_ppf_intervention::services::task_validation::validate_create_task_request(&request);

        prop_assert!(result.is_err());
        prop_assert!(matches!(result.unwrap_err(), TaskValidationError::InvalidScheduledDate(_)));
    }
}
