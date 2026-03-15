---
title: "ADR-008: Centralized Validation Service"
summary: "All input validation goes through a centralized validation service. No inline ad-hoc validation in handlers, services, or repositories."
domain: "validation"
status: "accepted"
read_when:
  - "Designing new features"
  - "Reviewing architectural decisions"
---

# ADR-008: Centralized Validation Service

## Status

Accepted

## Date

2026-03-13

## Summary

All input validation goes through a centralized validation service. No inline ad-hoc validation in handlers, services, or repositories.

## Context

- Need consistent validation across all domains
- Ad-hoc validation leads to inconsistent error messages
- Security-sensitive inputs (email, password, GPS) need specialized validation
- Business rules validation (task status transitions) needs centralization
- Validation errors should be structured and internationalizable

## Decision

### The Rule

**All input validation goes through `shared/services/validation/`. Never inline ad-hoc validation.**

### Validation Modules

```
shared/services/validation/
├── mod.rs              — ValidationService entrypoint
├── field_validators.rs — Email, password, username, name
├── sanitizers.rs       — Input sanitization and text formatting
├── gps_validators.rs   — GPS coordinate and accuracy validators
├── business_validators.rs — Task, client, auth workflow validators
├── security_validators.rs — Enhanced security validation
└── tests.rs            — Validation tests
```

### Error Types

```rust
// src-tauri/src/shared/services/validation/mod.rs
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
```

### Field Validators

```rust
// src-tauri/src/shared/services/validation/field_validators.rs
impl ValidationService {
    /// Validate email format
    pub fn validate_email(email: &str) -> Result<String, ValidationError> {
        let email = email.trim();
        
        if email.is_empty() {
            return Err(ValidationError::InputTooShort {
                field: "email".into(),
                min: 1,
            });
        }
        
        if email.len() > 254 {
            return Err(ValidationError::InputTooLong {
                field: "email".into(),
                max: 254,
            });
        }
        
        // RFC 5322 compliant regex
        let email_regex = Regex::new(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
            .unwrap();
        
        if !email_regex.is_match(email) {
            return Err(ValidationError::InvalidEmail(email.into()));
        }
        
        Ok(email.to_lowercase())
    }

    /// Validate password strength
    pub fn validate_password(password: &str) -> Result<String, ValidationError> {
        if password.len() < 8 {
            return Err(ValidationError::WeakPassword(
                "Password must be at least 8 characters".into(),
            ));
        }
        
        if password.len() > 128 {
            return Err(ValidationError::InputTooLong {
                field: "password".into(),
                max: 128,
            });
        }
        
        // Check for common patterns
        let has_upper = password.chars().any(|c| c.is_uppercase());
        let has_lower = password.chars().any(|c| c.is_lowercase());
        let has_digit = password.chars().any(|c| c.is_numeric());
        
        if !has_upper || !has_lower || !has_digit {
            return Err(ValidationError::WeakPassword(
                "Password must contain uppercase, lowercase, and digit".into(),
            ));
        }
        
        Ok(password.into())
    }

    /// Validate username format
    pub fn validate_username(username: &str) -> Result<String, ValidationError> {
        let username = username.trim();
        
        if username.len() < 3 {
            return Err(ValidationError::InputTooShort {
                field: "username".into(),
                min: 3,
            });
        }
        
        if username.len() > 64 {
            return Err(ValidationError::InputTooLong {
                field: "username".into(),
                max: 64,
            });
        }
        
        // Alphanumeric and underscore only
        if !username.chars().all(|c| c.is_alphanumeric() || c == '_') {
            return Err(ValidationError::InvalidUsername(
                "Username must contain only letters, numbers, and underscores".into(),
            ));
        }
        
        Ok(username.into())
    }
}
```

### GPS Validators

