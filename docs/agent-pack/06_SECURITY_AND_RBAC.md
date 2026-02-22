# 06 - Security and RBAC

## Auth flow

Entry commands (`src-tauri/src/domains/auth/ipc/auth.rs`):
- `auth_login`
- `auth_create_account`
- `auth_validate_session`
- `auth_refresh_token`
- `auth_logout`
- 2FA commands (`enable_2fa`, `verify_2fa_setup`, `disable_2fa`, `verify_2fa_code`, `is_2fa_enabled`, `regenerate_backup_codes`)

Frontend auth orchestrator:
- `frontend/src/domains/auth/api/AuthProvider.tsx`
- Stores session in secure storage abstraction and refreshes token periodically.

## Session and token enforcement

- Protected commands validate `session_token` using auth services.
- Shared middleware helpers: `src-tauri/src/shared/auth_middleware.rs`.
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
| Global admin/system | ✅ | limited | ❌ | ❌ | command handlers + role checks |
| Task read | ✅ | ✅ | ✅ (often scoped) | ✅ (read only) | `can_perform_task_operation` |
| Task create/update | ✅ | ✅ | ✅ (no assign/delete) | ❌ | `can_perform_task_operation` |
| Task assign | ✅ | ✅ | ❌ | ❌ | `can_perform_task_operation` |
| Task delete | ✅ | ❌ | ❌ | ❌ | `can_perform_task_operation` |
| User management | ✅ | limited | own profile only | own profile only | `can_perform_user_operation` |

## 2FA and session security

- 2FA types/models: `src-tauri/src/domains/auth/domain/models/auth.rs`
- 2FA service implementation: `src-tauri/src/domains/auth/infrastructure/two_factor.rs`
- Session service implementation: `src-tauri/src/domains/auth/infrastructure/session.rs`

## Local DB and secret handling

- DB path resolved from Tauri app data directory (`src-tauri/src/main.rs`).
- DB starts in WAL mode and uses connection pool config in db module.
- Optional env key for DB encryption wiring: `RPMA_DB_KEY` (read in `main.rs`).
- `.env` loading via `dotenvy::dotenv()` at startup.

## Security monitoring and audit surfaces

- Security IPC commands: `src-tauri/src/domains/audit/ipc/security.rs` (metrics/events/alerts/sessions)
- Session management commands include `get_active_sessions`, `revoke_session`, `revoke_all_sessions_except_current`.

## DOC vs CODE mismatch

- ADR text still references `Manager`; runtime code uses `Supervisor`.
