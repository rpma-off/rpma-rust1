---
title: "Security and RBAC"
summary: "Authentication flow, role-based access control, and data protection rules."
read_when:
  - "Implementing role-gated features"
  - "Reviewing security controls"
  - "Adding new user roles"
---

# 06. SECURITY AND RBAC

RPMA v2 uses a strict identity and access management system (**ADR-007**).

## Roles Hierarchy
1. **Admin**: System configuration, user management, full access.
2. **Supervisor**: Management of tasks, clients, and inventory.
3. **Technician**: Execution of assigned interventions.
4. **Viewer**: Read-only access to dashboards.

## Enforcement: resolve_context! (**ADR-006**)

Authentication and RBAC are enforced at the IPC boundary.
```rust
// Basic authentication (any role)
let ctx = resolve_context!(&state, &correlation_id);

// Role-gated authentication
let ctx = resolve_context!(&state, &correlation_id, UserRole::Admin);
```

## RequestContext Flow
- Raw session tokens are **forbidden** beyond the IPC layer.
- `RequestContext` contains `AuthContext` (user_id, role) and `correlation_id`.
- Every service method must accept `&RequestContext`.

## Data Protection
- **Database**: Local SQLite with optional encryption.
- **PII**: Scoped access via RBAC rules.
- **Input Sanitization**: Handled by centralized validation (**ADR-008**).
- **Soft Delete**: `deleted_at` prevents accidental data loss and provides an audit trail (**ADR-011**).

## Authentication Flow
1. **Frontend**: Calls `auth_login` with credentials.
2. **Backend**: Validates credentials against `users` table, creates a session in memory.
3. **Frontend**: Stores session state (Tauri handles the cookie/header).
4. **Subsequent Calls**: Backend `resolve_context!` verifies session validity.

## Security Constraints
- No hardcoded secrets.
- No logging of passwords or PII.
- All critical state transitions (e.g., Task Status) must be validated in the Domain layer.
