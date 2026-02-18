# 00 - Project Overview

## What is RPMA v2?

**RPMA v2** is an **offline-first desktop application** for managing Paint Protection Film (PPF) interventions. Built using **Tauri 2.1.0** with a Rust backend and Next.js 14 frontend, it serves automotive workshops that install PPF, handling the complete workflow from task creation through execution, documentation, and reporting.

### Who Uses It

- **Technicians**: Execute PPF interventions step-by-step, capture photos, record material usage
- **Supervisors**: Monitor workflow progress, assign tasks, review quality
- **Admins**: Manage users, configure system settings, access all data
- **Viewers**: Read-only access to reports and analytics

### Offline-First Philosophy

The application is designed to work **completely offline** with a local SQLite database. All data is stored locally, and sync capabilities push changes to a central server when online.

**Source of Truth**: The **local SQLite database** is the single source of truth for all application data.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Desktop Runtime** | Tauri 2.1 (`@tauri-apps/api ^2.8.0`) | Cross-platform app container |
| **Backend** | Rust 1.85 (MSRV) | Business logic, database access, IPC commands |
| **Database** | SQLite WAL — rusqlite 0.32, r2d2 0.8, r2d2_sqlite 0.25 | Local persistent storage with connection pooling |
| **Frontend** | Next.js ^14.2 (App Router) | UI and user interactions |
| **UI Framework** | React ^18.3 + TypeScript ^5.3 | Component-based UI |
| **Styling** | Tailwind CSS ^3.4 + shadcn/ui (Radix primitives) | Design system |
| **State Management** | TanStack React Query ^5.90 + Zustand ^5.0 | Server state + client state |
| **Validation** | Zod ^4.1 + react-hook-form ^7.64 | Forms + runtime validation |
| **Type Sharing** | ts-rs 10.1 | Rust → TypeScript type generation |
| **Auth** | Argon2 0.5 (passwords) + jsonwebtoken 9.3 (JWT) | Secure auth stack |

---

## Top-Level Modules

### 1. **Tasks** 
- Task creation, assignment, scheduling
- Task lifecycle: Draft → Scheduled → In Progress → Completed
- Integration with clients

### 2. **Clients**
- Client management (individuals and businesses)
- Contact information, history tracking
- Client-task relationships

### 3. **Interventions / Workflow**
- Step-by-step PPF application workflow
- Status tracking: Pending → In Progress → Paused → Completed
- Material consumption per step
- Photo capture at each step

### 4. **Calendar**
- Task scheduling and conflict detection
- Technician availability
- Appointment management

### 5. **Inventory / Materials**
- Material stock tracking (PPF rolls, liquids, tools)
- Consumption recording
- Low stock alerts and expiry tracking

### 6. **Reports & Analytics**
- Task completion reports
- Material usage reports
- Technician performance
- Client analytics
- Quality compliance

### 7. **Auth & Access Control**
- User authentication (email + password, TOTP 2FA support)
- Role-Based Access Control (RBAC): Admin, Supervisor, Technician, Viewer
- Session management with JWT (2h access, 7d refresh tokens)

### 8. **Admin / System**
- User management
- System settings and configuration
- Audit logging
- Performance monitoring

---

## Project Structure

