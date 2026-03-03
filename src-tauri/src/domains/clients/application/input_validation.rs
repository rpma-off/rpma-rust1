//! Input validation and sanitization for Client CRUD operations.
//!
//! Extracts presentation-layer input sanitization into the application layer,
//! keeping IPC handlers thin.

use crate::commands::ClientAction;
use crate::domains::clients::domain::models::client::{CreateClientRequest, UpdateClientRequest};
use crate::shared::ipc::errors::AppError;
use crate::shared::services::validation::ValidationService;

/// Validate and sanitize the data inside a [`ClientAction`].
///
pub fn sanitize_client_action(action: ClientAction) -> Result<ClientAction, AppError> {
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

fn sanitize_update_request(
    id: String,
    data: UpdateClientRequest,
) -> Result<UpdateClientRequest, AppError> {
    let validator = ValidationService::new();

    let validated_name = match data.name.as_deref() {
        Some(name) => Some(
            validator
                .sanitize_text_input(name, "name", 100)
                .map_err(|e| AppError::Validation(format!("Name validation failed: {}", e)))?,
        ),
        None => None,
    };
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domains::clients::domain::models::client::{ClientQuery, CustomerType};

    #[test]
    fn sanitize_create_action_sanitizes_fields() {
        let action = ClientAction::Create {
            data: CreateClientRequest {
                name: "  Client Name  ".to_string(),
                email: Some(" client@example.com ".to_string()),
                phone: Some(" +33123456789 ".to_string()),
                customer_type: CustomerType::Individual,
                address_street: None,
                address_city: None,
                address_state: None,
                address_zip: None,
                address_country: None,
                tax_id: None,
                company_name: Some("  ACME  ".to_string()),
                contact_person: Some("  John  ".to_string()),
                notes: Some("  note  ".to_string()),
                tags: Some("[\"  tag-a  \",\"tag-b\"]".to_string()),
            },
        };

        let sanitized = sanitize_client_action(action).expect("create sanitization should pass");
        match sanitized {
            ClientAction::Create { data } => {
                assert_eq!(data.name, "Client Name");
                assert_eq!(data.email.as_deref(), Some("client@example.com"));
                assert_eq!(data.company_name.as_deref(), Some("ACME"));
                assert_eq!(data.contact_person.as_deref(), Some("John"));
                assert_eq!(data.notes.as_deref(), Some("note"));
                assert_eq!(data.tags.as_deref(), Some("[\"tag-a\",\"tag-b\"]"));
            }
            _ => panic!("expected create action"),
        }
    }

    #[test]
    fn sanitize_update_action_sanitizes_fields() {
        let action = ClientAction::Update {
            id: "client-1".to_string(),
            data: UpdateClientRequest {
                id: "different-id".to_string(),
                name: Some("  Updated Name  ".to_string()),
                email: Some(" update@example.com ".to_string()),
                phone: Some(" +33987654321 ".to_string()),
                customer_type: Some(CustomerType::Business),
                address_street: None,
                address_city: None,
                address_state: None,
                address_zip: None,
                address_country: None,
                tax_id: None,
                company_name: Some("  NewCo  ".to_string()),
                contact_person: Some("  Jane  ".to_string()),
                notes: Some("  hello  ".to_string()),
                tags: Some("[\"  one  \",\"two\"]".to_string()),
            },
        };

        let sanitized = sanitize_client_action(action).expect("update sanitization should pass");
        match sanitized {
            ClientAction::Update { id, data } => {
                assert_eq!(id, "client-1");
                assert_eq!(data.id, "client-1");
                assert_eq!(data.name.as_deref(), Some("Updated Name"));
                assert_eq!(data.email.as_deref(), Some("update@example.com"));
                assert_eq!(data.company_name.as_deref(), Some("NewCo"));
                assert_eq!(data.contact_person.as_deref(), Some("Jane"));
                assert_eq!(data.notes.as_deref(), Some("hello"));
                assert_eq!(data.tags.as_deref(), Some("[\"one\",\"two\"]"));
            }
            _ => panic!("expected update action"),
        }
    }

    #[test]
    fn sanitize_other_actions_pass_through() {
        let action = ClientAction::List {
            filters: ClientQuery::default(),
        };

        let sanitized = sanitize_client_action(action).expect("list sanitization should pass");
        match sanitized {
            ClientAction::List { .. } => {}
            _ => panic!("expected list action"),
        }
    }
}
