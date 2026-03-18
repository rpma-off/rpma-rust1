# Architecture Audit — Flat Handler-Based Domains

**Date:** 2026-03-18  
**Scope:** calendar · clients · documents · notifications · settings  
**Method:** Static analysis of all source files within each domain

---

## Assessment Criteria

For each domain, three concerns are evaluated:

| # | Concern | Clean standard |
|---|---------|----------------|
| **C1** | Business logic mixed into IPC handler functions | Handlers must be thin (ADR-018): authenticate, delegate, format response only |
| **C2** | SQL queries outside a dedicated repository file | All SQL must live in `*_repository.rs`; no SQL in services, facades, or handlers |
| **C3** | Cross-domain dependencies that bypass `shared/contracts/` or the event bus | Cross-domain calls must go through a shared trait defined in `shared/contracts/` |

---

## 1. Calendar

**Files examined:**  
`calendar_handler/ipc.rs` · `calendar_handler/facade.rs` · `calendar_handler/service.rs` · `calendar_handler/repository.rs` · `calendar_handler/event_repository.rs` · `models.rs`

### Violations

#### C1 — Business logic in handler/facade

| Location | Lines | Description |
|----------|-------|-------------|
| `facade.rs` | 96–107 | `validate_date_range()` — date comparison logic belongs in an application validator, not the facade |
| `facade.rs` | 136–145 | `CreateEvent` arm validates title and datetime ordering inline instead of delegating to a validator |
| `facade.rs` | 154–162 | `UpdateEvent` arm repeats datetime ordering check |
| `service.rs` | 40–46 | `check_conflicts()` performs input validation using `ValidationService` before executing domain logic |
| `service.rs` | 70–90 | Conflict-result message formatting (presentation concern) inside the service |
| `ipc.rs` | 293–300 | `calendar_schedule_task` handler decides to convert a `Conflict` response into an `AppError::Validation`; this decision is a business rule and must live in the application layer |

#### C2 — SQL outside repository

No violations. All SQL is isolated in `repository.rs` and `event_repository.rs` and uses parameterized queries throughout. The dynamic `IN` clause construction in `repository.rs` lines 21–97 is acceptable because it is contained within the repository layer.

One concern in `repository.rs` lines 206–213: datetime string formatting (`"{}T{}:00"`) used to construct values persisted to the database. This is domain logic (a value-object transformation) embedded in a repository write path, which is a mild SRP violation but not a SQL-placement issue.

#### C3 — Cross-domain bypass

| Location | Lines | Description |
|----------|-------|-------------|
| `calendar_handler/repository.rs` | 8, 131–142 | `use crate::domains::tasks::domain::models::task::TaskStatus` — hard import from the tasks domain used to generate SQL filter values |

The domain does maintain a mirrored `CalendarTaskStatus` enum in `models.rs` (with a comment acknowledging the synchronisation requirement), but the repository bypasses it and imports the tasks enum directly.

**Correctly done:**  
- IPC handlers in `ipc.rs` are thin for most commands (get, create, delete).  
- `CalendarService` correctly implements the `TaskScheduler` shared contract, giving other domains a proper abstraction to depend on.  
- All SQL uses parameterized queries; no injection risk.  
- `upsert_schedule` uses `db.with_transaction()` for atomicity.

### Summary

| | |
|---|---|
| **Refactoring scope** | **M** |
| **Estimated effort** | 6–8 hours |

### Recommended first patch

**Remove the hard `TaskStatus` import from `calendar_handler/repository.rs`.**

Replace:
```rust
use crate::domains::tasks::domain::models::task::TaskStatus;
// ...
let completed = TaskStatus::Completed.to_string();
let cancelled = TaskStatus::Cancelled.to_string();
```
With:
```rust
let completed = "completed";
let cancelled = "cancelled";
```

This eliminates the only cross-domain compile-time dependency in roughly 15 minutes with zero behaviour change. It is the smallest change that begins separation of concerns and unblocks making the calendar domain independently compilable.

---

## 2. Clients

**Files examined:**  
`client_handler/ipc.rs` · `client_handler/service.rs` · `client_handler/validation.rs` · `client_handler/repository.rs` · `client_handler/mod.rs`

### Violations

#### C1 — Business logic in handler/service

| Location | Lines | Description |
|----------|-------|-------------|
| `client_handler/service.rs` | 230–231 | `update_client()` checks `client.created_by != user_id` — resource-ownership authorisation embedded inside business logic |
| `client_handler/service.rs` | 302–311 | `delete_client()` repeats the same ownership check with additional logging |

The IPC layer already enforces role-based access (RBAC); these checks add resource-based authorisation at the service level. Neither layer is wrong in isolation, but both concerns are co-located in business methods rather than being explicit and separate.

