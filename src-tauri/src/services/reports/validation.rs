//! Report validation utilities
//!
//! This module handles input validation for report generation.

use crate::models::reports::{DateRange, ReportFilters};
use chrono::{DateTime, Datelike, Duration, Utc};

/// Custom error type for validation operations
#[derive(Debug, thiserror::Error)]
pub enum ValidationError {
    #[error("Validation error: {0}")]
    Validation(String),
}

impl From<ValidationError> for crate::commands::AppError {
    fn from(error: ValidationError) -> Self {
        match error {
            ValidationError::Validation(msg) => crate::commands::AppError::Validation(msg),
        }
    }
}

type ValidationResult<T> = Result<T, ValidationError>;

/// Validate date range for report generation
pub fn validate_date_range(date_range: &DateRange) -> ValidationResult<()> {
    let now = Utc::now();
    let max_past_days = 365 * 2; // 2 years in the past
    let max_future_days = 30; // 30 days in the future

    // Convert to DateTime
    let start_date = DateTime::<Utc>::from_timestamp(date_range.start.timestamp(), 0)
        .ok_or_else(|| ValidationError::Validation("Invalid start date timestamp".to_string()))?;
    let end_date = DateTime::<Utc>::from_timestamp(date_range.end.timestamp(), 0)
        .ok_or_else(|| ValidationError::Validation("Invalid end date timestamp".to_string()))?;

    // Basic range validation
    if start_date >= end_date {
        return Err(ValidationError::Validation(
            "Start date must be before end date".to_string(),
        ));
    }

    // Prevent dates too far in the past
    let min_allowed_date = now - Duration::days(max_past_days);
    if start_date < min_allowed_date {
        return Err(ValidationError::Validation(format!(
            "Start date cannot be more than {} days in the past",
            max_past_days
        )));
    }

    // Prevent dates too far in the future
    let max_allowed_date = now + Duration::days(max_future_days);
    if end_date > max_allowed_date {
        return Err(ValidationError::Validation(format!(
            "End date cannot be more than {} days in the future",
            max_future_days
        )));
    }

    // Prevent ranges that are too large
    let range_duration = end_date.signed_duration_since(start_date);
    let max_range_days = 365; // 1 year max range
    if range_duration.num_days() > max_range_days {
        tracing::warn!(
            "Large date range requested: {} days",
            range_duration.num_days()
        );
        // Allow but warn - some reports might legitimately need large ranges
    }

    Ok(())
}

/// Validate report filters
pub fn validate_filters(filters: &ReportFilters) -> ValidationResult<()> {
    // Validate technician IDs
    if let Some(technician_ids) = &filters.technician_ids {
        if technician_ids.is_empty() {
            return Err(ValidationError::Validation(
                "Technician IDs list cannot be empty".to_string(),
            ));
        }
        if technician_ids.len() > 100 {
            return Err(ValidationError::Validation(
                "Cannot filter by more than 100 technician IDs".to_string(),
            ));
        }
        // Check for duplicates
        let mut seen = std::collections::HashSet::new();
        for id in technician_ids {
            if seen.contains(id) {
                return Err(ValidationError::Validation(format!(
                    "Duplicate technician ID: {}",
                    id
                )));
            }
            seen.insert(id);
        }
    }

    // Validate client IDs
    if let Some(client_ids) = &filters.client_ids {
        if client_ids.is_empty() {
            return Err(ValidationError::Validation(
                "Client IDs list cannot be empty".to_string(),
            ));
        }
        if client_ids.len() > 100 {
            return Err(ValidationError::Validation(
                "Cannot filter by more than 100 client IDs".to_string(),
            ));
        }
        // Check for duplicates
        let mut seen = std::collections::HashSet::new();
        for id in client_ids {
            if seen.contains(id) {
                return Err(ValidationError::Validation(format!(
                    "Duplicate client ID: {}",
                    id
                )));
            }
            seen.insert(id);
        }
    }

    // Validate statuses
    if let Some(statuses) = &filters.statuses {
        if statuses.is_empty() {
            return Err(ValidationError::Validation(
                "Statuses list cannot be empty".to_string(),
            ));
        }
        let valid_statuses = ["pending", "in_progress", "completed", "cancelled"];
        for status in statuses {
            if !valid_statuses.contains(&status.as_str()) {
                return Err(ValidationError::Validation(format!(
                    "Invalid status: {}. Valid statuses are: {}",
                    status,
                    valid_statuses.join(", ")
                )));
            }
        }
    }

    // Validate priorities
    if let Some(priorities) = &filters.priorities {
        if priorities.is_empty() {
            return Err(ValidationError::Validation(
                "Priorities list cannot be empty".to_string(),
            ));
        }
        let valid_priorities = ["low", "medium", "high", "urgent"];
        for priority in priorities {
            if !valid_priorities.contains(&priority.as_str()) {
                return Err(ValidationError::Validation(format!(
                    "Invalid priority: {}. Valid priorities are: {}",
                    priority,
                    valid_priorities.join(", ")
                )));
            }
        }
    }

    Ok(())
}

