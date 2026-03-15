//! Client validation — IPC request sanitization and ClientValidationService.

use super::{
    Client, ClientRepoQuery, CreateClientRequest, CustomerType, IClientRepository,
    UpdateClientRequest,
};
use crate::db::Database;
use crate::shared::ipc::errors::AppError as IpcAppError;
use crate::shared::repositories::cache::Cache;
use crate::shared::services::validation::ValidationService;
use regex::Regex;
use std::sync::Arc;

use super::repository::ClientRepository;
use crate::commands::ClientAction;

// ── IPC request container ─────────────────────────────────────────────────────

/// IPC request container
#[derive(serde::Deserialize, Debug)]
pub struct ClientCrudRequest {
    pub action: ClientAction,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

// ── Sanitization helpers ──────────────────────────────────────────────────────

/// Validate and sanitize the data inside a [`ClientAction`].
pub fn sanitize_client_action(action: ClientAction) -> Result<ClientAction, IpcAppError> {
    match action {
        ClientAction::Create { data } => {
            let sanitized = sanitize_create_request(data)?;
            Ok(ClientAction::Create { data: sanitized })
        }
        ClientAction::Update { id, data } => {
            let sanitized = sanitize_update_request(id, data)?;
            Ok(ClientAction::Update {
                id: sanitized.id.clone(),
                data: sanitized,
            })
        }
        other => Ok(other),
    }
}

/// Determine the required permission string for a [`ClientAction`].
pub fn required_permission(action: &ClientAction) -> Option<&'static str> {
    match action {
        ClientAction::Create { .. } => Some("create"),
        ClientAction::Update { .. } => Some("update"),
        ClientAction::Delete { .. } => Some("delete"),
        ClientAction::Get { .. }
        | ClientAction::GetWithTasks { .. }
        | ClientAction::List { .. }
        | ClientAction::ListWithTasks { .. }
        | ClientAction::Search { .. }
        | ClientAction::Stats => Some("read"),
    }
}

fn sanitize_create_request(
    data: CreateClientRequest,
) -> Result<CreateClientRequest, IpcAppError> {
    let validator = ValidationService::new();
    let validated_name = validator
        .sanitize_text_input(&data.name, "name", 100)
        .map_err(|e| IpcAppError::Validation(format!("Name validation failed: {}", e)))?;
    let validated_email = validator
        .validate_client_email(data.email.as_deref())
        .map_err(|e| IpcAppError::Validation(format!("Email validation failed: {}", e)))?;
    let validated_phone = validator
        .validate_phone(data.phone.as_deref())
        .map_err(|e| IpcAppError::Validation(format!("Phone validation failed: {}", e)))?;
    let validated_company_name = validator
        .sanitize_optional_text(data.company_name.as_deref(), "company_name", 100)
        .map_err(|e| IpcAppError::Validation(format!("Company name validation failed: {}", e)))?;
    let validated_contact_person = validator
        .sanitize_optional_text(data.contact_person.as_deref(), "contact_person", 100)
        .map_err(|e| {
            IpcAppError::Validation(format!("Contact person validation failed: {}", e))
        })?;
    let validated_notes = validator
        .sanitize_optional_text(data.notes.as_deref(), "notes", 1000)
        .map_err(|e| IpcAppError::Validation(format!("Notes validation failed: {}", e)))?;
    let validated_tags = if let Some(tags_str) = &data.tags {
        let tags: Vec<String> = serde_json::from_str(tags_str)
            .map_err(|e| IpcAppError::Validation(format!("Invalid tags JSON: {}", e)))?;
        let mut validated = Vec::new();
        for tag in tags {
            let sanitized = validator
                .sanitize_text_input(&tag, "tag", 50)
                .map_err(|e| IpcAppError::Validation(format!("Tag validation failed: {}", e)))?;
            validated.push(sanitized);
        }
        Some(serde_json::to_string(&validated).unwrap_or_default())
    } else {
        None
    };
    Ok(CreateClientRequest {
        name: validated_name,
        email: validated_email,
        phone: validated_phone,
        customer_type: data.customer_type,
        address_street: data.address_street,
        address_city: data.address_city,
        address_state: data.address_state,
        address_zip: data.address_zip,
        address_country: data.address_country,
        tax_id: data.tax_id,
        company_name: validated_company_name,
        contact_person: validated_contact_person,
        notes: validated_notes,
        tags: validated_tags,
    })
}

