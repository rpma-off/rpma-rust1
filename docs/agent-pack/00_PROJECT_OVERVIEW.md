# 00 - Project Overview

## What RPMA v2 is

RPMA v2 is an offline-first desktop application for managing PPF interventions: tasks, scheduling, execution workflow steps, photos/documents, inventory, quotes, reporting, and user administration.

Primary users (RBAC):
- admin
- supervisor
- technician
- viewer
Role enum: `src-tauri/src/domains/auth/domain/models/auth.rs`.

## Offline-first boundaries and source of truth

- Local SQLite database is the runtime source of truth. The file is created in the Tauri app data directory as `rpma.db` (`src-tauri/src/main.rs`).
- Sync is optional and queued in `sync_queue` with background processing (`src-tauri/src/domains/sync/infrastructure/sync/*`).
- In-process domain events are published via the event bus and websocket handler (`src-tauri/src/shared/services/event_bus.rs`, `src-tauri/src/shared/services/websocket_event_handler.rs`).

## Tech stack summary

| Layer | Stack | Code pointers |
|---|---|---|
| Desktop shell | Tauri 2 | `src-tauri/src/main.rs`, `src-tauri/tauri.conf.json` |
| Frontend | Next.js 14 + React 18 + TypeScript | `frontend/src/app/layout.tsx`, `frontend/src/app/RootClientLayout.tsx` |
| Frontend state | React Query + Context + Zustand | `frontend/src/app/providers.tsx`, `frontend/src/domains/auth/api/AuthProvider.tsx`, `frontend/src/lib/stores/layoutStore.ts` |
| IPC client | `safeInvoke` + command registry + domain IPC wrappers | `frontend/src/lib/ipc/utils.ts`, `frontend/src/lib/ipc/commands.ts`, `frontend/src/domains/*/ipc` |
| Backend | Rust bounded contexts | `src-tauri/src/domains/*` |
| DB | SQLite + r2d2 pool + WAL | `src-tauri/src/db/connection.rs`, `src-tauri/src/db/migrations.rs` |
| Type sharing | `ts-rs` export to TS | `src-tauri/src/bin/export-types.rs`, `scripts/write-types.js`, `frontend/src/lib/backend.ts` |

## Top-level modules (current)

Backend bounded contexts under `src-tauri/src/domains/`:
- analytics, audit, auth, calendar, clients, documents, interventions, inventory, notifications, quotes, reports, settings, sync, tasks, users

Backend non-domain command surfaces:
- `src-tauri/src/commands/*` (system, ui, navigation, performance, websocket, ipc_optimization)

Frontend feature domains under `frontend/src/domains/` mirror business areas and expose `api/`, `ipc/`, `services/`, `hooks/`, `components/`.

## Golden paths

Add a feature end-to-end:
1. Add domain model/application/infrastructure code in `src-tauri/src/domains/<domain>/`.
2. Expose an IPC command in `src-tauri/src/domains/<domain>/ipc/*` and register it in `src-tauri/src/main.rs`.
3. If exported Rust types changed, run `npm run types:sync`.
4. Add/update frontend IPC wrapper in `frontend/src/domains/<domain>/ipc/*.ts` and call it from UI/hooks.

Find a command handler and caller:
- Command registration: `src-tauri/src/main.rs`.
- Command implementation: `src-tauri/src/domains/*/ipc/**/*.rs` or `src-tauri/src/commands/*.rs`.
- Frontend caller: `frontend/src/domains/*/ipc/*.ts` or `frontend/src/lib/ipc/client.ts`.

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

- ADR 006 mentions `Manager`; runtime role enum and RBAC helpers use `Supervisor`.