Secondary: `client_handler/validation.rs` defines a `ClientValidationService` that is only invoked from tests; the production IPC flow calls `CreateClientRequest::validate()` directly from `client_handler/mod.rs`. The divergence means production and test validation rules differ (for example, `validate()` does not require an email, while `ClientValidationService` does).

#### C2 — SQL outside repository

No violations. All SQL is in `repository.rs`. The repository uses a trait abstraction (`IClientRepository`) and parameterized queries throughout.

One concern: `client_handler/validation.rs` lines 198 and 391 use `futures::executor::block_on()` to call async methods synchronously. These calls are in test-only paths today, but the pattern is dangerous in an async runtime (potential deadlock). It is not a SQL-placement violation but is a code-quality issue that should be resolved before `ClientValidationService` is ever called from production code.

#### C3 — Cross-domain bypass

No violations. The domain correctly implements the `ClientResolver` shared contract (`service.rs` lines 427–444) and does not import from other feature domains.

**Correctly done:**  
- IPC layer is thin and ADR-018 compliant.  
- Repository pattern is correctly implemented with a trait abstraction and caching.  
- `ClientResolver` contract is properly used.

### Summary

| | |
|---|---|
| **Refactoring scope** | **S** |
| **Estimated effort** | 4–5 hours |

### Recommended first patch

**Extract resource-ownership checks into a dedicated `ClientAuthorizationService`.**

Create `client_handler/authorization.rs` (~40 lines) with `can_update_client(client, user_id)` and `can_delete_client(client, user_id)` functions. Update `service.rs` to call these helpers. This removes authorisation logic from business methods, makes the rules visible and testable independently, and costs roughly 2 hours with no behaviour change.

---

## 3. Documents

**Files examined:**  
`photo_handler.rs` (1,298 lines) · `photo_repository.rs` · `report_handler.rs` · `report_export.rs` · `report_pdf.rs` · `document_storage.rs` · `models.rs` · `facade.rs`

### Violations

#### C1 — Business logic in handler/service

| Location | Lines | Description |
|----------|-------|-------------|
| `report_handler.rs` | 175–251 | `report_generate` IPC command orchestrates the entire report pipeline: fetch intervention, check permissions, generate report number, construct file path, run PDF renderer, build entity, persist. This is an application service masquerading as an IPC handler. |
| `photo_handler.rs` | 1–1298 | Single file contains `PhotoService` (lines 184–884), `DocumentsFacade` (lines 886–1075), and IPC command functions (lines 1077–1298). Separation of concerns is entirely absent. |
| `photo_handler.rs` | 301–419 | `PhotoService::store_photo()` performs image compression, quality scoring, thumbnail generation, and entity construction — all domain/infrastructure concerns mixed into one service method. |

#### C2 — SQL outside repository

| Location | Lines | Description |
|----------|-------|-------------|
| `photo_handler.rs` | 507–560 | `PhotoService::get_photos()` builds a dynamic WHERE clause and executes the query directly against the database. A `PhotoRepository` already exists in `photo_repository.rs` but is not used. |
| `photo_handler.rs` | 613–630 | `PhotoService::save_photo_record()` contains a 39-parameter INSERT and a 36-parameter UPDATE executed directly on the database connection. |
| `report_export.rs` | 14–32 | `resolve_technician_name()` runs `SELECT username FROM users WHERE id = ?` — an orphaned SQL query in a service helper function, querying another domain's table. |

#### C3 — Cross-domain bypass

| Location | Lines | Description |
|----------|-------|-------------|
| `report_export.rs` | 39–66 | `get_intervention_with_details()` accepts `Option<&InterventionService>` and **instantiates a new `InterventionService` directly** if none is provided — bypassing any contract layer. |
| `report_export.rs` | 91–98 | Calls `client_svc.get_client()` directly on a `ClientService` reference with no shared contract. |
| `photo_handler.rs` | 897–899 | `DocumentsServices` struct holds `Arc<InterventionService>` and `Arc<ClientService>` as concrete types with no abstraction. |
| `report_handler.rs` | 185–189 | `report_generate` passes `state.intervention_service` and `state.client_service` directly to `report_export_service::get_intervention_with_details()`. |
| `report_export.rs` | 14–32 | SQL on the `users` table (auth domain) from inside the documents domain — cross-domain data access without any contract. |

**Correctly done:**  
- Most IPC command functions are thin wrappers (delegate to facade or service).  
- `report_pdf.rs` is clean: view-model in, PDF out, no database access.  
- `document_storage.rs` is a well-scoped utility with no domain coupling.  
- `photo_repository.rs` exists with the right shape (`PhotoQuery`, `build_where_clause`) — it simply needs to be wired up.  
- `ReportRepository` methods in `report_handler.rs` use parameterized queries correctly.

