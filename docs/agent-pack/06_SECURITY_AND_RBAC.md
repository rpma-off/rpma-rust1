# RPMA v2 Security and RBAC

## Authentication Flow

### Overview
RPMA v2 implements a robust authentication system with password-based authentication, two-factor authentication (2FA), and secure session management.

### Login Flow
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ User enters     │───▶│ Frontend hashes  │───▶│ Backend validates│───▶│ Backend creates │
│ credentials     │    │ password with   │    │ credentials    │    │ session token   │
│                 │    │ salt            │    │ and returns    │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │                       │
         ▼                       ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ If 2FA enabled, │◀───│ Backend returns │◀───│ Backend stores  │◀───│ Session token   │
│ prompt for 2FA  │    │ temporary token  │    │ session in DB  │    │ returned to    │
│ code            │    │ requiring 2FA   │    │ with expiry    │    │ frontend        │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │                       │
         ▼                       ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ User enters 2FA │───▶│ Frontend sends │───▶│ Backend validates│───▶│ Backend issues  │
│ code            │    │ 2FA code       │    │ 2FA and returns│    │ final session   │
│                 │    │ with temp token│    │ session token   │    │ token           │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Implementation Details
**Backend**: `src-tauri/src/commands/auth.rs`
**Frontend**: `frontend/src/lib/ipc/domains/auth.ts`

```rust
// Password hashing with salt
pub fn hash_password(password: &str, salt: &str) -> String {
    use argon2::{
        password_hash::{PasswordHasher, SaltString},
        Argon2,
    };
    
    let salt = SaltString::encode_b64(salt.as_bytes())
        .expect("Salt should be valid base64");
    
    Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .expect("Password should hash")
        .to_string()
}

// Session token generation
pub fn generate_session_token() -> String {
    use uuid::Uuid;
    Uuid::new_v4().to_string()
}
```

### Session Management
Sessions are stored in the database with expiry timestamps and automatic cleanup:

```sql
-- Session table structure
CREATE TABLE user_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL,
    last_activity DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## Two-Factor Authentication

### TOTP Implementation
RPMA v2 supports Time-based One-Time Passwords (TOTP) using the RFC 6238 standard:

```rust
// 2FA setup
use totp_lite::{totp, Sha1};

pub fn generate_totp_secret() -> String {
    use base32::Alphabet;
    base32::encode(Alphabet::RFC4648 { padding: true }, &generate_random_bytes(20))
}

