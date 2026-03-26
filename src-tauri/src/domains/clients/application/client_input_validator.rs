//! Client input sanitization — application layer (ADR-001).
//!
//! Sanitization and light structural validation of IPC request payloads for the
//! clients bounded context. These functions belong in the application layer so
//! that the IPC handlers (`client_handler/ipc.rs`) remain thin and free of
//! business logic (ADR-018, ADR-001).

use crate::commands::ClientAction;
use crate::domains::clients::client_handler::{CreateClientRequest, UpdateClientRequest};
use crate::shared::ipc::errors::AppError as IpcAppError;
use crate::shared::services::validation::ValidationService;

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

/// Parse, validate, and re-serialise the JSON `tags` field.
///
/// Shared by both `sanitize_create_request` and `sanitize_update_request` to
/// avoid duplicating the same 14-line block in two places.
fn validate_tags_json(
    tags: Option<&str>,
    validator: &ValidationService,
) -> Result<Option<String>, IpcAppError> {
    let Some(tags_str) = tags else {
        return Ok(None);
    };
    let tags: Vec<String> = serde_json::from_str(tags_str)
        .map_err(|e| IpcAppError::Validation(format!("Invalid tags JSON: {}", e)))?;
    let mut validated = Vec::new();
    for tag in tags {
        let sanitized = validator
            .sanitize_text_input(&tag, "tag", 50)
            .map_err(|e| IpcAppError::Validation(format!("Tag validation failed: {}", e)))?;
        validated.push(sanitized);
    }
    Ok(Some(serde_json::to_string(&validated).unwrap_or_default()))
}

pub(crate) fn sanitize_create_request(
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
        .map_err(|e| IpcAppError::Validation(format!("Contact person validation failed: {}", e)))?;
    let validated_notes = validator
        .sanitize_optional_text(data.notes.as_deref(), "notes", 1000)
        .map_err(|e| IpcAppError::Validation(format!("Notes validation failed: {}", e)))?;
    let validated_tags = validate_tags_json(data.tags.as_deref(), &validator)?;
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

pub(crate) fn sanitize_update_request(
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
        .map_err(|e| IpcAppError::Validation(format!("Contact person validation failed: {}", e)))?;
    let validated_notes = validator
        .sanitize_optional_text(data.notes.as_deref(), "notes", 1000)
        .map_err(|e| IpcAppError::Validation(format!("Notes validation failed: {}", e)))?;
    let validated_tags = validate_tags_json(data.tags.as_deref(), &validator)?;
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

/// Validate that a `client_id` string is non-empty.
///
/// Application-layer concern (ADR-001): lives here so IPC handlers stay thin.
pub fn validate_client_id(client_id: &str) -> Result<(), crate::shared::ipc::errors::AppError> {
    if client_id.trim().is_empty() {
        return Err(crate::shared::ipc::errors::AppError::Validation(
            "client_id is required".to_string(),
        ));
    }
    Ok(())
}
