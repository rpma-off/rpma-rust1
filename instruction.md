﻿You are working inside the RPMA v2 repository (Tauri + Rust backend + Next.js frontend + SQLite WAL).
Goal: Determine if the bounded-contexts migration + cleanup is COMPLETE and ENFORCED.
If anything is missing or still “half-migrated”, FIX it in patch mode and keep the build green.

Hard rules:
- Do NOT rename any existing IPC command names used by the frontend (backward compatible).
- Do NOT introduce online services/payments/sync beyond what already exists (offline-first).
- End state must pass: `npm run quality:check` and `cargo test`.

## 0) Run the guardrails first (baseline truth)
1) `npm run quality:check`
   - Capture any failures from: validate:bounded-contexts, architecture:check, lint, typecheck, clippy, fmt.
2) `cd src-tauri && cargo test`

If any step fails → patch until green.

## 1) Backend structure completeness (per-domain)
For EACH domain under `src-tauri/src/domains/<domain>/`, verify it contains:
- `mod.rs` (single public facade export)
- optional `facade.rs`
- `application/`, `domain/`, `infrastructure/`, `ipc/`, `tests/`

Patch if missing:
- Create missing folders/files.
- Move code into the right layer (no business logic in ipc, no SQL in application/domain).

## 2) Shims cleanup (commands/services/repositories)
Verify the “legacy” folders are ONLY compatibility shims:
- `src-tauri/src/commands/*` should re-export canonical handlers from `domains/*/ipc/*`
- `src-tauri/src/services/*` and `src-tauri/src/repositories/*` should re-export canonical modules
- Exception: true shared infra (event bus / cache / etc.) can remain outside domains

Patch:
- Replace real implementations accidentally left in shims with `pub use ...` re-exports.
- Ensure canonical implementations live under the correct domain path.

## 3) Boundary enforcement (no cross-domain imports)
Audit imports:
- Inside any domain, forbid importing another domain’s internals (e.g., `crate::domains::other_domain::...`).
- Cross-domain coordination must happen via event bus / shared contracts only.

Patch:
- Remove illegal imports.
- Introduce/route through shared events if needed (publish/handle after commit).

## 4) Transaction boundaries & SQL locality
Rules to verify:
- Transactions start/commit only in `domains/*/application/*` (or the approved transaction helper entrypoint).
- Repositories accept a `&Transaction` where needed and do only data access.
- No `rusqlite`, raw SQL strings, or DB calls in domain/application layers.

Patch:
- Move transaction orchestration up to application layer.
- Move SQL + rusqlite usage down into infrastructure repositories.

## 5) IPC layer thinness + auth/RBAC consistency
Verify:
- IPC handlers authenticate + validate + delegate; no business logic, no SQL.
- Protected commands require session_token; public commands are explicitly public.
- Correlation id propagation is consistent (if your project uses it).

Patch:
- Refactor IPC handlers to call application services.
- Centralize error mapping to AppError patterns.

## 6) Frontend alignment (no drifting contracts)
Verify frontend calls:
- Frontend uses `frontend/src/lib/ipc/client.ts` / domain IPC modules, not random `invoke()` calls scattered everywhere.
- `frontend/src/lib/backend.ts` is not manually edited; types are generated.
- Run: `npm run types:drift-check` (and fix drift properly; regenerate if needed).

Patch:
- Route direct invokes into ipcClient modules.
- Fix type drift via Rust model fixes + `npm run types:sync`.

## 7) Migration/cleanup “done” criteria (final output)
At the end, output:
- ✅ PASS if: all checks green + no boundary violations + shims are shims only + structure complete
- ❌ FAIL if: you cannot make it pass; list blocking files/violations

Before finishing:
- Re-run `npm run quality:check`
- Re-run `cd src-tauri && cargo test`