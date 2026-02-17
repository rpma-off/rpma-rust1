# ADR-008: Offline-First Strategy

## Status
Accepted

## Context
RPMA v2 is a desktop application that must work without an internet connection. Local data is the source of truth.

## Decision
- SQLite in WAL mode is the primary data store, ensuring data integrity and concurrent read access.
- All business operations work against the local database with no dependency on remote services.
- Sync is optional and handled by a dedicated `sync` domain that queues changes for later upload.
- The event bus is in-memory and does not require network connectivity.
- No online services, payments, or external sync are introduced in the bounded context architecture.

## Consequences
- The application is fully functional offline.
- Data conflicts during sync must be handled by the sync domain (not by individual bounded contexts).
- All domain logic is designed for local-first operation.
