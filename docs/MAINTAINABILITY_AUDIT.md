# RPMA v2 — Maintainability Audit Report

**Date:** 2026-02-23  
**Scope:** Full 10x maintainability audit across architecture, security, data, and frontend/backend alignment

---

## System Health Score: **62 / 100**

| Dimension | Score | Weight | Weighted |
|---|---|---|---|
| Architecture Stability | 7/10 | 15% | 10.5 |
| Bounded Context Integrity | 8/10 | 15% | 12.0 |
| IPC Contract Stability | 5/10 | 10% | 5.0 |
| Migration Safety | 4/10 | 10% | 4.0 |
| Error Handling Consistency | 6/10 | 10% | 6.0 |
| RBAC Correctness | 7/10 | 10% | 7.0 |
| Transaction Safety | 6/10 | 5% | 3.0 |
| Correlation Completeness | 7/10 | 5% | 3.5 |
| SQLite Performance | 7/10 | 5% | 3.5 |
| Domain Isolation | 8/10 | 10% | 8.0 |
| Frontend/Backend Drift | 5/10 | 5% | 2.5 |
| **Total** | | **100%** | **65.0** |

> Adjusted score: **62** (penalty for pre-existing compilation failures in interventions domain)

---

## Top 5 Architectural Risks

### 1. 🔴 Backend Compilation Failure — Interventions Domain (CRITICAL)

**Impact:** Blocks CI, prevents all Rust tests, blocks releases  
**Root Cause:** `intervention_workflow.rs` references undeclared types `RPMARequestLogger` and `LogDomain` (15 compile errors)  
**Risk:** This domain is the core PPF workflow — the entire value proposition of the app is broken at compile time  

**Recommendation:** Add missing imports to `src-tauri/src/domains/interventions/infrastructure/intervention_workflow.rs`:
```rust
use crate::shared::logging::{RPMARequestLogger, LogDomain};
```

### 2. 🔴 Frontend TypeScript Errors — 116 Type Errors (CRITICAL)

**Impact:** `tsc --noEmit` fails; type safety compromised across interventions and workflow domains  
**Root Cause:** Mismatch between Rust-generated types and frontend usage, especially around `steps` property on intervention union types and `JsonValue` incompatibilities  
**Affected files:**
- `domains/interventions/` (services, hooks, IPC) — 64 errors
- `domains/workflow/` (IPC, services) — 52 errors

**Recommendation:** Run `npm run types:sync` after fixing the backend, then resolve remaining type mismatches. This may indicate a breaking Rust model change was not followed by type regeneration.

### 3. 🟡 Unauthenticated WebSocket Commands — 9 Endpoints (HIGH)

**Impact:** Any frontend code can broadcast messages, shutdown the WebSocket server, or send arbitrary task/intervention/client updates without authentication  
**Affected file:** `src-tauri/src/commands/websocket_commands.rs`  
**Endpoints:** `init_websocket_server`, `broadcast_websocket_message`, `send_websocket_message_to_client`, `get_websocket_stats`, `shutdown_websocket_server`, `broadcast_task_update`, `broadcast_intervention_update`, `broadcast_client_update`, `broadcast_system_notification`

**Recommendation:** Add `session_token` parameter and `authenticate!` macro call with appropriate role checks (Admin for server management, authenticated user for broadcasts).

### 4. 🟡 Migration System Validation Score: 10/100 (HIGH)

**Impact:** Missing npm scripts for migration testing, health checks, performance analysis, and schema drift detection. No automated validation pipeline.  
**Details:**
- `npm run migration:test` — missing
- `npm run migration:health-check` — missing
- `npm run migration:performance-analyze` — missing
- `npm run schema:drift-detect` — missing
- 6 required infrastructure files not found
- Results directory does not exist

**Recommendation:** Define the missing npm scripts in `package.json` pointing to existing scripts in `scripts/`, or create lightweight stubs. The migration audit itself passes (0 legacy items), so the SQL content is healthy — it's the tooling that needs wiring.

### 5. 🟡 Circular Dependencies in Tasks Domain (MEDIUM)

