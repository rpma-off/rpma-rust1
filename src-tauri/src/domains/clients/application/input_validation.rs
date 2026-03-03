//! Input validation and sanitization for Client CRUD operations.
//!
//! Extracts presentation-layer input sanitization into the application layer,
//! keeping IPC handlers thin.

use crate::commands::ClientAction;
use crate::domains::clients::domain::models::client::CreateClientRequest;
use crate::shared::ipc::errors::AppError;
use crate::shared::services::validation::ValidationService;

/// Validate and sanitize the data inside a [`ClientAction`].
///
/// Only the `Create` variant currently requires field-level sanitization.
/// All other variants pass through unchanged.
pub fn sanitize_client_action(action: ClientAction) -> Result<ClientAction, AppError> {
    match action {
        ClientAction::Create { data } => {
            let sanitized = sanitize_create_request(data)?;
            Ok(ClientAction::Create { data: sanitized })
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

fn sanitize_create_request(data: CreateClientRequest) -> Result<CreateClientRequest, AppError> {
    let validator = ValidationService::new();

    let validated_name = validator
        .sanitize_text_input(&data.name, "name", 100)
        .map_err(|e| AppError::Validation(format!("Name validation failed: {}", e)))?;
    let validated_email = validator
        .validate_client_email(data.email.as_deref())
        .map_err(|e| AppError::Validation(format!("Email validation failed: {}", e)))?;
    let validated_phone = validator
        .validate_phone(data.phone.as_deref())
        .map_err(|e| AppError::Validation(format!("Phone validation failed: {}", e)))?;
    let validated_company_name = validator
        .sanitize_optional_text(data.company_name.as_deref(), "company_name", 100)
        .map_err(|e| AppError::Validation(format!("Company name validation failed: {}", e)))?;
    let validated_contact_person = validator
        .sanitize_optional_text(data.contact_person.as_deref(), "contact_person", 100)
        .map_err(|e| AppError::Validation(format!("Contact person validation failed: {}", e)))?;
    let validated_notes = validator
        .sanitize_optional_text(data.notes.as_deref(), "notes", 1000)
        .map_err(|e| AppError::Validation(format!("Notes validation failed: {}", e)))?;

    let validated_tags = if let Some(tags_str) = &data.tags {
        let tags: Vec<String> = serde_json::from_str(tags_str)
            .map_err(|e| AppError::Validation(format!("Invalid tags JSON: {}", e)))?;
        let mut validated = Vec::new();
        for tag in tags {
            let sanitized = validator
                .sanitize_text_input(&tag, "tag", 50)
                .map_err(|e| AppError::Validation(format!("Tag validation failed: {}", e)))?;
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
