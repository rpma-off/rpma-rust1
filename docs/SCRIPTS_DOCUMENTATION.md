# Project Scripts Documentation

This document provides a comprehensive guide to the scripts used in the **RPMA-Rust** project. These scripts are primarily located in the `scripts/` directory and are used for database management, type synchronization, migrations, security auditing, and general development workflows.

## 📂 Root Directory Scripts

These batch files are convenience wrappers for managing the development environment on Windows.

| Script | Description | Usage |
|--------|-------------|-------|
| `start_dev.bat` | Starts the RPMA v2 development server. It runs type synchronization (`npm run types:sync`), sets the `JWT_SECRET` environment variable, and launches the Tauri application in dev mode. | Double-click or run `./start_dev.bat` in terminal. |
| `stop_dev.bat` | Stops the development server by forcibly killing `node.exe` and `tauri.exe` processes. Useful for ensuring a clean shutdown. | Double-click or run `./stop_dev.bat` in terminal. |

---

## 📂 Database Management Scripts

These scripts are located in `scripts/` and are used to inspect, validate, and repair the SQLite database (`rpma.db`).

### Inspection & Health Checks

#### `check_db.js`
*   **Description**: A general database inspection tool.
*   **Utility**: Checks the schema of `interventions` and `intervention_steps` tables, verifies the existence of specific columns (like `device_timestamp`), counts records, and reports the current schema version.
*   **Usage**: `node scripts/check_db.js`

#### `check_db_schema.js`
*   **Description**: detailed schema inspector.
*   **Utility**: Lists all tables and triggers in the database. It also queries the `schema_version` table to show the history of applied migrations.
*   **Usage**: `node scripts/check_db_schema.js`

#### `check_clients_db.js`
*   **Description**: Inspects the `clients` table.
*   **Utility**: Verifies if `clients` and `clients_fts` (Full Text Search) tables exist, counts client records, and fetches usage samples.
*   **Usage**: `node scripts/check_clients_db.js`

#### `check_client_tasks.js`
*   **Description**: Analyzes the relationship between tasks and clients.
*   **Utility**: Counts tasks linked to clients, verifies foreign key integrity, and samples task data including client names.
*   **Usage**: `node scripts/check_client_tasks.js`

### Repair & Maintenance

#### `cleanup_db.js`
*   **Description**: A repair script for fixing corrupted database states.
*   **Utility**: Drops problematic triggers (e.g., `chk_material_consumption_quality_trigger`), cleans up leftover temporary tables (`_new`), and allows resetting the schema version to a specific safe state (Version 12).
*   **Usage**: `node scripts/cleanup_db.js`

---

## 📂 Type System & Drift Detection

These scripts ensure that the TypeScript frontend types remain perfectly in sync with the Rust backend types.

### Core Type Scripts

#### `write-types.js`
*   **Description**: The bridge script for type generation.
*   **Utility**: Reads type definitions from `stdin` (piped from `cargo run ... export-types`) and writes them to `frontend/src/lib/backend.ts`. It validates that critical exports like `TaskStatus` are present before writing.
*   **Usage**: Used internally by `npm run types:sync`.

#### `validate-types.js`
*   **Description**: validatesthe generated `backend.ts` file.
*   **Utility**: Checks for the presence of required interfaces and enums (as defined in `EXPECTED_TYPES`). It looks for common issues like low definition counts or missing string-serialized timestamp fields.
*   **Usage**: `node scripts/validate-types.js` (or via `npm run types:validate`)

### Drift Detection

#### `check-type-drift.js`
*   **Description**: Analyzes consistency between Rust source code and generated TypeScript types.
*   **Utility**: Scans Rust files for `derive(TS)` or `derive(specta::Type)` and compares them against `backend.ts`. It generates a detailed report (`type-drift-report.json`) of missing or duplicate types.
*   **Usage**: `node scripts/check-type-drift.js`

#### `ci-type-drift-check.js`
*   **Description**: A stricter drift check designed for CI/CD environments.
*   **Utility**: Generates fresh types in a temporary directory and compares them byte-for-byte with the current `backend.ts`. Fails the build if there are differences.
*   **Usage**: `node scripts/ci-type-drift-check.js` (or via `npm run types:ci-drift-check`)

### Documentation

#### `generate-type-docs.js`
*   **Description**: Automates documentation generation for types.
*   **Utility**: Parses `backend.ts` and creates Markdown files in `docs/types/` describing the available data structures.
*   **Usage**: `node scripts/generate-type-docs.js`

#### `test-type-integration.js`
*   **Description**: A comprehensive integration test suite for the type system.
*   **Utility**: Creates temporary test files to verify that backend types, IPC responses, and Zod validation schemas are all aligned.
*   **Usage**: `node scripts/test-type-integration.js`

---

