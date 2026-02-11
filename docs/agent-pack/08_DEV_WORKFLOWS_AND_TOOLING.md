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

# Production build (optimized, no debug symbols)
npm run backend:build:release
```

---

## Type Synchronization

**MOST IMPORTANT**: Always run after modifying Rust models with `#[derive(TS)]`.

### Type Sync Workflow

```bash
# Regenerate TypeScript types from Rust
npm run types:sync
```

**What it does**:
1. Runs `cargo run --bin export-types` (Rust binary that exports all TS-annotated types to JSON)
2. Parses JSON output
3. Generates TypeScript files in `frontend/src/types/`

**Generated Files**:
- `frontend/src/types/database.types.ts`
- `frontend/src/types/unified.ts`
- Other domain-specific type files

**⚠️  WARNING**: These files are auto-generated. **DO NOT edit manually!**

---

### Type Validation

```bash
# Validate type consistency
npm run types:validate

# Check for type drift (frontend vs backend)
npm run types:drift-check

# Generate type documentation (markdown)
npm run types:generate-docs
```

**Type Drift Check**:
- Compares Rust model signatures with generated TypeScript types
- Flags mismatches (e.g., field added in Rust but not in TS)
- **Run this before committing** to catch type sync issues

**Example Output**:
```
✅ Task types match
✅ Client types match
❌ Intervention types MISMATCH
   - Rust has field 'quality_score: Option<i32>'
   - TypeScript missing this field
   Run 'npm run types:sync' to fix.
```

---

## Quality Checks (Pre-Commit)

### Run All Quality Gates

```bash
# Run all quality checks (recommended before every commit)
npm run quality:check
```

**What it runs**:
1. Frontend linting (ESLint)
2. Frontend type checking (TypeScript)
3. Backend check (Cargo check)
4. Backend linting (Clippy)
5. Backend formatting (Rustfmt)
6. Type drift check
7. Security audit

---

### Individual Quality Commands

#### Frontend Quality

```bash
# Lint JavaScript/TypeScript code
npm run frontend:lint

# Fix auto-fixable lint errors
npm run frontend:lint -- --fix

# Type check TypeScript
npm run frontend:type-check

# Check encoding issues (e.g., mojibake)
npm run frontend:encoding-check
```

#### Backend Quality

```bash
# Check Rust code (compilation errors)
npm run backend:check

# Lint Rust code (Clippy)
npm run backend:clippy

# Format Rust code (Rustfmt)
npm run backend:fmt

# Run all Rust checks
npm run backend:check && npm run backend:clippy && npm run backend:fmt
```

---

## Testing

### Frontend Tests

```bash
# Run all frontend tests (Jest)
npm run test:frontend

# Run tests in watch mode
npm run test:frontend -- --watch

# Run specific test file
npm run test:frontend -- TaskCard.test.tsx

# Generate coverage report
npm run test:frontend -- --coverage
```

**Test Location**: `frontend/src/__tests__/`

---

### Backend Tests

```bash
# Run all Rust tests
npm run test:backend

# Run specific test
cd src-tauri && cargo test test_create_task

# Run tests with output
cd src-tauri && cargo test -- --nocapture

# Run integration tests only
cd src-tauri && cargo test --test '*'
```

**Test Locations**:
- Unit tests: `src-tauri/src/**/*_tests.rs` or `#[cfg(test)] mod tests` in source files
- Integration tests: `src-tauri/tests/*.rs`

---

### End-to-End Tests (Playwright)

```bash
# Run E2E tests
npm run test:e2e

# Run specific test file
npm run test:e2e -- login.spec.ts

# Run in UI mode (interactive)
npm run test:e2e -- --ui
```

**Test Location**: `frontend/tests/e2e/*.spec.ts`

---

## Scripts Reference

RPMA v2 has **24 validation and automation scripts** in `scripts/`.

### Type Management Scripts

#### 1. `check-type-drift.js`

**Purpose**: Detect mismatches between Rust and TypeScript types

**Usage**: `npm run types:drift-check`

**What it checks**:
- Field name mismatches
- Field type mismatches
- Missing fields in TS that exist in Rust
- Extra fields in TS that don't exist in Rust

**Output**:
```
Checking type drift...
✅ Task: OK
✅ Client: OK
❌ Intervention: DRIFT DETECTED
   - Missing field: quality_score (Rust: Option<i32>)
```

