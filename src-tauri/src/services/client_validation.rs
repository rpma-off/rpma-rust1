//! Client Validation Service - Business rules and validation for clients
//!
//! This service handles all client validation logic including:
//! - Contact information validation (email, phone format)
//! - Required field enforcement
//! - Duplicate client prevention
//! - Location data validation (GPS coordinates)
//! - Custom validation rules for specific client types

use crate::db::Database;
use crate::models::client::{CreateClientRequest, UpdateClientRequest};
use regex::Regex;
use std::sync::Arc;

/// Service for client validation operations
#[derive(Debug)]
pub struct ClientValidationService {
    db: Arc<Database>,
}

impl ClientValidationService {
    /// Create a new ClientValidationService instance
    pub fn new(db: Arc<Database>) -> Self {
        Self { db }
    }

    /// Validate create client request
    pub fn validate_create_request(&self, req: &CreateClientRequest) -> Result<(), String> {
        // Validate required fields
        self.validate_required_fields(req)?;

        // Validate contact information
        self.validate_contact_info(req)?;

        // Validate location data
        self.validate_location_data(req)?;

        // Check for duplicates
        self.check_for_duplicates(req)?;

        // Validate business-specific rules
        self.validate_business_rules(req)?;

        Ok(())
    }

    /// Validate update client request
    pub fn validate_update_request(&self, req: &UpdateClientRequest) -> Result<(), String> {
        // Validate contact information if provided
        if let Some(email) = &req.email {
            self.validate_email(email)?;
        }
        if let Some(phone) = &req.phone {
            self.validate_phone(phone)?;
        }

        // Validate location data if provided
        if let (Some(street), Some(city), Some(state), Some(zip)) = (
            &req.address_street,
            &req.address_city,
            &req.address_state,
            &req.address_zip,
        ) {
            self.validate_address(street, city, state, zip)?;
        }

        // Validate business-specific rules
        self.validate_business_rules_update(req)?;

        Ok(())
    }

    /// Validate required fields for client creation
    fn validate_required_fields(&self, req: &CreateClientRequest) -> Result<(), String> {
        if req.name.trim().is_empty() {
            return Err("Client name is required".to_string());
        }

        if req.name.len() > 100 {
            return Err("Client name cannot exceed 100 characters".to_string());
        }

        if req.email.as_ref().map_or(true, |e| e.trim().is_empty()) {
            return Err("Email address is required".to_string());
        }

        Ok(())
    }

    /// Validate contact information
    fn validate_contact_info(&self, req: &CreateClientRequest) -> Result<(), String> {
        if let Some(ref email) = req.email {
            self.validate_email(email)?;
        }
        if let Some(ref phone) = req.phone {
            self.validate_phone(phone)?;
        }
        Ok(())
    }