## 📂 Migrations & Schema Management

Scripts to manage, test, and validate database migrations (`.sql` files in `src-tauri/migrations`).

### Migration Validation

#### `validate-migration-system.js`
*   **Description**: The master validation script for the entire migration system.
*   **Utility**: Runs a battery of tests: component validation (tests, health checks), integration checks (file structure, deps), and performance analysis. Generates a score and a JSON report.
*   **Usage**: `node scripts/validate-migration-system.js`

#### `test-migrations.js`
*   **Description**: A test runner for SQL migrations.
*   **Utility**: Creates a database snapshot, applies migrations, and verifies their success. It also performs basic SQL syntax validation on migration files.
*   **Usage**: `node scripts/test-migrations.js`

#### `migration-health-check.js`
*   **Description**: Monitors the health regarding migrations.
*   **Utility**: Checks for gaps in migration sequence numbers, outdated test results, and potential syntax issues in SQL files (e.g., `DROP TABLE` without `IF EXISTS`).
*   **Usage**: `node scripts/migration-health-check.js`

#### `detect-schema-drift.js`
*   **Description**: Static analysis tool for schema drift.
*   **Utility**: Parses `schema.sql` and checks if expected indexes, foreign keys, and required columns are present.
*   **Usage**: `node scripts/detect-schema-drift.js`

---

## 📂 Security & Auditing

#### `security-audit.js`
*   **Description**: A general security scanning tool.
*   **Utility**: Checks for:
    *   Weak or missing environment variables (`JWT_SECRET`).
    *   File permissions of sensitive files.
    *   Missing security dependencies (like `argon2`, `aes-gcm`).
    *   Hardcoded secrets in source code.
*   **Usage**: `node scripts/security-audit.js` (via `npm run security:audit`)

#### `ipc-authorization-audit.js`
*   **Description**: Specifically audits Tauri IPC commands.
*   **Utility**: Scans `src-tauri/src/commands` for functions exposed to the frontend. It verifies if they use the `authenticate!` macro or have a `session_token` parameter. Flags any "public" command that isn't on the allowlist.
*   **Usage**: `node scripts/ipc-authorization-audit.js`

---

## 📦 NPM Script Mapping

These are the commands available in `package.json` and the scripts they execute:

| NPM Command | Executes | Purpose |
|-------------|----------|---------|
| `dev` | `npm run types:sync && set JWT... && npm run tauri dev` | Full dev start (Win). |
| `types:sync` | `cargo run --bin export-types ... | node scripts/write-types.js` | Generates TS types from Rust. |
| `types:validate` | `node scripts/validate-types.js` | Validates generated types. |
| `types:drift-check` | `node scripts/check-type-drift.js` | Checks for type drift. |
| `types:ci-drift-check` | `node scripts/ci-type-drift-check.js` | CI/CD strict drift check. |
| `types:generate-docs` | `node scripts/generate-type-docs.js` | Generates markdown docs for types. |
| `ci:validate` | `bash scripts/ci-type-check.sh` | Runs CI validation suite. |
| `security:audit` | `node scripts/security-audit.js` | Runs security audit. |
| `performance:test` | `node scripts/performance-regression-test.js` | Runs performance tests. |
| `git:start-feature` | `node scripts/git-workflow.js start-feature <name>` | Sync main and create a new feature branch. |
| `git:sync-feature` | `node scripts/git-workflow.js sync-feature` | Rebase current feature branch on `origin/main`. |
| `git:finish-feature` | `node scripts/git-workflow.js finish-feature` | Push current feature branch with upstream tracking. |
| `git:cleanup-feature` | `node scripts/git-workflow.js cleanup-feature [branch]` | Update `main` and delete local feature branch. |
| `git:guard-main` | `node scripts/git-workflow.js guard-main` | Blocks unsafe direct pushes from local `main`. |

## Text Encoding Guard

#### `check-mojibake.js`
*   **Description**: Detects mojibake signatures in frontend source files.
*   **Utility**: Scans for corrupted sequences such as `é`, `«`, `’`, and replacement characters.
*   **Usage**:
    *   `cd frontend && npm run encoding:check`
    *   `npm run frontend:encoding-check`
*   **Guideline**: Keep source files saved as UTF-8 and avoid legacy recoding.

## Git Workflow Automation

#### `git-workflow.js`
*   **Description**: Automates a safe feature-branch workflow around `main`.
*   **Commands**:
    *   `npm run git:start-feature -- my-change`
    *   `npm run git:sync-feature`
    *   `npm run git:finish-feature`
    *   `npm run git:cleanup-feature -- feat/my-change`
*   **Safety**:
    *   Refuses to run when a merge is in progress.
    *   Refuses unsafe operations on `main`.
    *   `pre-push` hook runs `npm run git:guard-main`.
