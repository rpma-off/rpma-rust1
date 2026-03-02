# ADR-006: RBAC Policy

## Status
Accepted

## Context
The application supports multiple user roles (Admin, Supervisor, Technician, Viewer) with different access levels. Session management is handled locally without a remote token authority.

## Decision
- All protected IPC commands require a `session_token` parameter.
- Session tokens are plain UUID strings stored directly in the `sessions` table (introduced by migration `041_replace_user_sessions_with_sessions.sql`). The previous JWT-based `user_sessions` table was replaced; no JWT signing or verification is performed.
- Session tokens carry an 8-hour TTL enforced by the `expires_at` column and the `is_expired()` check in `UserSession`. The `SessionTimeoutConfig` default is 480 minutes (8 hours).
- The `authenticate!` macro validates the session token and returns the current user by delegating to `AuthMiddleware::authenticate` (`src-tauri/src/shared/auth_middleware.rs`).
- Role-based checks are performed at the command handler level using helpers in `src-tauri/src/shared/auth_middleware.rs`.
- The four roles form a hierarchy: `Admin > Supervisor > Technician > Viewer`. `AuthMiddleware::has_permission` encodes the hierarchy; callers may also use `can_perform_task_operation`, `can_perform_client_operation`, and `can_perform_user_operation` for resource-specific checks.
- Session tokens are validated on every protected endpoint.
- Two-factor authentication (2FA) commands (`enable_2fa`, `verify_2fa_setup`, `disable_2fa`, `regenerate_backup_codes`, `is_2fa_enabled`) are not implemented in the current backend and are explicitly enumerated in the frontend's `NOT_IMPLEMENTED_COMMANDS` guard to prevent silent failures.
- The `sessions` table enforces valid role values via a `BEFORE INSERT` trigger that rejects any value outside `('admin', 'supervisor', 'technician', 'viewer')`.

## Consequences
- Unauthorized access is blocked at the IPC boundary.
- Role definitions can evolve without changing the authentication mechanism.
- Every command handler follows a consistent authentication pattern.
- Introducing 2FA in a future iteration requires removing the affected commands from `NOT_IMPLEMENTED_COMMANDS` and providing the corresponding backend handlers.
