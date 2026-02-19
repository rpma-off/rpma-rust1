# GitHub Copilot Instructions for RPMA v2

These repository-level instructions are configured following GitHub's Copilot coding agent best practices: https://gh.io/copilot-coding-agent-tips.

## Project Overview

RPMA v2 is an **offline-first desktop application** for managing Paint Protection Film (PPF) interventions. The application handles tasks, interventions, workflow steps, photo management, inventory tracking, reporting, and user management with role-based access control.

## 📁 Project Structure

```
rpma-rust/
├── frontend/                 # Next.js 14 application
│   ├── src/
│   │   ├── app/             # App Router pages (38 pages)
│   │   ├── components/      # Shared React components (179+)
│   │   ├── domains/         # Feature domains (auth, interventions, inventory, tasks)
│   │   ├── hooks/           # Shared custom hooks (63+)
│   │   ├── lib/             # Utilities and IPC client (20 domain modules)
│   │   ├── shared/          # Shared utilities, types, and UI components
│   │   └── types/           # TypeScript types (auto-generated — DO NOT EDIT)
│   └── package.json
├── src-tauri/               # Rust/Tauri backend
│   ├── src/
│   │   ├── commands/        # 65 IPC command files
│   │   ├── domains/         # Bounded contexts (documents, interventions, inventory, quotes, tasks, users)
│   │   ├── models/          # 21 data models with ts-rs exports
│   │   ├── repositories/    # 20 repository files
│   │   ├── services/        # 88 service files
│   │   ├── shared/          # Shared backend utilities
│   │   └── db/              # Database management
│   └── Cargo.toml
├── migrations/              # SQLite migrations (6 SQL files)
├── scripts/                 # Build and validation scripts
└── docs/                    # Project documentation
```

## 🏗️ Architecture

### Four-Layer Architecture
```
Frontend (Next.js/React/TypeScript)
    ↓ IPC calls
Tauri Commands (Rust)
    ↓
Services (Business Logic - Rust)
    ↓
Repositories (Data Access - Rust)
    ↓
SQLite Database (WAL mode)
```

### Bounded Context Architecture
The backend uses Domain-Driven Design with bounded contexts under `src-tauri/src/domains/`:
- **documents** — Document storage and management
- **interventions** — PPF intervention lifecycle
- **inventory** — Material and stock tracking
- **quotes** — Quote creation and management
- **tasks** — Task and work order management
- **users** — User management and authentication

Each domain follows the structure: `application/` | `domain/` | `infrastructure/` | `ipc/` | `tests/`

The frontend mirrors this with feature domains under `frontend/src/domains/`:
- **auth** | **interventions** | **inventory** | **tasks**

Each frontend domain follows the structure: `api/` | `components/` | `hooks/` | `ipc/` | `services/`

## 📋 Essential Commands

```bash
# Development
npm run dev                    # Start both frontend and backend
npm run frontend:dev           # Frontend only (Next.js)

# Building
npm run build                  # Production build
npm run frontend:build         # Build frontend only
npm run backend:build          # Build backend only (Cargo)
npm run backend:build:release  # Build backend release version

# Quality check (REQUIRED before every commit)
npm run quality:check          # Run all quality checks

# Linting/Type-checking
npm run frontend:lint          # ESLint
npm run frontend:type-check    # TypeScript checking
npm run backend:check          # Cargo check
npm run backend:clippy         # Rust linting
npm run backend:fmt            # Rust formatting

# Architecture validation
npm run validate:bounded-contexts  # Validate domain boundaries
npm run architecture:check         # Check architecture rules

# Type Management
npm run types:sync             # Regenerate TS types from Rust
npm run types:validate         # Validate type consistency
npm run types:drift-check      # Check for type drift

# Testing
cd frontend && npm test        # Run frontend tests
cd frontend && npm run test:e2e # Run E2E tests with Playwright
cd frontend && npm run test:coverage # Run tests with coverage

# Security & Validation
npm run security:audit         # Security vulnerability scan
node scripts/validate-migration-system.js  # Migration validation
```

## ✅ Test Gates

Run these tests before submitting code:

