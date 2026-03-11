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

### Backend DDD Domains (16)
Located in `src-tauri/src/domains/`:
- **auth**: Authentication, sessions, RBAC
- **users**: User profiles, roles, management
- **tasks**: Work order lifecycle, assignment, status
- **interventions**: PPF execution workflow, steps, progress
- **inventory**: Material tracking, stock, consumption
- **quotes**: Quote lifecycle, pricing, conversion to tasks
- **calendar**: Scheduling, timeline views
- **clients**: Customer profiles, history
- **reports**: Business intelligence, analytics, exports
- **documents**: Photo storage, file attachments, intervention reports
- **sync**: Offline queue, background sync
- **audit**: Security logging, activity monitoring, alerting
- **settings**: System and user configuration
- **notifications**: In-app notifications and messaging
- **organizations**: Organization management, onboarding

### Frontend Feature Domains (18)
Located in `frontend/src/domains/`:
- **Core Entities**: `auth`, `users`, `tasks`, `interventions`, `clients`, `inventory`, `quotes`, `calendar`, `reports`, `sync`, `documents`, `settings`, `notifications`
- **High-Level Features**: `admin`, `bootstrap`, `dashboard`, `performance`, `audit`, `organizations`

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
- Backend Commands: `src-tauri/src/main.rs` (command registration, ~131 commands)
- Database: `src-tauri/src/db/mod.rs`, `src-tauri/src/db/connection.rs`
- IPC Client: `frontend/src/lib/ipc/client.ts`, `frontend/src/lib/ipc/utils.ts`

**Key Configuration**:
- Type Generation: `npm run types:sync` → outputs to `frontend/src/types/`
- Migrations: `src-tauri/migrations/` (53 migrations, versions 002-056)
- Session Duration: 8 hours (480 minutes / 28,800 seconds)

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