fn sanitize_update_request(
    id: String,
    data: UpdateClientRequest,
) -> Result<UpdateClientRequest, IpcAppError> {
    let validator = ValidationService::new();
    let validated_name = match data.name.as_deref() {
        Some(name) => Some(
            validator
                .sanitize_text_input(name, "name", 100)
                .map_err(|e| IpcAppError::Validation(format!("Name validation failed: {}", e)))?,
        ),
        None => None,
    };
    let validated_email = validator
        .validate_client_email(data.email.as_deref())
        .map_err(|e| IpcAppError::Validation(format!("Email validation failed: {}", e)))?;
    let validated_phone = validator
        .validate_phone(data.phone.as_deref())
        .map_err(|e| IpcAppError::Validation(format!("Phone validation failed: {}", e)))?;
    let validated_company_name = validator
        .sanitize_optional_text(data.company_name.as_deref(), "company_name", 100)
        .map_err(|e| IpcAppError::Validation(format!("Company name validation failed: {}", e)))?;
    let validated_contact_person = validator
        .sanitize_optional_text(data.contact_person.as_deref(), "contact_person", 100)
        .map_err(|e| {
            IpcAppError::Validation(format!("Contact person validation failed: {}", e))
        })?;
    let validated_notes = validator
        .sanitize_optional_text(data.notes.as_deref(), "notes", 1000)
        .map_err(|e| IpcAppError::Validation(format!("Notes validation failed: {}", e)))?;
    let validated_tags = if let Some(tags_str) = &data.tags {
        let tags: Vec<String> = serde_json::from_str(tags_str)
            .map_err(|e| IpcAppError::Validation(format!("Invalid tags JSON: {}", e)))?;
        let mut validated = Vec::new();
        for tag in tags {
            let sanitized = validator
                .sanitize_text_input(&tag, "tag", 50)
                .map_err(|e| IpcAppError::Validation(format!("Tag validation failed: {}", e)))?;
            validated.push(sanitized);
        }
        Some(serde_json::to_string(&validated).unwrap_or_default())
    } else {
        None
    };
    Ok(UpdateClientRequest {
        id,
        name: validated_name,
        email: validated_email,
        phone: validated_phone,
        customer_type: data.customer_type,
        address_street: data.address_street,
        address_city: data.address_city,
        address_state: data.address_state,
        address_zip: data.address_zip,
        address_country: data.address_country,
        tax_id: data.tax_id,
        company_name: validated_company_name,
        contact_person: validated_contact_person,
        notes: validated_notes,
        tags: validated_tags,
    })
}

// ── ClientValidationService ───────────────────────────────────────────────────

/// Service for client validation operations
#[derive(Debug)]
pub struct ClientValidationService {
    client_repo: Arc<dyn IClientRepository>,
}

impl ClientValidationService {
    pub fn new(client_repo: Arc<dyn IClientRepository>) -> Self {
        Self { client_repo }
    }

    pub fn new_with_db(db: Arc<Database>) -> Self {
        let cache = Arc::new(Cache::new(256));
        let repo = Arc::new(ClientRepository::new(db, cache));
        Self { client_repo: repo }
    }

    pub fn validate_create_request(&self, req: &CreateClientRequest) -> Result<(), String> {
        self.validate_required_fields(req)?;
        self.validate_contact_info(req)?;
        self.validate_location_data(req)?;
        futures::executor::block_on(self.check_for_duplicates(req))?;
        self.validate_business_rules(req)?;
        Ok(())
    }

    /// Alias used by proptest files
    pub fn validate_create_client_request(&self, req: &CreateClientRequest) -> Result<(), String> {
        self.validate_create_request(req)
    }

    pub fn validate_update_request(&self, req: &UpdateClientRequest) -> Result<(), String> {
        if let Some(email) = &req.email { self.validate_email(email)?; }
        if let Some(phone) = &req.phone { self.validate_phone(phone)?; }
        if let (Some(street), Some(city), Some(state), Some(zip)) =
            (&req.address_street, &req.address_city, &req.address_state, &req.address_zip)
        {
            self.validate_address(street, city, state, zip)?;
        }
        Ok(())
    }

    fn validate_required_fields(&self, req: &CreateClientRequest) -> Result<(), String> {
        if req.name.trim().is_empty() { return Err("Client name is required".to_string()); }
        if req.name.len() > 100 { return Err("Client name cannot exceed 100 characters".to_string()); }
        if req.email.as_ref().map_or(true, |e| e.trim().is_empty()) {
            return Err("Email address is required".to_string());
        }
        Ok(())
    }

    fn validate_contact_info(&self, req: &CreateClientRequest) -> Result<(), String> {
        if let Some(ref email) = req.email { self.validate_email(email)?; }
        if let Some(ref phone) = req.phone { self.validate_phone(phone)?; }
        Ok(())
    }