### Summary

| | |
|---|---|
| **Refactoring scope** | **L** |
| **Estimated effort** | 2–3 weeks (2 developers) |

### Recommended first patch

**Wire `PhotoRepository` into `PhotoService` for persistence and queries.**

1. Expand `photo_repository.rs` with `save(photo)`, `find(query)`, and `count(query)` methods (estimated +200 lines).  
2. In `photo_handler.rs`, replace the inline SQL in `save_photo_record()` and `get_photos()` with calls to `PhotoRepository`.

This is the smallest self-contained change: it removes the two most egregious SQL violations from the service layer, leverages an abstraction that already exists, and does not require any structural reorganisation of the monolithic file. Estimated effort: 3–4 hours, low risk.

---

## 4. Notifications

**Files examined:**  
`notification_handler/mod.rs` · `notification_handler/facade.rs` · `notification_handler/message_service.rs` · `notification_handler/message_repository.rs` · `notification_handler/notification_repository.rs` · `notification_handler/preferences_repository.rs` · `notification_handler/template_repository.rs` · `notification_handler/notification_service.rs` · `notification_handler/helper.rs`

### Violations

#### C1 — Business logic in handler

No violations. All IPC commands in `mod.rs` lines 86–318 are thin: each calls a single `NotificationsFacade` method.

#### C2 — SQL outside repository

| Location | Lines | Description |
|----------|-------|-------------|
| `message_service.rs` | 155–194 | `get_templates()` builds and executes a raw SELECT with dynamic `AND category = ?` / `AND message_type = ?` clauses. `TemplateRepository` already provides a `search()` method that implements identical logic. |
| `message_service.rs` | 196–227 | `get_preferences()` executes a 17-column SELECT directly on the database connection. `NotificationPreferencesRepository::find_by_user_id()` already exists and does exactly this. |
| `message_service.rs` | 229–276 | `update_preferences()` constructs a dynamic UPDATE using a macro (`maybe_field!`) and executes it directly. Dedicated update methods (`update_task_settings`, `update_client_settings`, etc.) exist in `preferences_repository.rs`. |

All three violations follow the same pattern: the service re-implements repository logic instead of delegating to the repositories that are already injected or constructible.

#### C3 — Cross-domain bypass

No violations. The `NotificationSender` shared contract in `shared/contracts/notification.rs` is the only cross-domain surface. `MessageService` implements it; the tasks domain consumes it via `Arc<dyn NotificationSender>`. No other domain imports notification types directly.

One structural concern: `mod.rs` lines 11–17 re-export every repository and service with `pub use *`. While not actively exploited, this removes the encapsulation benefit of the facade: external code *could* bypass `NotificationsFacade` and call `MessageRepository` directly without a compiler error. Restricting visibility to only the facade and public models would enforce the intended access contract.

**Correctly done:**  
- IPC layer is the cleanest of the five domains audited.  
- `NotificationsFacade` is a well-scoped orchestration point.  
- Cross-domain integration via `NotificationSender` trait is properly designed.  
- Four dedicated repositories exist with the correct responsibilities; they just need to be called.

### Summary

| | |
|---|---|
| **Refactoring scope** | **S** |
| **Estimated effort** | 2–3 hours |

### Recommended first patch

**Delegate `get_preferences()` in `MessageService` to `NotificationPreferencesRepository::find_by_user_id()`.**

This is the smallest of the three SQL violations. The repository method already exists and has identical semantics. The change is:

1. Remove lines 196–227 in `message_service.rs`.  
2. Inject (or construct) `NotificationPreferencesRepository` in the `MessageService` constructor.  
3. Implement `get_preferences` as a one-line delegation to `repo.find_by_user_id(user_id)`.

Estimated effort: 20–30 minutes. After this lands, `get_templates()` and `update_preferences()` follow the same pattern.

---

## 5. Settings

**Files examined:**  
`settings_handler.rs` · `user_settings_handler.rs` · `organization_handler.rs` · `facade.rs` · `settings_repository.rs` · `user_settings_repository.rs` · `organization_repository.rs` · `models.rs` · `tests/`

### Violations

#### C1 — Business logic in handler

| Location | Lines | Description |
|----------|-------|-------------|
| `user_settings_handler.rs` | 28–39 | `update_user_profile()` fetches current settings, mutates the `profile` field, then saves — a fetch-modify-save orchestration that belongs in the facade |
| `user_settings_handler.rs` | 43–54 | `update_user_preferences()` — same pattern |
| `user_settings_handler.rs` | 58–69 | `update_user_security()` — same pattern |
| `user_settings_handler.rs` | 73–84 | `update_user_performance()` — same pattern |
| `user_settings_handler.rs` | 88–99 | `update_user_accessibility()` — same pattern |
| `user_settings_handler.rs` | 103–114 | `update_user_notifications()` — same pattern |

