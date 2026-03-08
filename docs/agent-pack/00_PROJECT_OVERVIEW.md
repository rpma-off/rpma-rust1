# RPMA v2 - Project Overview

## What is RPMA v2?
RPMA v2 is an **offline-first desktop application** for managing Paint Protection Film (PPF) interventions. It serves as the single source of truth for technicians and managers to handle tasks, workflow steps, photo management, inventory, reporting, and secure user sessions with role-based access control (RBAC). The application prioritizes offline capability, ensuring workshop reliability without continuous connectivity.

## Technology Stack
- **Architecture Flow**: Frontend (Next.js) ↔ IPC Bridge (Tauri) ↔ Backend (Rust) ↔ Database (SQLite WAL)
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Rust 1.85+, Tauri 2.1 framework
- **Database**: SQLite with WAL mode (via `rusqlite` and `r2d2` pooling) for high-concurrency local storage
- **State Management**: Zustand, React Query (TanStack Query), Context API
- **Type Safety**: Automatic generation of TypeScript types from Rust models using `ts-rs`
- **Offline-First**: Sync queue with background operations (`domains/sync/`)

## Core Bounded Contexts (Domains)
The repository enforces Domain-Driven Design (DDD). Cross-domain access is strictly forbidden except through public interfaces.

| Domain | Purpose | Key Path |
|--------|---------|----------|
| **tasks** | Work order creation, assignment, status tracking | `src-tauri/src/domains/tasks/`, `frontend/src/domains/tasks/` |
| **interventions** | PPF execution lifecycle, step-by-step workflows, photo logging | `src-tauri/src/domains/interventions/`, `frontend/src/domains/interventions/` |
| **inventory** | Material tracking, stock management, consumption logging | `src-tauri/src/domains/inventory/`, `frontend/src/domains/inventory/` |
| **auth/users** | Authentication, session management, RBAC | `src-tauri/src/domains/auth/`, `src-tauri/src/domains/users/` |
| **quotes** | Quote creation, pricing, conversion to tasks | `src-tauri/src/domains/quotes/`, `frontend/src/domains/quotes/` |
| **calendar** | Scheduling and timeline views | `src-tauri/src/domains/calendar/`, `frontend/src/domains/calendar/` |
| **clients** | Customer profiles and histories | `src-tauri/src/domains/clients/`, `frontend/src/domains/clients/` |
| **reports/audit** | Business intelligence and audit trails | `src-tauri/src/domains/reports/`, `src-tauri/src/domains/audit/` |
| **documents** | Photo storage, file attachments | `src-tauri/src/domains/documents/`, `frontend/src/domains/documents/` |
| **sync** | Offline queue, background sync operations | `src-tauri/src/domains/sync/`, `frontend/src/domains/sync/` |
| **notifications** | In-app notifications and messaging | `src-tauri/src/domains/notifications/` |
| **settings** | User preferences and app configuration | `src-tauri/src/domains/settings/`, `frontend/src/domains/settings/` |

## Golden Paths

| Question | Navigate To |
|----------|-------------|
| "Where do I add a new feature end-to-end?" | [Backend Guide](./04_BACKEND_GUIDE.md) → [Frontend Guide](./03_FRONTEND_GUIDE.md) |
| "Which IPC command handles X?" | [IPC API & Contracts](./05_IPC_API_AND_CONTRACTS.md) |
| "What tables store Y?" | [Database & Migrations](./07_DATABASE_AND_MIGRATIONS.md) |
| "What RBAC roles exist?" | [Security & RBAC](./06_SECURITY_AND_RBAC.md) |
| "How do type sync and validation work?" | [Dev Workflows](./08_DEV_WORKFLOWS_AND_TOOLING.md) |

## Quick Reference

**Entry Points**:
- Frontend: `frontend/src/app/layout.tsx`, `frontend/src/app/page.tsx`
- Backend Commands: `src-tauri/src/main.rs` (command registration lines 66-312)
- Database: `src-tauri/src/db/mod.rs`, `src-tauri/src/schema.sql`
- IPC Client: `frontend/src/lib/ipc/client.ts`, `frontend/src/lib/ipc/utils.ts`

**Key Configuration**:
- Type Generation: `npm run types:sync` → outputs to `frontend/src/lib/backend/`
- Migrations: `src-tauri/migrations/` (52 migrations, versions 002-052)
- Session Duration: 8 hours (28,800 seconds)

---

**Navigation**:
- [Domain Model](./01_DOMAIN_MODEL.md)
- [Architecture & Dataflows](./02_ARCHITECTURE_AND_DATAFLOWS.md)
- [Frontend Guide](./03_FRONTEND_GUIDE.md)
- [Backend Guide](./04_BACKEND_GUIDE.md)
- [IPC API & Contracts](./05_IPC_API_AND_CONTRACTS.md)
- [Security & RBAC](./06_SECURITY_AND_RBAC.md)
- [Database & Migrations](./07_DATABASE_AND_MIGRATIONS.md)
- [Dev Workflows & Tooling](./08_DEV_WORKFLOWS_AND_TOOLING.md)
- [User Flows & UX](./09_USER_FLOWS_AND_UX.md)
