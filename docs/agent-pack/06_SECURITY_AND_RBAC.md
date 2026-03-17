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

| Role | Permissions |
|------|-------------|
| **Admin** | System configuration, user management, full access to all entities |
| **Supervisor** | Manage tasks, clients, inventory; create quotes; view reports |
| **Technician** | Execute assigned interventions; record materials; update task status |
| **Viewer** | Read-only access to dashboards and reports |

## Enforcement: resolve_context! (**ADR-006**)

Authentication and RBAC are enforced at the IPC boundary.

```rust
// Basic authentication (any role)
let ctx = resolve_context!(&state, &correlation_id);

// Role-gated authentication (requires specific role)
let ctx = resolve_context!(&state, &correlation_id, UserRole::Admin);

// Multiple roles allowed
let ctx = resolve_context!(&state, &correlation_id, UserRole::Admin, UserRole::Supervisor);
```

### RequestContext Structure

```rust
pub struct RequestContext {
    pub auth: AuthContext,
    pub correlation_id: String,
}

pub struct AuthContext {
    pub user_id: String,
    pub role: UserRole,
    pub session_id: String,
}
```

## RequestContext Flow

| Stage | Details |
|-------|---------|
| IPC Entry | `resolve_context!` validates session and extracts role |
| Application Layer | `RequestContext` passed to all service methods |
| Domain Layer | Business rules may check `ctx.role()` for conditional logic |

**Constraint**: Raw session tokens are **forbidden** beyond the IPC layer.

## Data Protection

| Aspect | Implementation |
|--------|---------------|
| Database | Local SQLite with optional encryption |
| PII | Scoped access via RBAC rules |
| Input Sanitization | Centralized validation (**ADR-008**) |
| Soft Delete | `deleted_at` prevents accidental data loss (**ADR-011**) |
| Error Sanitization | Database and internal errors sanitized before frontend (**ADR-019**) |

## Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. LOGIN                                                                    │
│Frontend → auth_login(credentials)→ IPC Layer                                │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. VALIDATION                                                               │
│ AuthService.login() → validates against users table                        │
│ Creates session in memory (SessionStore)                                    │
│ Returns session token                                                       │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. SESSION STORAGE                                                          │
│ Frontend stores session state (Tauri manages cookie/header)                 │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 4. SUBSEQUENT REQUESTS                                                      │
│ IPC call → resolve_context!() → validates session → creates RequestContext │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Session Management

- Sessions are stored in memory via `SessionStore`.
- Session tokens are validated on every IPC call.
- Role is extracted from session and included in `RequestContext`.

## Security Constraints

| Constraint | Enforcement |
|------------|-------------|
| No hardcoded secrets | Environment variables or config files |
| No logging passwords/PII | Explicit exclusion in logging |
| Critical transitions validated | Domain layer checks (e.g., Task status changes) |
| Session expiry | Handled by `SessionStore` |
| Failed login tracking | `login_attempts` table (migration 057) |

## Authorization Checks by Domain

| Domain | Admin | Supervisor | Technician | Viewer |
|--------|:-----:|:----------:|:----------:|:------:|
| auth (login) | ✓ | ✓ | ✓ | ✓ |
| auth (create account) | ✓ | — | — | — |
| users (CRUD) | ✓ | — | — | — |
| tasks (create) | ✓ | ✓ | — | — |
| tasks (view) | ✓ | ✓ | ✓ (assigned) | ✓ |
| tasks (update) | ✓ | ✓ | ✓ (assigned) | — |
| quotes (create) | ✓ | ✓ | — | — |
| inventory (manage) | ✓ | ✓ | ✓ | — |
| clients (manage) | ✓ | ✓ | — | — |
| trash (restore) | ✓ | ✓ | — | — |

## Key Files

| File | Purpose |
|------|---------|
| `src-tauri/src/shared/auth/request_context.rs` | RequestContext definition |
| `src-tauri/src/shared/auth/session_store.rs` | In-memory session storage |
| `src-tauri/src/domains/auth/` | Authentication domain |
| `src-tauri/migrations/057_add_login_attempts_table.sql` | Failed login tracking |