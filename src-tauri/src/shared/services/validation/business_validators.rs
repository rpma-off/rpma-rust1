//! Business-level validators for tasks, clients, and auth workflows.

use regex::Regex;

use crate::commands::TaskAction;
use crate::domains::tasks::domain::models::task::CreateTaskRequest;

use super::ValidationError;

impl super::ValidationService {
    /// Validate user role
    pub fn validate_role(&self, role: &str) -> Result<String, ValidationError> {
        let valid_roles = ["admin", "technician", "supervisor", "viewer"];

        if !valid_roles.contains(&role.to_lowercase().as_str()) {
            return Err(ValidationError::InvalidName(
                "Invalid user role".to_string(),
            ));
        }

        Ok(role.to_lowercase())
    }

    /// Validate complete signup data
    pub fn validate_signup_data(
        &self,
        email: &str,
        username: &str,
        first_name: &str,
        last_name: &str,
        password: &str,
        role: Option<&str>,
    ) -> Result<(String, String, String, String, String, String), ValidationError> {
        let validated_email = self.validate_email(email)?;
        let validated_username = self.validate_username(username)?;
        let validated_first_name = self.validate_name(first_name, "First name")?;
        let validated_last_name = self.validate_name(last_name, "Last name")?;
        let validated_password = self.validate_password(password)?;

        let validated_role = match role {
            Some(r) => self.validate_role(r)?,
            None => "viewer".to_string(), // Default role
        };

        Ok((
            validated_email,
            validated_username,
            validated_first_name,
            validated_last_name,
            validated_password,
            validated_role,
        ))
    }

    /// Validate login data
    pub fn validate_login_data(
        &self,
        email: &str,
        password: &str,
    ) -> Result<(String, String), ValidationError> {
        let validated_email = self.validate_email(email)?;

        if password.is_empty() {
            return Err(ValidationError::WeakPassword(
                "Password cannot be empty".to_string(),
            ));
        }

        if password.len() > 128 {
            return Err(ValidationError::InputTooLong {
                field: "password".to_string(),
                max: 128,
            });
        }

        Ok((validated_email, password.to_string()))
    }

    /// Validate task creation data
    pub fn validate_task_creation(
        &self,
        vehicle_plate: &str,
        vehicle_model: &str,
        ppf_zones: &[String],
        scheduled_date: &str,
    ) -> Result<(String, String, Vec<String>, String), ValidationError> {
        // Validate required fields
        if vehicle_plate.trim().is_empty() {
            return Err(ValidationError::InvalidName(
                "Vehicle plate is required".to_string(),
            ));
        }
        if vehicle_plate.len() > 20 {
            return Err(ValidationError::InputTooLong {
                field: "vehicle_plate".to_string(),
                max: 20,
            });
        }

        if vehicle_model.trim().is_empty() {
            return Err(ValidationError::InvalidName(
                "Vehicle model is required".to_string(),
            ));
        }
        if vehicle_model.len() > 100 {
            return Err(ValidationError::InputTooLong {
                field: "vehicle_model".to_string(),
                max: 100,
            });
        }

        if ppf_zones.is_empty() {
            return Err(ValidationError::InvalidName(
                "PPF zones are required".to_string(),
            ));
        }
        for zone in ppf_zones {
            if zone.trim().is_empty() {
                return Err(ValidationError::InvalidName(
                    "PPF zone cannot be empty".to_string(),
                ));
            }
            if zone.len() > 100 {
                return Err(ValidationError::InputTooLong {
                    field: "ppf_zone".to_string(),
                    max: 100,
                });
            }
        }

        if scheduled_date.trim().is_empty() {
            return Err(ValidationError::InvalidName(
                "Scheduled date is required".to_string(),
            ));
        }
        // Basic date format validation (YYYY-MM-DD)
        if !scheduled_date.chars().all(|c| c.is_numeric() || c == '-') || scheduled_date.len() != 10
        {
            return Err(ValidationError::InvalidName(
                "Invalid scheduled date format".to_string(),
            ));
        }

        Ok((
            vehicle_plate.to_string(),
            vehicle_model.to_string(),
            ppf_zones.to_vec(),
            scheduled_date.to_string(),
        ))
    }

