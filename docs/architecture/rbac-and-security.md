---
title: "RBAC and Security"
summary: "How role-based access control and security are implemented in the RPMA application."
read_when:
  - "Designing features with permission requirements"
  - "Updating user roles"
  - "Security reviews"
---

# RBAC and Security

The RPMA application implements Role-Based Access Control (RBAC) to ensure that users can only access the data and perform the operations permitted by their role.

## User Roles (ADR-007)

The system defines several user roles in `src-tauri/src/shared/contracts/auth.rs`:

1.  **Admin**: Full system access, including configuration and user management.
2.  **Supervisor**: Full access to all domains but restricted from core system settings.
3.  **Technician**: Can manage their own assigned tasks, interventions, and inventory. Restricted from modifying others' data or deleting records.
4.  **Viewer**: Read-only access to specific domains.

## Enforcement Layers

Security is enforced at multiple layers to provide defense in depth:

### 1. IPC Boundary (Gatekeeping)
The `resolve_context!` macro ensures that:
- The user has a valid, non-expired session.
- The user has the minimum role required to execute the command.
- A `correlation_id` is initialized for auditing.

**Example**:
```rust
let ctx = resolve_context!(&state, &correlation_id, UserRole::Supervisor); // Minimum role: Supervisor
```

### 2. Application Layer (Logic Enforcement)
The `RequestContext` is passed through all layers. Application services use this context to perform fine-grained permission checks.

**Example**:
```rust
if !ctx.auth.role.can_delete_tasks() {
    return Err(AppError::Authorization("User lacks permission to delete tasks".into()));
}
```

### 3. Policy Services
For complex rules (e.g., "A technician can only edit their own tasks"), we use domain-specific policy services.

**Example**:
```rust
// src-tauri/src/domains/tasks/application/services/task_policy_service.rs
pub fn check_task_permissions(auth: &AuthContext, task: &Task, operation: &str) -> Result<(), AppError> {
    if auth.role == UserRole::Technician && task.technician_id.as_deref() != Some(&auth.user_id) {
        return Err(AppError::Authorization("Technician can only edit their own tasks".into()));
    }
    Ok(())
}
```

## Security Best Practices

- **Zero-Trust**: Never trust input from the frontend. Always validate and authorize in the backend.
- **Sanitized Errors**: Avoid leaking system information in error responses (ADR-019).
- **Hardened Sessions**: Session tokens are managed securely in the backend; the frontend only receives what it needs for UI logic.
- **Auditing**: Every authorized operation is tracked via the event bus for auditing and compliance (ADR-016).
