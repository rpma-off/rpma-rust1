# RPMA v2 — Maintainability Audit Report

**Date:** 2026-03-08
**Scope:** Full codebase — frontend, IPC, application, domain, infrastructure, migrations, scripts/CI
**Method:** Static analysis, file metrics, pattern detection, cross-layer consistency checks

---

## Executive Summary

| Zone | Score /10 | Trend | Top Risk |
|------|-----------|-------|----------|
| **Frontend** | 6.0 | ⚠️ Declining | God-object IPC client (1,680 LOC), 73 files > 300 lines |
| **IPC** | 5.5 | ⚠️ Mixed | Inconsistent return types, 3 auth patterns, fat handlers |
| **Application** | 7.0 | ⚠️ At Risk | `quote_service.rs` (754 LOC, 22 functions) |
| **Domain** | 6.5 | ⚠️ Declining | rusqlite in 7+ domain models violates no-I/O rule |
| **Infrastructure** | 6.0 | ⚠️ Declining | 10+ repository files > 700 LOC, monolithic SQL |
| **Migrations** | 8.0 | ✅ Good | Minimal issues, well-organized |
| **Scripts / CI** | 8.5 | ✅ Good | Comprehensive quality gates already in place |

**Overall Maintainability: 6.5/10** — The architecture is sound (DDD, bounded contexts, clean layering) but implementation has accumulated debt: oversized files, inconsistent contracts, duplicated patterns, and incomplete migration from legacy to domain structure.

---

## Zone 1 — Frontend (Score: 6.0/10)

**Total:** ~124,600 LOC across 755+ files | 18 domains | 73 files > 300 lines

### Problems Found

#### F-01: God-Object IPC Client
- **File:** `frontend/src/lib/ipc/client.ts` — **1,680 lines**, 114+ exported methods
- **Impact:** Cannot tree-shake, hard to test in isolation, creates implicit coupling to every domain, discourages adoption of domain-specific IPC wrappers
- **Evidence:** 4+ files still import directly from this legacy client
- **Patch:** Split into 10 domain-aligned modules (~150 LOC each), re-export from barrel for backward compatibility, then deprecate barrel
- **Effort:** 2–3 days
- **Regression Risk:** Low (functional behavior unchanged, only file organization)
- **Gain:** Testability, bundle optimization, clear ownership per domain

#### F-02: Oversized Components / Hooks
- **Files:**
  - `useNewQuotePage.ts` — 19 `useState` calls (should be `useReducer`)
  - `useQuotesCrud.ts` — 15 `useState` calls
  - `WorkflowProvider.tsx` — 692 lines (mixed business logic + rendering)
  - `PerformanceTab.tsx` — 669 lines
  - `backend-type-guards.ts` — 1,364 lines (monolithic)
  - `mock-db.ts` — 1,235 lines (test mock, but still costly)
- **Impact:** Hard to reason about, hard to test, high cost of change, merge conflicts
- **Patch:** Extract state into `useReducer` for hooks with > 8 `useState`; split components > 500 lines by concern (data vs. presentation)
- **Effort:** 3–5 days (incremental, per-file)
- **Regression Risk:** Medium (behavior-preserving refactors, but UI regressions possible)
- **Gain:** 40–60% reduction in cognitive load per file, better testability

#### F-03: Naming Convention Inconsistencies
- **Evidence:** In `frontend/src/components/`: 9 PascalCase, 45 camelCase, 16 kebab-case
- **Impact:** Developer friction, harder to find components, inconsistent auto-imports
- **Patch:** Rename to PascalCase (React convention); add ESLint filename rule
- **Effort:** 1 day (automated rename + import fixup)
- **Regression Risk:** Low (file renames only, no logic change)
- **Gain:** Consistent developer experience, fewer onboarding questions

#### F-04: Tasks Domain Complexity
- **Evidence:** `tasks` domain = 21,909 LOC (31% of all domain code)
- **Impact:** High cognitive load, long CI times for related changes, merge conflicts
- **Patch:** Identify sub-domain boundaries (task CRUD, task workflow, task photos, task rules) and split
- **Effort:** 5–8 days
- **Regression Risk:** Medium (requires careful import path migration)
- **Gain:** Faster development cycles, parallel team work, clearer ownership

