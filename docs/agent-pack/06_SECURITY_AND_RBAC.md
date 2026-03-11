# Security & RBAC

RPMA v2 handles sensitive client data with comprehensive security measures.

## Authentication Flow

### 1. Login Process
**Entry**: `frontend/src/app/login/page.tsx` → `domains/auth/components/LoginForm.tsx`

**Flow**:
1. User submits credentials
2. Frontend calls `auth_login` IPC command
3. Backend validates password hash (argon2)
4. On success, UUID `session_token` generated
5. Session stored in SQLite `sessions` table
6. Token returned to frontend
7. Frontend stores in `AuthProvider` context

### 2. Session Token
**Location**: `src-tauri/src/domains/auth/domain/models/auth.rs` (`UserSession`)

**Duration**: 8 hours (480 minutes / 28,800 seconds)

**Session Structure**:
```rust
pub struct UserSession {
    pub id: String,         // UUID — also the session token
    pub user_id: String,
    pub username: String,
    pub email: String,
    pub role: UserRole,
    pub token: String,      // alias of id
    pub expires_at: String, // RFC3339
    pub last_activity: String,
    pub created_at: String,
}
```

### 3. Session Validation
**Location**: `src-tauri/src/domains/auth/infrastructure/auth/`

- Check token exists in `sessions` table
- Verify `expires_at` > current time
- Update `last_activity` timestamp on access
- Rate limiting on failed attempts (see `rate_limiter.rs`)

### 4. Token Storage
**Table**: `sessions` (migration 041)

---

## Role-Based Access Control (RBAC)

### Roles
**Definition**: `src-tauri/src/domains/auth/domain/models/auth.rs` (`UserRole`)

```rust
pub enum UserRole {
    Admin,       // Full system access
    Supervisor,  // Task management, assignment, quotes
    Technician,  // Assigned tasks, interventions, photos
    Viewer,      // Read-only access
}
```

**Hierarchy**: Admin > Supervisor > Technician > Viewer

### Permission Logic
**Location**: `src-tauri/src/shared/auth_middleware.rs` (`AuthMiddleware`)

**Permission Matrix**:

| User Role | Admin Required | Supervisor Required | Technician Required | Viewer Required |
|-----------|----------------|---------------------|---------------------|-----------------|
| Admin | YES | YES | YES | YES |
| Supervisor | NO | YES | YES | YES |
| Technician | NO | NO | YES | YES |
| Viewer | NO | NO | NO | YES |

### Enforcement Pattern

**In IPC Handler**:
```rust
use crate::shared::auth_middleware::AuthMiddleware;

let ctx = AuthMiddleware::authenticate_command(
    &session_token,
    &state,
    Some(UserRole::Technician), // minimum required role
    &correlation_id,
).await?;
```

### Operation-Specific Checks
Additional granular permission checks exist in domain services for specific operations like task assignment, intervention finalization, etc.

---

## Audit Logging

**Location**: `src-tauri/src/domains/audit/`

**AuditEvent Types** (examples):
- **Auth**: `AuthenticationSuccess`, `AuthenticationFailure`, `AuthorizationDenied`, `SessionCreated`, `SessionExpired`
- **Data**: `DataCreated`, `DataUpdated`, `DataDeleted`, `DataExported`, `DataImported`
- **Tasks**: `TaskCreated`, `TaskUpdated`, `TaskAssigned`, `TaskCompleted`
- **Interventions**: `InterventionCreated`, `InterventionStarted`, `InterventionCompleted`
- **Security**: `SecurityViolation`, `SuspiciousActivity`, `RateLimitExceeded`

**Table**: `audit_events`

**Key Files**:
- `src-tauri/src/domains/audit/infrastructure/audit_service.rs`
- `src-tauri/src/domains/audit/infrastructure/audit_repository.rs`
- `src-tauri/src/domains/audit/infrastructure/security_monitor.rs`

---

## Security Features

### Rate Limiting
**Location**: `src-tauri/src/domains/auth/infrastructure/rate_limiter.rs`
- Protects against brute force attacks on login
- Configurable thresholds and lockout periods

### Password Security
- Hashing: argon2 (memory-hard password hashing)
- Salt stored with password hash

### Session Security
- UUID session tokens (cryptographically random)
- Automatic expiration (8 hours)
- Activity tracking for idle timeout
- Session cleanup for expired sessions

### Input Validation
**Location**: `src-tauri/src/shared/services/validation/`
- Field validators
- Business validators
- Security validators
- GPS validators
- Sanitizers

---

## Data Protection

### Local Database
- Data lives locally in SQLite
- Path: Tauri `app_data_dir()` → `rpma.db`
- Windows: `%APPDATA%/rpma-rust/rpma.db`
- WAL mode for concurrent access

### Secrets
- No secrets committed to repository
- Use `.env` for configuration (loaded via `dotenvy`)
- Optional database encryption key via `RPMA_DB_KEY` environment variable

### Error Sanitization
Server-side errors (Database, Internal, Io, Network, Sync, Configuration) are automatically sanitized before being sent to frontend to prevent leaking:
- SQL queries and errors
- File paths
- Stack traces
- Internal IP addresses
- API keys

---

## Validation Scripts

```bash
# Verify IPC authorization
node scripts/ipc-authorization-audit.js

# Security audit
npm run security:audit
```

---

## Security Commands (Audit Domain)

| Command | Purpose |
|---------|---------|
| `get_security_metrics` | Get security statistics |
| `get_security_events` | List security events |
| `get_security_alerts` | List security alerts |
| `acknowledge_security_alert` | Acknowledge an alert |
| `resolve_security_alert` | Resolve an alert |
| `get_active_sessions` | List active sessions |
| `revoke_session` | Revoke a specific session |
| `revoke_all_sessions_except_current` | Revoke all other sessions |
| `get_session_timeout_config` | Get timeout configuration |
