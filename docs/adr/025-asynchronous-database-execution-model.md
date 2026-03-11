# ADR-025: Asynchronous Database Execution Model

## Status
Accepted

## Context
SQLite is inherently synchronous and blocking. Direct usage within the Tauri/Tokio async runtime can lead to thread starvation and unresponsive UI if long-running queries block the executor.

## Decision

### AsyncDatabase Wrapper
- The `AsyncDatabase` struct (`src-tauri/src/db/mod.rs`) wraps the synchronous database connection pool.
- All database operations in IPC handlers must use the `async` variants (e.g., `execute_async`, `query_as_async`).

### Thread Pool Isolation
- Operations are offloaded to a dedicated blocking thread pool using `tokio::task::spawn_blocking`.
- This ensures that the primary async runtime remains free to handle IPC routing, WebSocket broadcasting, and other non-blocking tasks.

### Transactional Safety
- `with_transaction_async` ensures that multi-step operations remain atomic even when executed within the async-offloading model.

## Consequences
- The application remains responsive even during complex database operations or large data imports.
- Deadlocks between async tasks and database connections are minimized.
- High-concurrency read access is preserved through the combination of async offloading and SQLite WAL mode.
