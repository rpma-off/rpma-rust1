# ADR-002: Transaction Boundaries

## Status
Accepted

## Context
Database transactions must be controlled at the application layer to ensure consistency while keeping infrastructure concerns out of domain logic.

## Decision
- DB transactions are started and committed only in `domains/*/application/` services.
- Infrastructure repositories receive a `&rusqlite::Transaction` parameter and execute within it.
- The `Database::with_transaction` helper is the sole entry point for transactional work.
- SQL strings and `rusqlite` usage are restricted to `infrastructure/` and `shared/db/` modules only.

## Consequences
- Business logic in the application layer controls commit/rollback scope.
- Repository methods are pure data-access operations with no side-effect control.
- The architecture check script enforces SQL-free application and domain layers.
