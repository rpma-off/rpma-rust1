# ADR-010: Session Token Model

## Status
Accepted

## Context
The initial schema used a `user_sessions` table storing JWT tokens with associated metadata. JWT-based sessions require signing secrets and verification logic that is unnecessary in a fully offline, single-device desktop application. Migration `041_replace_user_sessions_with_sessions.sql` replaced this model.

## Decision
- Sessions are represented by a `sessions` table introduced in migration 041. Each row contains a UUID primary key (`id`) that serves directly as the session token.
- The `UserSession` struct (`src-tauri/src/domains/auth/domain/models/auth.rs`) treats `id` and `token` as aliases of the same UUID string. No JWT encoding, signing, or verification is performed.
- Session lifetime is fixed at 8 hours (`SessionTimeoutConfig::default_timeout_minutes = 480`). The `expires_at` column stores the absolute expiry as an epoch-millisecond integer; `UserSession::is_expired()` compares against `Utc::now()`.
- The `last_activity` column is updated on each authenticated request to support activity-based session extension if required in the future.
- A `BEFORE INSERT` trigger on the `sessions` table rejects any `role` value outside `('admin', 'supervisor', 'technician', 'viewer')`, enforcing the role enum at the database layer.
- Session tokens are validated on every protected IPC command via `AuthMiddleware::authenticate`, which calls `auth_service.validate_session`. The frontend `safeInvoke` wrapper retrieves the token from the auth store and injects it automatically.
- The former `user_sessions` table is dropped by migration 041; all pre-migration sessions are invalidated, which is the expected behavior on schema upgrade.

## Consequences
- Session management is fully offline-capable and requires no cryptographic key management.
- All existing sessions are invalidated when migration 041 is applied (upgrade boundary).
- Two-factor authentication is not provided by the current session model; 2FA-related IPC commands are explicitly marked as not implemented in the frontend.
- Future introduction of JWT or remote session validation would require a new migration and updates to `AuthMiddleware`.