For comparison, `settings_handler.rs` is correctly implemented: every handler delegates to a single `SettingsFacade` method. The inconsistency between the two handler files indicates the user-settings handlers were written before equivalent facade methods existed.

Secondary: `organization_repository.rs` line 57 calls `request.validate()` inside `create_organization()`. Validation is already performed in `facade.rs` line 229 before the repository is called. The duplicate call in the repository is redundant and creates confusion about which layer owns validation.

#### C2 — SQL outside repository

No violations. All SQL is in the three repository files (`settings_repository.rs`, `user_settings_repository.rs`, `organization_repository.rs`). The facade and all handlers contain zero SQL.

#### C3 — Cross-domain bypass

| Location | Lines | Description |
|----------|-------|-------------|
| `organization_repository.rs` | 456–471 | `has_admin_users()` executes `SELECT COUNT(*) FROM users WHERE role = ?` — directly querying the `users` table, which belongs to the auth/user domain. The onboarding status check therefore depends on auth domain's internal schema. |

Call path: `organization_handler.rs::get_onboarding_status()` → `facade.rs::get_onboarding_status()` → `org_repo.has_admin_users()` → direct SQL on `users`.

The proper approach is to expose a `has_users_with_role(role)` method through a shared contract in `shared/contracts/` (e.g., `UserQuery`) and have the auth domain implement it.

**Correctly done:**  
- `settings_handler.rs` is thin and ADR-018 compliant.  
- All SQL is properly isolated in three dedicated repository files.  
- `SettingsFacade` provides a clean single entry point.  
- `SettingsAccessPolicy` RBAC rules are explicit and well-structured.  
- Audit logging of settings changes is correctly placed in the repository.

### Summary

| | |
|---|---|
| **Refactoring scope** | **M** |
| **Estimated effort** | 2–3 hours |

### Recommended first patch

**Extract the six fetch-modify-save sequences from `user_settings_handler.rs` into corresponding `SettingsFacade` methods.**

Add six methods to `facade.rs` (`update_user_profile`, `update_user_preferences`, `update_user_security`, `update_user_performance`, `update_user_accessibility`, `update_user_notifications`), each encapsulating the get-mutate-save pattern. Update each handler to a single facade delegation call. This makes `user_settings_handler.rs` consistent with `settings_handler.rs`, removes business logic from the IPC layer, and costs roughly 30 minutes with no behaviour change.

---

## Cross-Domain Summary

| Domain | C1 Business logic in handlers | C2 SQL outside repository | C3 Cross-domain bypass | Scope | First patch |
|--------|-------------------------------|---------------------------|------------------------|-------|-------------|
| **Calendar** | ✗ Validation in facade; conflict decision in handler | ✓ Clean | ✗ Direct `TaskStatus` import | **M** | Remove `TaskStatus` import; use string literals (~15 min) |
| **Clients** | ✗ Resource-ownership auth in service methods | ✓ Clean | ✓ Clean | **S** | Extract `ClientAuthorizationService` (~2 h) |
| **Documents** | ✗ Full pipeline in IPC handler; monolithic service file | ✗ SQL in `PhotoService`; orphan SQL in `report_export.rs` | ✗ Direct `InterventionService` / `ClientService` coupling; cross-domain SQL on `users` | **L** | Wire `PhotoRepository` into `PhotoService` (~4 h) |
| **Notifications** | ✓ Clean | ✗ Three SQL blocks in `MessageService` with existing repository methods available | ✓ Clean | **S** | Delegate `get_preferences()` to existing repository method (~30 min) |
| **Settings** | ✗ Six fetch-modify-save loops in user-settings handler | ✓ Clean | ✗ Direct SQL on `users` table in `organization_repository.rs` | **M** | Extract six methods to `SettingsFacade` (~30 min) |

### Priority recommendation

Execute patches in the order that delivers the highest impact per unit of risk:

1. **Notifications** `get_preferences` delegation — 30 min, zero risk, proves pattern.  
2. **Settings** user-settings facade extraction — 30 min, zero risk, makes the handler consistent.  
3. **Calendar** `TaskStatus` import removal — 15 min, zero risk, removes cross-domain compile dependency.  
4. **Clients** `ClientAuthorizationService` extraction — 2 h, low risk, improves testability of authorisation.  
5. **Documents** `PhotoRepository` wiring — 4 h, low risk, removes largest SQL concentration.  
6. **Documents** cross-domain contract layer — 1–2 weeks, medium risk, requires new `shared/contracts/` traits.