---

#### 2. `write-types.js`

**Purpose**: Convert exported Rust types (JSON) to TypeScript files

**Usage**: Called automatically by `npm run types:sync`

**Reads**: Output from `cargo run --bin export-types`

**Writes**: `frontend/src/types/*.ts`

---

#### 3. `validate-types.js`

**Purpose**: Validate generated TypeScript types

**Usage**: `npm run types:validate`

**Checks**:
- All types are syntactically valid TypeScript
- No circular dependencies
- Imports are correct

---

#### 4. `generate-type-docs.js`

**Purpose**: Generate markdown documentation for all types

**Usage**: `npm run types:generate-docs`

**Output**: `docs/types/` (auto-generated type reference)

---

### Security & RBAC Scripts

#### 5. `security-audit.js`

**Purpose**: Comprehensive security audit

**Usage**: `npm run security:audit`

**Checks**:
- Dependency vulnerabilities (npm audit + cargo audit)
- Hardcoded secrets in code
- Insecure patterns (e.g., `eval()`, `dangerouslySetInnerHTML`)
- RBAC violations
- Session security

**Output**:
```
Security Audit Results:
✅ No npm vulnerabilities
✅ No cargo vulnerabilities
❌ Found potential hardcoded secret in auth.rs:42
⚠️  3 commands missing session token validation
```

---

#### 6. `ipc-authorization-audit.js`

**Purpose**: Ensure all protected IPC commands require session token

**Usage**: `node scripts/ipc-authorization-audit.js`

**Output**:
```
IPC Authorization Audit:
✅ task_create - Protected
✅ task_update - Protected
❌ task_export - MISSING SESSION TOKEN CHECK
✅ client_create - Protected
```

---

#### 7. `validate-rbac.js`

**Purpose**: Validate RBAC implementation

**Usage**: `node scripts/validate-rbac.js`

**Checks**:
- All commands have appropriate role checks
- No privilege escalation vulnerabilities
- Consistent permission enforcement

---

### Migration & Database Scripts

#### 8. `validate-migration-system.js`

**Purpose**: Validate migration files

**Usage**: `node scripts/validate-migration-system.js`

**Checks**:
- Sequential numbering
- Idempotency (IF NOT EXISTS)
- SQL syntax
- Foreign key validity

---

#### 9. `test-migrations.js`

**Purpose**: Test migration application

**Usage**: `node scripts/test-migrations.js [migration_number]`

**Example**:
```bash
node scripts/test-migrations.js 029
```

---

#### 10. `migration-health-check.js`

**Purpose**: Check database migration status

**Usage**: `node scripts/migration-health-check.js`

**Output**:
```
Current schema version: 28
Pending migrations: 029, 030
Database integrity: OK
```

---

#### 11. `detect-schema-drift.js`

**Purpose**: Detect schema changes not reflected in migrations

**Usage**: `node scripts/detect-schema-drift.js`

---

### Database Utilities

#### 12. `check_db.js`

**Purpose**: Check database connectivity and structure

**Usage**: `node scripts/check_db.js`

---

#### 13. `check_db_schema.js`

**Purpose**: Validate database schema against expected structure

**Usage**: `node scripts/check_db_schema.js`

---

#### 14. `cleanup_db.js`

**Purpose**: Clean up test data and orphaned records

**Usage**: `node scripts/cleanup_db.js`

---

### Code Quality Scripts

#### 15. `check-bundle-size.js`

**Purpose**: Analyze frontend bundle size

**Usage**: `npm run bundle:check-size`

**Output**:
```
Bundle Size Report:
- main.js: 245 KB (within limit: 300 KB)
- vendor.js: 512 KB (⚠️  exceeds recommended: 500 KB)
```

---

#### 16. `check-mojibake.js`

**Purpose**: Detect encoding issues (mojibake characters)

**Usage**: `node scripts/check-mojibake.js`

---

### Git Workflow Scripts

#### 17. `git-workflow.js`

**Purpose**: Automated Git workflow management

**Usage**:
```bash
# Start a new feature branch
npm run git:start-feature my-feature

# Sync feature branch with main
npm run git:sync-feature

# Finish feature (merge to main)
npm run git:finish-feature

# Clean up merged branches
npm run git:cleanup-feature

# Guard main branch (prevent direct commits)
npm run git:guard-main
```

---

