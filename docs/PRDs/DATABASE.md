# Database Schema Documentation

RPMA-Rust uses a local SQLite database for data persistence. This document describes the schema, key entities, and the migration strategy.

## Technical Configuration

*   **Engine**: SQLite 3.
*   **Mode**: WAL (Write-Ahead Logging) enabled for better concurrency.
*   **Security**: Encryption at rest (via `SQLCipher` or similar, triggered by `RPMA_DB_KEY`).
*   **Initialization**: Migrations are applied automatically on application startup.
*   **Pool Management**: `r2d2` with `r2d2-sqlite` for connection pooling.

## Primary Entities

### Users & Authentication
*   `users`: ID, email, password hash, role, status, organization ID.
*   `sessions`: Session token, user ID, expiry, last active timestamp.
*   `two_factor_auth`: TOTP secrets and status for users.
*   `login_attempts`: Tracking failed logins for security.

### Business Entities
*   `organizations`: Company information, branding, and onboarding status.
*   `clients`: Contact details and metadata for customers.
*   `tasks`: Assigned work units, linked to clients and users.
*   `interventions`: The workflow state for an active task, tracking progress through steps.
*   `intervention_steps`: Detailed state for each step in an intervention.
*   `photos`: Metadata for intervention documentation.

### Inventory & Materials
*   `materials`: Name, SKU, stock quantity, thresholds.
*   `inventory_transactions`: History of all stock movements (incoming/consumption/manual).
*   `categories`: Grouping for materials.
*   `suppliers`: Supplier information for materials.

### Quotes & Documentation
*   `quotes`: Pricing, client link, and acceptance status.
*   `quote_items`: Line items for a specific quote.
*   `intervention_reports`: Generated report metadata.

## Schema Highlights

### Indexes
*   **Foreign Key Indexes**: Standard indexes on all FK columns for fast joins.
*   **Soft Delete Indexes**: Partial indexes on columns where `deleted_at IS NULL` to optimize queries for active records.
*   **Search Indexes**: On `client.name`, `task.title`, and `material.sku`.

### Triggers
*   **Client Statistics**: Automated updates for client interaction counts and totals.
*   **User Settings**: Automatic creation of default settings when a user is added.

### Constraints
*   **Soft Deletion**: Most entities use a `deleted_at` timestamp rather than physical deletion.
*   **Foreign Key Integrity**: Enforced via `PRAGMA foreign_keys = ON`.
*   **Inventory Limits**: Check constraints to prevent negative stock values (added in migration 031).

## Migration Strategy

Migrations are stored in `src-tauri/migrations` as numbered SQL files (e.g., `001_initial.sql`). The application uses a custom migration harness that:
1.  Detects the current database version via a `user_version` PRAGMA.
2.  Applies missing migrations in sequence.
3.  Verifies the database schema integrity after each run.
4.  Optionally runs a "fresh-db-test" in CI to ensure all migrations are reproducible.

## Data Flows

```ascii
[Frontend] --(IPC)--> [Service] --(Repository)--> [SQL Engine]
                                                        |
                                            [SQLite Database File]
                                            (rpma.db - Encrypted)
```
