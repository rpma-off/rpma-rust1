# ADR-022: Repository Container and Centralized Data Access

## Status
Accepted

## Context
Individual domain services often require access to multiple repositories. Propagating individual repository references leads to bloated constructors and difficult dependency management.

## Decision

### Repositories Container
- The `Repositories` struct (`src-tauri/src/shared/repositories/factory.rs`) serves as a centralized container for all domain repositories.
- It is initialized once by the `ServiceBuilder` and shared across the application.

### Repository Factory
- The `RepositoryBuilder` provides a fluent API for constructing the container with shared resources (e.g., database connection pool and global cache).
- Repositories are lazily or eagerly instantiated within the container and exposed via public fields or getter methods.

### Shared Caching
- The container provides a single `Cache` instance that is shared among all repositories, enabling cross-repository cache invalidation and consistent memory usage limits.

## Consequences
- Service constructors are simplified by accepting a single `Arc<Repositories>` reference.
- Data access patterns are standardized across all domains.
- Centralized cache management prevents fragmented memory usage by multiple isolated caches.
