# Architecture Adherence Audit Report

**Date**: 2025-02-12
**Scope**: Four-layer architecture compliance (Commands → Services → Repositories → Database)
**Methodology**: Static analysis of all Rust source files in `src-tauri/src/`

---

## Summary of Findings

| Category | Count | Severity |
|----------|-------|----------|
| Commands bypassing Services to access DB directly | 4 files | 🔴 Critical |
| Business logic in Commands layer | 6 files | 🟠 High |
| Services bypassing Repositories to access DB directly | 35+ files | 🔴 Critical |
| UI/Presentation concerns in Services layer | 3 files | 🟠 High |
| Commands directly instantiating Repositories | 1 file | 🟠 High |

---

## Violation Category 1: Commands Layer Bypassing Services (Direct DB Access)

### Violation 1.1 — `src-tauri/src/commands/settings/audit.rs`

**Type**: Command → Database (skips Services and Repositories)

**Lines**: 9, 48–63, 76–88, 113–125

**Evidence**:
```rust
// Line 9: Direct rusqlite import in commands layer
use rusqlite::{params, OptionalExtension};

// Lines 48-63: Raw SQL in command-layer helper function
fn upsert_data_consent(conn: &rusqlite::Connection, consent: &DataConsent) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO user_consent (user_id, consent_data, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET ...",
        params![consent.user_id, consent_data, now],
    )
}

// Lines 76-88: Direct DB query in command handler
let conn = state.db.get_connection()?;
let stored_consent: Option<String> = conn
    .query_row("SELECT consent_data FROM user_consent WHERE user_id = ?", ...)
```

**Impact**: Violates separation of concerns; consent logic cannot be reused or tested independently; SQL scattered outside repository layer.

**Proposed Fix**: Create a `ConsentRepository` with `get_consent()` and `upsert_consent()` methods, a `ConsentService` for business logic, and have the command delegate to the service.

---

### Violation 1.2 — `src-tauri/src/commands/system.rs`

**Type**: Command → Database (skips Services and Repositories)

**Lines**: 3, 173–227, 249–272, 276–330

**Evidence**:
```rust
// Line 3: Direct Database import
use crate::db::Database;

// Lines 199-205: Direct SQL COUNT queries in command handler
let task_count: i64 = conn
    .query_row("SELECT COUNT(*) FROM tasks;", [], |row| row.get(0))
    .unwrap_or(0);
let client_count: i64 = conn
    .query_row("SELECT COUNT(*) FROM clients;", [], |row| row.get(0))
    .unwrap_or(0);

// Lines 259-261: Health check with direct SQL
let count: i64 = conn
    .query_row("SELECT COUNT(*) FROM users", [], |row| row.get(0))
```

**Impact**: Database diagnostics, health checks, and statistics queries bypass the entire service/repository stack. Changes to table schemas would require updating command-layer code.

**Proposed Fix**: Create a `SystemService` with `diagnose_database()`, `health_check()`, `get_database_stats()`, and `force_wal_checkpoint()` methods. The service can access a `SystemRepository` for table counts, or use existing repositories.

---

### Violation 1.3 — `src-tauri/src/commands/reports/export/intervention_export.rs`

**Type**: Command → Repository (skips Services)

**Lines**: 283–289

**Evidence**:
```rust
// Lines 283-289: Direct repository instantiation in command layer
use crate::repositories::{Cache, ClientRepository};
let cache = std::sync::Arc::new(Cache::new(1000));
let client_repo = std::sync::Arc::new(ClientRepository::new(
    std::sync::Arc::new(db.clone()),
    cache,
));
let client_service = ClientService::new(client_repo);
```

**Impact**: Command layer creates its own service/repository instances instead of using shared state, bypassing DI and potentially creating inconsistent cache states.

**Proposed Fix**: Use `state.client_service` and `state.intervention_service` from the shared application state instead of instantiating new service/repository objects.

---

## Violation Category 2: Business Logic in Commands Layer

### Violation 2.1 — `src-tauri/src/commands/task/statistics.rs`

**Type**: Business logic (calculations, insights, trends) in commands layer

**Lines**: 68–166

