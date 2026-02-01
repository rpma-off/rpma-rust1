//! Report validation utilities
//!
//! This module handles input validation for report generation.

use crate::models::reports::{DateRange, ReportFilters};
use chrono::{DateTime, Utc, Duration, Datelike};

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
            "Start date must be before end date".to_string()
        ));
    }

    // Prevent dates too far in the past
    let min_allowed_date = now - Duration::days(max_past_days);
    if start_date < min_allowed_date {
        return Err(ValidationError::Validation(
            format!("Start date cannot be more than {} days in the past", max_past_days)
        ));
    }

    // Prevent dates too far in the future
    let max_allowed_date = now + Duration::days(max_future_days);
    if end_date > max_allowed_date {
        return Err(ValidationError::Validation(
            format!("End date cannot be more than {} days in the future", max_future_days)
        ));
    }

    // Prevent ranges that are too large
    let range_duration = end_date.signed_duration_since(start_date);
    let max_range_days = 365; // 1 year max range
    if range_duration.num_days() > max_range_days {
        tracing::warn!("Large date range requested: {} days", range_duration.num_days());
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
                "Technician IDs list cannot be empty".to_string()
            ));
        }
        if technician_ids.len() > 100 {
            return Err(ValidationError::Validation(
                "Cannot filter by more than 100 technician IDs".to_string()
            ));
        }
        // Check for duplicates
        let mut seen = std::collections::HashSet::new();
        for id in technician_ids {
            if seen.contains(id) {
                return Err(ValidationError::Validation(
                    format!("Duplicate technician ID: {}", id)
                ));
            }
            seen.insert(id);
        }
    }

    // Validate client IDs
    if let Some(client_ids) = &filters.client_ids {
        if client_ids.is_empty() {
            return Err(ValidationError::Validation(
                "Client IDs list cannot be empty".to_string()
            ));
        }
        if client_ids.len() > 100 {
            return Err(ValidationError::Validation(
                "Cannot filter by more than 100 client IDs".to_string()
            ));
        }
        // Check for duplicates
        let mut seen = std::collections::HashSet::new();
        for id in client_ids {
            if seen.contains(id) {
                return Err(ValidationError::Validation(
                    format!("Duplicate client ID: {}", id)
                ));
            }
            seen.insert(id);
        }
    }

    // Validate statuses
    if let Some(statuses) = &filters.statuses {
        if statuses.is_empty() {
            return Err(ValidationError::Validation(
                "Statuses list cannot be empty".to_string()
            ));
        }
        let valid_statuses = ["pending", "in_progress", "completed", "cancelled"];
        for status in statuses {
            if !valid_statuses.contains(&status.as_str()) {
                return Err(ValidationError::Validation(
                    format!("Invalid status: {}. Valid statuses are: {}", status, valid_statuses.join(", "))
                ));
            }
        }
    }

    // Validate priorities
    if let Some(priorities) = &filters.priorities {
        if priorities.is_empty() {
            return Err(ValidationError::Validation(
                "Priorities list cannot be empty".to_string()
            ));
        }
        let valid_priorities = ["low", "medium", "high", "urgent"];
        for priority in priorities {
            if !valid_priorities.contains(&priority.as_str()) {
                return Err(ValidationError::Validation(
                    format!("Invalid priority: {}. Valid priorities are: {}", priority, valid_priorities.join(", "))
                ));
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
        return Err(ValidationError::Validation(
            format!("Year cannot be before {}. Historical data not available.", min_year)
        ));
    }

    if year > max_year {
        return Err(ValidationError::Validation(
            format!("Year cannot be after {}. Future years not supported.", max_year)
        ));
    }

    Ok(())
}

/// Sanitize and validate string parameters to prevent injection
pub fn sanitize_string(input: &str) -> String {
    // Remove potentially dangerous characters and limit length
    input.chars()
        .filter(|c| c.is_alphanumeric() || c.is_whitespace() || *c == '-' || *c == '_')
        .take(100) // Limit length
        .collect::<String>()
        .trim()
        .to_string()
}