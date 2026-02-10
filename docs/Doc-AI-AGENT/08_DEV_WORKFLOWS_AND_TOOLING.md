# RPMA v2 Development Workflows and Tooling

## Development Commands

### Essential Development Commands
```bash
# Start full development environment (recommended)
npm run dev

# Frontend only development
npm run frontend:dev

# Backend only (Rust) development
npm run tauri:dev

# Production build
npm run build

# Type synchronization (critical after model changes)
npm run types:sync

# Type validation
npm run types:validate

# Type drift check
npm run types:drift-check

# Frontend linting and type checking
npm run frontend:lint
npm run frontend:type-check

# Backend compilation check
npm run backend:check

# Backend linting
npm run backend:clippy

# Format Rust code
npm run backend:fmt
```

### Database and Migration Commands
```bash
# Validate migration system
node scripts/validate-migration-system.js

# Migration health check
node scripts/migration-health-check.js

# Database consistency check
npm run db:check

# Reset database (development only)
npm run db:reset

# Seed database with sample data
npm run db:seed
```

### Security and Validation Commands
```bash
# Run security audit
npm run security:audit

# Validate session security
node scripts/validate-session-security.js

# Validate RBAC implementation
node scripts/validate-rbac.js

# Check for hardcoded secrets
node scripts/check-secrets.js
```

## Type Synchronization Workflow

### The Critical Type Sync Process
The synchronization between Rust backend types and TypeScript frontend types is crucial for maintaining type safety:

1. **Model Changes in Rust**: When you modify any Rust model in `src-tauri/src/models/`
2. **Run Type Sync**: Execute `npm run types:sync` to regenerate TypeScript types
3. **Validate Types**: Run `npm run types:validate` to ensure consistency
4. **Check Drift**: Run `npm run types:drift-check` to find discrepancies

### Example Workflow
```bash
# 1. Modify a Rust model
# src-tauri/src/models/task.rs
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct Task {
    pub id: String,
    pub title: String,
    pub urgency_level: Option<String>,  // New field added
    // ... other fields
}

# 2. Regenerate TypeScript types
npm run types:sync
# Output: Types generated successfully in frontend/src/lib/backend.ts

# 3. Validate types
npm run types:validate
# Output: All types are valid

# 4. Check for drift
npm run types:drift-check
# Output: No type drift detected
```

### Type Sync Failure Resolution
```bash
# If type sync fails
npm run types:sync
# Error: Error generating types: field 'urgency_level' not exportable

# Check Rust model
grep -n "urgency_level" src-tauri/src/models/task.rs

# Fix: Add ts attribute or ensure type is exportable
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct Task {
    pub id: String,
    pub title: String,
    #[ts(optional)]  // Add this for Option types
    pub urgency_level: Option<String>,
}

# Run sync again
npm run types:sync
# Success!
```

## Quality Gates

### Pre-commit Validation
The project includes several quality gates that should be passed before committing:

```bash
# Run all quality checks
npm run quality:check

# This script runs:
# 1. Type synchronization check
# 2. Type validation
# 3. Drift check
# 4. Migration system validation
# 5. Security audit
# 6. Frontend linting
# 7. Backend clippy
```

### Individual Quality Scripts

#### Type Validation
```bash
# npm run types:validate
# Validates:
# 1. All TypeScript types are generated
# 2. No missing type exports
# 3. Type structure consistency
```

#### Drift Check
```bash
# npm run types:drift-check
# Checks for:
# 1. Missing TypeScript fields
# 2. Extra TypeScript fields
# 3. Type mismatches between Rust and TS
```

#### Migration Health
```bash
# node scripts/validate-migration-system.js
# Validates:
# 1. Migration file naming
# 2. SQL syntax correctness
# 3. Migration order consistency
# 4. Schema version tracking
```

#### Security Audit
```bash
# npm run security:audit
# Checks for:
# 1. Hardcoded secrets
# 2. Weak dependencies
# 3. Insecure configurations
# 4. Common vulnerability patterns
```

## Development Workflow Scenarios

### Scenario 1: Adding a New Feature

#### 1. Frontend Feature
```bash
# 1. Create new page/route
mkdir -p frontend/src/app/(dashboard)/new-feature
touch frontend/src/app/(dashboard)/new-feature/page.tsx

# 2. Create components
mkdir -p frontend/src/components/new-feature
touch frontend/src/components/new-feature/NewFeatureForm.tsx
touch frontend/src/components/new-feature/NewFeatureList.tsx

# 3. Create IPC domain wrapper
touch frontend/src/lib/ipc/domains/new-feature.ts

# 4. Add validation schemas
touch frontend/src/lib/validations/new-feature.ts
```

#### 2. Backend Feature
```bash
# 1. Create model
touch src-tauri/src/models/new_feature.rs

# 2. Create repository
touch src-tauri/src/repositories/new_feature_repository.rs

# 3. Create service
touch src-tauri/src/services/new_feature.rs

# 4. Create command
touch src-tauri/src/commands/new_feature.rs

# 5. Register command in main.rs
```

#### 3. Synchronize Types
```bash
# After creating model
npm run types:sync
npm run types:validate
npm run types:drift-check
```

#### 4. Quality Checks
```bash
# Run all quality checks before committing
npm run quality:check

# If everything passes:
git add .
git commit -m "feat: add new feature implementation"
```

### Scenario 2: Database Schema Change

#### 1. Create Migration
```bash
# Create new migration file
touch src-tauri/migrations/028_add_new_feature_table.sql
```

#### 2. Write Migration SQL
```sql
-- 028_add_new_feature_table.sql
-- Add new table for new feature

CREATE TABLE IF NOT EXISTS new_features (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'archived')),
    created_by TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT (datetime('now')),
    updated_at DATETIME NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_new_features_status ON new_features(status);
CREATE INDEX IF NOT EXISTS idx_new_features_created_by ON new_features(created_by);
```

