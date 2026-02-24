# 06 - Security and RBAC

## Auth flow

Entry commands (`src-tauri/src/domains/auth/ipc/auth.rs`):
- `auth_login`
- `auth_create_account`
- `auth_validate_session`
- `auth_logout`

Session model:
- UUID session tokens stored in `sessions` (migration 041)
- Session TTL is fixed at 8 hours (`src-tauri/src/domains/auth/infrastructure/session.rs`)

Frontend auth orchestrator:
- `frontend/src/domains/auth/api/AuthProvider.tsx`
- Session token storage and refresh logic are handled client-side; no server refresh token API exists.

## Session and token enforcement

- Protected commands validate `session_token` using `AuthMiddleware` (`src-tauri/src/shared/auth_middleware.rs`).
- Auth macro usage: `authenticate!` and permission helpers in `src-tauri/src/shared/auth_middleware.rs`.
- Correlation/user context update helpers: `src-tauri/src/shared/ipc/correlation.rs`.

## RBAC roles and hierarchy

Role enum:
- `admin`
- `supervisor`
- `technician`
- `viewer`

Source: `src-tauri/src/domains/auth/domain/models/auth.rs`.

Hierarchy logic source: `src-tauri/src/shared/auth_middleware.rs` (`has_permission`).

## RBAC matrix (from middleware + command patterns)

| Operation family | Admin | Supervisor | Technician | Viewer | Enforcement pointers |
|---|---:|---:|---:|---:|---|
| Global admin/system | yes | limited | no | no | `authenticate!` + role checks in handlers |
| Task read | yes | yes | yes | yes | `can_perform_task_operation` |
| Task create/update | yes | yes | yes (no assign/delete) | no | `can_perform_task_operation` |
| Task assign | yes | yes | no | no | `can_perform_task_operation` |
| Task delete | yes | no | no | no | `can_perform_task_operation` |
| User management | yes | limited | own profile only | own profile only | `can_perform_user_operation` |

## Local DB and secret handling

- DB path resolved from Tauri app data directory (`src-tauri/src/main.rs`).
- DB uses WAL + pooled connections (`src-tauri/src/db/connection.rs`).
- Optional env key for DB encryption wiring: `RPMA_DB_KEY` (read in `src-tauri/src/main.rs`).
- `.env` loading via `dotenvy::dotenv()` at startup.

## Security monitoring and audit surfaces

- Security IPC commands: `src-tauri/src/domains/audit/ipc/security.rs` (metrics/events/alerts/sessions)
- Session management commands include `get_active_sessions`, `revoke_session`, `revoke_all_sessions_except_current`, `update_session_timeout`.

## DOC vs CODE mismatch

- Legacy migrations add 2FA-related columns (`015_add_two_factor_auth.sql`, `028_add_two_factor_user_columns.sql`), but the backend removed 2FA services and commands; session auth is UUID-only.
- Frontend IPC registry and auth client still reference refresh/2FA commands that are not registered in `src-tauri/src/main.rs`.
