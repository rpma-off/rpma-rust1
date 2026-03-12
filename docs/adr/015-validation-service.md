---
title: "Centralized Validation Service with Domain-Specific Validators"
summary: "Consolidate input validation in a shared service with domain-specific validators, keeping business rules in the backend while providing UX feedback on frontend."
domain: validation
status: accepted
created: 2026-03-12
---

## Context

Input validation is needed at multiple levels:

- Frontend: Immediate UX feedback
- IPC layer: Request shape validation
- Domain layer: Business rule enforcement

Without centralized validation:

- Rules are duplicated across layers
- Frontend and backend can disagree on validity
- Error messages are inconsistent
- Security validation is scattered

## Decision

**Implement a centralized validation service with domain-specific submodules, enforced primarily in the backend.**

### Service Structure

Defined in `src-tauri/src/shared/services/validation/mod.rs`:

```rust
pub mod field_validators;     // Email, password, username, name
pub mod sanitizers;           // Input sanitization and formatting
pub mod gps_validators;       // GPS coordinate and accuracy
pub mod business_validators;  // Task, client, auth workflow
pub mod security_validators;  // Enhanced security validation
```

### Error Types

```rust
#[derive(Error, Debug)]
pub enum ValidationError {
    #[error("Invalid email format: {0}")]
    InvalidEmail(String),
    #[error("Password too weak: {0}")]
    WeakPassword(String),
    #[error("Invalid username: {0}")]
    InvalidUsername(String),
    #[error("Invalid GPS coordinates: {0}")]
    InvalidGPSCoordinates(String),
    #[error("GPS accuracy too low: {accuracy}m (minimum: {required}m)")]
    GPSAccuracyTooLow { accuracy: f64, required: f64 },
    #[error("Input too long: {field} (max {max} characters)")]
    InputTooLong { field: String, max: usize },
}
```

### Field Validators

```rust
// field_validators.rs
pub fn validate_email(email: &str) -> Result<(), ValidationError> {
    let email_regex = Regex::new(r"^[^\s@]+@[^\s@]+\.[^\s@]+$").unwrap();
    if !email_regex.is_match(email) {
        return Err(ValidationError::InvalidEmail(email.to_string()));
    }
    Ok(())
}

pub fn validate_password(password: &str) -> Result<(), ValidationError> {
    if password.len() < 8 {
        return Err(ValidationError::WeakPassword("Must be at least 8 characters".into()));
    }
    if !password.chars().any(|c| c.is_uppercase()) {
        return Err(ValidationError::WeakPassword("Must contain uppercase letter".into()));
    }
    Ok(())
}
```

### GPS Validators

```rust
// gps_validators.rs
pub fn validate_gps_coordinates(lat: f64, lng: f64) -> Result<(), ValidationError> {
    if !(-90.0..=90.0).contains(&lat) {
        return Err(ValidationError::InvalidGPSCoordinates(
            format!("Latitude {} out of range", lat)
        ));
    }
    if !(-180.0..=180.0).contains(&lng) {
        return Err(ValidationError::InvalidGPSCoordinates(
            format!("Longitude {} out of range", lng)
        ));
    }
    Ok(())
}

pub fn validate_gps_accuracy(accuracy: f64, min_required: f64) -> Result<(), ValidationError> {
    if accuracy > min_required {
        return Err(ValidationError::GPSAccuracyTooLow {
            accuracy,
            required: min_required,
        });
    }
    Ok(())
}
```

### Business Validators

```rust
// business_validators.rs
pub fn validate_task_status_transition(
    current: TaskStatus,
    new: TaskStatus,
) -> Result<(), ValidationError> {
    match (current, new) {
        (TaskStatus::Pending, TaskStatus::InProgress) => Ok(()),
        (TaskStatus::InProgress, TaskStatus::Completed) => Ok(()),
        (TaskStatus::InProgress, TaskStatus::OnHold) => Ok(()),
        _ => Err(ValidationError::InvalidTransition(format!(
            "Cannot transition from {:?} to {:?}",
            current, new
        ))),
    }
}
```

### Frontend Validation (UX Only)

Frontend validates for immediate feedback but backend is authoritative:

```typescript
// frontend/src/lib/validation/field-validators.ts
export function validateEmail(email: string): string | null {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return 'Invalid email format';
    }
    return null;
}

// Used in forms for immediate feedback
const emailError = validateEmail(formData.email);
```

### Backend Validation (Authoritative)

```rust
// In domain/application layer
pub fn create_task(&self, ctx: &RequestContext, request: CreateTaskRequest) -> AppResult<Task> {
    // Validate all fields
    ValidationService::validate_title(&request.title)?;
    ValidationService::validate_gps(&request.location)?;
    
    // Business rules
    self.validate_client_exists(&request.client_id)?;
    self.validate_technician_available(&request.assigned_to)?;
    
    // Create task
    // ...
}
```

## Consequences

### Positive

- **Single Source of Truth**: Backend validation is authoritative
- **Reusability**: Validators shared across domains
- **Type Safety**: Rust ensures all fields are validated
- **Consistent Errors**: Standardized error messages
- **Security**: Sanitizers prevent injection attacks

### Negative

- **Duplication**: Frontend must duplicate some rules for UX
- **Latency**: Backend validation requires round-trip
- **Complexity**: Two validation layers to maintain
- **Drift Risk**: Frontend and backend rules can diverge

## Related Files

- `src-tauri/src/shared/services/validation/mod.rs` — Validation module
- `src-tauri/src/shared/services/validation/field_validators.rs` — Field validators
- `src-tauri/src/shared/services/validation/gps_validators.rs` — GPS validators
- `src-tauri/src/shared/services/validation/business_validators.rs` — Business rules
- `src-tauri/src/shared/services/validation/security_validators.rs` — Security
- `frontend/src/lib/validation/` — Frontend validation

## Read When

- Adding new input fields
- Implementing form validation
- Creating new business rules
- Debugging validation errors
- Adding security validation
- Understanding GPS accuracy requirements
