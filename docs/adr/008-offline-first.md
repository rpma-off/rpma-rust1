# ADR-008: Offline-First Strategy

## Status
Accepted

## Context
The application is designed for desktop environments where internet connectivity is intermittent or unavailable. Local data is the authoritative source of truth.

## Decision

### Local Persistence
- SQLite in WAL (Write-Ahead Logging) mode is the primary data store.
- All business operations are executed against the local database without remote dependencies.
- Periodic WAL checkpointing via `Database::checkpoint_wal` bounds the size of the `-wal` sidecar file.

### Offline Identity
- Session management is handled via a local `sessions` table (UUID-based).
- Authentication and authorization checks are performed entirely against local state, requiring no network round-trips.

### Embedded Resources
- Database migrations are embedded in the binary using `include_dir!`.
- Application logic and schema definitions ship as a single unit, ensuring consistent operation regardless of host filesystem state.

### Optional Synchronization
- A dedicated `sync` domain manages the background synchronization of local changes to remote targets when connectivity is available.
- The `SyncQueue` buffers outgoing changes to prevent data loss during offline periods.

### Startup Integrity
- `Database::ensure_required_views` recreates SQL views (e.g., `client_statistics`) on every startup, ensuring the frontend has access to required projections even if the schema was migrated across disparate versions.

## Consequences
- Full application functionality is maintained in air-gapped environments.
- Latency is minimized by avoiding remote requests in critical user paths.
- Deployment is simplified to a single binary containing all logic and schema assets.
