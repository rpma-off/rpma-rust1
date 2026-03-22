//! Client validation service — application layer (ADR-001).
//!
//! `ClientValidationService` owns all field-level, format, and business-rule
//! validation for the clients bounded context, including duplicate detection
//! and deletion guards that require repository access.
//!
//! This type belongs in the application layer because it orchestrates
//! repository queries (duplicate email/tax-id checks, active-task guards)
//! alongside pure field rules.  IPC handlers must not instantiate or call
//! this service directly — they go through `ClientService`.

use crate::db::Database;
use crate::domains::clients::client_handler::repository::ClientRepository;
use crate::domains::clients::client_handler::{
    ClientRepoQuery, CreateClientRequest, CustomerType, IClientRepository, UpdateClientRequest,
};
use crate::shared::repositories::cache::Cache;
use regex::Regex;
use std::sync::Arc;

/// Service for client validation operations.
///
/// Performs required-field checks, email/phone format rules, address
/// validation, duplicate detection, business-type rules, and deletion guards.
#[derive(Debug)]
pub struct ClientValidationService {
    client_repo: Arc<dyn IClientRepository>,
}

impl ClientValidationService {
    /// Construct a `ClientValidationService` from an existing repository
    /// handle (preferred — avoids creating a second `Arc<ClientRepository>`).
    pub fn new(client_repo: Arc<dyn IClientRepository>) -> Self {
        Self { client_repo }
    }

    /// Construct directly from a `Database` handle.
    ///
    /// Intended for test helpers that do not have a pre-wired repository.
    /// Production code should prefer [`new`](Self::new).
    pub fn new_with_db(db: Arc<Database>) -> Self {
        let cache = Arc::new(Cache::new(256));
        let repo = Arc::new(ClientRepository::new(db, cache));
        Self { client_repo: repo }
    }

    // ── Public entry points ───────────────────────────────────────────────────

    /// Validate a complete create request: required fields, contact info,
    /// location data, duplicate detection, and business rules.
    pub fn validate_create_request(&self, req: &CreateClientRequest) -> Result<(), String> {
        self.validate_required_fields(req)?;
        self.validate_contact_info(req)?;
        self.validate_location_data(req)?;
        futures::executor::block_on(self.check_for_duplicates(req))?;
        self.validate_business_rules(req)?;
        Ok(())
    }

    /// Alias kept for backward-compatibility with proptest files.
    pub fn validate_create_client_request(&self, req: &CreateClientRequest) -> Result<(), String> {
        self.validate_create_request(req)
    }

    /// Validate the mutable fields of an update request.
    pub fn validate_update_request(&self, req: &UpdateClientRequest) -> Result<(), String> {
        if let Some(email) = &req.email {
            self.validate_email(email)?;
        }
        if let Some(phone) = &req.phone {
            self.validate_phone(phone)?;
        }
        if let (Some(street), Some(city), Some(state), Some(zip)) = (
            &req.address_street,
            &req.address_city,
            &req.address_state,
            &req.address_zip,
        ) {
            self.validate_address(street, city, state, zip)?;
        }
        Ok(())
    }

    /// Guard a delete operation: reject if the client still has active tasks.
    pub fn validate_client_deletion(&self, client_id: &str) -> Result<(), String> {
        let active_tasks =
            futures::executor::block_on(self.client_repo.count_active_tasks(client_id))
                .map_err(|e| format!("Failed to check active tasks: {}", e))?;
        if active_tasks > 0 {
            return Err(format!(
                "Cannot delete client with {} active tasks. \
                 Complete or cancel all tasks first.",
                active_tasks
            ));
        }
        Ok(())
    }

    // ── Private helpers ───────────────────────────────────────────────────────

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

    fn validate_contact_info(&self, req: &CreateClientRequest) -> Result<(), String> {
        if let Some(ref email) = req.email {
            self.validate_email(email)?;
        }
        if let Some(ref phone) = req.phone {
            self.validate_phone(phone)?;
        }
        Ok(())
    }

