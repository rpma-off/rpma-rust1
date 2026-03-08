# Security & RBAC

RPMA v2 handles sensitive client data with comprehensive security measures.

## Authentication Flow

### 1. Login Process
**Entry**: `frontend/src/app/login/page.tsx` → `domains/auth/components/LoginForm.tsx`

**Flow**:
1. User submits credentials
2. Frontend calls `auth_login` IPC command
3. Backend validates password hash
4. On success, UUID `session_token` generated
5. Session stored in SQLite `sessions` table
6. Token returned to frontend
7. Frontend stores in secure context (`AuthProvider`)

### 2. Session Token
**Location**: `src-tauri/src/shared/contracts/auth.rs` (UserSession)

**Duration**: 8 hours (28,800 seconds)

### 3. Session Validation
**Location**: `src-tauri/src/domains/auth/application/auth_service.rs`

- Check token exists in `sessions` table
- Verify `expires_at` > current time
- Update `last_activity` timestamp

### 4. Token Storage
**Table**: `sessions` (updated in migration 041)

---

## Role-Based Access Control (RBAC)

### Roles
**Definition**: `src-tauri/src/shared/contracts/auth.rs` (UserRole)

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
**Location**: `src-tauri/src/shared/auth_middleware.rs`

```rust
pub fn has_permission(user_role: &UserRole, required_role: &UserRole) -> bool {
    match (user_role, required_role) {
        (Admin, _) => true,
        (Supervisor, Admin) => false,
        (Supervisor, _) => true,
        (Technician, Admin | Supervisor) => false,
        (Technician, _) => true,
        (Viewer, Viewer) => true,
        (Viewer, _) => false,
    }
}
```

### Enforcement Pattern
**Macro**: `authenticate!` (`src-tauri/src/shared/auth_middleware.rs`)

```rust
// In IPC Handler
let current_user = authenticate!(&session_token, &state, UserRole::Technician);
```

### Operation-Specific Checks
Functions like `can_perform_task_operation()` provide granular control over CRUD + specialized actions (like `assign`).

---

## Audit Logging

**Location**: `src-tauri/src/domains/audit/infrastructure/audit_service.rs`

**AuditEvent Types** (55 total):
- **Auth**: `AuthenticationSuccess`, `AuthenticationFailure`, `AuthorizationDenied`, `SessionCreated`, `SessionExpired`, etc.
- **Data**: `DataCreated`, `DataUpdated`, `DataDeleted`, `DataExported`, `DataImported`
- **Tasks**: `TaskCreated`, `TaskUpdated`, `TaskAssigned`, `TaskCompleted`, etc.
- **Interventions**: `InterventionCreated`, `InterventionStarted`, `InterventionCompleted`, etc.
- **Security**: `SecurityViolation`, `SuspiciousActivity`, `RateLimitExceeded`, `BruteForceAttempt`, etc.

**Table**: `audit_events`

---

## Data Protection

### Local Database
- Data lives locally in SQLite.
- Path determined by Tauri API (`app_data_dir`).
- Windows: `%APPDATA%/rpma-rust1/` (TODO: verify exact name in tauri.conf.json)

### Secrets
- No secrets committed to repository.
- Use `.env` or system keychain (where applicable).

### Validation Scripts
```bash
# Verify IPC authorization
node scripts/ipc-authorization-audit.js

# Security audit
npm run security:audit
```
