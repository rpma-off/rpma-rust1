---
title: "Repository Pattern with Async Traits"
summary: "Use async trait-based repositories with a consistent base interface for all data access, separating persistence logic from business rules."
domain: data
status: accepted
created: 2026-03-12
---

## Context

Data access patterns vary across entities (tasks, clients, inventory, etc.), but all require similar operations:

- CRUD operations (create, read, update, delete)
- Query filtering and pagination
- Existence checks
- Bulk operations

Without a consistent pattern, each domain implements data access differently, leading to:

- Duplicated boilerplate code
- Inconsistent error handling
- Difficulty testing business logic in isolation
- Tight coupling between services and SQL

## Decision

**Implement a repository pattern with async traits providing a consistent base interface.**

### Base Repository Trait

Defined in `src-tauri/src/shared/repositories/base.rs`:

```rust
#[async_trait]
pub trait Repository<T: Send, ID: Send + Sync + Clone + 'static> {
    async fn find_by_id(&self, id: ID) -> RepoResult<Option<T>>;
    async fn find_all(&self) -> RepoResult<Vec<T>>;
    async fn save(&self, entity: T) -> RepoResult<T>;
    async fn delete_by_id(&self, id: ID) -> RepoResult<bool>;
    async fn exists_by_id(&self, id: ID) -> RepoResult<bool>;
    
    // Default implementations for bulk operations
    async fn delete_by_ids(&self, ids: Vec<ID>) -> RepoResult<i64> { ... }
    async fn find_by_ids(&self, ids: Vec<ID>) -> RepoResult<Vec<T>> { ... }
}
```

### Queryable Extension

```rust
#[async_trait]
pub trait Queryable<T, Q>: Repository<T, Q::Id>
where
    Q: Query + Send + Sync + Clone + 'static,
{
    async fn find_by_query(&self, query: Q) -> RepoResult<Vec<T>>;
    async fn find_one_by_query(&self, query: Q) -> RepoResult<Option<T>>;
    async fn count_by_query(&self, query: Q) -> RepoResult<i64>;
    async fn exists_by_query(&self, query: Q) -> RepoResult<bool>;
}
```

### Query Trait

```rust
pub trait Query: Send + Sync {
    type Id: Send + Sync + Clone;
    
    fn build_where_clause(&self) -> (String, Vec<rusqlite::types::Value>);
    fn build_order_by_clause(&self) -> Option<String>;
    fn build_limit_offset(&self) -> Option<(i64, Option<i64>)>;
}
```

### Error Types

```rust
#[derive(Debug, thiserror::Error)]
pub enum RepoError {
    #[error("Database error: {0}")]
    Database(String),
    #[error("Not found: {0}")]
    NotFound(String),
    #[error("Validation error: {0}")]
    Validation(String),
    #[error("Conflict: {0}")]
    Conflict(String),
    #[error("Cache error: {0}")]
    Cache(String),
}
```

### Pagination

```rust
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, TS)]
pub struct PaginatedResult<T> {
    pub data: Vec<T>,
    pub pagination: PaginationInfo,
}

pub struct PaginationInfo {
    pub page: i32,
    pub limit: i32,
    pub total: i64,
    pub total_pages: i32,
}
```

## Consequences

### Positive

- **Consistency**: All domains use the same data access patterns
- **Testability**: Repositories can be mocked for unit testing
- **Type Safety**: Compile-time verification of query parameters
- **Encapsulation**: SQL is isolated from business logic
- **Reusability**: Base implementations reduce boilerplate

### Negative

- **Indirection**: One more layer between service and database
- **Generic Constraints**: Complex trait bounds can be confusing
- **Async Overhead**: All operations are async even for simple queries
- **Learning Curve**: New developers must understand trait patterns

## Related Files

- `src-tauri/src/shared/repositories/base.rs` — Base traits and error types
- `src-tauri/src/shared/repositories/mod.rs` — Repository module index
- `src-tauri/src/shared/repositories/cache.rs` — Caching layer
- `src-tauri/src/shared/repositories/factory.rs` — Repository factory
- `src-tauri/src/domains/*/infrastructure/` — Domain-specific implementations

## Read When

- Adding new entities requiring persistence
- Implementing custom query logic
- Understanding error handling for data operations
- Setting up repository mocking for tests
- Investigating pagination behavior
- Adding bulk operations