pub fn verify_totp(secret: &str, code: &str) -> bool {
    let time = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs() / 30;
    
    totp::<Sha1>(secret, time).map(|t| t == code.parse::<u32>().unwrap()).unwrap_or(false)
}
```

### Backup Codes
Users can generate backup codes for account recovery when 2FA is enabled:

```rust
// Generate backup codes
pub fn generate_backup_codes() -> Vec<String> {
    (0..10)
        .map(|_| {
            (0..8)
                .map(|_| fastrand::digit(10))
                .collect()
        })
        .collect()
}
```

## Role-Based Access Control (RBAC)

### Role Hierarchy
RPMA v2 implements four distinct roles with escalating permissions:

#### 1. Viewer
- Read-only access to assigned tasks and interventions
- View client information
- View reports and analytics
- Cannot modify any data

#### 2. Technician
- All Viewer permissions
- Create and update own tasks and interventions
- Upload photos and complete workflow steps
- View and update assigned inventory
- Generate personal performance reports

#### 3. Supervisor
- All Technician permissions
- View and manage all team tasks and interventions
- Assign tasks to technicians
- View all client information
- Generate team performance reports
- Manage inventory levels

#### 4. Admin
- All Supervisor permissions
- User management (create, update, deactivate)
- System configuration and settings
- Full database access and exports
- Manage all aspects of the application

### Permission Matrix

| Feature                 | Viewer | Technician | Supervisor | Admin |
|-------------------------|--------|------------|------------|-------|
| View assigned tasks     | ✓      | ✓          | ✓          | ✓     |
| View all tasks          | ✗      | ✗          | ✓          | ✓     |
| Create tasks            | ✗      | ✓          | ✓          | ✓     |
| Assign tasks            | ✗      | ✗          | ✓          | ✓     |
| Execute interventions   | ✗      | ✓          | ✓          | ✓     |
| View all clients        | ✓      | ✓          | ✓          | ✓     |
| Edit client information | ✗      | ✗          | ✓          | ✓     |
| Manage inventory        | ✗      | ✓ (view)   | ✓          | ✓     |
| Generate reports        | ✓ (own)| ✓ (own)    | ✓ (team)   | ✓     |
| Manage users            | ✗      | ✗          | ✗          | ✓     |
| System settings         | ✗      | ✗          | ✗          | ✓     |

### Permission Enforcement
Permissions are checked at the command level:

```rust
// Example permission check
#[tauri::command]
async fn assign_task(
    task_id: String,
    technician_id: String,
    session_token: String,
    app_state: State<'_, Arc<AppState>>,
) -> Result<Task, AppError> {
    // Authenticate user
    let user = authenticate(&session_token, &app_state.db)?;
    
    // Check authorization
    if user.role < UserRole::Supervisor {
        return Err(AppError::Authorization(
            "Only supervisors and admins can assign tasks".to_string()
        ));
    }
    
    // Execute operation
    TaskService::assign_task(&app_state.db, &task_id, &technician_id, &user.id)
}
```

### Data Access Control
Row-level security ensures users can only access data they're authorized to see:

```rust
// In repository methods
pub fn list_tasks_for_user(
    tx: &Transaction,
    user: &User,
    filters: &TaskFilters,
) -> Result<Vec<Task>, AppError> {
    let mut query = String::from(
        "SELECT * FROM tasks WHERE deleted_at IS NULL"
    );
    
    // Add role-based filtering
    match user.role {
        UserRole::Viewer | UserRole::Technician => {
            query.push_str(" AND technician_id = ?");
            params.push(user.id.clone());
        },
        UserRole::Supervisor => {
            // Supervisors can see their team's tasks
            query.push_str(" AND technician_id IN (SELECT id FROM users WHERE supervisor_id = ?)");
            params.push(user.id.clone());
        },
        UserRole::Admin => {
            // Admins can see all tasks (no additional filter)
        }
    }
    
    // Execute query with params
    // ...
}
```

## Data Protection

### Local Database Security
- SQLite database is encrypted at rest using SQLCipher
- Database file permissions are restricted to the current user
- Automatic database locking when application is not in focus

### Secrets Management
- Sensitive configuration is stored in environment variables
- API keys and tokens are encrypted in the database
- Passwords are hashed using Argon2 with per-user salts
- Session tokens are cryptographically secure UUIDs

### Input Validation
All user inputs are validated before processing:

```rust
// Example validation
use validator::{Validate, ValidationError};

#[derive(Debug, Validate, Deserialize)]
pub struct CreateTaskRequest {
    #[validate(length(min = 1, max = 255, message = "Title must be 1-255 characters"))]
    pub title: String,
    
    #[validate(email(message = "Invalid email format"))]
    pub client_email: Option<String>,
    
    #[validate(custom = "validate_ppf_zones")]
    pub ppf_zones: Option<Vec<String>>,
}

fn validate_ppf_zones(zones: &Vec<String>) -> Result<(), ValidationError> {
    let valid_zones = vec![
        "hood", "roof", "trunk", "fenders", "mirrors", "bumpers", "doors"
    ];
    
    for zone in zones {
        if !valid_zones.contains(&zone.as_str()) {
            return Err(ValidationError::new("Invalid PPF zone"));
        }
    }
    
    Ok(())
}
```

### SQL Injection Prevention
All database queries use parameterized statements:

```rust
// Safe query execution
pub fn get_user_by_email(tx: &Transaction, email: &str) -> Result<User, AppError> {
    let mut stmt = tx.prepare(
        "SELECT id, email, username, role FROM users WHERE email = ? AND deleted_at IS NULL"
    )?;
    
    let user = stmt.query_row(params![email], |row| {
        Ok(User {
            id: row.get(0)?,
            email: row.get(1)?,
            username: row.get(2)?,
            role: UserRole::from_str(row.get::<_, String>(3)?).unwrap(),
        })
    })?;
    
    Ok(user)
}
```

## Audit Logging

### Security Event Logging
All security-sensitive operations are logged with correlation IDs:

```rust
// Audit logging for security events
use serde_json::json;

pub fn log_security_event(
    db: &DbPool,
    event_type: &str,
    user_id: &str,
    details: serde_json::Value,
    correlation_id: &str,
) -> Result<(), AppError> {
    let log_entry = SecurityLog {
        id: Uuid::new_v4().to_string(),
        event_type: event_type.to_string(),
        user_id: user_id.to_string(),
        details: json!(details),
        ip_address: get_client_ip(),
        user_agent: get_user_agent(),
        timestamp: chrono::Utc::now(),
        correlation_id: correlation_id.to_string(),
    };
    
    SecurityLogRepository::create(db, &log_entry)
}