    /// Validate email format
    fn validate_email(&self, email: &str) -> Result<(), String> {
        if email.is_empty() {
            return Err("Email cannot be empty".to_string());
        }

        if email.len() > 254 {
            return Err("Email address is too long".to_string());
        }

        // RFC 5322 compliant email regex (simplified)
        let email_regex = Regex::new(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
            .map_err(|_| "Invalid email regex pattern".to_string())?;

        if !email_regex.is_match(email) {
            return Err("Invalid email format".to_string());
        }

        // Check for suspicious patterns
        if email.contains("..") || email.starts_with('.') || email.ends_with('.') {
            return Err("Invalid email format".to_string());
        }

        Ok(())
    }

    /// Validate phone format
    fn validate_phone(&self, phone: &str) -> Result<(), String> {
        if phone.is_empty() {
            return Err("Phone number is required".to_string());
        }

        // Remove all non-digit characters for validation
        let digits_only: String = phone.chars().filter(|c| c.is_ascii_digit()).collect();

        if digits_only.len() < 10 || digits_only.len() > 15 {
            return Err("Phone number must be between 10 and 15 digits".to_string());
        }

        Ok(())
    }

    /// Validate location data
    fn validate_location_data(&self, req: &CreateClientRequest) -> Result<(), String> {
        if let (Some(ref street), Some(ref city), Some(ref state), Some(ref zip)) = (
            &req.address_street,
            &req.address_city,
            &req.address_state,
            &req.address_zip,
        ) {
            self.validate_address(street, city, state, zip)?;
        }

        if let Some(country) = &req.address_country {
            if country.trim().is_empty() {
                return Err("Country cannot be empty if provided".to_string());
            }
        }

        Ok(())
    }

    /// Validate address components
    fn validate_address(
        &self,
        street: &str,
        city: &str,
        state: &str,
        zip: &str,
    ) -> Result<(), String> {
        if street.trim().is_empty() {
            return Err("Street address is required".to_string());
        }

        if city.trim().is_empty() {
            return Err("City is required".to_string());
        }

        if state.trim().is_empty() {
            return Err("State is required".to_string());
        }

        if zip.trim().is_empty() {
            return Err("ZIP code is required".to_string());
        }

        // Basic ZIP code validation (US format)
        let zip_regex =
            Regex::new(r"^\d{5}(-\d{4})?$").map_err(|_| "Invalid ZIP regex pattern".to_string())?;

        if !zip_regex.is_match(zip) {
            return Err("Invalid ZIP code format (expected 12345 or 12345-6789)".to_string());
        }

        Ok(())
    }

    /// Check for duplicate clients
    fn check_for_duplicates(&self, req: &CreateClientRequest) -> Result<(), String> {
        // Check for duplicate email
        if let Some(ref email) = req.email {
            let email_count: i64 = self
                .db
                .as_ref()
                .query_single_value(
                    "SELECT COUNT(*) FROM clients WHERE email = ? AND deleted_at IS NULL",
                    rusqlite::params![email],
                )
                .map_err(|e| format!("Failed to check email duplicates: {}", e))?;

            if email_count > 0 {
                return Err("A client with this email address already exists".to_string());
            }
        }

        // Check for duplicate tax ID if provided
        if let Some(ref tax_id) = req.tax_id {
            if !tax_id.trim().is_empty() {
                let tax_count: i64 = self
                    .db
                    .as_ref()
                    .query_single_value(
                        "SELECT COUNT(*) FROM clients WHERE tax_id = ? AND deleted_at IS NULL",
                        rusqlite::params![tax_id],
                    )
                    .map_err(|e| format!("Failed to check tax ID duplicates: {}", e))?;

                if tax_count > 0 {
                    return Err("A client with this tax ID already exists".to_string());
                }
            }
        }

        Ok(())
    }

    /// Validate business-specific rules
    fn validate_business_rules(&self, req: &CreateClientRequest) -> Result<(), String> {
        match req.customer_type {
            crate::models::CustomerType::Business => {
                // Business clients require company name
                if req
                    .company_name
                    .as_ref()
                    .map_or(true, |name| name.trim().is_empty())
                {
                    return Err("Company name is required for business clients".to_string());
                }

                // Business clients require contact person
                if req
                    .contact_person
                    .as_ref()
                    .map_or(true, |person| person.trim().is_empty())
                {
                    return Err("Contact person is required for business clients".to_string());
                }

                // Business clients should have tax ID
                if req
                    .tax_id
                    .as_ref()
                    .map_or(true, |tax| tax.trim().is_empty())
                {
                    return Err("Tax ID is recommended for business clients".to_string());
                }
            }
            crate::models::CustomerType::Individual => {
                // Individual clients don't need company name or contact person
                // But if provided, they should be reasonable
                if req
                    .company_name
                    .as_ref()
                    .map_or(false, |name| name.len() > 100)
                {
                    return Err("Company name cannot exceed 100 characters".to_string());
                }
            }
        }

        // Validate tags if provided
        if let Some(tags) = &req.tags {
            if tags.len() > 500 {
                return Err("Tags cannot exceed 500 characters".to_string());
            }

            // Basic JSON validation for tags
            if !tags.trim().is_empty() {
                serde_json::from_str::<serde_json::Value>(tags)
                    .map_err(|_| "Tags must be valid JSON".to_string())?;
            }
        }

        Ok(())
    }

    /// Validate business rules for updates
    fn validate_business_rules_update(&self, _req: &UpdateClientRequest) -> Result<(), String> {
        // Add any update-specific validation rules here
        // For now, most validation is handled in individual field validation
        Ok(())
    }

    /// Validate client can be deleted (check for active tasks)
    pub fn validate_client_deletion(&self, client_id: &str) -> Result<(), String> {
        let active_tasks: i64 = self.db
            .as_ref()
            .query_single_value(
                "SELECT COUNT(*) FROM tasks WHERE client_id = ? AND status IN ('pending', 'in_progress') AND deleted_at IS NULL",
                rusqlite::params![client_id],
            )
            .map_err(|e| format!("Failed to check active tasks: {}", e))?;

        if active_tasks > 0 {
            return Err(format!(
                "Cannot delete client with {} active tasks. Complete or cancel all tasks first.",
                active_tasks
            ));
        }

        Ok(())
    }
}
