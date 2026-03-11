# ADR-006: RBAC Policy and Session Security

## Status
Accepted

## Context
The application requires a tiered access control system to manage permissions for multiple user roles (Admin, Supervisor, Technician, Viewer) in an offline-first desktop environment.

## Decision

### Role Hierarchy
Roles follow a strict linear hierarchy: `Admin > Supervisor > Technician > Viewer`.
- `AuthMiddleware::has_permission` implements this comparison.
- Higher roles inherit all permissions of lower roles.

### Enforcement Mechanism
- All protected IPC commands require a valid `session_token`.
- `AuthMiddleware::authenticate_command` validates the token and extracts the `UserSession`.
- Role-based checks are performed at the IPC command handler or application service level using helpers in `src-tauri/src/shared/auth_middleware.rs`.
- Hierarchical checks (e.g., `can_perform_task_operation`) ensure users only access resources permitted by their role.

### Session Integrity
- Session tokens are UUID strings stored in the local `sessions` table.
- A `BEFORE INSERT` trigger on the `sessions` table enforces valid role values: `('admin', 'supervisor', 'technician', 'viewer')`.
- Session TTL is 8 hours (480 minutes), enforced by the `expires_at` column and backend validation logic.

### Auditing
- `node scripts/ipc-authorization-audit.js` runs in CI to verify that all protected commands have appropriate RBAC guards and follow established security patterns.
- `node scripts/ipc-consistency-check.js` ensures command handlers align with their declared security metadata.

## Consequences
- Unauthorized access is blocked at the IPC entry point.
- The hierarchy simplifies permission management by avoiding complex many-to-many role-permission mappings.
- Security consistency is verified automatically by CI scripts.