```
rpma-rust1/
├── src-tauri/                # Rust/Tauri backend
│   ├── src/
│   │   ├── commands/         # IPC command handlers (236 commands across 37+ files)
│   │   │   ├── mod.rs        # Module exports, ApiResponse, AppState, errors
│   │   │   ├── auth_middleware.rs # authenticate! macro, RBAC checks
│   │   │   ├── auth.rs       # Authentication commands (login, 2FA, logout)
│   │   │   ├── client.rs     # Client CRUD (client_crud command)
│   │   │   ├── material.rs   # Inventory commands (21 commands)
│   │   │   ├── calendar.rs   # Scheduling commands (9 commands)
│   │   │   ├── user.rs       # User management (8 commands)
│   │   │   ├── quote.rs      # Quote/Devis generation (11 commands)
│   │   │   ├── analytics.rs  # Analytics commands
│   │   │   ├── notification.rs # Notification commands
│   │   │   ├── performance.rs # Performance metrics
│   │   │   ├── security.rs   # Security monitoring (11 commands)
│   │   │   ├── system.rs     # System info, health checks
│   │   │   ├── task/         # Task commands submodule (8 commands)
│   │   │   │   ├── facade.rs # task_crud, edit_task, delay_task
│   │   │   │   ├── queries.rs # get_tasks_with_clients, statistics
│   │   │   │   ├── validation.rs # check_task_availability, assignment
│   │   │   │   └── statistics.rs # task analytics
│   │   │   ├── intervention/ # Intervention workflow submodule (11 commands)
│   │   │   │   ├── workflow.rs # intervention_start, advance_step, finalize
│   │   │   │   ├── queries.rs # get, get_active_by_task, progress
│   │   │   │   └── data_access.rs # update, get_step
│   │   │   ├── reports/      # Reports submodule (15 commands)
│   │   │   │   ├── core.rs   # get_task_completion_report, etc.
│   │   │   │   ├── search.rs
│   │   │   │   ├── generation/ # PDF generation
│   │   │   │   └── export/   # CSV, Excel export
│   │   │   └── settings/     # Settings submodule (12 commands)
│   │   │       ├── core.rs   # get_app_settings, update_app_settings
│   │   │       ├── profile.rs # update_user_profile
│   │   │       ├── preferences.rs
│   │   │       └── security.rs # change_user_password
│   │   ├── services/         # Business logic layer (80+ files)
│   │   ├── repositories/     # Data access layer (18+ files)
│   │   ├── models/           # Data models with ts-rs exports (15+ files)
│   │   ├── db/               # Database management & migrations
│   │   ├── sync/             # Offline sync queue (2 files)
│   │   └── lib.rs            # Module exports
│   ├── migrations/           # SQLite migrations (35 SQL files, embedded via include_dir!)
│   ├── Cargo.toml            # Rust dependencies
│   └── src/bin/export-types.rs  # Type export binary
├── frontend/                 # Next.js application
│   ├── src/
│   │   ├── app/              # Next.js App Router pages (40+ routes)
│   │   ├── components/       # React components (245 components)
│   │   ├── lib/
│   │   │   ├── ipc/          # IPC client
│   │   │   │   ├── client.ts      # Main ipcClient object
│   │   │   │   ├── secure-client.ts # Secure IPC operations
│   │   │   │   ├── core/          # Core IPC logic (index, response-handlers, types)
│   │   │   │   ├── domains/       # 19 domain-specific modules (auth, tasks, clients, etc.)
│   │   │   │   ├── mock/          # Mock implementations
│   │   │   │   ├── utils.ts       # safeInvoke wrapper
│   │   │   │   ├── cache.ts       # cachedInvoke, invalidatePattern
│   │   │   │   └── retry.ts       # Retry logic
│   │   │   ├── stores/       # Zustand stores (layoutStore, calendarStore)
│   │   │   ├── services/     # Frontend business logic
│   │   │   ├── validation/   # Zod schemas
│   │   │   └── backend.ts    # ⚠️ AUTO-GENERATED (do not edit manually)
│   │   ├── hooks/            # Custom React hooks (64 hooks)
│   │   └── contexts/         # React contexts (4 contexts)
│   └── package.json
├── scripts/                  # Build and validation scripts (40+ scripts)
│   ├── write-types.js             # Convert Rust types to TypeScript
│   ├── validate-types.js          # Validate generated types
│   ├── check-type-drift.js        # Detect Rust/TS mismatches
│   ├── security-audit.js          # Comprehensive security scan
│   ├── ipc-authorization-audit.js # Check IPC auth
│   ├── validate-migration-system.js # Validate migrations
│   ├── test-migrations.js         # Test migration execution
│   ├── migration-health-check.js  # Migration status
│   ├── detect-schema-drift.js     # Detect schema changes
│   ├── check_db.js                # Database connectivity
│   ├── check_db_schema.js         # Schema validation
│   ├── check-bundle-size.js       # Bundle analysis
│   ├── detect-duplication.js      # Code duplication
│   ├── check-mojibake.js          # Encoding issues
│   └── git-workflow.js            # Git automation
├── package.json              # Root package.json (45 npm scripts)
└── docs/                     # Documentation
    └── agent-pack/           # AI agent onboarding docs (this directory!)
```

---

## Key Design Principles

### 1. **Four-Layer Architecture**
```
UI Layer (Next.js)
      ↓ IPC
Command Layer (Tauri Commands)
      ↓
Service Layer (Business Logic)
      ↓
Repository Layer (Data Access)
      ↓
Database (SQLite)
```

### 2. **Type Safety Everywhere**
- Rust models use `#[derive(Serialize, TS)]` to export TypeScript types
- Frontend uses **auto-generated** types from backend
- **Never manually edit** `frontend/src/lib/backend.ts`

### 3. **Offline-First + Event Bus**
- All operations work offline with local SQLite database
- Domain events track state changes via `InMemoryEventBus` (`src-tauri/src/services/event_bus.rs`)
- Sync queue handles server synchronization (`src-tauri/src/sync/queue.rs`, `src-tauri/src/sync/background.rs`)
- Background sync runs at 30-second intervals