**Impact:** Fragile module loading, potential runtime errors, unclear dependency direction  
**Pattern:** `tasks/api/index.ts` → `shared/hooks/useAutoSave` → `tasks/services` (was circular before this audit)  
**Status:** ✅ **FIXED** in this audit — `useWorkflowStepAutoSave` moved out of shared layer into tasks domain where it belongs  

---

## Patches Applied in This Audit

### Patch 1: Architecture Check Script Crash Fix
**File:** `scripts/architecture-check.js`  
**Issue:** Script crashed with `ENOENT` when `src-tauri/src/services/` directory didn't exist  
**Fix:** Added `fs.existsSync()` guards before scanning legacy directories  

### Patch 2: Shared Layer Contamination Removal
**File:** `frontend/src/shared/hooks/useAutoSave.ts`  
**Issue:** Shared hook imported `taskService` from tasks domain, violating layer independence  
**Fix:** Removed domain-specific `useWorkflowStepAutoSave` function and `taskService` import from shared layer. The proper implementation already existed in `domains/tasks/hooks/useWorkflowStepAutoSave.ts`.

### Patch 3: Cross-Domain Import Violations (11 violations → 0)
**Files:**
- `domains/analytics/hooks/useDashboardDataQuery.ts` — `@/domains/tasks/services` → `@/domains/tasks`
- `domains/workflow/components/CalendarDashboard.tsx` — 4 internal calendar imports consolidated to `@/domains/calendar` public API
- `domains/workflow/server/index.ts` — `@/domains/tasks/services` → `@/domains/tasks`
- `domains/tasks/server/index.ts` — `@/domains/documents/services` → `@/domains/documents`

### Patch 4: System Command Authentication (Security Fix)
**File:** `src-tauri/src/commands/system.rs`  
**Issue:** `diagnose_database`, `force_wal_checkpoint`, `get_database_stats` were accessible without authentication  
**Fix:** Added `session_token` parameter and `authenticate!` macro with Admin role requirement  
**Frontend:** Updated all IPC call sites to pass session token:
- `frontend/src/domains/admin/ipc/admin.ipc.ts`
- `frontend/src/lib/ipc/client.ts`
- `frontend/src/lib/ipc/domains/system.ts`
- `frontend/src/lib/ipc/mock/mock-client.ts`
- `frontend/src/lib/tauri/ipc.ts`
- `frontend/src/app/admin/page.tsx`

### Patch 5: Test Updates
**Files:**
- `frontend/src/lib/ipc/__tests__/system-ipc-contract.test.ts` — Updated to verify session token passing
- `frontend/src/hooks/useAutoSave.test.ts` — Updated imports to match new module structure

---

## Detailed Dimension Analysis

### Architecture Stability (7/10)
- ✅ Clean 4-layer architecture (IPC → Application → Infrastructure → Domain)
- ✅ 14 properly structured bounded contexts with facade pattern
- ✅ Architecture check script now passes (was crashing)
- ⚠️ 133 known violations tracked in allowlist (progressive migration)
- ❌ Legacy `commands/` directory still contains domain-specific logic

### Bounded Context Integrity (8/10)
- ✅ All 20 frontend domains have complete public APIs
- ✅ No cross-domain internal imports (after fixes)
- ✅ No circular dependencies
- ✅ No legacy `@/lib/services` or `@/lib/ipc/domains` imports
- ✅ Shared layer independence verified
- ⚠️ `workflow` domain is essentially a proxy for `tasks` domain — consider merging

### IPC Contract Stability (5/10)
- ✅ Commands map cleanly to Tauri handlers
- ❌ 116 TypeScript errors indicate type drift between Rust models and generated types
- ❌ No automated IPC contract testing beyond manual test files
- ⚠️ Mixed error return types (`String` vs `AppError`) across commands

### Migration Safety (4/10)
- ✅ 39 numbered migrations with proper sequencing
- ✅ Migration audit passes (0 legacy items)
- ❌ Validation system scores 10/100 due to missing tooling scripts
- ❌ No automated migration testing in CI
- ⚠️ No schema drift detection enabled

