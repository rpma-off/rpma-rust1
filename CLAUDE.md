# CLAUDE.md 

## Project Overview

RPMA v2 is an **offline-first desktop application** for managing Paint Protection Film (PPF) interventions. The application handles tasks, interventions, workflow steps, photo management, inventory tracking, reporting, and user management with role-based access control.

## 📁 Project Structure

```
rpma-rust/
├── frontend/                 # Next.js 14 application
│   ├── src/
│   │   ├── app/             # App Router pages
│   │   ├── components/      # React components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # Utilities and IPC client
│   │   ├── types/           # TypeScript type definitions (auto-generated from Rust)
│   │   └── ui/              # shadcn/ui components
│   └── package.json
├── src-tauri/               # Rust/Tauri backend
│   ├── src/
│   │   ├── commands/        # Tauri IPC command handlers
│   │   ├── models/          # Data models with ts-rs exports
│   │   ├── repositories/    # Database access layer
│   │   ├── services/        # Business logic layer
│   │   └── db/              # Database management
│   └── Cargo.toml
├── migrations/              # SQLite migrations
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

**Key Principle**: Keep layer responsibilities strictly separated. Each layer should only communicate with adjacent layers.

## 🔑 Critical Consistency Rules

### Type Safety
- **NEVER manually edit generated TypeScript types** in `frontend/src/types/`
- Rust models are the single source of truth for types
- Use `npm run types:sync` to regenerate TypeScript types from Rust
- Run `npm run types:drift-check` to verify type consistency

### IPC Communication
- All protected IPC commands **MUST** require `session_token` parameter
- Follow the response envelope pattern: `{ success: boolean, data?: T, error?: string }`
- Commands must be properly exported in `src-tauri/src/lib.rs`
- Frontend IPC calls go through `frontend/src/lib/ipc/`

### Security & RBAC
- Enforce Role-Based Access Control (RBAC) in command handlers
- Use validators in `src-tauri/src/commands/validators.rs`
- Session tokens must be validated for all protected endpoints
- User permissions must be checked before data access

### Database
- **NEVER** modify the database schema directly
- Always create migrations in `migrations/` directory
- Use the migration manager for schema changes
- Test migrations with `node scripts/validate-migration-system.js`

## 📋 Essential Commands

```bash
# Development
npm run dev                    # Start both frontend and backend
npm run frontend:dev           # Frontend only
npm run backend:dev            # Backend only (Tauri)

# Building
npm run build                  # Production build
npm run frontend:build         # Build frontend only

# Quality Checks
npm run quality:check          # Run all quality gates (RECOMMENDED)
npm run frontend:lint          # ESLint
npm run frontend:type-check    # TypeScript checking
npm run backend:check          # Cargo check
npm run backend:clippy         # Rust linting
npm run backend:fmt            # Rust formatting

# Type Management
npm run types:sync             # Regenerate TS types from Rust
npm run types:validate         # Validate type consistency
npm run types:drift-check      # Check for type drift

# Security & Validation
npm run security:audit         # Security vulnerability scan
node scripts/validate-rbac.js  # RBAC validation
node scripts/validate-session-security.js  # Session security check
node scripts/validate-migration-system.js  # Migration validation

# Testing
npm test                       # Run all tests
npm run test:frontend          # Frontend tests only
npm run test:backend           # Backend tests only
```

## 🎯 Development Workflow

### Before Making Changes
1. Search for existing patterns in the codebase - **copy existing patterns** rather than inventing new ones
2. Understand the 4-layer architecture and which layer your change belongs to
3. Check related documentation in `docs/` directory
4. Run `npm run quality:check` to establish baseline

### Making Changes
1. **Frontend changes**: 
   - Follow existing component patterns in `frontend/src/components/`
   - Use Tailwind CSS for styling
   - Leverage shadcn/ui components when available
   - Keep components small and focused

2. **Backend changes**:
   - Add/modify models in `src-tauri/src/models/` with `#[derive(Serialize, TS)]`
   - Implement business logic in `src-tauri/src/services/`
   - Add data access methods in `src-tauri/src/repositories/`
   - Create IPC commands in `src-tauri/src/commands/`

3. **Database changes**:
   - Create a new migration file in `migrations/`
   - Follow migration naming: `YYYYMMDDHHMMSS_description.sql`
   - Test both up and down migrations

### After Making Changes
1. Run type sync: `npm run types:sync`
2. Run appropriate linters and type checkers
3. Add/update tests (unit, integration, or e2e as appropriate)
4. Run `npm run quality:check` before committing
5. Ensure all tests pass
6. Update documentation if behavior changed

## ✅ Quality Gates

Run these checks before submitting code:

### Frontend
```bash
npm run frontend:lint          # Must pass
npm run frontend:type-check    # Must pass
npm run test:frontend          # Must pass
```

### Backend
```bash
npm run backend:check          # Must pass
npm run backend:clippy         # Must pass
npm run backend:fmt            # Must pass
npm run test:backend           # Must pass
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
node scripts/validate-rbac.js  # Must pass
node scripts/validate-session-security.js  # Must pass
```

### Full Check (Recommended)
```bash
npm run quality:check          # Runs all quality gates
```

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
- No flaky tests - tests must be deterministic
- Use stable fixtures, avoid time-based dependencies
- Keep tests fast, focused, and readable
- Test success path AND error conditions

### Minimum Coverage
- Every bug fix requires a regression test
- Every new feature requires tests for:
  - ✅ Success path
  - ❌ Validation failures
  - 🔒 Permission failures (for protected features)

## 🚫 What NOT to Do

- ❌ **Never** manually edit generated TypeScript types
- ❌ **Never** commit TODOs, "quick hacks", or commented-out code
- ❌ **Never** modify database schema without migrations
- ❌ **Never** leave unhandled errors or panics in production code
- ❌ **Never** skip RBAC checks for protected operations
- ❌ **Never** commit secrets, API keys, or sensitive data
- ❌ **Never** introduce breaking changes without migration path
- ❌ **Never** bypass quality gates before committing