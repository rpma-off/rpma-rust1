# ADR-024: Document and Media Storage Strategy

## Status
Accepted

## Context
The application manages media assets (e.g., task photos, intervention evidence) that are too large for the SQLite database and require reliable local storage on the host machine.

## Decision

### External File Storage
- Binary assets are stored in the host filesystem under the `photos/` subdirectory of the application data directory.
- Database records (e.g., `Photo` entity) store only the relative path and metadata (dimensions, hash, timestamp) of the asset.

### Storage Abstraction (PhotoService)
- The `PhotoService` (`src-tauri/src/domains/documents/infrastructure/photo.rs`) abstracts the underlying storage provider.
- It supports pluggable storage types (currently `local` is the standard for offline-first operation).

### Developer Workflow Isolation
- During development (`tauri dev`), media storage is explicitly directed to the user's application data directory rather than the repository root to prevent infinite rebuild loops triggered by file changes.

## Consequences
- Database size remains manageable and performance is preserved.
- Media assets are persisted independently of the schema migrations.
- The system is prepared for future cloud-storage integration by using a service abstraction.
