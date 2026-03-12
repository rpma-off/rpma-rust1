---
title: "Session-Based Authentication with Role-Based Access Control"
summary: "Implement in-memory session management with role-based permissions, enforced at the IPC layer using a centralized auth guard."
domain: auth
status: accepted
created: 2026-03-12
---

## Context

The application requires user authentication to protect sensitive operations like task management, client data access, and inventory modifications. Requirements include:

- Secure session management without server dependency
- Role-based permissions (Admin, Manager, Technician, Viewer)
- Session expiration handling
- Audit trail for authorization decisions
- Centralized enforcement point to prevent bypass

## Decision

**Use in-memory session store with centralized RBAC enforcement at the IPC layer.**

### Session Management

Sessions are stored in `src-tauri/src/infrastructure/auth/session_store.rs`:

```rust
pub struct SessionStore {
    session: RwLock<Option<UserSession>>,
}

impl SessionStore {
    pub fn set(&self, session: UserSession) { ... }
    pub fn clear(&self) { ... }
    pub fn get(&self) -> AppResult<UserSession> {
        // Validates expiration
        if session.is_expired() {
            self.clear();
            return Err(AppError::Authentication("Session expired".to_string()));
        }
        Ok(session)
    }
}
```

### RBAC Roles

Defined in `src-tauri/src/shared/contracts/auth.rs`:

```rust
pub enum UserRole {
    Admin,      // Full access
    Manager,    // Team management, reports
    Technician, // Task execution, interventions
    Viewer,     // Read-only access
}
```

### Centralized Enforcement

All IPC commands use the `resolve_context!` macro from `src-tauri/src/shared/context/session_resolver.rs`:

```rust
#[macro_export]
macro_rules! resolve_context {
    ($state:expr, $correlation_id:expr) => {
        // Authenticate any logged-in user
    };
    ($state:expr, $correlation_id:expr, $required_role:expr) => {
        // Authenticate with minimum role requirement
    };
}
```

Example usage in commands:

```rust
#[tauri::command]
pub async fn vacuum_database(
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> Result<ApiResponse<()>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Admin);
    // ... operation
}
```

### Permission Checks

Authorization is enforced via `auth_middleware.rs`:

```rust
pub fn has_permission(user_role: &UserRole, required_role: &UserRole) -> bool {
    matches!((user_role, required_role), ...)
}
```

## Consequences

### Positive

- **Single Enforcement Point**: All commands flow through session resolver
- **No Token in Services**: Business logic never sees raw tokens
- **Explicit Requirements**: Role requirements are visible at command definition
- **Session Expiration**: Automatic cleanup of expired sessions
- **Audit Trail**: All auth decisions logged with correlation IDs

### Negative

- **Memory-Only**: Sessions lost on application restart (users must re-login)
- **Single Device**: No multi-device session sharing
- **No Token Refresh**: Sessions expire requiring re-authentication
- **Testing Overhead**: Permission failure paths must be tested per domain

## Related Files

- `src-tauri/src/infrastructure/auth/session_store.rs` — Session storage
- `src-tauri/src/shared/context/session_resolver.rs` — Context resolution
- `src-tauri/src/shared/ipc/auth_guard.rs` — Auth guard utilities
- `src-tauri/src/shared/contracts/auth.rs` — Role definitions
- `src-tauri/src/shared/auth_middleware.rs` — Permission checks
- `src-tauri/src/shared/logging/audit_service.rs` — Audit logging

## Read When

- Adding new IPC commands requiring authentication
- Defining new user roles
- Implementing permission checks in services
- Testing authorization failure paths
- Investigating session-related errors
- Understanding why services never see session tokens
