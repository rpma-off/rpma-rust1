# Backend Architecture Audit (Rust)

## Scope
Audit of the Rust backend architecture with focus on command → service → repository boundaries, service responsibility creep, module size, dependency injection, and error propagation.
Audit date: 2026-02-11.

## Architecture Smells

### Boundary Drift (Command → Service → Repository)
- **Direct DB access in commands**: `commands/message.rs`, `commands/ui.rs`, and `commands/status.rs` perform SQL/connection work directly instead of delegating to services/repositories.
- **Per-command service construction**: `commands/calendar.rs` creates `CalendarService`/`CalendarEventService` directly rather than using `AppState`-managed services.
- **Report commands bypass repositories**: `commands/reports/generation/report_commands.rs` calls report generators that accept `&Database` and perform raw DB queries.

### Service Responsibility Creep
- **`services/material.rs` (1.6k+ lines)**: mixes CRUD, inventory movements, categories, suppliers, consumption, and statistics.
- **`services/settings.rs` (1.5k+ lines)**: blends profile, preferences, security, accessibility, notifications, and audit settings.
- **`services/auth.rs` (1.1k+ lines)**: combines account lifecycle, session management, password handling, rate limiting, and MFA.
- **`services/pdf_generation.rs` (1.2k+ lines)**: mixes templating, layout, rendering, and export coordination.

### Repository Layer Underuse
- Repositories exist for message/material/user, yet several services/commands still issue SQL directly (e.g., `commands/message.rs`, `services/material.rs`).
- Generic repository abstractions in `services/repository.rs` appear unused, creating parallel patterns and confusion.

### Dependency Injection Inconsistency
- `ServiceBuilder` constructs a subset of services; other services are instantiated ad hoc in commands (`calendar`, `user`).
- Constructor signatures vary (`Database` by value vs `Arc<Database>`), complicating shared lifetimes and DI ergonomics.

### Error Propagation Inconsistency
- Error surfaces vary between `AppError`, ad-hoc `String` results, and service-specific error enums (e.g., `MaterialError`).
- Command layers often re-wrap errors with custom strings, obscuring sources and losing typed context.

## Refactor Map (Small, Safe Steps)
1. **Expand `AppState` + `ServiceBuilder`** to include calendar, user, and message services; update commands to use injected services.
2. **Move direct DB access out of commands** into service or repository modules (start with message/status/ui).
3. **Normalize service constructors** on `Arc<Database>` + repositories to enforce shared DI patterns.
4. **Adopt a single error conversion path** (repository/service → `AppError`) and eliminate `Result<T, String>` in new code paths.
5. **Introduce façade modules** for large services while incrementally moving logic into submodules.
6. **Decide on repository abstraction**: either standardize on concrete repositories or delete unused generic `services/repository.rs`.

## Suggested Module Splits
- `services/material.rs` → `inventory.rs`, `categories.rs`, `suppliers.rs`, `transactions.rs`, `consumption.rs`, `statistics.rs`, `mod.rs` (facade).
- `services/settings.rs` → `profile.rs`, `preferences.rs`, `security.rs`, `accessibility.rs`, `notifications.rs`, `audit.rs`.
- `services/auth.rs` → `accounts.rs`, `sessions.rs`, `tokens.rs`, `password.rs`, `mfa.rs`, `rate_limit.rs`.
- `services/pdf_generation.rs` → `templates.rs`, `layout.rs`, `renderer.rs`, `export.rs`.
- `commands/mod.rs` → domain-focused request/response modules (`task_types`, `client_types`, `user_types`) to reduce cross-domain coupling.