**Evidence**:
```rust
// Lines 68-74: Business calculation in commands layer
pub fn calculate_completion_rate(stats: &TaskStatistics) -> f64 {
    (stats.completed_tasks as f64 / stats.total_tasks as f64) * 100.0
}

// Lines 77-111: Efficiency metrics calculation
pub fn calculate_efficiency_metrics(stats: &TaskStatistics) -> HashMap<String, f64> { ... }

// Lines 114-140: Performance insight generation with business rules
pub fn generate_performance_insights(stats: &TaskStatistics) -> Vec<String> {
    if completion_rate > 90.0 { "Excellent completion rate above 90%" }
    ...
}

// Lines 143-166: Trend calculation
pub fn calculate_productivity_trends(...) -> HashMap<String, f64> { ... }
```

**Impact**: Four business logic functions (`calculate_completion_rate`, `calculate_efficiency_metrics`, `generate_performance_insights`, `calculate_productivity_trends`) are defined in the commands layer. They cannot be reused by other services and are not testable in isolation from the command infrastructure.

**Proposed Fix**: Move all four functions to `services/task_statistics.rs`. The command handler should call the service methods.

---

### Violation 2.2 — `src-tauri/src/commands/intervention/queries.rs`

**Type**: Business logic (progress calculation) in commands layer

**Lines**: 96–112

**Evidence**:
```rust
// Progress calculation logic in command handler
let total_steps = intervention_details.steps.len() as i32;
let completed_steps = intervention_details.steps.iter()
    .filter(|s| matches!(s.step.step_status, StepStatus::Completed))
    .count() as i32;
let _completion_percentage = if total_steps > 0 {
    (completed_steps as f64 / total_steps as f64) * 100.0
} else { 0.0 };
```

**Impact**: Intervention progress calculation logic is in the command layer. The computed values are not even used (prefixed with `_`), and the function returns hardcoded placeholder values instead. This is both a layer violation and dead code.

**Proposed Fix**: Implement `get_progress()` in `InterventionService` that performs this calculation and returns the real progress. Remove dead code from the command.

---

### Violation 2.3 — `src-tauri/src/commands/client.rs`

**Type**: Complex validation/transformation logic in commands layer

**Lines**: 52–113

**Evidence**:
```rust
// Lines 76-94: Tag validation loop with JSON parsing/re-serialization
let tags: Vec<String> = serde_json::from_str(tags_str)?;
let mut validated = Vec::new();
for tag in tags {
    let sanitized = validator.sanitize_text_input(&tag, "tag", 50)?;
    validated.push(sanitized);
}
Some(serde_json::to_string(&validated).unwrap_or_default())
```

**Impact**: While simple input validation in commands is acceptable, the tag parsing/validation/re-serialization loop is complex business logic that belongs in a service or validation service.

**Proposed Fix**: Move tag validation logic to `ClientService` or extend `ValidationService` with a `validate_and_sanitize_tags()` method.

---

### Violation 2.4 — `src-tauri/src/commands/intervention/data_access.rs`

**Type**: Authorization logic duplicated in commands layer

**Lines**: 36–44, 166–174

**Evidence**:
```rust
// Authorization checks repeated in multiple command handlers
if intervention.technician_id.as_ref() != Some(&session.user_id)
    && !matches!(
        session.role,
        crate::models::auth::UserRole::Admin | crate::models::auth::UserRole::Supervisor
    )
{
    return Err(AppError::Authorization("Not authorized ...".to_string()));
}
```

**Impact**: The same authorization pattern is duplicated across multiple intervention command handlers. This should be centralized in the service or middleware layer.

**Proposed Fix**: Create `InterventionService::check_access()` or add to `AuthMiddleware` to centralize this repeated authorization pattern.

---

## Violation Category 3: Services Bypassing Repositories (Direct DB Access)

### Violation 3.1 — Pervasive Direct SQL in Services

**Type**: Service → Database (skips Repositories)

**Affected Files** (35+ files with direct `rusqlite` usage):

