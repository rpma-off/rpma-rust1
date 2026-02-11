# GitHub Copilot Instructions for RPMA v2

## Project Overview

RPMA v2 is an **offline-first desktop application** built with Tauri (Rust + system webview) for managing Paint Protection Film (PPF) interventions. The application handles tasks, interventions, workflow steps, photo management, inventory tracking, reporting, and user management with role-based access control.

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

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **UI Library**: shadcn/ui (Radix UI primitives)
- **Backend**: Rust with Tauri framework
- **Database**: SQLite with WAL mode
- **State Management**: React hooks, Context API, Zustand
- **Authentication**: JWT tokens with 2FA support
- **Type Safety**: Automatic TypeScript generation from Rust models using `ts-rs`
- **Testing**: Vitest (frontend), Rust built-in tests (backend)

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

## 🔒 Security Guidelines

### Authentication
- Use JWT tokens for session management
- Support 2FA with TOTP
- Store session tokens securely
- Validate tokens on every protected endpoint

### RBAC Implementation
- Define user roles: Admin, Manager, Technician, Viewer
- Check permissions at the command handler level
- Enforce data access restrictions in repositories
- Never expose privileged operations to unprivileged users

### Input Validation
- Validate all user inputs at command handler level
- Use Rust's type system for compile-time safety
- Sanitize data before database operations
- Return clear error messages without leaking sensitive info

### Data Protection
- Use SQLite WAL mode for data integrity
- Implement proper error handling for database operations
- Ensure offline-first design doesn't compromise security
- Protect sensitive data (passwords, tokens) appropriately

## 📝 Coding Standards

### Rust
- Follow Rust naming conventions (snake_case for functions/variables, PascalCase for types)
- Use `rustfmt` for consistent formatting
- Run `clippy` and address all warnings
- Prefer `Result<T, E>` over panics
- Document public APIs with doc comments (`///`)
- Use `#[derive(Serialize, Deserialize, TS)]` for models shared with frontend

### TypeScript/React
- Use functional components with hooks
- Follow ESLint rules strictly
- Use TypeScript's strict mode
- Prefer interfaces over types for object shapes
- Use meaningful variable and function names
- Extract reusable logic into custom hooks
- Keep components under 200 lines when possible

### Tailwind CSS
- Use utility classes consistently
- Follow mobile-first responsive design
- Leverage shadcn/ui components
- Extract repeated patterns into components

## 🚫 What NOT to Do

- ❌ **Never** manually edit generated TypeScript types
- ❌ **Never** commit TODOs, "quick hacks", or commented-out code
- ❌ **Never** modify database schema without migrations
- ❌ **Never** leave unhandled errors or panics in production code
- ❌ **Never** skip RBAC checks for protected operations
- ❌ **Never** commit secrets, API keys, or sensitive data
- ❌ **Never** introduce breaking changes without migration path
- ❌ **Never** bypass quality gates before committing

## 📚 Additional Resources

- **Architecture**: See `docs/ARCHITECTURE.md` for detailed architecture documentation
- **Deployment**: See `docs/DEPLOYMENT.md` for deployment guidelines
- **API Documentation**: Auto-generated from Rust code
- **Component Library**: shadcn/ui documentation at ui.shadcn.com
- **Tauri Docs**: tauri.app/v1/guides

## 💡 Tips for AI Assistants

1. **Always prefer copying existing patterns** over creating new ones
2. **Make the smallest possible change** that solves the problem
3. **Keep layer responsibilities separated** - respect the architecture
4. **Run quality checks early and often** to catch issues quickly
5. **When in doubt, check existing code** for similar implementations
6. **Test thoroughly** - include success and failure cases
7. **Update documentation** if behavior changes
8. **Keep diffs small and reviewable** - break large changes into smaller PRs

## 🔄 Common Workflows

### Adding a New Feature
1. Plan which layers are affected
2. Create/update Rust models with `#[derive(TS)]`
3. Add repository methods for data access
4. Implement business logic in services
5. Create IPC command handlers
6. Run `npm run types:sync` to generate TypeScript types
7. Implement frontend UI and state management
8. Add tests at each layer
9. Run `npm run quality:check`
10. Update documentation

### Fixing a Bug
1. Write a failing test that reproduces the bug
2. Identify the layer where the bug exists
3. Make the minimal fix in the appropriate layer
4. Verify the test now passes
5. Run `npm run quality:check`
6. Add regression test if not already covered

### Refactoring
1. Ensure existing tests pass
2. Make incremental changes
3. Run tests after each change
4. Maintain the same external behavior
5. Run `npm run quality:check`
6. Update documentation if public APIs changed

---

**Remember**: This is an offline-first application. Always design with local data storage as the source of truth, not as a cache of remote data.
