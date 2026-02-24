# 00 - Project Overview

## What RPMA v2 is

RPMA v2 is an offline-first desktop application for PPF operations (tasking, execution, inventory, quotes, documents, users, and reporting).

- Runtime: Tauri v2 (`src-tauri/src/main.rs`)
- Frontend: Next.js 14 App Router (`frontend/src/app`)
- Backend: Rust bounded contexts (`src-tauri/src/domains/*`)
- Data: local SQLite in WAL mode (`src-tauri/src/db`, initialized in `src-tauri/src/main.rs`)

Primary users in code and RBAC:
- `admin`
- `supervisor`
- `technician`
- `viewer`

Role enum source: `src-tauri/src/domains/auth/domain/models/auth.rs`.

## Offline-first boundaries and source of truth

- Local SQLite database is the runtime source of truth.
- Sync is optional and queued (`src-tauri/src/domains/sync/*`).
- Domain events are in-process (`src-tauri/src/shared/services/event_bus.rs`).
- App startup creates/opens `rpma.db` in Tauri app data directory and runs init/migrations (`src-tauri/src/main.rs`).

## Tech stack summary

| Layer | Stack | Code pointers |
|---|---|---|
| Desktop shell | Tauri 2 | `src-tauri/src/main.rs`, `src-tauri/tauri.conf.json` |
| Frontend | Next.js 14 + React 18 + TS | `frontend/src/app/layout.tsx`, `frontend/src/app/RootClientLayout.tsx` |
| Frontend state | React Query + Zustand | `frontend/src/app/providers.tsx`, `frontend/src/domains/*/stores` |
| IPC client | `safeInvoke` wrapper + domain IPC modules | `frontend/src/lib/ipc/utils.ts`, `frontend/src/lib/ipc/client.ts`, `frontend/src/domains/*/ipc` |
| Backend | Rust (bounded contexts) | `src-tauri/src/domains/*` |
| DB | SQLite + r2d2 pool + WAL | `src-tauri/src/db/connection.rs`, `src-tauri/src/db/migrations.rs` |
| Type sharing | `ts-rs` export to TS | `src-tauri/src/bin/export-types.rs`, `scripts/write-types.js`, `frontend/src/lib/backend.ts` |

## Top-level modules (current)

Backend bounded contexts under `src-tauri/src/domains/`:
- `auth`, `users`, `tasks`, `clients`, `interventions`, `documents`, `inventory`, `quotes`
- `calendar`, `reports`, `analytics`, `notifications`, `settings`, `audit`, `sync`

Frontend feature domains under `frontend/src/domains/` mirror business areas and expose `api/`, `ipc/`, `services/`, `hooks/`, `components/`.

## Golden paths

### Add a feature end-to-end
1. Backend domain model/application/infrastructure/ipc in `src-tauri/src/domains/<domain>/`.
2. Register command in `src-tauri/src/main.rs` `generate_handler![...]`.
3. If exported Rust types changed: run `npm run types:sync`.
4. Add/update frontend domain IPC wrapper (`frontend/src/domains/<domain>/ipc/*.ts`) and consumer hooks/components.

### Find command handler and caller
- Rust registration: `src-tauri/src/main.rs` (135+ commands registered)
- Rust implementation: `src-tauri/src/domains/*/ipc/**/*.rs`
- Frontend caller(s): `frontend/src/domains/*/ipc/*.ts` and `frontend/src/lib/ipc/client.ts`

## Internal navigation

- Domain model and invariants: `./01_DOMAIN_MODEL.md`
- Runtime architecture and flows: `./02_ARCHITECTURE_AND_DATAFLOWS.md`
- Frontend implementation map: `./03_FRONTEND_GUIDE.md`
- Backend implementation map: `./04_BACKEND_GUIDE.md`
- IPC contracts and command index: `./05_IPC_API_AND_CONTRACTS.md`
- Security and RBAC: `./06_SECURITY_AND_RBAC.md`
- Database and migrations: `./07_DATABASE_AND_MIGRATIONS.md`
- Dev workflows/tooling: `./08_DEV_WORKFLOWS_AND_TOOLING.md`
- User flows and UX map: `./09_USER_FLOWS_AND_UX.md`

## DOC vs CODE mismatch

- Some ADR text still mentions `Manager`; code role enum uses `Supervisor` (`src-tauri/src/domains/auth/domain/models/auth.rs`, `docs/adr/006-rbac-policy.md`).