| File | Key Violations |
|------|---------------|
| `services/rate_limiter.rs` | Lines 42–56: `CREATE TABLE IF NOT EXISTS` DDL, Lines 79+: raw SQL queries |
| `services/analytics.rs` | Direct `query_as()`, `params!`, `from_row()` usage |
| `services/audit_service.rs` | Direct `execute()`, `prepare()`, `get_connection()` |
| `services/auth.rs` | Direct `rusqlite::params!`, `execute()`, `query_row()` |
| `services/calendar.rs` | Direct `query_row()`, `prepare()`, `params_from_iter()` |
| `services/client_queries.rs` | Direct `prepare()`, `get_connection()` |
| `services/client_statistics.rs` | Direct `query_row()`, `prepare()` |
| `services/client_task_integration.rs` | Direct `execute()`, `query_row()`, `params!` |
| `services/client_validation.rs` | Direct `rusqlite::params!` |
| `services/dashboard.rs` | Direct `query_row()`, `prepare()`, `get_connection()` |
| `services/geo.rs` | Direct `from_row()`, `params!`, `query_as()` |
| `services/intervention_data.rs` | Direct `params!`, `Transaction`, `execute()` |
| `services/intervention_workflow.rs` | Direct `params!`, `execute()`, `get_connection()` |
| `services/material.rs` | Direct `params!`, `execute()`, `query_row()`, `from_row()` |
| `services/message.rs` | Direct `params!`, `execute()`, `query_map()` |
| `services/operational_intelligence.rs` | Direct `query_row()`, `params!` |
| `services/performance_monitor.rs` | Direct `params!`, `execute()` |
| `services/prediction.rs` | Direct `prepare()`, `query()`, `params_from_iter()` |
| `services/security_monitor.rs` | Direct `params!`, `execute()`, `query_row()` |
| `services/settings.rs` | Direct `rusqlite::Transaction`, `params!`, `execute()` |
| `services/task.rs` | Direct `params!`, `execute()`, `query_row()` |
| `services/task_creation.rs` | Direct `params!`, `prepare()` |
| `services/task_deletion.rs` | Direct `params!`, `execute()` |
| `services/task_queries.rs` | Direct `params!`, `prepare()` |
| `services/task_statistics.rs` | Direct `params!`, `prepare()` |
| `services/task_update.rs` | Direct `params!`, `get_connection()` |
| `services/task_validation.rs` | Direct `params!`, `prepare()`, `query_row()` |
| `services/two_factor.rs` | Direct `params!`, `query_row()` |
| `services/workflow_cleanup.rs` | Direct `params!`, `execute()`, `query_row()` |
| `services/photo/*.rs` (4 files) | Direct `params!`, `execute()`, `query_single_as()` |
| `services/reports/*.rs` (7 files) | Direct `params!`, `query_multiple()` |

**Impact**: This is the most systemic violation in the codebase. Nearly every service directly accesses SQLite via `rusqlite`, completely bypassing the repository layer. This means:
- SQL is scattered across 35+ service files
- Schema changes require updates in dozens of files
- Services cannot be unit-tested without a real database
- The repository layer exists but is largely underutilized

**Proposed Fix**: This is a large-scale refactoring effort. Prioritize by:
1. **High priority**: Services with corresponding repositories that are being bypassed (task, client, intervention)
2. **Medium priority**: Services that need new repositories created (rate_limiter, analytics, settings, calendar)
3. **Low priority**: Utility services (performance_monitor, prediction, operational_intelligence)

---

## Violation Category 4: UI/Presentation Concerns in Services

### Violation 4.1 — `src-tauri/src/services/analytics.rs`

**Type**: UI presentation logic (widget creation, colors) in service layer

**Lines**: ~117, ~147

**Evidence**:
```rust
// Creating UI widgets with hardcoded colors in service layer
let widgets = self.create_default_widgets(&kpis)?;
colors: Some(vec!["#3B82F6".to_string()]),
```

**Impact**: Service layer defines UI-specific widget configurations and CSS color values. Changes to dashboard appearance require modifying business logic code.

**Proposed Fix**: Return raw KPI data from the service. Move widget creation and color assignments to the frontend.

---

### Violation 4.2 — `src-tauri/src/services/pdf_report.rs`

**Type**: Presentation/layout logic in service layer

**Lines**: ~46–91

**Evidence**:
```rust
// PDF layout and styling in service layer
doc.set_title("Rapport d'Intervention PPF");
let mut decorator = SimplePageDecorator::new();
decorator.set_margins(20);
// ... formatting strings for display
doc.push(elements::Paragraph::new(&format!("Couleur: {}", color)));
```

**Impact**: PDF layout, margins, fonts, and formatting strings are tightly coupled with business logic. While PDF generation inherently involves presentation, the business data should be separated from the formatting template.

**Proposed Fix**: Separate data preparation (service) from document formatting (dedicated PDF formatter/presenter). The service should prepare a data structure, and a separate formatter module should handle layout.

---

### Violation 4.3 — `src-tauri/src/services/notification.rs`

**Type**: HTML email body generation in service layer

**Lines**: ~72, ~151, ~193