### 4. **Security by Default**
- All 235 protected IPC commands require `session_token` parameter (1 public: auth_login)
- RBAC enforcement at command handler level via `authenticate!` macro (`src-tauri/src/commands/auth_middleware.rs`)
- Password hashing with Argon2 (`src-tauri/src/services/auth.rs:779-801`)
- JWT tokens: 2-hour access, 7-day refresh (`src-tauri/src/services/token.rs:60-61`)
- Rate limiting: 5 failed attempts, 15-minute lockout (`src-tauri/src/services/rate_limiter.rs`)
- Audit logging for sensitive operations (`src-tauri/src/services/audit_service.rs`)
- TOTP 2FA support (6-digit codes, 30s window) (`src-tauri/src/services/two_factor.rs`)

---

## "Golden Paths" - Start Here

### For Backend Development:
1. Read **[04_BACKEND_GUIDE.md](./04_BACKEND_GUIDE.md)** - How to add a new IPC command
2. Read **[02_ARCHITECTURE_AND_DATAFLOWS.md](./02_ARCHITECTURE_AND_DATAFLOWS.md)** - Understand the layers
3. Read **[05_IPC_API_AND_CONTRACTS.md](./05_IPC_API_AND_CONTRACTS.md)** - Top 30 commands

### For Frontend Development:
1. Read **[03_FRONTEND_GUIDE.md](./03_FRONTEND_GUIDE.md)** - Frontend structure and patterns
2. Read **[09_USER_FLOWS_AND_UX.md](./09_USER_FLOWS_AND_UX.md)** - User journeys
3. Read **[05_IPC_API_AND_CONTRACTS.md](./05_IPC_API_AND_CONTRACTS.md)** - How to call backend

### For Understanding Business Logic:
1. Read **[01_DOMAIN_MODEL.md](./01_DOMAIN_MODEL.md)** - Entities and relationships
2. Read **[06_SECURITY_AND_RBAC.md](./06_SECURITY_AND_RBAC.md)** - Auth and permissions
3. Read **[02_ARCHITECTURE_AND_DATAFLOWS.md](./02_ARCHITECTURE_AND_DATAFLOWS.md)** - Data flows

### For Database Work:
1. Read **[07_DATABASE_AND_MIGRATIONS.md](./07_DATABASE_AND_MIGRATIONS.md)** - Migration system
2. Read **[01_DOMAIN_MODEL.md](./01_DOMAIN_MODEL.md)** - Table schemas

### For Dev Workflows:
1. Read **[08_DEV_WORKFLOWS_AND_TOOLING.md](./08_DEV_WORKFLOWS_AND_TOOLING.md)** - Scripts and commands

---

## Quick Start Commands

```bash
# Development (both frontend + backend)
npm run dev

# Type sync (ALWAYS run after modifying Rust models)
npm run types:sync

# Run all quality checks before committing
npm run quality:check

# Run frontend only
npm run frontend:dev

# Build for production
npm run build
```

---

## File Naming Conventions

- **Rust files**: `snake_case.rs` (e.g., `task_service.rs`, `client_repository.rs`)
- **TypeScript files**: `kebab-case.ts` or `PascalCase.tsx` for components
- **IPC commands**: `domain_action` format (e.g., `task_crud`, `intervention_start`)
- **Database tables**: `snake_case` (e.g., `tasks`, `interventions`, `intervention_steps`)

---

## Key Entry Points

| Component | Entry Point | Location |
|-----------|-------------|----------|
| Frontend App | Root Layout | `frontend/src/app/layout.tsx` |
| Frontend Providers | QueryClientProvider, AuthProvider, Toaster, ThemeProvider | `frontend/src/components/providers.tsx` |
| IPC Client | `ipcClient` object | `frontend/src/lib/ipc/client.ts` |
| IPC Hook | `useIpcClient()` | `frontend/src/lib/ipc/client.ts` |
| Auth Middleware | `authenticate!` macro | `src-tauri/src/commands/auth_middleware.rs` |
| Database Init | `Database::new()` | `src-tauri/src/db/mod.rs` |
| Migrations | `Database::migrate()` | `src-tauri/src/db/migrations.rs` (35 SQL files in `src-tauri/migrations/` + Rust-implemented migrations 1-33) |
| Type Export | `export-types` binary | `src-tauri/src/bin/export-types.rs` |
| AppState | Centralized service container | `src-tauri/src/lib.rs:279-320` |
| Command Registration | `tauri::generate_handler![]` | `src-tauri/src/main.rs:69-306` (236 commands) |

---

## Next Steps

1. **Understand the domain**: [01_DOMAIN_MODEL.md](./01_DOMAIN_MODEL.md)
2. **Learn the architecture**: [02_ARCHITECTURE_AND_DATAFLOWS.md](./02_ARCHITECTURE_AND_DATAFLOWS.md)
3. **Pick your development area**:
   - Frontend → [03_FRONTEND_GUIDE.md](./03_FRONTEND_GUIDE.md)
   - Backend → [04_BACKEND_GUIDE.md](./04_BACKEND_GUIDE.md)
   - Database → [07_DATABASE_AND_MIGRATIONS.md](./07_DATABASE_AND_MIGRATIONS.md)