#### F-05: Dual IPC Layer (Legacy + Domain)
- **Evidence:** Legacy `lib/ipc/client.ts` used by 4+ files alongside new domain-specific `domains/*/ipc/*.ipc.ts` wrappers
- **Impact:** Two sources of truth for mutations, risk of cache invalidation bugs, confusion on which to use
- **Patch:** Complete migration of remaining 4 consumers to domain IPC wrappers; then deprecate and eventually remove legacy client
- **Effort:** 1–2 days
- **Regression Risk:** Low (both layers already call the same backend commands)
- **Gain:** Single source of truth, simpler mental model

---

## Zone 2 — IPC Layer (Score: 5.5/10)

**Total:** ~8,888 LOC (backend IPC) + ~3,144 LOC (legacy commands) | 34 domain IPC files + 13 legacy command files

### Problems Found

#### I-01: Inconsistent Return Types
- **Evidence:**
  - Domain IPC: mostly `Result<ApiResponse<T>, AppError>` (~90%)
  - Calendar: returns `Result<CommandContext, AppError>` (non-standard)
  - Sync/Queue: returns `Result<T, String>` (loses error context)
  - Legacy commands: mix of `Result<T, String>`, `Result<T, Box<dyn Error>>`, `Result<ApiResponse<T>, AppError>`
- **Impact:** Frontend must handle 3+ error shapes, debugging is harder, type safety gaps
- **Patch:** Standardize all handlers to `Result<ApiResponse<T>, AppError>`; add CI check via `ipc-consistency-check.js`
- **Effort:** 2–3 days
- **Regression Risk:** Medium (changing error types requires updating callers)
- **Gain:** Uniform error handling, simpler frontend extraction, better error reporting

#### I-02: Inconsistent Authentication Patterns
- **Evidence:**
  - 6 files use `authenticate!` macro (proper pattern)
  - 7 files use direct `validate_session()` (low-level, inconsistent)
  - 1 file (`audit/security.rs`) uses **both** patterns
- **Impact:** Security audit complexity, risk of missing auth on new endpoints, inconsistent correlation IDs
- **Patch:** Standardize on `authenticate!` macro; update `security.rs` to use single pattern
- **Effort:** 1–2 days
- **Regression Risk:** Low (macro wraps the same validation)
- **Gain:** Consistent security posture, easier auditing, less code

#### I-03: Fat IPC Handlers (Business Logic Leakage)
- **Evidence:**
  - `quotes/ipc/quote.rs` — **853 lines**, 23 functions
  - `inventory/ipc/material.rs` — **799 lines**
  - `tasks/ipc/facade.rs` — **635 lines**
  - `clients/ipc/client.rs` — **536 lines**
- **Impact:** Violates "thin handler" architecture rule, business logic duplicated between IPC and application layers, harder to unit test
- **Patch:** Extract business logic to application services; IPC handlers should be < 200 lines (route → validate → delegate → respond)
- **Effort:** 4–6 days (incremental, per-domain)
- **Regression Risk:** Medium (requires integration test validation per domain)
- **Gain:** Proper layering, testable business logic, easier review

#### I-04: Legacy Command Migration Incomplete
- **Evidence:** 13 legacy command files under `commands/` including `log.rs`, `navigation.rs`, `system.rs`, `performance.rs`, `ui.rs`
- **Impact:** Two architectures coexist, newcomers confused about where to add new commands
- **Patch:** Migrate utility commands to a `system` or `infra` domain; keep websocket as cross-cutting concern
- **Effort:** 2–3 days
- **Regression Risk:** Low (wrapper migration, same behavior)
- **Gain:** Single architecture pattern, clearer codebase entry points

---

## Zone 3 — Application Layer (Score: 7.0/10)

**Total:** Moderate size, well-layered | Main concern: a few oversized services

### Problems Found

#### A-01: Quote Service God-Object
- **File:** `domains/quotes/application/quote_service.rs` — **754 lines**, 22 functions
- **Impact:** Single class owns create, update, delete, status transitions, calculations, PDF generation orchestration — SRP violation
- **Patch:** Split into focused services:
  - `QuoteCrudService` (create, get, update, delete, duplicate)
  - `QuoteWorkflowService` (status transitions: sent, accepted, rejected, expired)
  - `QuoteCalculationService` (pricing, totals, tax)
