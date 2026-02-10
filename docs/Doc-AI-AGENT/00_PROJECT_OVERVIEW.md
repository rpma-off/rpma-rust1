# RPMA v2 Project Overview

## What is RPMA v2?

RPMA v2 is an offline-first desktop application for managing Paint Protection Film (PPF) installation workflows. It serves automotive technicians and supervisors who need to track vehicle service jobs, manage installation steps, capture quality photos, and maintain inventory - all while supporting reliable offline operation.

The application follows a "source of truth" approach where the local SQLite database is primary, with synchronization capabilities to a central server when connectivity is available.

## Tech Stack Summary

- **Desktop Framework**: Tauri (Rust + system webview)
- **Frontend**: Next.js 14 with React, TypeScript, and Tailwind CSS
- **UI Components**: shadcn/ui built on Radix UI primitives
- **Backend**: Rust with SQLite (WAL mode) for data persistence
- **State Management**: React hooks with contexts and Zustand for global state
- **Authentication**: JWT with 2FA support and role-based access control
- **Type Safety**: Automatic TypeScript generation from Rust models using `ts-rs`

## Architecture Overview

RPMA v2 follows a clean 4-layer architecture:

```
┌─────────────────────────────────────┐
│    Next.js Frontend (React)         │  ← Presentation & UI State
├─────────────────────────────────────┤
│    Tauri IPC Layer                  │  ← Communication Bridge
├─────────────────────────────────────┤
│    Rust Services                    │  ← Business Logic
├─────────────────────────────────────┤
│    SQLite Database                  │  ← Data Persistence
└─────────────────────────────────────┘
```

## Core Domains

1. **Tasks**: General work items and job requests that can be converted to interventions
2. **Interventions**: Specialized PPF installation workflows with detailed steps and progress tracking
3. **Clients**: Customer management with vehicle information and service history
4. **Materials**: PPF film inventory with supplier and batch tracking
5. **Reports**: Performance analytics and business intelligence
6. **Authentication**: User management with roles (Admin, Technician, Supervisor, Viewer)
7. **Settings**: Application configuration and user preferences

## Key Entry Points

- **Frontend Root Layout**: `frontend/src/app/layout.tsx` - Server component wrapper
- **Frontend Client Layout**: `frontend/src/app/RootClientLayout.tsx` - Authentication and routing
- **IPC Client**: `frontend/src/lib/ipc/client.ts` - Backend communication interface
- **Rust Main**: `src-tauri/src/main.rs` - Application entry point and service initialization
- **Database Init**: `src-tauri/src/main.rs` (setup function) - DB creation and migrations

## Offline-First Features

- Local SQLite database as primary data store
- Comprehensive sync queue with retry logic
- Denormalized data for offline functionality
- Optimistic updates with conflict resolution
- Background sync when connectivity is available

## Golden Paths to Learn More

1. **[Domain Model](01_DOMAIN_MODEL.md)** - Understand the core entities and relationships
2. **[Architecture & Dataflows](02_ARCHITECTURE_AND_DATAFLOWS.md)** - Deep dive into the technical architecture
3. **[Frontend Guide](03_FRONTEND_GUIDE.md)** - Frontend patterns and conventions
4. **[Backend Guide](04_BACKEND_GUIDE.md)** - Backend implementation patterns
5. **[IPC API & Contracts](05_IPC_API_AND_CONTRACTS.md)** - Frontend-backend communication
6. **[Security & RBAC](06_SECURITY_AND_RBAC.md)** - Authentication and authorization
7. **[Database & Migrations](07_DATABASE_AND_MIGRATIONS.md)** - Data persistence and schema management
8. **[Dev Workflows & Tooling](08_DEV_WORKFLOWS_AND_TOOLING.md)** - Development processes and commands
9. **[User Flows & UX](09_USER_FLOWS_AND_UX.md)** - User interaction patterns

## Quick Development Commands

```bash
# Start development environment (recommended)
npm run dev

# Frontend only
npm run frontend:dev

# Type synchronization (critical after model changes)
npm run types:sync

# Type validation
npm run types:validate

# Type drift check
npm run types:drift-check

# Database and migration checks
node scripts/validate-migration-system.js

# Security audit
npm run security:audit
```

## Essential Development Patterns

- **Model Changes**: Always run `npm run types:sync` after modifying Rust models
- **New Commands**: Follow the pattern in `src-tauri/src/commands/` with proper authentication
- **New Pages**: Use App Router structure in `frontend/src/app/`
- **UI Components**: Strictly use shadcn/ui components with Tailwind utilities
- **Database Changes**: Create migration files in `src-tauri/migrations/` following the naming convention