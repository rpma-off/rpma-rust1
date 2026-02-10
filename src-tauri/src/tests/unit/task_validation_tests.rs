//! Unit tests for task validation helpers

use crate::models::task::{CreateTaskRequest, TaskStatus};
use crate::services::task_validation::validate_status_transition;
use crate::test_utils::TestDataFactory;

#[cfg(test)]
mod tests {
    use super::*;

    fn base_request() -> CreateTaskRequest {
        TestDataFactory::create_test_task(None)
    }

    #[test]
    fn test_create_task_request_valid() {
        let request = base_request();
        let result = request.validate();
        assert!(result.is_ok(), "Valid request should pass validation");
    }

    #[test]
    fn test_create_task_request_missing_vehicle_plate() {
        let mut request = base_request();
        request.vehicle_plate = "".to_string();
        let result = request.validate();
        assert!(result.is_err());
    }

    #[test]
    fn test_create_task_request_missing_vehicle_model() {
        let mut request = base_request();
        request.vehicle_model = "".to_string();
        let result = request.validate();
        assert!(result.is_err());
    }

    #[test]
    fn test_create_task_request_missing_ppf_zones() {
        let mut request = base_request();
        request.ppf_zones = vec![];
        let result = request.validate();
        assert!(result.is_err());
    }

    #[test]
    fn test_create_task_request_invalid_ppf_zone_length() {
        let mut request = base_request();
        request.ppf_zones = vec!["x".repeat(101)];
        let result = request.validate();
        assert!(result.is_err());
    }

    #[test]
    fn test_create_task_request_invalid_scheduled_date() {
        let mut request = base_request();
        request.scheduled_date = "".to_string();
        let result = request.validate();
        assert!(result.is_err());
    }

    #[test]
    fn test_create_task_request_invalid_vehicle_year() {
        let mut request = base_request();
        request.vehicle_year = Some("1800".to_string());
        let result = request.validate();
        assert!(result.is_err());
    }

    #[test]
    fn test_create_task_request_invalid_email() {
        let mut request = base_request();
        request.customer_email = Some("invalid-email".to_string());
        let result = request.validate();
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_status_transition_valid() {
        let result = validate_status_transition(&TaskStatus::Draft, &TaskStatus::Pending);
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_status_transition_invalid() {
        let result = validate_status_transition(&TaskStatus::Completed, &TaskStatus::Pending);
        assert!(result.is_err());
    }
}