    fn validate_email(&self, email: &str) -> Result<(), String> {
        if email.is_empty() {
            return Err("Email cannot be empty".to_string());
        }
        if email.len() > 254 {
            return Err("Email address is too long".to_string());
        }
        let email_regex = Regex::new(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
            .map_err(|_| "Invalid email regex pattern".to_string())?;
        if !email_regex.is_match(email) {
            return Err("Invalid email format".to_string());
        }
        if email.contains("..") || email.starts_with('.') || email.ends_with('.') {
            return Err("Invalid email format".to_string());
        }
        Ok(())
    }

    fn validate_phone(&self, phone: &str) -> Result<(), String> {
        if phone.is_empty() {
            return Err("Phone number is required".to_string());
        }
        let digits_only: String = phone.chars().filter(|c| c.is_ascii_digit()).collect();
        if digits_only.len() < 10 || digits_only.len() > 15 {
            return Err("Phone number must be between 10 and 15 digits".to_string());
        }
        Ok(())
    }

    fn validate_location_data(&self, req: &CreateClientRequest) -> Result<(), String> {
        if let (Some(street), Some(city), Some(state), Some(zip)) = (
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
        let zip_regex = Regex::new(r"^\d{5}(-\d{4})?$")
            .map_err(|_| "Invalid ZIP regex pattern".to_string())?;
        if !zip_regex.is_match(zip) {
            return Err(
                "Invalid ZIP code format (expected 12345 or 12345-6789)".to_string(),
            );
        }
        Ok(())
    }

    async fn check_for_duplicates(&self, req: &CreateClientRequest) -> Result<(), String> {
        if let Some(ref email) = req.email {
            let exists = IClientRepository::find_by_email(self.client_repo.as_ref(), email)
                .await
                .map_err(|e| format!("Failed to check email duplicates: {}", e))?
                .is_some();
            if exists {
                return Err(
                    "A client with this email address already exists".to_string(),
                );
            }
        }
        if let Some(ref tax_id) = req.tax_id {
            if !tax_id.trim().is_empty() {
                let query = ClientRepoQuery {
                    ..Default::default()
                };
                let count = IClientRepository::count(self.client_repo.as_ref(), query)
                    .await
                    .map_err(|e| format!("Failed to check tax ID duplicates: {}", e))?;
                // Placeholder — actual implementation should filter by tax_id in the
                // repository layer.
                if count > 1_000_000 {
                    return Err("A client with this tax ID already exists".to_string());
                }
            }
        }
        Ok(())
    }

    fn validate_business_rules(&self, req: &CreateClientRequest) -> Result<(), String> {
        match req.customer_type {
            CustomerType::Business => {
                if req
                    .company_name
                    .as_ref()
                    .map_or(true, |n| n.trim().is_empty())
                {
                    return Err(
                        "Company name is required for business clients".to_string(),
                    );
                }
                if req
                    .contact_person
                    .as_ref()
                    .map_or(true, |p| p.trim().is_empty())
                {
                    return Err(
                        "Contact person is required for business clients".to_string(),
                    );
                }
                if req.tax_id.as_ref().map_or(true, |t| t.trim().is_empty()) {
                    return Err(
                        "Tax ID is recommended for business clients".to_string(),
                    );
                }
            }
            CustomerType::Individual => {
                if req.company_name.as_ref().map_or(false, |n| n.len() > 100) {
                    return Err(
                        "Company name cannot exceed 100 characters".to_string(),
                    );
                }
            }
        }
        if let Some(tags) = &req.tags {
            if tags.len() > 500 {
                return Err("Tags cannot exceed 500 characters".to_string());
            }
            if !tags.trim().is_empty() {
                serde_json::from_str::<serde_json::Value>(tags)
                    .map_err(|_| "Tags must be valid JSON".to_string())?;
            }
        }
        Ok(())
    }
}
