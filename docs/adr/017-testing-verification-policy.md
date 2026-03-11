# ADR-017: Comprehensive Testing and Verification Policy

## Status
Accepted

## Context
Maintaining architectural integrity and preventing regressions in a complex Tauri application requires rigorous automated validation.

## Decision

### Testing Standards
- **Bug Fixes**: Require a regression test covering the reported failure state.
- **New Features**: Must include coverage for the success path, input validation failure, and permission/RBAC failure.
- **Location**: Tests reside within the owning domain (`src-tauri/src/domains/[domain]/tests/`).

### Automated Guardrails (CI)
Architectural and technical invariants are enforced by scripts in the `scripts/` directory:

- **Architecture & Boundaries**: `npm run architecture:check` and `npm run backend:boundaries:check` enforce domain isolation and layer hierarchy (`ipc -> application -> domain -> infrastructure`).
- **Type Integrity**: `npm run types:validate` and `npm run types:drift-check` ensure the frontend types are in sync with Rust models.
- **RBAC Consistency**: `node scripts/ipc-authorization-audit.js` verifies that all IPC commands are correctly authenticated and role-checked.
- **Database Health**: `npm run backend:migration:fresh-db-test` validates the migration system by running a full schema initialization in a clean environment.
- **Code Quality**: `node scripts/enforce-complexity-rules.js` and `npm run maintainability:check` bound cyclomatic complexity and maintainability indices.

### Verification Workflow
The `npm run quality:check` command consolidates all critical validators and must pass before merging. It includes:
- Linting and type-checking (frontend and backend).
- Boundary coverage enforcement.
- Migration audit.
- Complexity enforcement.

## Consequences
- Technical debt is capped by automated complexity checks.
- Architectural drift is detected immediately in CI.
- Security and data integrity invariants are verified programmatically.
