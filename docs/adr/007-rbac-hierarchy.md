# ADR-007: Role-Based Access Control Hierarchy

## Status

Accepted

## Date

2026-03-13

## Summary

Implements a role hierarchy (Admin > Supervisor > Technician > Viewer) with permission cascading, where higher roles inherit permissions from lower roles.

## Context

- Need to control access to features based on user responsibilities
- Roles must be hierarchical for maintainability
- Permission checks need to be consistent across IPC handlers
- Domain-specific operations require role validation
- Self-management (users editing own profiles) needs exceptions

## Decision

### Role Hierarchy

```
Admin        — Full system access
    ↓
Supervisor   — Manage technicians, view all, assign tasks
    ↓
Technician   — Execute interventions, update assigned tasks
    ↓
Viewer       — Read-only access
```

### Permission Rules

1. **Admin**: Full access to all operations
2. **Supervisor**: Cannot delete, cannot manage admins
3. **Technician**: Cannot assign tasks, cannot delete
4. **Viewer**: Read-only access

### Implementation

```rust
// src-tauri/src/shared/auth_middleware.rs
impl AuthMiddleware {
    /// Check if a user role has permission for the required role
    pub fn has_permission(user_role: &UserRole, required_role: &UserRole) -> bool {
        use UserRole::*;

        match (user_role, required_role) {
            // Admin has access to everything
            (Admin, _) => true,

            // Supervisor can access supervisor, technician, and viewer operations
            (Supervisor, Admin) => false,
            (Supervisor, _) => true,

            // Technician can access technician and viewer operations
            (Technician, Admin | Supervisor) => false,
            (Technician, _) => true,

            // Viewer can only access viewer operations
            (Viewer, Viewer) => true,
            (Viewer, _) => false,
        }
    }

    /// Check if user can perform task operations
    pub fn can_perform_task_operation(user_role: &UserRole, operation: &str) -> bool {
        use UserRole::*;

        match (user_role, operation) {
            (Admin, _) => true,
            (Supervisor, op) if ["create", "read", "update", "assign"].contains(&op) => true,
            (Supervisor, _) => false,
            (Technician, op) if ["create", "read", "update"].contains(&op) => true,
            (Technician, _) => false,
            (Viewer, "read") => true,
            (Viewer, _) => false,
        }
    }

    /// Check if user can perform user management operations
    pub fn can_perform_user_operation(
        user_role: &UserRole,
        operation: &str,
        target_user_id: Option<&str>,
        current_user_id: &str,
    ) -> bool {
        use UserRole::*;

        match (user_role, operation) {
            (Admin, _) => true,
            (Supervisor, op) if ["read", "update"].contains(&op) => true,
            (Supervisor, _) => false,
            // Users can always read/update their own profile
            (_role, op) if ["read", "update"].contains(&op) 
                && target_user_id == Some(current_user_id) => true,
            (Technician | Viewer, "read") if target_user_id == Some(current_user_id) => true,
            (Technician | Viewer, _) => false,
        }
    }
}
```

### IPC Handler Usage

```rust
// Role-gated command
#[tauri::command]
pub async fn delete_user(
    id: String,
    state: State<'_, AppStateType>,
    correlation_id: Option<String>,
) -> AppResult<()> {
    // Only Admin can delete users
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Admin);
    
    let service = UserService::new(/* ... */);
    service.delete_user(&id, &ctx).await
}

// Any authenticated user
#[tauri::command]
pub async fn get_task(
    id: String,
    state: State<'_, AppStateType>,
    correlation_id: Option<String>,
) -> AppResult<Task> {
    let ctx = resolve_context!(&state, &correlation_id);
    // ...
}

// Operation-level permission
#[tauri::command]
pub async fn update_task(
    id: String,
    payload: UpdateTaskRequest,
    state: State<'_, AppStateType>,
    correlation_id: Option<String>,
) -> AppResult<Task> {
    let ctx = resolve_context!(&state, &correlation_id);
    
    check_task_permission!(&ctx.auth.role, "update");
    
    // ...
}
```

### Permission Macros

```rust
// Permission check macros for concise enforcement
#[macro_export]
macro_rules! check_task_permission {
    ($user_role:expr, $operation:expr) => {
        if !$crate::shared::auth_middleware::AuthMiddleware::can_perform_task_operation(
            $user_role, $operation,
        ) {
            return Err($crate::shared::ipc::AppError::Authorization(format!(
                "Insufficient permissions to {} tasks",
                $operation
            )));
        }
    };
}

#[macro_export]
macro_rules! check_user_permission {
    ($user_role:expr, $operation:expr, $target_user_id:expr, $current_user_id:expr) => {
        if !$crate::shared::auth_middleware::AuthMiddleware::can_perform_user_operation(
            $user_role, $operation, $target_user_id, $current_user_id,
        ) {
            return Err($crate::shared::ipc::AppError::Authorization(format!(
                "Insufficient permissions to {} user",
                $operation
            )));
        }
    };
}
```

### Role Definition

```rust
// src-tauri/src/shared/contracts/auth.rs
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum UserRole {
    Admin,
    Supervisor,
    Technician,
    Viewer,
}

impl UserRole {
    pub fn can_create_tasks(&self) -> bool {
        matches!(self, UserRole::Admin | UserRole::Supervisor | UserRole::Technician)
    }

    pub fn can_assign_tasks(&self) -> bool {
        matches!(self, UserRole::Admin | UserRole::Supervisor)
    }

    pub fn can_delete_tasks(&self) -> bool {
        matches!(self, UserRole::Admin)
    }

    pub fn can_manage_users(&self) -> bool {
        matches!(self, UserRole::Admin | UserRole::Supervisor)
    }
}
```

### Permission Matrix

| Operation | Admin | Supervisor | Technician | Viewer |
|-----------|-------|------------|------------|--------|
| Create Task | ✓ | ✓ | ✓ | ✗ |
| Read Task | ✓ | ✓ | ✓ | ✓ |
| Update Task | ✓ | ✓ | ✓ | ✗ |
| Delete Task | ✓ | ✗ | ✗ | ✗ |
| Assign Task | ✓ | ✓ | ✗ | ✗ |
| Create User | ✓ | ✗ | ✗ | ✗ |
| Read User | ✓ | ✓ | Own | Own |
| Update User | ✓ | ✓ | Own | Own |
| Delete User | ✓ | ✗ | ✗ | ✗ |
| Create Quote | ✓ | ✓ | ✓ | ✗ |
| Finalize Intervention | ✓ | ✓ | ✓ | ✗ |

## Consequences

### Positive

- Clear permission hierarchy easy to understand
- Permission checks are centralized and consistent
- Self-management exceptions built in
- Single source of truth for RBAC rules
- Easy to audit permission checks

### Negative

- Role hierarchy may not fit all use cases
- Permission matrix needs maintenance as features grow
- Some operations need fine-grained checks beyond roles
- Domain-specific permission logic may need custom functions

## Related Files

- `src-tauri/src/shared/auth_middleware.rs` - AuthMiddleware implementation
- `src-tauri/src/shared/contracts/auth.rs` - UserRole definition
- `src-tauri/src/shared/context/auth_context.rs` - AuthContext
- Test files in `src-tauri/src/tests/unit/auth_service_tests.rs`

## When to Read This ADR

- Adding new IPC commands
- Implementing role checks in services
- Understanding permission hierarchy
- Adding new user roles (if needed)
- Debugging authorization failures
- Writing permission tests

## References

- AGENTS.md "Every IPC command must call resolve_context!"
- AuthMiddleware implementation
- Test cases in `src-tauri/src/shared/auth_middleware.rs:321-403`