// Usage in authentication
if password_invalid {
    log_security_event(
        &app_state.db,
        "login_failed_invalid_password",
        &user.id,
        json!({"email": credentials.email}),
        &correlation_id,
    );
}
```

### Data Access Auditing
Access to sensitive data is tracked:

```rust
// Log access to client data
pub fn get_client_with_audit(
    client_id: &str,
    user: &User,
    db: &DbPool,
) -> Result<Client, AppError> {
    let client = ClientRepository::get_by_id(&db.get()?, client_id)?;
    
    // Log access
    log_data_access(
        &db,
        "client_accessed",
        &user.id,
        client_id,
        json!({"action": "view"}),
    )?;
    
    Ok(client)
}
```

## Security Validation Scripts

### Security Audit Command
```bash
# Run comprehensive security audit
npm run security:audit

# This script checks for:
# 1. Hardcoded secrets in source code
# 2. Weak dependency versions
# 3. Insecure configurations
# 4. SQL injection vulnerabilities
# 5. XSS vulnerabilities
```

### Session Management Validation
```bash
# Check session security
node scripts/validate-session-security.js

# Validates:
# 1. Session token entropy
# 2. Session expiry enforcement
# 3. Concurrent session limits
# 4. Session cleanup processes
```

### RBAC Validation
```bash
# Validate RBAC implementation
node scripts/validate-rbac.js

# Checks:
# 1. Permission coverage for all commands
# 2. Data access control enforcement
# 3. Role hierarchy consistency
# 4. Privilege escalation prevention
```

## Secure Development Guidelines

### Password Policy
- Minimum 12 characters
- Require uppercase, lowercase, numbers, and symbols
- Password history tracking (prevent reuse of last 5 passwords)
- Expiration after 90 days (configurable)

### Session Security
- Tokens expire after 8 hours of inactivity
- Maximum session duration of 24 hours
- Concurrent session limit of 3 per user
- Automatic cleanup of expired sessions

### API Security
- Rate limiting on authentication endpoints
- Account lockout after 5 failed attempts (30 minute cooldown)
- CORS configuration for web-based access
- Content Security Policy headers

### Data Encryption
- Database encryption at rest
- Backup encryption
- Secure transmission over IPC
- Sensitive field encryption in database

### Secure Configuration
```rust
// Security configuration
pub struct SecurityConfig {
    pub password_min_length: usize,
    pub max_login_attempts: u32,
    pub lockout_duration_minutes: u64,
    pub session_timeout_hours: u64,
    pub max_concurrent_sessions: u32,
    pub require_2fa_for_admins: bool,
}

impl Default for SecurityConfig {
    fn default() -> Self {
        Self {
            password_min_length: 12,
            max_login_attempts: 5,
            lockout_duration_minutes: 30,
            session_timeout_hours: 8,
            max_concurrent_sessions: 3,
            require_2fa_for_admins: true,
        }
    }
}
```

## Security Testing

### Authentication Testing
```rust
#[cfg(test)]
mod security_tests {
    use super::*;
    
    #[test]
    fn test_password_hashing() {
        let password = "test_password_123!";
        let salt = "random_salt";
        
        let hash = hash_password(password, salt);
        let hash2 = hash_password(password, salt);
        
        // Same password and salt should produce same hash
        assert_eq!(hash, hash2);
        
        // Hash should not contain plaintext password
        assert!(!hash.contains(password));
    }
    
    #[test]
    fn test_totp_verification() {
        let secret = generate_totp_secret();
        let code = generate_totp_code(&secret);
        
        assert!(verify_totp(&secret, &code));
        assert!(!verify_totp(&secret, "000000"));
    }
}
```

### Integration Testing
```rust
#[tauri::test]
async fn test_authentication_flow() {
    // Create test user
    let user = create_test_user().await;
    
    // Test login
    let login_response = login_with_credentials(
        user.email.clone(),
        "test_password"
    ).await;
    
    assert!(login_response.success);
    assert!(login_response.data.session_token.is_some());
    
    // Test protected endpoint without token
    let protected_response = get_protected_resource("").await;
    assert!(!protected_response.success);
    
    // Test protected endpoint with token
    let protected_response = get_protected_resource(
        &login_response.data.session_token
    ).await;
    assert!(protected_response.success);
}
```