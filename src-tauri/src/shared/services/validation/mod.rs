//! Input validation and sanitization service
//!
//! Implementation is split across focused submodules:
//! - `field_validators`    — Email, password, username, name validators
//! - `sanitizers`          — Input sanitization and text formatting
//! - `gps_validators`      — GPS coordinate and accuracy validators
//! - `business_validators` — Task, client, and auth workflow validators
//! - `security_validators` — Enhanced security validation (email, password)

use thiserror::Error;

// ── Submodules ────────────────────────────────────────────────────────────────

mod business_validators;
mod field_validators;
mod gps_validators;
mod sanitizers;
mod security_validators;

#[cfg(test)]
mod tests;

// ── Error type ────────────────────────────────────────────────────────────────

#[derive(Error, Debug)]
pub enum ValidationError {
    #[error("Invalid email format: {0}")]
    InvalidEmail(String),
    #[error("Password too weak: {0}")]
    WeakPassword(String),
    #[error("Invalid username: {0}")]
    InvalidUsername(String),
    #[error("Invalid name: {0}")]
    InvalidName(String),
    #[error("Input contains forbidden characters")]
    ForbiddenCharacters,
    #[error("Input too long: {field} (max {max} characters)")]
    InputTooLong { field: String, max: usize },
    #[error("Input too short: {field} (min {min} characters)")]
    InputTooShort { field: String, min: usize },
    #[error("Invalid GPS coordinates: {0}")]
    InvalidGPSCoordinates(String),
    #[error("GPS accuracy too low: {accuracy}m (minimum required: {required}m)")]
    GPSAccuracyTooLow { accuracy: f64, required: f64 },
    #[error("GPS data too old: {age_seconds}s (maximum age: {max_age}s)")]
    GPSDataTooOld { age_seconds: i64, max_age: i64 },
}

// ── Service struct ────────────────────────────────────────────────────────────

#[derive(Clone, Debug)]
pub struct ValidationService;

impl Default for ValidationService {
    fn default() -> Self {
        Self::new()
    }
}

impl ValidationService {
    pub fn new() -> Self {
        Self
    }
}
