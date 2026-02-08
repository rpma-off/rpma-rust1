# RPMA v2 Agent Documentation

This directory contains 10 high-signal Markdown files designed to help an AI agent quickly understand and work with the RPMA v2 codebase. Each file focuses on a specific aspect of the application and provides practical, actionable information.

## Files Overview

### 📋 [00_PROJECT_OVERVIEW.md](00_PROJECT_OVERVIEW.md)
- What RPMA v2 is and who uses it
- Tech stack summary and architecture overview
- Core domains and key entry points
- Quick development commands

### 🏗️ [01_DOMAIN_MODEL.md](01_DOMAIN_MODEL.md)
- Core entities (Task, Intervention, Client, User, etc.)
- Relationships and lifecycle of each entity
- Storage patterns and domain rules
- Status enums and transitions

### 🏛️ [02_ARCHITECTURE_AND_DATAFLOWS.md](02_ARCHITECTURE_AND_DATAFLOWS.md)
- 4-layer architecture (Frontend → IPC → Services → Database)
- Data flow diagrams for key operations
- Offline-first sync implementation
- Type synchronization and event systems

### 🎨 [03_FRONTEND_GUIDE.md](03_FRONTEND_GUIDE.md)
- Frontend structure and component patterns
- IPC client usage and state management
- Adding new UI features safely
- Common pitfalls and solutions

### ⚙️ [04_BACKEND_GUIDE.md](04_BACKEND_GUIDE.md)
- Backend structure (commands, services, repositories)
- Command implementation pattern
- Error handling and database interaction
- Adding new backend features

### 🔌 [05_IPC_API_AND_CONTRACTS.md](05_IPC_API_AND_CONTRACTS.md)
- IPC contract rules and authentication
- Top 30 most important commands with details
- Type synchronization approach
- Error handling across IPC boundary

### 🔐 [06_SECURITY_AND_RBAC.md](06_SECURITY_AND_RBAC.md)
- Authentication flow with 2FA
- Role-based access control matrix
- Data protection measures
- Security validation scripts

### 💾 [07_DATABASE_AND_MIGRATIONS.md](07_DATABASE_AND_MIGRATIONS.md)
- SQLite setup with WAL mode
- Migration system implementation
- Safe migration practices
- Common issues and solutions

### 🛠️ [08_DEV_WORKFLOWS_AND_TOOLING.md](08_DEV_WORKFLOWS_AND_TOOLING.md)
- Development commands and workflows
- Type synchronization process
- Quality gates and validation scripts
- "If you change X, run Y" checklist

### 👤 [09_USER_FLOWS_AND_UX.md](09_USER_FLOWS_AND_UX.md)
- Main user flows for each role
- Entry routes and UI states
- Backend commands per flow
- Design system guardrails

## Quick Start for AI Agents

### To understand the project quickly:
1. Start with [00_PROJECT_OVERVIEW.md](00_PROJECT_OVERVIEW.md) for high-level context
2. Read [01_DOMAIN_MODEL.md](01_DOMAIN_MODEL.md) to understand the data model
3. Review [02_ARCHITECTURE_AND_DATAFLOWS.md](02_ARCHITECTURE_AND_DATAFLOWS.md) for technical architecture
4. Check [08_DEV_WORKFLOWS_AND_TOOLING.md](08_DEV_WORKFLOWS_AND_TOOLING.md) for development practices

### For specific tasks:
- **Adding a new feature**: Read [03_FRONTEND_GUIDE.md](03_FRONTEND_GUIDE.md) and [04_BACKEND_GUIDE.md](04_BACKEND_GUIDE.md)
- **Working with the API**: Read [05_IPC_API_AND_CONTRACTS.md](05_IPC_API_AND_CONTRACTS.md)
- **Database changes**: Read [07_DATABASE_AND_MIGRATIONS.md](07_DATABASE_AND_MIGRATIONS.md)
- **Security/permissions**: Read [06_SECURITY_AND_RBAC.md](06_SECURITY_AND_RBAC.md)
- **UI/UX changes**: Read [09_USER_FLOWS_AND_UX.md](09_USER_FLOWS_AND_UX.md)

## Key Conventions

### Development Commands
```bash
# Essential commands
npm run dev              # Start development
npm run types:sync        # Sync Rust→TS types (CRITICAL)
npm run types:validate    # Validate types
npm run types:drift-check # Check for drift
```

### Code Patterns
- **Frontend**: Use shadcn/ui components with Tailwind classes
- **Backend**: Follow command→service→repository pattern
- **Authentication**: All protected commands need `session_token`
- **Type Safety**: Never edit `frontend/src/lib/backend.ts` (generated)

### Important Paths
- Frontend root: `frontend/src/app/`
- IPC client: `frontend/src/lib/ipc/`
- Backend commands: `src-tauri/src/commands/`
- Models: `src-tauri/src/models/`
- Migrations: `src-tauri/migrations/`

## Acceptance Criteria

An agent that has thoroughly reviewed these files should be able to:

✅ Answer "Where do I add a new feature?"  
✅ Identify "Which command handles X?"  
✅ Locate "What tables store Y?"  
✅ Understand "What are the business rules?"  
✅ Follow development patterns consistently  
✅ Navigate the codebase efficiently  
✅ Avoid common pitfalls  
✅ Run appropriate validation commands  

## Maintenance

These files should be updated when:
- New major features are added
- Architecture changes occur
- Development workflows evolve
- New security measures are implemented

Keep these files accurate and concise - they are the primary source of truth for AI agents working with RPMA v2.