    fn validate_email(&self, email: &str) -> Result<(), String> {
        if email.is_empty() { return Err("Email cannot be empty".to_string()); }
        if email.len() > 254 { return Err("Email address is too long".to_string()); }
        let email_regex = Regex::new(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
            .map_err(|_| "Invalid email regex pattern".to_string())?;
        if !email_regex.is_match(email) { return Err("Invalid email format".to_string()); }
        if email.contains("..") || email.starts_with('.') || email.ends_with('.') {
            return Err("Invalid email format".to_string());
        }
        Ok(())
    }

    fn validate_phone(&self, phone: &str) -> Result<(), String> {
        if phone.is_empty() { return Err("Phone number is required".to_string()); }
        let digits_only: String = phone.chars().filter(|c| c.is_ascii_digit()).collect();
        if digits_only.len() < 10 || digits_only.len() > 15 {
            return Err("Phone number must be between 10 and 15 digits".to_string());
        }
        Ok(())
    }

    fn validate_location_data(&self, req: &CreateClientRequest) -> Result<(), String> {
        if let (Some(street), Some(city), Some(state), Some(zip)) =
            (&req.address_street, &req.address_city, &req.address_state, &req.address_zip)
        {
            self.validate_address(street, city, state, zip)?;
        }
        if let Some(country) = &req.address_country {
            if country.trim().is_empty() {
                return Err("Country cannot be empty if provided".to_string());
            }
        }
        Ok(())
    }

    fn validate_address(&self, street: &str, city: &str, state: &str, zip: &str) -> Result<(), String> {
        if street.trim().is_empty() { return Err("Street address is required".to_string()); }
        if city.trim().is_empty() { return Err("City is required".to_string()); }
        if state.trim().is_empty() { return Err("State is required".to_string()); }
        if zip.trim().is_empty() { return Err("ZIP code is required".to_string()); }
        let zip_regex = Regex::new(r"^\d{5}(-\d{4})?$")
            .map_err(|_| "Invalid ZIP regex pattern".to_string())?;
        if !zip_regex.is_match(zip) {
            return Err("Invalid ZIP code format (expected 12345 or 12345-6789)".to_string());
        }
        Ok(())
    }

    async fn check_for_duplicates(&self, req: &CreateClientRequest) -> Result<(), String> {
        if let Some(ref email) = req.email {
            let exists = IClientRepository::find_by_email(self.client_repo.as_ref(), email).await
                .map_err(|e| format!("Failed to check email duplicates: {}", e))?
                .is_some();
            if exists { return Err("A client with this email address already exists".to_string()); }
        }
        if let Some(ref tax_id) = req.tax_id {
            if !tax_id.trim().is_empty() {
                let query = ClientRepoQuery {
                    ..Default::default()
                };
                let count = IClientRepository::count(self.client_repo.as_ref(), query).await
                    .map_err(|e| format!("Failed to check tax ID duplicates: {}", e))?;
                // This is a placeholder, actual implementation should filter by tax_id in Repo.
                if count > 1000000 { // dummy
                     return Err("A client with this tax ID already exists".to_string());
                }
            }
        }
        Ok(())
    }

    fn validate_business_rules(&self, req: &CreateClientRequest) -> Result<(), String> {
        match req.customer_type {
            CustomerType::Business => {
                if req.company_name.as_ref().map_or(true, |n| n.trim().is_empty()) {
                    return Err("Company name is required for business clients".to_string());
                }
                if req.contact_person.as_ref().map_or(true, |p| p.trim().is_empty()) {
                    return Err("Contact person is required for business clients".to_string());
                }
                if req.tax_id.as_ref().map_or(true, |t| t.trim().is_empty()) {
                    return Err("Tax ID is recommended for business clients".to_string());
                }
            }
            CustomerType::Individual => {
                if req.company_name.as_ref().map_or(false, |n| n.len() > 100) {
                    return Err("Company name cannot exceed 100 characters".to_string());
                }
            }
        }
        if let Some(tags) = &req.tags {
            if tags.len() > 500 { return Err("Tags cannot exceed 500 characters".to_string()); }
            if !tags.trim().is_empty() {
                serde_json::from_str::<serde_json::Value>(tags)
                    .map_err(|_| "Tags must be valid JSON".to_string())?;
            }
        }
        Ok(())
    }

    pub fn validate_client_deletion(&self, client_id: &str) -> Result<(), String> {
        let active_tasks = futures::executor::block_on(self.client_repo.count_active_tasks(client_id))
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
