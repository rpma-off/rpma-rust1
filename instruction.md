﻿You are working inside the RPMA v2 repo (Tauri + Rust backend + Next.js frontend).
Goal: make the Inventory page stable and functional by fixing repeated IPC failures and the underlying backend errors.

Context (symptoms)
Frontend logs show repeated IPC failures (often amplified by React StrictMode double-invocation / effects):

inventory_get_stats → {"Internal":"An internal error occurred. Please try again."}
material_get_inventory_movement_summary → same internal
material_list_categories → same internal Stack mentions safeInvoke and hooks useInventoryStats.ts, useInventory.ts, and components like InventoryReports.tsx, InventorySettings.tsx.
The project uses the layered architecture + IPC pattern described in docs. :contentReference[oaicite:0]{index=0} :contentReference[oaicite:1]{index=1}

Hard constraints
Patch only what is needed to fix these Inventory IPC errors.
Keep existing UX/pages, don’t redesign.
Maintain RPMA architecture: Frontend → IPC Command → Service → Repo → SQLite. :contentReference[oaicite:2]{index=2}
Use typed IPC client (ipcClient) + safeInvoke patterns. :contentReference[oaicite:3]{index=3}
No breaking API changes unless absolutely required; if you must, update both Rust command + TS client types together.
Phase 1 — Reproduce + pinpoint the real backend failure
Find Inventory entry points:
frontend/src/app/inventory/**
Hooks: frontend/src/hooks/useInventory*.ts
Components: frontend/src/components/**/inventory* (or similar)
Locate the IPC calls:
inventory_get_stats
material_get_inventory_movement_summary
material_list_categories Identify where arguments are built (session token? filters? dates?).
In Rust, locate the corresponding Tauri commands:
Search in src-tauri/src/commands/** for those command names.
Verify they are registered in tauri::generate_handler![...] exactly (name must match). :contentReference[oaicite:4]{index=4}
Add/confirm backend logs that include:
correlation_id
user_id
operation name
full error chain (including DB errors) Ensure errors are not being swallowed into a generic “Internal” without actionable logs.
Deliverable: a short “root cause” note in-code as comments near the fix (not a separate doc).

Phase 2 — Fix backend causes (most likely)
For each failing command, do ALL of the following:

A) Validate auth + RBAC properly
Ensure commands use the expected auth/session validation (e.g., authenticate! macro / middleware patterns used elsewhere).
If Inventory is role-restricted, return a clear auth/forbidden error (not Internal), and ensure frontend handles it gracefully.
Confirm the frontend is passing sessionToken to protected commands. :contentReference[oaicite:5]{index=5}
B) Validate request payloads
If a command takes date ranges, pagination, optional filters, or ids:
add defensive validation and sane defaults
return a typed validation error (not Internal)
If the command expects garage_id / org_id but frontend is not providing it, fix the contract.
C) Fix repository queries + edge cases
Common SQLite/Rusqlite failure modes to check and patch:

Missing tables/columns due to migrations not applied (verify migrations for inventory/material).
NULL handling: SUM/COUNT returning NULL → map to 0.
Date parsing / timezone assumptions.
Empty result sets causing unwrap() panic.
Bad joins / filters that assume rows exist.
Concurrency / locked DB: ensure busy_timeout/WAL is set (project mentions it). :contentReference[oaicite:6]{index=6}
Patch requirements:

Replace any unwrap() / expect() in these call paths with proper error handling.
When computing stats, ensure default outputs:
counts = 0
totals = 0
arrays = []
Return ApiResponse<T> with a specific error type when possible.
D) Add targeted tests (backend)
Add unit/integration tests for:
inventory_get_stats with empty DB
material_list_categories with no categories
material_get_inventory_movement_summary with no movements
Tests should assert:
command/service returns success with defaults
no panic
correct shape of response
Phase 3 — Fix frontend call pattern to stop request storms
Even if backend is fixed, the logs show many repeated calls. Do:

A) Ensure hooks do not refetch in a loop
In useInventoryStats.ts and useInventory.ts:

Use React Query properly (or the project’s standard), with:
stable queryKey
enabled: !!sessionToken and any other required IDs
retry configured to avoid hammering on deterministic failures (e.g., 0–1 retries max for Internal)
refetchOnWindowFocus: false unless explicitly desired
Guard effect dependencies: no inline object literals in deps, memoize params.
B) Ensure StrictMode double-invoke doesn’t duplicate side effects
If you use useEffect to call IPC manually:
add an idempotency guard (e.g., useRef “didFetch”)
or migrate to React Query useQuery which is designed for this.
Ensure Inventory page mount does one fetch per dataset.
C) Improve UX on failure
When safeInvoke returns Internal:
show a single toast/banner (not repeated)
set an error state + “Retry” button
do not console.error spam in a loop
If unauthorized: redirect to login or show “session expired”.
Phase 4 — Contract + types sanity
Confirm TS types match Rust response models (don’t edit auto-generated frontend/src/lib/backend.ts manually). :contentReference[oaicite:7]{index=7}
If you change a Rust model/response:
regenerate types using the project scripts (e.g., npm run types:sync, then validate). :contentReference[oaicite:8]{index=8}
Ensure IPC domain module exists/used:
frontend/src/lib/ipc/domains/inventory.ts (or equivalent) should expose typed functions.
Acceptance criteria (must pass)
Opening /inventory no longer spams logs.
inventory_get_stats, material_list_categories, material_get_inventory_movement_summary succeed on an empty DB (returning default values).
If DB/migration is missing, error message is specific in backend logs and surfaced as a friendly UI error (no infinite retries).
Automated tests added and passing (backend + any minimal frontend tests if present).
Output format
Apply patches directly in the repo.
Keep changes minimal and localized.
Provide a final summary:
root cause(s)
files changed
how to verify manually (exact steps + what to expect)