**Evidence**:
```rust
// HTML content generation in service layer
let (subject, body) = self.render_template(&template, &variables)?;
// Sending with HTML body
"content": [{"type": "text/html", "value": body}]
```

**Impact**: Email template rendering and HTML generation mixed with notification business logic.

**Proposed Fix**: Extract email template rendering into a dedicated `TemplateService` or `EmailFormatter`.

---

## Prioritized Refactoring Roadmap

### Phase 1 — Critical (Commands → DB violations)
1. Refactor `commands/settings/audit.rs` → Create `ConsentService` + `ConsentRepository`
2. Refactor `commands/system.rs` → Create `SystemService`
3. Refactor `commands/reports/export/intervention_export.rs` → Use shared `state` services
4. Move business logic from `commands/task/statistics.rs` → `services/task_statistics.rs`

### Phase 2 — High (Business logic misplacement)
5. Move progress calculation from `commands/intervention/queries.rs` → `InterventionService`
6. Move tag validation from `commands/client.rs` → `ValidationService`
7. Centralize authorization checks from `commands/intervention/data_access.rs` → `AuthMiddleware`

### Phase 3 — Systemic (Services → DB violations)
8. Create missing repositories and route service DB access through them (35+ files)
9. Start with highest-impact services: `task*.rs`, `client*.rs`, `intervention*.rs`

### Phase 4 — Presentation concerns
10. Move UI widget/color logic from `services/analytics.rs` → Frontend
11. Separate PDF data preparation from formatting in `services/pdf_report.rs`
12. Extract email templates from `services/notification.rs`

---

## GitHub Issues

The following issues are formatted for direct copy-paste into GitHub Issues.

---

### Issue 1: Commands layer directly accesses database in settings/audit.rs

**Title**: `[Architecture] Commands layer bypasses service/repository layers in settings/audit.rs`

**Context**:
The `settings/audit.rs` command handler directly uses `rusqlite` to execute raw SQL queries against the database, completely bypassing both the service and repository layers. This violates the documented four-layer architecture (Commands → Services → Repositories → Database).

**Expected vs Actual**:
- **Expected**: Command handlers delegate to a service, which delegates to a repository for data access.
- **Actual**: `get_data_consent()` and `update_data_consent()` command handlers directly call `state.db.get_connection()` and execute raw SQL (`INSERT INTO user_consent`, `SELECT consent_data FROM user_consent`).

**Impact**:
- SQL logic is scattered outside the repository layer
- Consent operations cannot be reused by other services
- Unit testing requires a real database connection
- Schema changes to `user_consent` table require modifying command-layer code

**Proposed Fix**:
1. Create `ConsentRepository` in `src-tauri/src/repositories/` with `get_consent(user_id)` and `upsert_consent(consent)` methods
2. Create `ConsentService` in `src-tauri/src/services/` that uses `ConsentRepository` and encapsulates default consent logic
3. Update `settings/audit.rs` commands to delegate to `ConsentService`
4. Remove direct `rusqlite` imports from the commands module

**Acceptance Criteria**:
- [ ] No `rusqlite` imports in `src-tauri/src/commands/settings/audit.rs`
- [ ] No raw SQL in `src-tauri/src/commands/settings/audit.rs`
- [ ] `ConsentRepository` handles all `user_consent` table access
- [ ] `ConsentService` encapsulates consent business logic
- [ ] Command handlers only call service methods
- [ ] Existing tests pass
- [ ] New unit tests for `ConsentRepository` and `ConsentService`

**Labels**: `backend`, `architecture`, `tech-debt`

---

### Issue 2: Commands layer directly accesses database in system.rs

**Title**: `[Architecture] Commands layer bypasses service/repository layers in system.rs`

**Context**:
The `system.rs` command handlers (`diagnose_database`, `health_check`, `get_database_stats`, `force_wal_checkpoint`) directly execute SQL queries and PRAGMA commands against the database, bypassing service and repository layers.

**Expected vs Actual**:
- **Expected**: System/diagnostic commands delegate to a service layer.
- **Actual**: Commands directly call `pool.get()`, then execute `SELECT COUNT(*)`, `PRAGMA journal_mode`, `PRAGMA integrity_check`, and `PRAGMA wal_checkpoint` against the raw connection.

**Impact**:
- 4 command handlers contain direct SQL (8+ raw queries)
- Database diagnostics logic cannot be reused
- No abstraction boundary for database health operations
- Changes to table schemas require modifying command-layer code

