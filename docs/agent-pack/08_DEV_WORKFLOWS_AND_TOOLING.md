# 08 - Dev Workflows and Tooling

## Development Commands

### Core Development

```bash
# Start full development environment (frontend + backend)
npm run dev

# Start frontend only (Next.js dev server)
npm run frontend:dev

# Start backend only (Tauri)
npm run tauri dev

# Build for production
npm run build

# Production build (optimized)
npm run backend:build:release
```

---

## Type Synchronization

**MOST IMPORTANT**: Always run after modifying Rust models with `#[derive(Serialize, Deserialize, TS)]`.

```bash
# Regenerate TypeScript types from Rust (via export-types binary)
npm run types:sync
```

**What it does**:
1. Runs `cargo run --bin export-types` (located at `src-tauri/src/bin/export-types.rs`)
2. Captures JSON output of all exported Rust types
3. Parses JSON with `scripts/write-types.js`
4. Generates `frontend/src/lib/backend.ts` with TypeScript interfaces

**Validation**:
```bash
npm run types:validate         # Validate consistency of generated types
npm run types:drift-check      # Check for type drift between Rust and TS
npm run types:ci-drift-check   # CI-specific drift check (stricter)
npm run types:generate-docs    # Generate type documentation in Markdown
```

⚠️ **CRITICAL**: Never manually edit `frontend/src/lib/backend.ts`! Always regenerate.

---

## Quality Checks (Pre-Commit)

### Run All Quality Gates

```bash
npm run quality:check
```

**Runs**:
1. Frontend linting (ESLint)
2. Frontend type checking (TypeScript)
3. Bounded contexts validation (`validate:bounded-contexts`)
4. Backend check (Cargo check)
5. Backend linting (Clippy)
6. Backend formatting check (Rustfmt `--check`)
7. Architecture check (`architecture:check`)

---

### Individual Quality Commands

#### Frontend

```bash
npm run frontend:lint           # ESLint
npm run frontend:lint -- --fix  # Auto-fix
npm run frontend:type-check     # TypeScript
npm run frontend:encoding-check # Encoding issues
```

#### Backend

```bash
npm run backend:check           # Cargo check
npm run backend:clippy          # Clippy linting
npm run backend:fmt             # Rustfmt formatting
```

---

## Testing

### Frontend Tests

```bash
cd frontend && npm test                    # All tests
cd frontend && npm run test:watch          # Watch mode
cd frontend && npm run test:coverage       # Coverage report
cd frontend && npm run test:coverage:check # With threshold
cd frontend && npm run test:components     # Component tests
cd frontend && npm run test:hooks          # Hook tests
cd frontend && npm run test:integration    # Integration tests
```

**Test Location**: `frontend/src/__tests__/`, `frontend/tests/`

---

### Backend Tests

```bash
cd src-tauri && cargo test                 # All tests
cd src-tauri && cargo test --lib           # Library tests
cd src-tauri && cargo test test_name       # Specific test
cd src-tauri && cargo test migration       # Migration tests
cd src-tauri && cargo test performance     # Performance tests
cd src-tauri && cargo test -- --nocapture  # With output
```

**Test Locations**:
- Unit: `#[cfg(test)] mod tests` in source files
- Integration: `src-tauri/tests/*.rs`

---

### E2E Tests (Playwright)

```bash
cd frontend && npm run test:e2e            # Run E2E tests
cd frontend && npm run test:e2e:ui         # UI mode
cd frontend && npm run test:e2e:debug      # Debug mode
cd frontend && npm run test:e2e:codegen    # Generate code
```

**Test Location**: `frontend/tests/e2e/*.spec.ts`

---

## Scripts Reference

### Root Package.json (45+ scripts)

**Location**: `/home/runner/work/rpma-rust1/rpma-rust1/package.json`

| Category | Scripts | Purpose |
|----------|---------|---------|
| **Dev** | `dev`, `tauri` | Start full development environment |
| **Build** | `build`, `clean` | Production build, cleanup |
| **Frontend** | `frontend:dev`, `frontend:build`, `frontend:lint`, `frontend:type-check`, `frontend:encoding-check`, `frontend:clean`, `frontend:install` | Frontend development |
| **Backend** | `backend:build`, `backend:build:release`, `backend:check`, `backend:clippy`, `backend:fmt` | Backend development |
| **Types** | `types:sync`, `types:validate`, `types:drift-check`, `types:ci-drift-check`, `types:generate-docs` | Type management |
| **Quality** | `quality:check`, `security:audit`, `duplication:detect`, `code-review:check`, `architecture:check`, `validate:bounded-contexts` | Quality gates |
| **Bundle** | `bundle:analyze`, `bundle:check-size` | Bundle analysis |
| **Performance** | `performance:test`, `performance:update-baseline` | Performance testing |
| **Git** | `git:start-feature`, `git:sync-feature`, `git:finish-feature`, `git:cleanup-feature`, `git:guard-main` | Git workflow automation |
| **CI** | `ci:validate`, `prepare` (husky) | CI/CD integration |

---

### Scripts in `scripts/` Directory

**Location**: `/home/runner/work/rpma-rust1/rpma-rust1/scripts/`

