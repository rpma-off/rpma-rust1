# ADR-005: IPC Mapping

## Status
Accepted

## Context
Tauri IPC commands bridge the frontend and backend. They must be thin adapters that delegate to application services.

## Decision
- IPC handlers live in `src-tauri/src/domains/*/ipc/*.rs` or `src-tauri/src/commands/*.rs`.
- Each handler authenticates the user, initializes correlation context, delegates to the application service, and maps errors to `AppError`.
- IPC handlers must not contain business logic, SQL, or direct repository access.
- Command names are stable and backward-compatible with the frontend.
- The frontend issues all IPC calls through the `safeInvoke` wrapper (`frontend/src/lib/ipc/utils.ts`), which enforces the following invariants at the call site:
  - A `correlation_id` is generated or reused and injected into every call's argument payload before dispatch to the backend.
  - A `session_token` is automatically retrieved from the auth store and injected into the argument payload for every command not listed in `PUBLIC_COMMANDS`.
  - Commands listed in `NOT_IMPLEMENTED_COMMANDS` (currently the 2FA command set: `enable_2fa`, `verify_2fa_setup`, `disable_2fa`, `regenerate_backup_codes`, `is_2fa_enabled`, `auth_refresh_token`) are short-circuited at the frontend with a `NOT_IMPLEMENTED` error before reaching the backend.
  - Public (unauthenticated) commands are enumerated in the `PUBLIC_COMMANDS` set; all other commands are treated as protected.
  - A per-call timeout (default 120 seconds) prevents indefinite blocking on a backend operation.
- Backend responses must conform to the `ApiResponse<T>` or `CompressedApiResponse` envelope; `safeInvoke` unwraps the envelope before returning data to the caller.

## Consequences
- The IPC layer is a thin, testable adapter.
- Business logic changes do not require IPC layer modifications.
- Error mapping is centralized per domain.
- Adding or removing a public command requires an explicit change to the `PUBLIC_COMMANDS` set in `safeInvoke`.
- Stub or unimplemented backend commands must be added to `NOT_IMPLEMENTED_COMMANDS` to prevent silent runtime failures.