**Proposed Fix**:
1. Create `SystemService` in `src-tauri/src/services/` with `diagnose_database()`, `health_check()`, `get_database_stats()`, and `force_wal_checkpoint()` methods
2. Optionally create `SystemRepository` for table count queries
3. Update `system.rs` commands to delegate to `SystemService`

**Acceptance Criteria**:
- [ ] No direct SQL queries in `src-tauri/src/commands/system.rs`
- [ ] `SystemService` handles all database diagnostic operations
- [ ] Command handlers only call service methods
- [ ] Existing functionality preserved
- [ ] Unit tests for `SystemService`

**Labels**: `backend`, `architecture`, `tech-debt`

---

### Issue 3: Commands layer instantiates repositories directly in intervention_export.rs

**Title**: `[Architecture] Commands layer instantiates repositories directly in intervention_export.rs`

**Context**:
The `intervention_export.rs` command creates its own `ClientRepository` and `ClientService` instances instead of using the shared application state, bypassing the dependency injection pattern.

**Expected vs Actual**:
- **Expected**: Commands access services via `state.client_service` (shared, DI-managed instances).
- **Actual**: Command instantiates `Cache::new(1000)`, `ClientRepository::new(...)`, and `ClientService::new(client_repo)` directly (lines 283–289).

**Impact**:
- Creates separate cache instances, leading to inconsistent cache state
- Bypasses dependency injection and shared configuration
- Repository instantiation logic is duplicated outside the DI container
- Harder to mock/test

**Proposed Fix**:
1. Refactor `get_intervention_with_details()` to accept `state` or individual services instead of raw `db`
2. Use `state.client_service` and `state.intervention_service` for all data access
3. Remove direct repository imports from the command module

**Acceptance Criteria**:
- [ ] No `use crate::repositories::` imports in `commands/reports/export/intervention_export.rs`
- [ ] No direct `Repository::new()` or `Service::new()` calls in the command
- [ ] Shared state services used for all data access
- [ ] Report generation still works correctly
- [ ] Existing tests pass

**Labels**: `backend`, `architecture`, `tech-debt`

---

### Issue 4: Business logic functions in commands/task/statistics.rs belong in services layer

**Title**: `[Architecture] Business logic functions in commands/task/statistics.rs should be in services layer`

**Context**:
Four business logic functions are defined in the commands layer (`commands/task/statistics.rs`) instead of the services layer:
- `calculate_completion_rate()`
- `calculate_efficiency_metrics()`
- `generate_performance_insights()`
- `calculate_productivity_trends()`

These functions perform business calculations (completion rates, efficiency metrics, performance insights, trend analysis) that belong in `services/task_statistics.rs`.

**Expected vs Actual**:
- **Expected**: Business calculations are in the service layer and can be reused by other services.
- **Actual**: Four calculation functions (lines 68–166) are in `commands/task/statistics.rs`, making them inaccessible to other services.

**Impact**:
- Business logic cannot be reused by other services (e.g., reports, analytics)
- Calculation logic is not testable independently from command infrastructure
- Violates single responsibility principle for command handlers

**Proposed Fix**:
1. Move `calculate_completion_rate()`, `calculate_efficiency_metrics()`, `generate_performance_insights()`, and `calculate_productivity_trends()` to `services/task_statistics.rs`
2. Update any callers to use the service-layer versions
3. Add unit tests in the service layer

**Acceptance Criteria**:
- [ ] No business calculation functions in `commands/task/statistics.rs`
- [ ] All four functions available in `services/task_statistics.rs`
- [ ] Unit tests for each moved function
- [ ] No compilation errors
- [ ] All existing tests pass

**Labels**: `backend`, `architecture`, `tech-debt`

---

### Issue 5: Intervention progress calculation in commands layer is dead code

**Title**: `[Architecture] Intervention progress calculation in commands/intervention/queries.rs is dead code and misplaced`

**Context**:
The `get_intervention_progress` command handler in `commands/intervention/queries.rs` contains progress calculation business logic (lines 96–112) that computes `completed_steps` and `completion_percentage`, but the computed values are never used (prefixed with `_`). Instead, hardcoded placeholder values are returned.

**Expected vs Actual**:
- **Expected**: `InterventionService.get_progress()` calculates and returns real progress data.
- **Actual**: Command handler performs the calculation (wrong layer), then discards the results and returns hardcoded placeholders (`current_step: 1`, `completion_percentage: 0.0`).