## "If You Change X, You Must Run Y" Checklist

### ✅ After modifying Rust models:
```bash
npm run types:sync
npm run types:validate
```

### ✅ After modifying database schema:
```bash
# Create migration
touch src-tauri/migrations/NNN_description.sql

# Validate migration
node scripts/validate-migration-system.js

# Test migration
npm run dev  # Migrations auto-apply
```

### ✅ After adding new IPC command:
```bash
# Register in main.rs
# Run type sync
npm run types:sync

# Verify RBAC
node scripts/ipc-authorization-audit.js
```

### ✅ After modifying dependencies:
```bash
# Frontend
cd frontend && npm install

# Backend
cd src-tauri && cargo build

# Security check
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

## Continuous Integration (CI) Commands

**Note**: CI is configured in `.github/workflows/` (TODO: verify if configured)

### CI Quality Check

```bash
npm run ci:validate
```

**Runs**:
- All quality checks
- All tests
- Security audit
- Type drift check

---

## Performance Testing

### Performance Regression Test

```bash
# Run performance tests
npm run performance:test

# Update performance baselines
npm run performance:update-baseline
```

**What it tests**:
- IPC command latency
- Database query performance
- Frontend render time

---

## Development Workflow Example

### Scenario: Add "Archive Task" Feature

1. **Start development**:
   ```bash
   npm run dev
   ```

2. **Create feature branch**:
   ```bash
   npm run git:start-feature archive-task
   ```

3. **Add Rust model changes** (if needed):
   ```rust
   // src-tauri/src/models/task.rs
   pub enum TaskStatus {
       // ... existing
       Archived,  // ← NEW
   }
   ```

4. **Sync types**:
   ```bash
   npm run types:sync
   ```

5. **Add repository method**:
   ```rust
   // src-tauri/src/repositories/task_repository.rs
   pub fn archive_task(&self, task_id: &str) -> RepoResult<Task> { ... }
   ```

6. **Add service method**:
   ```rust
   // src-tauri/src/services/task.rs
   pub async fn archive_task(...) -> Result<Task, AppError> { ... }
   ```

7. **Add IPC command**:
   ```rust
   // src-tauri/src/commands/task/archive.rs
   #[tauri::command]
   pub async fn task_archive(...) -> Result<ApiResponse<Task>, AppError> { ... }
   ```

8. **Register command in main.rs**:
   ```rust
   .invoke_handler(tauri::generate_handler![..., task_archive])
   ```

9. **Add frontend IPC function**:
   ```typescript
   // frontend/src/lib/ipc/domains/task.ts
   export async function archiveTask(sessionToken: string, taskId: string) { ... }
   ```

10. **Add UI component**:
    ```typescript
    // frontend/src/components/tasks/ArchiveButton.tsx
    ```

11. **Test locally**:
    ```bash
    # Test in UI
    # Verify IPC command works
    ```

12. **Run quality checks**:
    ```bash
    npm run quality:check
    ```

13. **Run tests**:
    ```bash
    npm run test
    ```

14. **Commit changes**:
    ```bash
    git add .
    git commit -m "feat: add task archive functionality"
    ```

15. **Push and create PR**:
    ```bash
    git push origin feature/archive-task
    # Create PR on GitHub
    ```

---

## Troubleshooting Common Issues

### Issue: "Types out of sync" error

**Solution**:
```bash
npm run types:sync
npm run types:validate
```

---

### Issue: "Cargo build failed"

**Check**:
```bash
cd src-tauri
cargo check
cargo clippy
```

**Common fixes**:
- Missing dependency in `Cargo.toml`
- Syntax error in Rust code
- Type mismatch

---

### Issue: "Migration failed"

**Solution**:
```bash
node scripts/validate-migration-system.js
# Check migration SQL syntax
# Verify foreign key references
```

---

### Issue: "Frontend won't start"

**Check**:
```bash
cd frontend
npm install  # Reinstall dependencies
rm -rf .next  # Clear Next.js cache
npm run dev
```

---

## Next Steps

- **User flows**: [09_USER_FLOWS_AND_UX.md](./09_USER_FLOWS_AND_UX.md)
- **Backend guide**: [04_BACKEND_GUIDE.md](./04_BACKEND_GUIDE.md)
- **Database guide**: [07_DATABASE_AND_MIGRATIONS.md](./07_DATABASE_AND_MIGRATIONS.md)