| Script | Purpose | Usage |
|--------|---------|-------|
| **Type Management** |
| `write-types.js` | Convert Rust types to TypeScript | Called by `npm run types:sync` |
| `validate-types.js` | Validate generated types | `npm run types:validate` |
| `check-type-drift.js` | Detect Rust/TS mismatches | `npm run types:drift-check` |
| `ci-type-drift-check.js` | CI-specific drift check | `npm run types:ci-drift-check` |
| `generate-type-docs.js` | Generate type documentation | `npm run types:generate-docs` |
| `test-type-integration.js` | Integration tests for types | Manual |
| **Security** |
| `security-audit.js` | Comprehensive security scan | `npm run security:audit` |
| `ipc-authorization-audit.js` | Check IPC auth | `node scripts/ipc-authorization-audit.js` |
| **Migration** |
| `validate-migration-system.js` | Validate migrations | Manual |
| `test-migrations.js` | Test migration execution | Manual |
| `migration-health-check.js` | Migration status | Manual |
| `detect-schema-drift.js` | Detect schema changes | Manual |
| **Database** |
| `check_db.js` | Database connectivity | Manual |
| `check_db_schema.js` | Schema validation | Manual |
| `cleanup_db.js` | Clean test data | Manual |
| `check_clients_db.js` | Client table checks | Manual |
| `check_client_tasks.js` | Client-task relationships | Manual |
| `verify_user_settings.js` | User settings validation | Manual |
| **Code Quality** |
| `check-bundle-size.js` | Bundle analysis | `npm run bundle:check-size` |
| `detect-duplication.js` | Code duplication | `npm run duplication:detect` |
| `check-mojibake.js` | Encoding issues | Manual |
| `fix-encoding.js` | Fix encoding issues | `npm run fix:encoding` |
| **Git** |
| `git-workflow.js` | Git automation | `npm run git:start-feature`, etc. |
| **CI/CD** |
| `ci-type-check.sh` | CI type validation | `npm run ci:validate` |
| `test-health-check.sh` | Health check tests | Manual |

---

## "If You Change X, Run Y" Checklist

### ✅ After modifying Rust models:
```bash
npm run types:sync
npm run types:validate
```

### ✅ After modifying database schema:
```bash
# Create new migration file in src-tauri/migrations/ (NOT the root migrations/ dir!)
touch src-tauri/migrations/NNN_description.sql
# Edit with your SQL changes

# Validate migration system
node scripts/validate-migration-system.js

# Migrations auto-apply on startup
npm run dev

# Or test specific migration
node scripts/test-migrations.js [NNN]
```

### ✅ After adding new IPC command:
```bash
# 1. Implement command in src-tauri/src/commands/
# 2. Register in main.rs invoke_handler! (lines 69-250)
# 3. Sync types if new models added
npm run types:sync

# 4. Audit IPC authorization
node scripts/ipc-authorization-audit.js

# 5. Add frontend IPC function
# Edit frontend/src/lib/ipc/domains/[domain].ts
```

### ✅ After modifying dependencies:
```bash
cd frontend && npm install
cd src-tauri && cargo build
npm run security:audit
```

### ✅ Before committing:
```bash
npm run quality:check
```

### ✅ Before pushing to production:
```bash
npm run quality:check
npm run test
npm run types:drift-check
node scripts/security-audit.js
```

---

## Performance Testing

```bash
npm run performance:test           # Performance regression
npm run performance:update-baseline # Update baselines
```

**What it tests**:
- IPC command latency
- Database query performance
- Frontend render time

---

## Development Workflow Example

### Add "Archive Task" Feature

1. **Start development**: `npm run dev`
2. **Create branch**: `npm run git:start-feature archive-task`
3. **Modify Rust model** (if needed): `src-tauri/src/models/task.rs`
4. **Sync types**: `npm run types:sync`
5. **Add repository method**: `src-tauri/src/repositories/task_repository.rs`
6. **Add service method**: `src-tauri/src/services/task.rs`
7. **Add IPC command**: `src-tauri/src/commands/task/facade.rs`
8. **Register in main.rs**: Add to `invoke_handler`
9. **Add frontend IPC**: `frontend/src/lib/ipc/domains/tasks.ts`
10. **Add UI component**: `frontend/src/components/tasks/`
11. **Test locally**
12. **Quality check**: `npm run quality:check`
13. **Run tests**: `npm run test`
14. **Commit**: `git commit -m "feat: add task archive"`
15. **Push**: `git push origin feature/archive-task`

---

## Troubleshooting

### Issue: "Types out of sync"
```bash
npm run types:sync
npm run types:validate
```

### Issue: "Cargo build failed"
```bash
cd src-tauri && cargo check && cargo clippy
```

### Issue: "Migration failed"
```bash
node scripts/validate-migration-system.js
```

### Issue: "Frontend won't start"
```bash
cd frontend && npm install && rm -rf .next && npm run dev
```

---

## Next Steps

- **User flows**: [09_USER_FLOWS_AND_UX.md](./09_USER_FLOWS_AND_UX.md)
- **Backend guide**: [04_BACKEND_GUIDE.md](./04_BACKEND_GUIDE.md)
- **Database guide**: [07_DATABASE_AND_MIGRATIONS.md](./07_DATABASE_AND_MIGRATIONS.md)
