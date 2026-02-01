//! Validation functions for report generation
//!
//! This module provides validation utilities for report parameters,
//! particularly date ranges and other constraints.

use crate::commands::{AppError, AppResult};
use crate::models::reports::DateRange;
use chrono::{Datelike, Duration, Utc};

/// Validate date range parameters to prevent invalid queries
pub fn validate_date_range(date_range: &DateRange) -> AppResult<()> {
    // Check that end date is after start date
    if date_range.end <= date_range.start {
        return Err(AppError::Validation(
            "End date must be after start date".to_string(),
        ));
    }

    // Check that dates are not before Unix epoch
    if date_range.start.timestamp() < 0 || date_range.end.timestamp() < 0 {
        return Err(AppError::Validation(
            "Dates cannot be before Unix epoch".to_string(),
        ));
    }

    // Check that date range is not too large (maximum 1 year to prevent performance issues)
    let duration = date_range.end.signed_duration_since(date_range.start);
    if duration.num_days() > 365 {
        return Err(AppError::Validation(
            "Date range cannot exceed 1 year".to_string(),
        ));
    }

    // Check for reasonable future dates (not more than 1 year in the future)
    let now = Utc::now();
    let one_year_from_now = now + Duration::days(365);
    if date_range.end > one_year_from_now {
        return Err(AppError::Validation(
            "End date cannot be more than 1 year in the future".to_string(),
        ));
    }

    Ok(())
}

/// Validate year parameter for seasonal reports
pub fn validate_year(year: i32) -> AppResult<()> {
    let current_year = Utc::now().year();
    if year < 2020 || year > current_year + 1 {
        return Err(AppError::Validation(
            format!("Year must be between 2020 and {}", current_year + 1),
        ));
    }
    Ok(())
}