### Error Handling Consistency (6/10)
- ✅ Comprehensive `AppError` enum with 12+ variants
- ✅ Error sanitization for frontend (server errors don't leak internals)
- ⚠️ System commands previously returned `Result<_, String>` — now fixed for protected ones
- ⚠️ `health_check`, `get_device_info`, `get_app_info` still return `Result<_, String>`

### RBAC Correctness (7/10)
- ✅ 4 roles defined: Admin, Supervisor, Technician, Viewer
- ✅ `authenticate!` macro used consistently in domain IPC handlers
- ✅ System commands now require Admin role (after fix)
- ❌ WebSocket commands (9) remain unauthenticated
- ❌ IPC optimization commands (6) remain unauthenticated
- ❌ Navigation commands (7) remain unauthenticated

### Transaction Safety (6/10)
- ✅ SQLite WAL mode enabled for concurrent reads
- ✅ Force WAL checkpoint available (now admin-only)
- ⚠️ No explicit transaction boundaries visible in application services
- ⚠️ `spawn_blocking` pattern used for DB access (correct for SQLite)

### Correlation Completeness (7/10)
- ✅ `correlation_id` parameter on most commands
- ✅ `init_correlation_context` called consistently
- ✅ `update_correlation_context_user` added after authentication
- ⚠️ Some commands only use correlation for tracing, not for audit trail

### SQLite Performance (7/10)
- ✅ WAL mode, connection pooling via r2d2
- ✅ Migration 039 adds foreign key indexes
- ✅ Database diagnostics and stats available
- ⚠️ No query performance monitoring or slow query logging
- ⚠️ No explicit PRAGMA optimization beyond WAL

### Domain Isolation (8/10)
- ✅ Backend domains follow strict DDD boundaries
- ✅ Frontend domains use public API pattern (`api/index.ts`)
- ✅ Cross-domain communication via event bus (backend)
- ✅ All cross-domain import violations fixed
- ⚠️ `workflow` domain is tightly coupled to `tasks` domain

### Frontend/Backend Drift (5/10)
- ❌ 116 TypeScript errors indicate significant type drift
- ❌ `npm run types:sync` likely not run after recent Rust changes
- ⚠️ Some IPC commands have parameter mismatches (pre-existing)
- ✅ `types:drift-check` tool exists for validation

---

## Refactor Roadmap

### Short-Term (1–2 Sprints)

| Priority | Item | Effort |
|---|---|---|
| P0 | Fix interventions domain compilation (add missing imports) | 1h |
| P0 | Run `npm run types:sync` to regenerate TypeScript types | 1h |
| P0 | Fix remaining 116 TypeScript errors in interventions/workflow | 1–2d |
| P1 | Add auth to WebSocket commands (9 endpoints) | 4h |
| P1 | Wire missing migration npm scripts | 2h |
| P1 | Standardize error return types (`AppError` everywhere) | 4h |
| P2 | Add auth to IPC optimization commands (6 endpoints) | 2h |

### Long-Term (1–3 Months)

| Priority | Item | Effort |
|---|---|---|
| P1 | Merge `workflow` domain into `tasks` or define clear boundary | 1w |
| P1 | Add IPC contract testing (auto-generated from Rust types) | 1w |
| P1 | Implement migration CI pipeline with automated testing | 3d |
| P2 | Add SQLite query performance monitoring | 3d |
| P2 | Progressive reduction of 133 architecture allowlist violations | Ongoing |
| P2 | Add transaction boundary documentation and enforcement | 1w |
| P3 | Extract cross-cutting concerns from legacy `commands/` directory | 2w |
| P3 | Add schema drift detection to CI pipeline | 2d |

---

## Validation Results After Audit

| Check | Before | After |
|---|---|---|
| `npm run architecture:check` | ❌ CRASH | ✅ PASS (133 allowlisted) |
| `npm run validate:bounded-contexts` | ❌ 11 errors | ✅ PASS (0 errors) |
| `npm run frontend:lint` | ❌ 3 errors | ⚠️ 0 errors (19 warnings) |
| System command auth | ❌ 3 unprotected | ✅ All protected (Admin) |
| Shared layer independence | ❌ tasks import | ✅ Clean |
| Cross-domain imports | ❌ 11 violations | ✅ 0 violations |