- **Effort:** 3–4 days
- **Regression Risk:** Medium (must verify all callers use correct service)
- **Gain:** Focused responsibilities, easier testing, parallel development

#### A-02: Task Command Service Size
- **File:** `domains/tasks/application/task_command_service.rs` — **520 lines**
- **Impact:** Growing toward god-object territory, complex orchestration
- **Patch:** Monitor; split if it exceeds 600 lines. Consider extracting task-workflow operations
- **Effort:** 2 days (when needed)
- **Regression Risk:** Low
- **Gain:** Preventive maintenance

#### A-03: Input Validation Duplication
- **Evidence:**
  - Backend: validation in `domains/*/application/input_validation.rs`
  - Frontend: Zod schemas in `lib/validation/`
  - Same rules (email, phone, name length) defined independently
- **Impact:** Drift between frontend and backend validation; user sees different errors depending on where validation triggers
- **Patch:** Backend is source of truth; frontend validation should be a convenience layer that mirrors backend rules. Add shared validation constants file, or generate frontend schemas from backend
- **Effort:** 3–5 days
- **Regression Risk:** Low (additive change, doesn't remove existing validation)
- **Gain:** Consistent user experience, single source of truth for business rules

---

## Zone 4 — Domain Layer (Score: 6.5/10)

**Total:** Domain models across 14 bounded contexts | Clean DDD structure but with I/O leakage

### Problems Found

#### D-01: rusqlite in Domain Models (ADR-002 Violation)
- **Files affected (7+):**
  - `calendar/domain/models/calendar.rs` — imports `rusqlite`
  - `calendar/domain/models/calendar_event.rs` — imports `rusqlite`
  - `clients/domain/models/client.rs` — imports `rusqlite`
  - `documents/domain/models/photo.rs` — imports `rusqlite`
  - `interventions/domain/models/step.rs` — imports `rusqlite`
  - `interventions/domain/models/intervention.rs` — imports `rusqlite`
  - `inventory/domain/models/material.rs` — imports `rusqlite` (927 lines with 5 `from_row` impls)
- **Impact:** Domain layer is coupled to persistence technology; cannot test business logic without database; violates ADR-002 (transaction boundaries) and the "domain has no I/O" rule
- **Patch:** Move `from_row()` / `ToSql` implementations to infrastructure-layer mapper structs (e.g., `MaterialMapper`, `CalendarEventMapper`). Domain models stay pure.
- **Effort:** 4–6 days (systematic, per-domain)
- **Regression Risk:** Medium (must ensure all repository code uses mappers)
- **Gain:** Pure domain layer, unit-testable business rules, database-agnostic models

#### D-02: Oversized Domain Models
- **Evidence:**
  - `material.rs` — **927 lines** (5 `from_row` implementations, mixed concerns)
  - `task.rs` — **705 lines**
  - `intervention.rs` — **552 lines**
  - `quote.rs` — **501 lines**
  - `notification.rs` — **492 lines**
- **Impact:** Models contain persistence logic, validation, conversion, and business rules all mixed together
- **Patch:** Extract:
  - Persistence logic → infrastructure mappers
  - Validation → value objects or validators
  - Conversion → dedicated converter modules
- **Effort:** 3–5 days
- **Regression Risk:** Medium
- **Gain:** Single-responsibility models, smaller files, testable units

#### D-03: Implicit Cross-Domain Coupling
- **Evidence:** Cross-domain `use crate::domains::` imports detected in application/infrastructure layers (expected for orchestration, but needs monitoring)
- **Impact:** Risk of circular dependencies, harder to extract domains as independent modules
- **Patch:** Audit cross-domain imports; introduce domain events (ADR-004) for async communication between domains
- **Effort:** 5–8 days (long-term)
- **Regression Risk:** Low (additive pattern)
- **Gain:** Decoupled domains, easier independent deployment, clearer boundaries

---

## Zone 5 — Infrastructure Layer (Score: 6.0/10)

**Total:** ~37,738 LOC (31% of backend) | Repositories are the largest files in the codebase

### Problems Found

#### INF-01: Monolithic Repositories
- **Evidence (10+ files > 700 LOC):**
  - `report_view_model.rs` — **1,297 lines**
  - `report_pdf.rs` — **1,124 lines**
  - `calendar.rs` — **942 lines**
  - `message_repository.rs` — **894 lines**
  - `intervention_repository.rs` — **894 lines**
  - `quote_repository.rs` — **893 lines**
  - `client_repository.rs` — **819 lines**
  - `photo_repository.rs` — **767 lines**
  - `task_rules_repository.rs` — **750 lines**
  - `notification_repository.rs` — **704 lines**
- **Impact:** Hard to navigate, long review cycles, merge conflicts, high cognitive load
- **Patch:** Split by operation type:
  - `*_read_repository.rs` (queries, projections)
  - `*_write_repository.rs` (mutations, transactions)
  - Or by sub-entity (e.g., `task_photo_repository.rs`, `task_rules_repository.rs`)
- **Effort:** 3–5 days per repository
- **Regression Risk:** Medium (must verify all callers)
- **Gain:** 50% reduction in file size, parallel development, clearer ownership

#### INF-02: SQL Duplication
- **Evidence:** 53 instances of `SELECT * FROM` across 21 infrastructure files
- **Impact:** Column changes require updating multiple queries, risk of missing updates, performance (fetching unnecessary columns)
- **Patch:** Use explicit column lists; extract shared query fragments into constants or builder helpers
- **Effort:** 3–5 days
- **Regression Risk:** Low (query behavior unchanged if columns match)
- **Gain:** Explicit contracts, easier column migration, potential performance improvement

#### INF-03: Report Generation Complexity
- **Evidence:** `report_view_model.rs` (1,297 lines) + `report_pdf.rs` (1,124 lines) = 2,421 lines for reports
- **Impact:** Any report change requires understanding 2,400+ lines, high test cost
- **Patch:** Extract report sections into composable builders (header, body, footer, calculations)
- **Effort:** 4–6 days
- **Regression Risk:** Medium (PDF output must be verified visually)
- **Gain:** Composable reports, easier to add new report types

---

## Zone 6 — Migrations (Score: 8.0/10)

**Total:** 52 migration files, 1,923 LOC | Well-organized, reasonable sizes

### Problems Found

#### M-01: Largest Migrations Approaching Complexity Limit
- **Evidence:**
  - `023_add_messaging_tables.sql` — 146 lines
  - `025_add_analytics_dashboard.sql` — 140 lines
  - `024_add_inventory_management.sql` — 121 lines
- **Impact:** Complex migrations are harder to review and debug
- **Patch:** No immediate action; establish 100-line soft limit for future migrations, split complex ones into sequential files
- **Effort:** Policy change only
- **Regression Risk:** None
- **Gain:** Easier rollback, incremental schema evolution

#### M-02: Dual Migration Locations
- **Evidence:** 10 files in `migrations/` (root) + 52 files in `src-tauri/migrations/`
- **Impact:** Confusion about which location to use for new migrations
- **Patch:** Document canonical location; consider consolidating if root migrations are legacy
- **Effort:** 0.5 day
- **Regression Risk:** None
- **Gain:** Clarity for contributors

---

## Zone 7 — Scripts / CI (Score: 8.5/10)

**Total:** 41 scripts, 7,559 LOC | Comprehensive quality gates

### Problems Found

#### S-01: Large Audit Scripts
- **Evidence:**
  - `maintainability-audit.js` — 641 lines
  - `architecture-check.js` — 553 lines
  - `validate-bounded-contexts.js` — 544 lines
  - `ipc-production-gate.js` — 520 lines
- **Impact:** Scripts themselves becoming hard to maintain
- **Patch:** Extract shared utilities (file scanning, reporting) into a `scripts/lib/` directory
- **Effort:** 1–2 days
- **Regression Risk:** Low
- **Gain:** DRY scripts, easier to add new quality checks

#### S-02: Script Functionality Overlap
- **Evidence:** Both `architecture-check.js` and `backend-architecture-check.js` check architecture; `boundary-coverage-report.js` and `boundary-coverage-enforce.js` overlap
- **Impact:** Confusion about which to run, potential inconsistent results
- **Patch:** Merge overlapping scripts or clearly document their distinct purposes
- **Effort:** 1 day
- **Regression Risk:** Low
- **Gain:** Simpler CI pipeline, clearer quality gate responsibilities

---

## Cross-Cutting Findings

### CC-01: Error Contract Heterogeneity
- **Backend IPC:** 3 patterns (`Result<ApiResponse<T>, AppError>`, `Result<T, String>`, `Result<T, Box<dyn Error>>`)
- **Frontend extraction:** Must handle multiple error shapes
- **AppError:** 22 well-designed variants exist but aren't uniformly used
- **Fix:** Enforce `Result<ApiResponse<T>, AppError>` for all IPC handlers; add CI lint

### CC-02: Scattered Configuration Values
- **Evidence:** 59 files with hardcoded timeout/retry values across frontend IPC layer
- **Fix:** Centralize in a config module, import everywhere

### CC-03: Test Coverage Asymmetry
- **Backend:** All domains have tests ✅ (2,994 LOC domain tests + 2,683 LOC integration tests)
- **Frontend:** 20 of 97 frontend test suites failing (pre-existing, not caused by recent changes) — **120 failing tests out of 461 total frontend tests**
- **Fix:** Triage and fix the 20 failing suites; establish test health baseline

---

## Maintainability Score Summary

| Zone | Score | Key Metric | Primary Debt |
|------|-------|-----------|--------------|
| Frontend | 6.0 | 73 files > 300 LOC | God-object IPC client, oversized hooks |
| IPC | 5.5 | 3 return type patterns | Fat handlers, inconsistent auth |
| Application | 7.0 | 1 god-service (754 LOC) | Quote service SRP violation |
| Domain | 6.5 | 7 models with rusqlite | I/O in domain, oversized models |
| Infrastructure | 6.0 | 10 repos > 700 LOC | Monolithic repositories, SQL duplication |
| Migrations | 8.0 | 52 files, clean | Minor: dual locations |
| Scripts / CI | 8.5 | 41 scripts, comprehensive | Minor: script overlap |
| **Overall** | **6.5** | | |

---

## Structural Simplification Roadmap

### Phase 1 — Quick Wins (Week 1–2, Low Risk)

| # | Action | Files | Effort | Gain |
|---|--------|-------|--------|------|
| 1 | Standardize IPC return types to `Result<ApiResponse<T>, AppError>` | ~15 handlers | 2d | Uniform error handling |
| 2 | Standardize auth to `authenticate!` macro everywhere | ~7 files | 1d | Consistent security |
| 3 | Complete legacy IPC client migration (4 remaining consumers) | 4 files | 1d | Single IPC pattern |
| 4 | Add CI rule: max 600 LOC per non-test file | 1 script | 0.5d | Prevent future bloat |
| 5 | Document canonical migration location | 1 doc | 0.5d | Contributor clarity |

### Phase 2 — Strategic Refactoring (Week 3–6, Medium Risk)

| # | Action | Files | Effort | Gain |
|---|--------|-------|--------|------|
| 6 | Split `lib/ipc/client.ts` into domain modules | 1 → 10 files | 3d | Testability, bundle size |
| 7 | Extract `from_row()`/`ToSql` from domain models to infrastructure mappers | 7 domain models | 5d | Pure domain layer |
| 8 | Split `quote_service.rs` into 3 focused services | 1 → 3 files | 3d | SRP, testability |
| 9 | Refactor `useNewQuotePage.ts` (19 useState → useReducer) | 1 file | 1d | Reduced complexity |
| 10 | Split top 5 repositories (> 800 LOC) into read/write | 5 → 10 files | 5d | Parallel development |

### Phase 3 — Deep Cleanup (Week 7–10, Higher Risk)

| # | Action | Files | Effort | Gain |
|---|--------|-------|--------|------|
| 11 | Extract business logic from fat IPC handlers | 4 IPC files | 5d | Clean layering |
| 12 | Split tasks frontend domain into sub-domains | ~50 files | 8d | Manageable domain size |
| 13 | Deduplicate SQL patterns (53 `SELECT *` → explicit columns) | 21 infra files | 4d | Explicit contracts |
| 14 | Consolidate frontend validation with backend rules | validation files | 4d | Single source of truth |
| 15 | Decompose report generation (2,421 LOC → composable builders) | 2 files | 5d | Composable reports |

### Phase 4 — Prevention (Ongoing)

| # | Action | Type | Effort | Gain |
|---|--------|------|--------|------|
| 16 | CI enforcement: file size limits | Script | 0.5d | Prevent regression |
| 17 | CI enforcement: `Result<T, String>` ban in IPC | Clippy rule | 0.5d | Type-safe errors |
| 18 | CI enforcement: no rusqlite in `*/domain/*` | Script | 0.5d | Architecture guard |
| 19 | Rename camelCase/kebab-case components to PascalCase | 61 files | 1d | Naming consistency |
| 20 | Fix 20 pre-existing failing frontend test suites | 20 suites | 5d | Test reliability |

---

## Total Estimated Effort

| Phase | Duration | Risk | Coverage |
|-------|----------|------|----------|
| Phase 1 — Quick Wins | 5 days | Low | Error contracts, auth, CI guards |
| Phase 2 — Strategic Refactoring | 17 days | Medium | God-objects, domain purity, SRP |
| Phase 3 — Deep Cleanup | 26 days | Medium-High | Fat handlers, SQL, validation, reports |
| Phase 4 — Prevention | 7.5 days | Low | CI enforcement, naming, test health |
| **Total** | **~55.5 days** | | **Full structural simplification** |

**Recommended team allocation:** 1–2 engineers, spread across 3 months alongside feature work. Each phase is independently valuable — no need to complete all phases before seeing ROI.

---

## Appendix A — Files Requiring Immediate Attention

| File | LOC | Issue | Priority |
|------|-----|-------|----------|
| `frontend/src/lib/ipc/client.ts` | 1,680 | God-object, 114+ methods | 🔴 Critical |
| `src-tauri/src/domains/quotes/ipc/quote.rs` | 853 | Fat IPC handler, 23 functions | 🔴 Critical |
| `src-tauri/src/domains/inventory/ipc/material.rs` | 799 | Fat IPC handler | 🔴 Critical |
| `src-tauri/src/domains/quotes/application/quote_service.rs` | 754 | God-service, 22 functions | 🟡 High |
| `src-tauri/src/domains/inventory/domain/models/material.rs` | 927 | rusqlite in domain, 5 from_row | 🟡 High |
| `src-tauri/src/domains/tasks/domain/models/task.rs` | 705 | Oversized domain model | 🟡 High |
| `src-tauri/src/domains/reports/infrastructure/report_view_model.rs` | 1,297 | Monolithic report builder | 🟡 High |
| `src-tauri/src/domains/reports/infrastructure/report_pdf.rs` | 1,124 | Monolithic PDF generator | 🟡 High |
| `frontend/src/domains/quotes/hooks/useNewQuotePage.ts` | ~400 | 19 useState calls | 🟡 High |
| `frontend/src/lib/validation/backend-type-guards.ts` | 1,364 | Monolithic type guard | 🟢 Medium |

## Appendix B — Architecture Violations Detected

| Violation | ADR | Count | Severity |
|-----------|-----|-------|----------|
| rusqlite imports in domain models | ADR-002 | 7 files | 🔴 Critical |
| Business logic in IPC handlers | ADR-005 | 4 files | 🔴 Critical |
| `Result<T, String>` in IPC (vs `AppError`) | ADR-003 | 20+ handlers | 🟡 High |
| Mixed auth patterns (`authenticate!` vs direct) | ADR-006 | 7 files | 🟡 High |
| Cross-domain imports (monitoring needed) | ADR-001 | Detected | 🟢 Medium |

## Appendix C — Positive Patterns to Preserve

| Pattern | Location | Value |
|---------|----------|-------|
| Domain-specific IPC wrappers | `domains/*/ipc/*.ipc.ts` | Clean abstraction |
| Data freshness / mutation signaling | `lib/data-freshness.ts` | Consistent cache invalidation |
| 14 Architecture Decision Records | `docs/adr/` | Documentation culture |
| 41 quality scripts | `scripts/` | Automated enforcement |
| All backend domains have tests | `domains/*/tests/` | Coverage culture |
| Zero TODO/FIXME in codebase | Everywhere | Clean code discipline |
| 100% snake_case in Rust files | `src-tauri/src/` | Naming discipline |
| Centralized `IPC_COMMANDS` enum | Frontend IPC | Single command registry |
| `AppError` with 22 variants | `shared/ipc/errors.rs` | Well-designed error taxonomy |
| `safeInvoke()` wrapper | `lib/ipc/utils.ts` | Unified frontend error handling |