/// Validate year parameter for seasonal reports
pub fn validate_year(year: i32) -> ValidationResult<()> {
    let current_year = Utc::now().year();
    let min_year = 2020;
    let max_year = current_year + 1;

    if year < min_year {
        return Err(ValidationError::Validation(format!(
            "Year cannot be before {}. Historical data not available.",
            min_year
        )));
    }

    if year > max_year {
        return Err(ValidationError::Validation(format!(
            "Year cannot be after {}. Future years not supported.",
            max_year
        )));
    }

    Ok(())
}

/// Sanitize and validate string parameters to prevent injection
pub fn sanitize_string(input: &str) -> String {
    // Remove potentially dangerous characters and limit length
    input
        .chars()
        .filter(|c| c.is_alphanumeric() || c.is_whitespace() || *c == '-' || *c == '_')
        .take(100) // Limit length
        .collect::<String>()
        .trim()
        .to_string()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::reports::{DateRange, ReportFilters};
    use chrono::{Duration, Utc};

    // -- Date range validation tests --

    #[test]
    fn test_validate_date_range_valid() {
        let range = DateRange {
            start: Utc::now() - Duration::days(30),
            end: Utc::now(),
        };
        assert!(validate_date_range(&range).is_ok());
    }

    #[test]
    fn test_validate_date_range_start_after_end() {
        let range = DateRange {
            start: Utc::now(),
            end: Utc::now() - Duration::days(30),
        };
        let err = validate_date_range(&range).unwrap_err();
        assert!(
            err.to_string().contains("Start date must be before end date"),
            "Expected start-before-end error, got: {}",
            err
        );
    }

    #[test]
    fn test_validate_date_range_too_far_in_past() {
        let range = DateRange {
            start: Utc::now() - Duration::days(800),
            end: Utc::now() - Duration::days(750),
        };
        let err = validate_date_range(&range).unwrap_err();
        assert!(
            err.to_string().contains("in the past"),
            "Expected past-limit error, got: {}",
            err
        );
    }

    #[test]
    fn test_validate_date_range_too_far_in_future() {
        let range = DateRange {
            start: Utc::now(),
            end: Utc::now() + Duration::days(60),
        };
        let err = validate_date_range(&range).unwrap_err();
        assert!(
            err.to_string().contains("in the future"),
            "Expected future-limit error, got: {}",
            err
        );
    }

    #[test]
    fn test_validate_date_range_same_start_end() {
        let now = Utc::now();
        let range = DateRange {
            start: now,
            end: now,
        };
        let err = validate_date_range(&range).unwrap_err();
        assert!(
            err.to_string().contains("Start date must be before end date"),
            "Expected start-before-end error, got: {}",
            err
        );
    }

    // -- Filter validation tests --

    #[test]
    fn test_validate_filters_default() {
        let filters = ReportFilters::default();
        assert!(validate_filters(&filters).is_ok());
    }

    #[test]
    fn test_validate_filters_valid_statuses() {
        let filters = ReportFilters {
            statuses: Some(vec!["completed".to_string(), "pending".to_string()]),
            ..ReportFilters::default()
        };
        assert!(validate_filters(&filters).is_ok());
    }

    #[test]
    fn test_validate_filters_invalid_status() {
        let filters = ReportFilters {
            statuses: Some(vec!["invalid_status".to_string()]),
            ..ReportFilters::default()
        };
        let err = validate_filters(&filters).unwrap_err();
        assert!(
            err.to_string().contains("Invalid status"),
            "Expected invalid-status error, got: {}",
            err
        );
    }

    #[test]
    fn test_validate_filters_empty_statuses() {
        let filters = ReportFilters {
            statuses: Some(vec![]),
            ..ReportFilters::default()
        };
        let err = validate_filters(&filters).unwrap_err();
        assert!(
            err.to_string().contains("cannot be empty"),
            "Expected empty-list error, got: {}",
            err
        );
    }

    #[test]
    fn test_validate_filters_invalid_priority() {
        let filters = ReportFilters {
            priorities: Some(vec!["critical".to_string()]),
            ..ReportFilters::default()
        };
        let err = validate_filters(&filters).unwrap_err();
        assert!(
            err.to_string().contains("Invalid priority"),
            "Expected invalid-priority error, got: {}",
            err
        );
    }

    #[test]
    fn test_validate_filters_valid_priorities() {
        let filters = ReportFilters {
            priorities: Some(vec!["low".to_string(), "high".to_string(), "urgent".to_string()]),
            ..ReportFilters::default()
        };
        assert!(validate_filters(&filters).is_ok());
    }

    #[test]
    fn test_validate_filters_duplicate_technician_ids() {
        let filters = ReportFilters {
            technician_ids: Some(vec!["t1".to_string(), "t1".to_string()]),
            ..ReportFilters::default()
        };
        let err = validate_filters(&filters).unwrap_err();
        assert!(
            err.to_string().contains("Duplicate technician ID"),
            "Expected duplicate error, got: {}",
            err
        );
    }

    #[test]
    fn test_validate_filters_too_many_technician_ids() {
        let ids: Vec<String> = (0..101).map(|i| format!("t{}", i)).collect();
        let filters = ReportFilters {
            technician_ids: Some(ids),
            ..ReportFilters::default()
        };
        let err = validate_filters(&filters).unwrap_err();
        assert!(
            err.to_string().contains("more than 100"),
            "Expected too-many error, got: {}",
            err
        );
    }

    #[test]
    fn test_validate_filters_duplicate_client_ids() {
        let filters = ReportFilters {
            client_ids: Some(vec!["c1".to_string(), "c1".to_string()]),
            ..ReportFilters::default()
        };
        let err = validate_filters(&filters).unwrap_err();
        assert!(
            err.to_string().contains("Duplicate client ID"),
            "Expected duplicate error, got: {}",
            err
        );
    }

    // -- Year validation tests --

    #[test]
    fn test_validate_year_valid() {
        assert!(validate_year(2024).is_ok());
    }

    #[test]
    fn test_validate_year_too_old() {
        let err = validate_year(2019).unwrap_err();
        assert!(
            err.to_string().contains("cannot be before"),
            "Expected year-too-old error, got: {}",
            err
        );
    }

    #[test]
    fn test_validate_year_too_future() {
        let err = validate_year(2099).unwrap_err();
        assert!(
            err.to_string().contains("cannot be after"),
            "Expected year-too-future error, got: {}",
            err
        );
    }

    // -- Sanitize string tests --

    #[test]
    fn test_sanitize_string_removes_special_chars() {
        assert_eq!(sanitize_string("hello<script>world"), "helloscriptworld");
    }

    #[test]
    fn test_sanitize_string_allows_hyphens_underscores() {
        assert_eq!(sanitize_string("my-report_name"), "my-report_name");
    }

    #[test]
    fn test_sanitize_string_limits_length() {
        let long_input = "a".repeat(200);
        let result = sanitize_string(&long_input);
        assert_eq!(result.len(), 100);
    }

    #[test]
    fn test_sanitize_string_trims_whitespace() {
        assert_eq!(sanitize_string("  hello  "), "hello");
    }
}
