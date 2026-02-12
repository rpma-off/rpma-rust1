# 00 - Project Overview

## What is RPMA v2?

**RPMA v2** is an **offline-first desktop application** for managing Paint Protection Film (PPF) interventions, built using **Tauri** (Rust backend + Next.js frontend). It targets automotive workshops that install PPF, handling the complete workflow from task creation through execution, documentation, and reporting.

### Who Uses It

- **Technicians**: Execute PPF interventions step-by-step, capture photos, record material usage
- **Supervisors**: Monitor workflow progress, assign tasks, review quality
- **Admins**: Manage users, configure system settings, access all data
- **Viewers**: Read-only access to reports and analytics

### Offline-First Philosophy

The application is designed to work **completely offline** with a local SQLite database. All data is stored locally, and future sync capabilities will push changes to a central server when online.

**Source of Truth**: The **local SQLite database** is the single source of truth for all application data.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Desktop Runtime** | Tauri 2.x | Cross-platform app container |
| **Backend** | Rust | Business logic, database access, IPC commands |
| **Database** | SQLite (WAL mode) | Local persistent storage |
| **Frontend** | Next.js 14 (App Router) | UI and user interactions |
| **UI Framework** | React 18 + TypeScript | Component-based UI |
| **Styling** | Tailwind CSS + shadcn/ui | Design system |
| **State Management** | React Query + Zustand | Server state + client state |
| **Type Sharing** | ts-rs | Rust → TypeScript type generation |

---

## Top-Level Modules

### 1. **Tasks** 
- Task creation, assignment, scheduling
- Task lifecycle: Draft → Assigned → In Progress → Completed
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
- User authentication (email + password, 2FA support)
- Role-Based Access Control (RBAC): Admin, Supervisor, Technician, Viewer
- Session management

### 8. **Admin / System**
- User management
- System settings and configuration
- Audit logging
- Performance monitoring

---

## Project Structure

```
rpma-rust/
├── src-tauri/                # Rust/Tauri backend
│   ├── src/
│   │   ├── commands/         # IPC command handlers (~60 files)
│   │   ├── services/         # Business logic layer (~60 services)
│   │   ├── repositories/     # Data access layer (~18 repositories)
│   │   ├── models/           # Data models with ts-rs exports (~20 files)
│   │   ├── db/               # Database management & migrations
│   │   ├── sync/             # Offline sync queue
│   │   ├── logging/          # Structured logging
│   │   └── main.rs           # Application entry point
│   ├── migrations/           # SQLite migrations (~28 files)
│   └── Cargo.toml            # Rust dependencies
├── frontend/                 # Next.js application
│   ├── src/
│   │   ├── app/              # Next.js App Router pages
│   │   ├── components/       # React components (~270 files)
│   │   ├── lib/
│   │   │   ├── ipc/          # IPC client modules (~65 files)
│   │   │   ├── services/     # Frontend business logic
│   │   │   └── utils/        # Utility functions
│   │   ├── types/            # TypeScript types (auto-generated from Rust)
│   │   ├── hooks/            # Custom React hooks (~65 files)
│   │   └── contexts/         # React contexts
│   └── package.json          # Frontend dependencies
├── scripts/                  # Build and validation scripts (~24 files)
├── migrations/               # Root-level migration symlink
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
- **Never manually edit** `frontend/src/types/*.ts`

### 3. **Offline-First + Event Bus**
- All operations work offline
- Domain events track state changes
- Future sync queue will handle server synchronization

### 4. **Security by Default**
- All protected IPC commands require `session_token`
- RBAC enforcement at the command handler level
- Audit logging for sensitive operations

---

##  "Golden Paths" - Start Here

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
- **IPC commands**: `domain_action` format (e.g., `task_create`, `intervention_start`)
- **Database tables**: `snake_case` (e.g., `tasks`, `interventions`, `intervention_steps`)

---

## Next Steps

1. **Understand the domain**: [01_DOMAIN_MODEL.md](./01_DOMAIN_MODEL.md)
2. **Learn the architecture**: [02_ARCHITECTURE_AND_DATAFLOWS.md](./02_ARCHITECTURE_AND_DATAFLOWS.md)
3. **Pick your development area**:
   - Frontend → [03_FRONTEND_GUIDE.md](./03_FRONTEND_GUIDE.md)
   - Backend → [04_BACKEND_GUIDE.md](./04_BACKEND_GUIDE.md)
   - Database → [07_DATABASE_AND_MIGRATIONS.md](./07_DATABASE_AND_MIGRATIONS.md)
