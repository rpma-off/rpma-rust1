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

**MOST IMPORTANT**: Always run after modifying Rust models.

```bash
# Regenerate TypeScript types from Rust
npm run types:sync
```

**What it does**:
1. Runs `cargo run --bin export-types`
2. Parses JSON output
3. Generates `frontend/src/lib/backend.ts`

**Validation**:
```bash
npm run types:validate        # Validate consistency
npm run types:drift-check     # Check for type drift
npm run types:generate-docs   # Generate type documentation
```

⚠️ **WARNING**: Never manually edit `frontend/src/lib/backend.ts`!

---

## Quality Checks (Pre-Commit)

### Run All Quality Gates

```bash
npm run quality:check
```

**Runs**:
1. Frontend linting (ESLint)
2. Frontend type checking (TypeScript)
3. Backend check (Cargo check)
4. Backend linting (Clippy)
5. Backend formatting (Rustfmt)
6. Type drift check
7. Security audit

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

### Root Package.json (45 scripts)

| Category | Scripts |
|----------|---------|
| **Dev** | `dev`, `tauri` |
| **Build** | `build` |
| **Frontend** | `frontend:dev`, `frontend:build`, `frontend:lint`, `frontend:type-check`, `frontend:clean` |
| **Backend** | `backend:build`, `backend:build:release`, `backend:check`, `backend:clippy`, `backend:fmt` |
| **Types** | `types:sync`, `types:validate`, `types:drift-check`, `types:ci-drift-check`, `types:generate-docs` |
| **Quality** | `quality:check`, `security:audit`, `duplication:detect`, `code_review:check` |
| **Bundle** | `bundle:analyze`, `bundle:check-size` |
| **Performance** | `performance:test`, `performance:update-baseline` |
| **Git** | `git:start-feature`, `git:sync-feature`, `git:finish-feature`, `git:cleanup-feature`, `git:guard-main` |
| **CI** | `ci:validate` |

---

### Scripts in `scripts/` Directory

| Script | Purpose |
|--------|---------|
| **Type Management** |
| `write-types.js` | Convert Rust types to TypeScript |
| `validate-types.js` | Validate generated types |
| `check-type-drift.js` | Detect Rust/TS mismatches |
| `generate-type-docs.js` | Generate type documentation |
| **Security** |
| `security-audit.js` | Comprehensive security scan |
| `ipc-authorization-audit.js` | Check IPC auth |
| **Migration** |
| `validate-migration-system.js` | Validate migrations |
| `test-migrations.js` | Test migration execution |
| `migration-health-check.js` | Migration status |
| `detect-schema-drift.js` | Detect schema changes |
| **Database** |
| `check_db.js` | Database connectivity |
| `check_db_schema.js` | Schema validation |
| `cleanup_db.js` | Clean test data |
| **Code Quality** |
| `check-bundle-size.js` | Bundle analysis |
| `detect-duplication.js` | Code duplication |
| `check-mojibake.js` | Encoding issues |
| **Git** |
| `git-workflow.js` | Git automation |

---

## "If You Change X, Run Y" Checklist

### ✅ After modifying Rust models:
```bash
npm run types:sync
npm run types:validate
```

### ✅ After modifying database schema:
```bash
touch migrations/NNN_description.sql
node scripts/validate-migration-system.js
npm run dev  # Migrations auto-apply
```

### ✅ After adding new IPC command:
```bash
# Register in main.rs
npm run types:sync
node scripts/ipc-authorization-audit.js
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
