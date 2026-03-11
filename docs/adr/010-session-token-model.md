# ADR-010: Session Token Model

## Status
Accepted

## Context
In a local-first desktop application, complex cryptographic session authorities (like external JWT providers) introduce unnecessary overhead. The system requires a simple, secure, and fully offline-capable session model.

## Decision

### Storage and Structure
- The `sessions` table stores active sessions with a UUID primary key used as the session token.
- No JWT encoding or external signature verification is performed.
- Session TTL is 480 minutes (8 hours), tracked via the `expires_at` epoch timestamp.
- The `last_activity` timestamp is updated on every authenticated request to support idle-timeout logic.

### Memory Management (SessionStore)
- The `SessionStore` (`src-tauri/src/infrastructure/auth/session_store.rs`) maintains the active session in a `RwLock<Option<UserSession>>`.
- `SessionStore::get()` performs automatic expiration checks before returning a session.
- The store is initialized during `service_builder.rs` and injected into the global `AppState`.

### IPC Authentication Patterns
- **`resolve_context!` Macro**: The standard entry point for IPC handlers to retrieve the `RequestContext` (including `AuthContext` and `correlation_id`). It supports optional role enforcement.
- **`AuthGuard`**: Provides an explicit API (`require_authenticated`, `require_role`) for non-macro use cases.

### Frontend Security
- `AuthSecureStorage` (`frontend/src/lib/secureStorage.ts`) persists the session token on the client using AES-GCM encryption.
- The `safeInvoke` wrapper automatically retrieves and injects the session token into the argument payload for protected commands.

## Consequences
- Authentication is high-performance and requires no network I/O.
- Session state is isolated from external identity providers.
- The `resolve_context!` pattern ensures that application services receive high-level context objects rather than raw tokens.
