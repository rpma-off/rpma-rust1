# 06 — Security and RBAC

## Authentication Flow (ADR-006)

**Login sequence:**
1. Frontend calls `auth_login({ email, password })` via `safeInvoke` (no session token needed — public command)
2. IPC handler: `domains/auth/ipc/auth.rs` → `auth_input_validator.validate_login_input()`
3. `AuthService.authenticate()` verifies password hash in `infrastructure/auth/authentication.rs`
4. `SessionService.create_session()` issues `UserSession { id (UUID token), user_id, role, expires_at }`
5. Session stored in `SessionStore` (in-memory `Arc<Mutex<Option<UserSession>>>`)
6. Session token returned to frontend → stored in `AuthProvider` context

**Session resolution (every protected command):**
```rust
// In IPC handler:
let ctx = resolve_context!(&state, &request.correlation_id);              // any role
let ctx = resolve_context!(&state, &request.correlation_id, UserRole::Admin); // min role enforced
```
`session_resolver.rs` does:
1. Retrieve `UserSession` from `SessionStore`
2. Check expiry
3. `has_permission(user_role, required_role)` — return `AppError::Authorization` if insufficient
4. Build `RequestContext { auth: AuthContext { user_id, role, session_id, username, email }, correlation_id }`

**Critical principle:** No service or repository ever sees a raw session token. The session resolver is the exclusive validation boundary.

## RBAC Hierarchy (ADR-007)

### Backend enforcement matrix (`shared/auth_middleware.rs`)

```rust
pub fn has_permission(user_role: &UserRole, required_role: &UserRole) -> bool {
    match (user_role, required_role) {
        (Admin, _)                           => true,   // Admin: full access
        (Supervisor, Admin)                  => false,
        (Supervisor, _)                      => true,   // Supervisor: supervisor/technician/viewer
        (Technician, Admin | Supervisor)     => false,
        (Technician, _)                      => true,   // Technician: technician/viewer
        (Viewer, Viewer)                     => true,
        (Viewer, _)                          => false,
    }
}
```

### Operation-specific checks (`auth_middleware.rs`)
- `can_perform_task_operation(role, op)`: Admin→all; Supervisor→create/read/update/assign (no delete); Technician→create/read/update; Viewer→read
- `can_perform_client_operation(role, op)`: same hierarchy
- `can_perform_user_operation(role, op, target_user_id, current_user_id)`: Admin→all; Supervisor→read/update; others→self-only

### Role definitions (`domains/auth/domain/models/auth.rs`)
```rust
pub enum UserRole {
    Admin,       // Full system access
    Supervisor,  // Create/assign tasks, manage clients/quotes
    Technician,  // Execute interventions, update own tasks
    Viewer,      // Read-only
}
```

## Frontend RBAC (`frontend/src/lib/rbac.ts`)

Frontend enforcement is **UI-layer defense-in-depth**. The backend is always authoritative.

### 26 permission set
```
task:read, task:write, task:update, task:delete
client:read, client:write, client:update, client:delete
report:read, report:write
settings:read, settings:write
user:read, user:write, user:update, user:delete
inventory:read, inventory:write
calendar:read, calendar:write
photo:upload, photo:delete
```

### Role-permission matrix
| Role | Allowed permissions |
|------|-------------------|
| **admin** | All 26 |
| **supervisor** | task(R/W/U), client(R/W/U), report(R/W), inventory(R/W), calendar(R/W), photo(upload/delete), user(R) |
| **technician** | task(R/W/U), client(R), inventory(R), calendar(R), photo(upload) |
| **viewer** | task(R), client(R), report(R), inventory(R), calendar(R) |

### Usage
```typescript
import { createPermissionChecker } from '@/lib/rbac';
const { can } = createPermissionChecker(currentUser);

if (can('task:delete')) { /* show delete button */ }
```

## Audit Logging

- Sensitive actions (task deletion, intervention completion, role changes) emit `DomainEvent` to the EventBus
- `AuditLogHandler` (registered in `service_builder.rs`) persists events to the `audit_log` table
- Audit service: `domains/auth/application/audit_service.rs`
- Security monitoring: `domains/auth/infrastructure/audit_repository.rs`
- Security metrics and alerts exposed via admin IPC commands (`admin/ipc/audit.ipc.ts`)

## Rate Limiting

- Login attempts tracked in `login_attempts` table
- Composite index `idx_login_attempts_identifier_locked` (migration 066)
- Rate limiter config in `shared/contracts/rate_limiter.rs`
- Enforced at auth IPC boundary via `AuthService`

## Content Security Policy (Tauri)

CSP configured in `src-tauri/tauri.conf.json`:
- `style-src` does **not** include `unsafe-inline` (patched in security audit)
- `script-src unsafe-inline` retained (required for Next.js — CSP nonce phase 2 is planned)

## Data Protection

- **Local DB**: SQLite file stored in OS app data directory (resolved by Tauri at runtime)
- **Password hashing**: `password_hash` field uses salted hash — `#[serde(skip_serializing)]` prevents it ever appearing in API responses
- **Secrets**: Never committed; no plaintext secrets in SQLite DB
- **Soft deletes only**: User deletion is soft-delete via `deleted_at` (ADR-011) — audit trail preserved