#### 3. Update Model
```rust
// src-tauri/src/models/new_feature.rs
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct NewFeature {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub status: NewFeatureStatus,
    pub created_by: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub enum NewFeatureStatus {
    Active,
    Inactive,
    Archived,
}
```

#### 4. Test Migration
```bash
# Validate migration syntax
node scripts/validate-migration-syntax.js src-tauri/migrations/028_add_new_feature_table.sql

# Test on development database
npm run db:migrate
```

#### 5. Update Types
```bash
# Regenerate TypeScript types
npm run types:sync
npm run types:validate
```

### Scenario 3: Fixing a Bug

#### 1. Identify Issue
```bash
# Check logs
tail -f logs/tauri-app.log

# Debug with Rust
RUST_LOG=debug npm run tauri:dev

# Debug with TypeScript
console.log statements or use browser dev tools
```

#### 2. Implement Fix
```bash
# Fix backend code
# Edit src-tauri/src/commands/problem_command.rs

# Fix frontend code
# Edit frontend/src/components/problematic-component.tsx
```

#### 3. Test Fix
```bash
# Run relevant tests
npm test

# Manual testing
npm run dev
```

#### 4. Validate Changes
```bash
# If models changed
npm run types:sync

# Always run
npm run quality:check
```

## CI/CD Integration

### GitHub Actions Workflow
The project includes automated CI/CD that runs same quality checks:

```yaml
# .github/workflows/quality-check.yml
name: Quality Checks

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Setup Rust
      uses: actions-rs/toolchain@v1
      with:
        toolchain: stable
    
    - name: Install dependencies
      run: npm ci
    
    - name: Type synchronization
      run: npm run types:sync
    
    - name: Type validation
      run: npm run types:validate
    
    - name: Type drift check
      run: npm run types:drift-check
    
    - name: Migration validation
      run: node scripts/validate-migration-system.js
    
    - name: Security audit
      run: npm run security:audit
    
    - name: Frontend lint
      run: npm run frontend:lint
    
    - name: Backend clippy
      run: npm run backend:clippy
    
    - name: Run tests
      run: npm test
```

## Build and Release Process

### Development Build
```bash
# Development build with hot reload
npm run dev

# Individual components
npm run frontend:dev  # Frontend only
npm run tauri:dev     # Tauri with frontend
```

### Production Build
```bash
# Build for production
npm run build

# This runs:
# 1. Frontend production build
# 2. Rust backend compilation
# 3. Tauri application bundling
# 4. Type synchronization check
# 5. All quality checks
```

### Platform-Specific Builds
```bash
# Build for specific platforms
npm run tauri:build -- --target x86_64-pc-windows-msvc
npm run tauri:build -- --target x86_64-apple-darwin
npm run tauri:build -- --target x86_64-unknown-linux-gnu

# Build with custom configurations
npm run tauri:build -- --debug
```

## Testing Workflows

### Running Tests
```bash
# Run all tests
npm test

# Frontend unit tests
npm run test:frontend

# Backend unit tests
npm run test:backend

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e
```

### Test Structure
```
tests/
├── frontend/             # Frontend unit tests
│   ├── components/       # Component tests
│   ├── hooks/           # Hook tests
│   └── utils/           # Utility tests
├── backend/             # Backend unit tests
│   ├── commands/        # Command tests
│   ├── services/        # Service tests
│   └── repositories/    # Repository tests
└── integration/         # Integration tests
    ├── api/             # API integration tests
    └── database/        # Database integration tests
```

### Test Coverage
```bash
# Generate coverage report
npm run test:coverage

# View coverage
open coverage/lcov-report/index.html
```

## Environment Configuration

### Development Environment
```bash
# Copy environment template
cp .env.example .env.local

# Configure development variables
# .env.local
DATABASE_URL=sqlite:dev.db
LOG_LEVEL=debug
ENABLE_2FA=false
```

### Production Environment
```bash
# Production environment setup
export DATABASE_URL=sqlite:/data/production.db
export LOG_LEVEL=info
export ENABLE_2FA=true
export JWT_SECRET=$(openssl rand -base64 32)
```

## Performance Monitoring

### Development Profiling
```bash
# Profile Rust backend
RUST_LOG=trace npm run tauri:dev

# Profile frontend
npm run dev:profiling
```

### Performance Metrics
```bash
# Check bundle size
npm run analyze:bundle

# Check startup time
npm run measure:startup

# Database performance
npm run analyze:database
```

## "If You Change X, Run Y" Checklist

| Change X                                    | Run Y                                                               |
|--------------------------------------------|--------------------------------------------------------------------|
| Rust model in `src-tauri/src/models/`      | `npm run types:sync && npm run types:validate`                     |
| Database schema (migration)                 | `npm run db:migrate && node scripts/validate-migration-system.js`   |
| Frontend component with new API usage       | `npm run frontend:type-check`                                       |
| New IPC command                             | `npm run types:sync && npm run backend:check`                       |
| Authentication logic                        | `node scripts/validate-session-security.js`                         |
| Authorization/permissions                   | `node scripts/validate-rbac.js`                                    |
| User roles or permissions                   | `npm run security:audit && npm run test:integration`               |
| Dependencies                                | `npm audit && npm run frontend:lint`                               |
| Rust code                                   | `npm run backend:clippy && npm run backend:fmt`                   |
| Before committing                           | `npm run quality:check`                                             |
| Before pushing to main                      | `npm run test && npm run build`                                     |

This checklist ensures all necessary validations are performed after specific types of changes, maintaining code quality and consistency throughout the development process.