```rust
// src-tauri/src/shared/services/validation/gps_validators.rs
impl ValidationService {
    /// Validate GPS coordinates
    pub fn validate_gps_coordinates(
        latitude: f64,
        longitude: f64,
    ) -> Result<(), ValidationError> {
        if latitude < -90.0 || latitude > 90.0 {
            return Err(ValidationError::InvalidGPSCoordinates(
                format!("Latitude {} out of range [-90, 90]", latitude),
            ));
        }
        
        if longitude < -180.0 || longitude > 180.0 {
            return Err(ValidationError::InvalidGPSCoordinates(
                format!("Longitude {} out of range [-180, 180]", longitude),
            ));
        }
        
        Ok(())
    }

    /// Validate GPS accuracy for intervention location requirements
    pub fn validate_gps_accuracy(
        accuracy_meters: f64,
        required_accuracy_meters: f64,
    ) -> Result<(), ValidationError> {
        if accuracy_meters > required_accuracy_meters {
            return Err(ValidationError::GPSAccuracyTooLow {
                accuracy: accuracy_meters,
                required: required_accuracy_meters,
            });
        }
        
        Ok(())
    }

    /// Validate GPS data freshness
    pub fn validate_gps_freshness(
        timestamp_ms: i64,
        max_age_seconds: i64,
    ) -> Result<(), ValidationError> {
        let now = Utc::now().timestamp_millis();
        let age_seconds = (now - timestamp_ms) / 1000;
        
        if age_seconds > max_age_seconds {
            return Err(ValidationError::GPSDataTooOld {
                age_seconds,
                max_age: max_age_seconds,
            });
        }
        
        Ok(())
    }
}
```

### Business Validators

```rust
// src-tauri/src/shared/services/validation/business_validators.rs
impl ValidationService {
    /// Validate task status transition
    pub fn validate_task_status_transition(
        from: TaskStatus,
        to: TaskStatus,
    ) -> Result<(), ValidationError> {
        let valid_transitions = match from {
            TaskStatus::Pending => vec![TaskStatus::Assigned, TaskStatus::Cancelled],
            TaskStatus::Assigned => vec![TaskStatus::InProgress, TaskStatus::Pending, TaskStatus::Cancelled],
            TaskStatus::InProgress => vec![TaskStatus::Completed, TaskStatus::OnHold, TaskStatus::Cancelled],
            TaskStatus::OnHold => vec![TaskStatus::InProgress, TaskStatus::Cancelled],
            TaskStatus::Completed => vec![],
            TaskStatus::Cancelled => vec![],
        };
        
        if !valid_transitions.contains(&to) {
            return Err(ValidationError::InvalidStatusTransition {
                from: from.to_string(),
                to: to.to_string(),
            });
        }
        
        Ok(())
    }
}
```

### Usage in Handlers

```rust
// ✅ CORRECT: Use validation service
#[tauri::command]
pub async fn create_user(
    request: CreateUserRequest,
    state: State<'_, AppStateType>,
    correlation_id: Option<String>,
) -> AppResult<User> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Admin);
    
    // Validate inputs
    let email = ValidationService::validate_email(&request.email)?;
    let password = ValidationService::validate_password(&request.password)?;
    let username = ValidationService::validate_username(&request.username)?;
    
    let service = UserService::new(/* ... */);
    service.create_user(email, password, username, &ctx).await
}

// ❌ WRONG: Inline validation
#[tauri::command]
pub async fn create_user(
    request: CreateUserRequest,
    state: State<'_, AppStateType>,
    correlation_id: Option<String>,
) -> AppResult<User> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Admin);
    
    // Don't do this!
    if request.email.len() < 5 {
        return Err(AppError::Validation("Email too short".into()));
    }
    
    // ...
}
```

## Consequences

### Positive

- Consistent validation across all domains
- Centralized error messages (internationalizable)
- Security-sensitive validation in one place
- Easy to add new validation rules
- Testable in isolation

### Negative

- May seem over-engineered for simple validations
- Requires importing validation service everywhere
- Some domain-specific validation may still be needed

## Related Files

- `src-tauri/src/shared/services/validation/mod.rs` — Main module
- `src-tauri/src/shared/services/validation/field_validators.rs`
- `src-tauri/src/shared/services/validation/gps_validators.rs`
- `src-tauri/src/shared/services/validation/business_validators.rs`
- `src-tauri/src/shared/services/validation/security_validators.rs`
- `src-tauri/src/shared/services/validation/sanitizers.rs`

## When to Read This ADR

- Adding new input fields
- Implementing form validation
- Handling user input
- Creating new entity types
- Writing validation tests
- Security-sensitive input handling

## References

- AGENTS.md "All input validation goes through shared/services/validation/"
- Validation error types
- Test cases in validation tests