    /// Validate task action data
    pub async fn validate_task_action(
        &self,
        action: TaskAction,
    ) -> Result<TaskAction, ValidationError> {
        match action {
            TaskAction::Create { data } => {
                let (validated_plate, validated_model, validated_zones, validated_date) = self
                    .validate_task_creation(
                        &data.vehicle_plate,
                        &data.vehicle_model,
                        &data.ppf_zones,
                        &data.scheduled_date,
                    )?;

                Ok(TaskAction::Create {
                    data: CreateTaskRequest {
                        vehicle_plate: validated_plate,
                        vehicle_model: validated_model,
                        ppf_zones: validated_zones,
                        scheduled_date: validated_date,
                        ..data
                    },
                })
            }
            TaskAction::Update { id, data } => {
                // Validate ID format
                if id.trim().is_empty() {
                    return Err(ValidationError::InvalidName(
                        "Task ID is required".to_string(),
                    ));
                }

                // For update, we can validate optional fields if provided
                if let Some(vehicle_plate) = &data.vehicle_plate {
                    if vehicle_plate.trim().is_empty() {
                        return Err(ValidationError::InvalidName(
                            "Vehicle plate cannot be empty".to_string(),
                        ));
                    }
                    if vehicle_plate.len() > 20 {
                        return Err(ValidationError::InputTooLong {
                            field: "vehicle_plate".to_string(),
                            max: 20,
                        });
                    }
                }

                if let Some(ppf_zones) = &data.ppf_zones {
                    if ppf_zones.is_empty() {
                        return Err(ValidationError::InvalidName(
                            "At least one PPF zone required".to_string(),
                        ));
                    }
                    for zone in ppf_zones {
                        if zone.trim().is_empty() {
                            return Err(ValidationError::InvalidName(
                                "PPF zone cannot be empty".to_string(),
                            ));
                        }
                    }
                }

                Ok(TaskAction::Update { id, data })
            }
            // For other actions, just return as-is for now
            _ => Ok(action),
        }
    }

    /// Validate client creation data
    pub fn validate_client_creation(&self, name: &str) -> Result<String, ValidationError> {
        if name.trim().is_empty() {
            return Err(ValidationError::InvalidName("Name is required".to_string()));
        }
        if name.len() > 100 {
            return Err(ValidationError::InputTooLong {
                field: "name".to_string(),
                max: 100,
            });
        }

        // Basic name validation - allow letters, spaces, hyphens, apostrophes
        let name_regex = Regex::new(r"^[\p{L}\s'-]+$")
            .map_err(|_| ValidationError::InvalidName("Invalid regex pattern".to_string()))?;

        if !name_regex.is_match(name) {
            return Err(ValidationError::InvalidName(
                "Name can only contain letters, spaces, hyphens, and apostrophes".to_string(),
            ));
        }

        Ok(name.trim().to_string())
    }

    /// Validate email for client (optional field)
    pub fn validate_client_email(
        &self,
        email: Option<&str>,
    ) -> Result<Option<String>, ValidationError> {
        match email {
            Some(email_str) if !email_str.trim().is_empty() => {
                let validated = self.validate_email(email_str)?;
                Ok(Some(validated))
            }
            _ => Ok(None),
        }
    }

    /// Validate phone number (basic validation)
    pub fn validate_phone(&self, phone: Option<&str>) -> Result<Option<String>, ValidationError> {
        match phone {
            Some(phone_str) if !phone_str.trim().is_empty() => {
                let cleaned = phone_str
                    .chars()
                    .filter(|c| c.is_numeric() || "+-() ".contains(*c))
                    .collect::<String>();
                if cleaned.len() < 7 || cleaned.len() > 20 {
                    return Err(ValidationError::InvalidName(
                        "Invalid phone number format".to_string(),
                    ));
                }
                Ok(Some(cleaned))
            }
            _ => Ok(None),
        }
    }
}