```bash
# All backend tests (Rust)
cd src-tauri && cargo test --lib

# Database migration tests
cd src-tauri && cargo test migration

# Performance tests
cd src-tauri && cargo test performance

# Frontend tests (TypeScript/React)
cd frontend && npm test

# E2E tests with Playwright
cd frontend && npm run test:e2e

# Code coverage
cd frontend && npm run test:coverage
```

### Frontend
```bash
npm run frontend:lint          # Must pass
npm run frontend:type-check    # Must pass
```

### Backend
```bash
npm run backend:check          # Must pass
npm run backend:clippy         # Must pass
npm run backend:fmt            # Must pass
```

### Types
```bash
npm run types:sync             # Regenerate
npm run types:validate         # Must pass
npm run types:drift-check      # Must pass
```

### Security
```bash
npm run security:audit         # Must pass
```

## 🚨 Strict Rules

### Architecture — MUST follow at all times
- ✅ **ALWAYS** follow the 4-layer architecture: Frontend → Commands → Services → Repositories → DB
- ❌ **NEVER** skip layers (e.g., no direct DB access from services — use repositories)
- ❌ **NEVER** put business logic in IPC command handlers
- ❌ **NEVER** import across domain boundaries internally (use each domain's public `api/index.ts`)
- ❌ **NEVER** write SQL outside of `infrastructure/` files in domain modules
- ✅ **ALWAYS** place new backend features inside the appropriate bounded context under `src-tauri/src/domains/`
- ✅ **ALWAYS** validate bounded contexts pass: `npm run validate:bounded-contexts`

### Type Safety — MUST follow at all times
- ❌ **NEVER** manually edit any file under `frontend/src/types/` — these are auto-generated
- ✅ **ALWAYS** run `npm run types:sync` after modifying any Rust model that derives `ts-rs::TS`
- ✅ **ALWAYS** run `npm run types:drift-check` before committing

### Security — MUST follow at all times
- ✅ **ALWAYS** validate `session_token` in every protected IPC command
- ✅ **ALWAYS** enforce RBAC permissions before executing protected operations
- ❌ **NEVER** commit secrets, tokens, or credentials to Git
- ❌ **NEVER** bypass authentication or authorization checks
- ✅ **ALWAYS** run `npm run security:audit` before submitting code

### Database — MUST follow at all times
- ✅ **ALWAYS** use numbered migration files for schema changes
- ✅ **ALWAYS** make migrations idempotent (`IF NOT EXISTS`, `IF EXISTS`)
- ❌ **NEVER** modify the database schema outside of migration files
- ✅ **ALWAYS** validate migrations: `node scripts/validate-migration-system.js`

### Code Quality — MUST follow at all times
- ✅ **ALWAYS** run `npm run quality:check` before every commit
- ✅ **ALWAYS** use UTF-8 encoding for all source files
- ✅ **ALWAYS** use conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`, `perf:`, `security:`
- ❌ **NEVER** push directly to `main` (enforced by `git:guard-main` hook)
- ❌ **NEVER** disable or skip linting, type-checking, or architecture validation

### Testing — MUST follow at all times
- ✅ **ALWAYS** write a regression test for every bug fix
- ✅ **ALWAYS** write tests for new features (success path, validation failure, permission failure)
- ❌ **NEVER** write flaky or time-dependent tests
- ❌ **NEVER** delete or weaken existing tests to make a build pass

## 🧪 Testing Requirements

### When to Add Tests
- **Always** when adding new features
- **Always** when fixing bugs (regression tests)
- **Always** when changing business logic

### Test Types
- **Unit tests**: For services and repositories (backend), hooks (frontend)
- **Integration tests**: For IPC commands and critical workflows
- **Component tests**: For UI components with complex logic
- **E2E tests**: For critical user flows

### Test Quality Standards
- No flaky tests — tests must be deterministic
- Use stable fixtures, avoid time-based dependencies
- Keep tests fast, focused, and readable
- Test success path AND error conditions

### Minimum Coverage
- Every bug fix requires a regression test
- Every new feature requires tests for:
  - ✅ Success path
  - ❌ Validation failures
  - 🔒 Permission failures (for protected features)

## 📚 Additional Resources

- **DOCUMENTATION**: See `docs/agent-pack/README.md` for detailed documentation about our project
- **ADR**: See `docs/adr/` for architectural decision records