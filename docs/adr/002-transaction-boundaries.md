# ADR-002: Transaction Boundaries and Persistence Logic

## Status
Accepted

## Context
Database transactions must be controlled at the application layer to ensure multi-step consistency across domain services while keeping infrastructure-specific concerns out of business logic.

## Decision

### Transaction Orchestration
- Database transactions are started, committed, or rolled back exclusively in the **Application Layer**.
- `Database::with_transaction` (`src-tauri/src/db/mod.rs`) and its async counterpart `AsyncDatabase::with_transaction_async` are the mandatory entry points for transactional operations.
- Application services are responsible for determining the scope of the transaction and passing the `&rusqlite::Transaction` handle to infrastructure repositories.

### Repository Pattern
- Infrastructure repositories receive a `&rusqlite::Transaction` or a connection handle as a parameter.
- Repository methods must be "pure" data-access operations with no internal control over transaction lifecycle (commit/rollback).
- SQL statements and `rusqlite` dependencies are strictly confined to the `infrastructure/` and `src-tauri/src/db/` modules.

### Consistency Guards
- The `scripts/architecture-check.js` script enforces that neither the `domain/` nor `application/` layers contain direct SQL queries or database driver imports.
- Complex data transformations requiring application logic during schema evolution are implemented as Rust-based migrations within the transactional framework.

## Consequences
- Business logic remains isolated from the underlying persistence technology.
- Atomic execution of multi-step use cases is guaranteed at the service level.
- Repository code is simplified and highly reusable within different transactional contexts.