**Impact**:
- Frontend always receives incorrect progress data (hardcoded 0%)
- Dead code in production creates maintenance confusion
- Business logic in wrong layer

**Proposed Fix**:
1. Implement `get_progress(intervention_id)` in `InterventionService`
2. Move the progress calculation logic into the service method
3. Remove dead code from the command handler
4. Command handler calls `intervention_service.get_progress()` and returns real data

**Acceptance Criteria**:
- [ ] `InterventionService` has a `get_progress()` method
- [ ] Command handler delegates to service (no calculation logic)
- [ ] No dead/unused variables in the command handler
- [ ] Real progress data returned to frontend
- [ ] Unit tests for `get_progress()` in the service

**Labels**: `backend`, `architecture`, `bug`, `tech-debt`

---

### Issue 6: Tag validation logic in commands/client.rs belongs in service/validation layer

**Title**: `[Architecture] Complex tag validation logic in commands/client.rs should be in service layer`

**Context**:
The `client_crud` command handler in `commands/client.rs` contains a complex tag validation loop (lines 76–94) that parses JSON, iterates over tags, sanitizes each one, and re-serializes them. While simple input validation in commands is acceptable, this multi-step JSON parse/validate/serialize pipeline is business logic.

**Expected vs Actual**:
- **Expected**: Command handler performs simple validation; complex multi-step validation pipelines are in `ValidationService` or `ClientService`.
- **Actual**: JSON parsing, iteration, per-tag sanitization, and re-serialization all happen in the command handler.

**Impact**:
- Tag validation logic cannot be reused (e.g., in import operations)
- Command handler is unnecessarily complex
- Inconsistent with how other fields are validated

**Proposed Fix**:
1. Add `validate_and_sanitize_tags(tags_json: &str) -> Result<String, String>` to `ValidationService`
2. Update `client_crud` to call the validation service method
3. Reduce command handler complexity

**Acceptance Criteria**:
- [ ] Tag validation logic in `ValidationService` or `ClientService`
- [ ] Command handler uses the service method for tag validation
- [ ] Existing tag validation behavior preserved
- [ ] Unit tests for tag validation logic

**Labels**: `backend`, `architecture`, `tech-debt`

---

### Issue 7: Duplicated authorization checks in intervention commands should be centralized

**Title**: `[Architecture] Duplicated authorization checks in intervention commands should be centralized`

**Context**:
The same authorization pattern is duplicated in multiple intervention command handlers across `data_access.rs` and `queries.rs`:
```rust
if intervention.technician_id.as_ref() != Some(&session.user_id)
    && !matches!(session.role, Admin | Supervisor) { ... }
```

This pattern appears at least 3 times across `intervention_get`, `intervention_get_step`, and `get_intervention_progress`.

**Expected vs Actual**:
- **Expected**: Authorization logic is centralized in a service or middleware method.
- **Actual**: Same authorization pattern copy-pasted across multiple command handlers.

**Impact**:
- DRY violation: authorization logic duplicated in 3+ locations
- Risk of inconsistent authorization if one copy is updated but others are not
- Harder to audit security when authorization is scattered

**Proposed Fix**:
1. Create `InterventionService::check_user_access(intervention, user_session) -> Result<(), AppError>` method
2. Or add `AuthMiddleware::can_access_intervention(intervention, session) -> bool`
3. Replace all duplicated checks with the centralized method

**Acceptance Criteria**:
- [ ] Single centralized method for intervention access checks
- [ ] All intervention command handlers use the centralized method
- [ ] No duplicated authorization logic
- [ ] Authorization behavior unchanged
- [ ] Unit tests for the centralized authorization method

**Labels**: `backend`, `architecture`, `security`, `tech-debt`

---

### Issue 8: Services layer pervasively bypasses repository layer for database access

**Title**: `[Architecture] 35+ service files directly access SQLite, bypassing repository layer`

**Context**:
The most systemic architecture violation in the codebase: over 35 service files import `rusqlite` and execute raw SQL queries directly, completely bypassing the repository layer. The repository layer exists (`src-tauri/src/repositories/`) but is largely underutilized.

**Affected services include**: `rate_limiter.rs`, `analytics.rs`, `audit_service.rs`, `auth.rs`, `calendar.rs`, `client_queries.rs`, `client_statistics.rs`, `dashboard.rs`, `geo.rs`, `intervention_data.rs`, `intervention_workflow.rs`, `material.rs`, `message.rs`, `operational_intelligence.rs`, `performance_monitor.rs`, `prediction.rs`, `security_monitor.rs`, `settings.rs`, `task.rs`, `task_creation.rs`, `task_deletion.rs`, `task_queries.rs`, `task_statistics.rs`, `task_update.rs`, `task_validation.rs`, `two_factor.rs`, `workflow_cleanup.rs`, `photo/*.rs`, `reports/*.rs`.

**Expected vs Actual**:
- **Expected**: Services call repository methods; repositories handle all SQL and database operations.
- **Actual**: Services import `rusqlite::{params, Connection}` and execute SQL directly.

**Impact**:
- SQL is scattered across 35+ files instead of being centralized in repositories
- Schema changes require updating dozens of files
- Services cannot be unit-tested without a real database
- Repository layer is architecturally dead in most areas
- Increases risk of SQL injection or inconsistent queries

**Proposed Fix**:
Phase this refactoring over multiple sprints:
1. **Sprint 1**: Route `task*.rs` services through `TaskRepository`
2. **Sprint 2**: Route `client*.rs` services through `ClientRepository`
3. **Sprint 3**: Route `intervention*.rs` services through `InterventionRepository`
4. **Sprint 4**: Create new repositories for remaining services (analytics, calendar, settings, etc.)

**Acceptance Criteria**:
- [ ] No `rusqlite` imports in service files (phased approach acceptable)
- [ ] All SQL queries in repository layer
- [ ] Services use repository interfaces for data access
- [ ] Existing functionality preserved at each phase
- [ ] Test coverage for new repository methods

**Labels**: `backend`, `architecture`, `tech-debt`

---

### Issue 9: UI-specific widget colors and configuration in services/analytics.rs

**Title**: `[Architecture] UI presentation logic (colors, widgets) in services/analytics.rs should be in frontend`

**Context**:
The `AnalyticsService` in `services/analytics.rs` creates dashboard widgets with hardcoded CSS color values (e.g., `"#3B82F6"`) and UI-specific widget configurations. This is presentation logic that belongs in the frontend.

**Expected vs Actual**:
- **Expected**: Service returns raw KPI data; frontend handles widget creation and styling.
- **Actual**: Service creates widget objects with hardcoded colors and UI layout properties.

**Impact**:
- UI changes (colors, widget layout) require modifying backend service code
- Backend service has unnecessary coupling to UI presentation concerns
- Frontend cannot independently customize dashboard appearance

**Proposed Fix**:
1. Service should return raw KPI/metrics data only
2. Move widget creation and color assignment to frontend components
3. Frontend can map KPI data to widgets with appropriate colors/layout

**Acceptance Criteria**:
- [ ] No hardcoded CSS colors in backend services
- [ ] Service returns structured KPI data without UI-specific properties
- [ ] Frontend handles widget creation and styling
- [ ] Dashboard functionality preserved

**Labels**: `backend`, `frontend`, `architecture`, `tech-debt`

---

### Issue 10: rate_limiter.rs service creates database tables via DDL

**Title**: `[Architecture] rate_limiter.rs creates tables with CREATE TABLE, bypassing migration system`

**Context**:
The `RateLimiterService` in `services/rate_limiter.rs` executes `CREATE TABLE IF NOT EXISTS login_attempts` DDL at runtime (lines 42–56), bypassing both the repository layer and the migration system.

**Expected vs Actual**:
- **Expected**: All schema changes go through migration files in `migrations/`. Services access data through repositories.
- **Actual**: Service creates tables at runtime using raw DDL SQL.

**Impact**:
- Schema defined outside migration system
- Table creation happens at unpredictable runtime points
- No migration rollback capability for this table
- Violates both layer architecture and migration system rules

**Proposed Fix**:
1. Create a proper migration for the `login_attempts` table in `migrations/`
2. Create `LoginAttemptRepository` for data access
3. Remove DDL from `RateLimiterService`
4. Service uses repository for CRUD operations

**Acceptance Criteria**:
- [ ] `login_attempts` table created via migration
- [ ] No `CREATE TABLE` in service code
- [ ] `LoginAttemptRepository` handles data access
- [ ] Service delegates to repository
- [ ] Migration tested with validate-migration-system.js

**Labels**: `backend`, `architecture`, `db`, `tech-debt`

---
