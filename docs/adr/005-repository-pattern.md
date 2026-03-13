# ADR-005: Repository Pattern for Data Access

## Status

Accepted

## Date

2026-03-13

## Summary

All database access goes through repository interfaces. Domain and application layers never see SQL or database connections directly.

## Context

- Need to decouple domain logic from SQLite implementation details
- Testing domain services requires ability to mock data access
- Schema changes should not propagate beyond infrastructure layer
- Query logic and performance optimizations need centralization
- Future migration path to different database requires abstraction

## Decision

We implement the Repository Pattern with:

### 1. Base Repository Trait

```rust
// src-tauri/src/shared/repositories/base.rs
pub trait Repository<T> {
    fn find_by_id(&self, id: &str) -> Result<Option<T>, RepositoryError>;
    fn find_all(&self) -> Result<Vec<T>, RepositoryError>;
    fn save(&self, entity: &T) -> Result<(), RepositoryError>;
    fn delete(&self, id: &str) -> Result<(), RepositoryError>;
}
```

### 2. Domain-Specific Repositories

Each domain defines its repository interface in `infrastructure/`:

```rust
// src-tauri/src/domains/users/infrastructure/user_repository/repository_impl.rs
pub struct UserRepository {
    db: Arc<Database>,
}

impl UserRepository {
    pub fn new(db: Arc<Database>) -> Self {
        Self { db }
    }

    pub fn find_by_email(&self, email: &str) -> Result<Option<User>, RepositoryError> {
        let conn = self.db.get_connection()?;
        // SQL here, not in domain layer
        conn.query_row(/* ... */)
    }

    pub fn find_by_role(&self, role: UserRole) -> Result<Vec<User>, RepositoryError> {
        // Implementation
    }
}
```

### 3. Repository Factory

```rust
// src-tauri/src/shared/repositories/factory.rs
pub struct Repositories {
    pub user: Arc<UserRepository>,
    pub client: Arc<ClientRepository>,
    pub quote: Arc<QuoteRepository>,
    pub message: Arc<MessageRepository>,
}

impl Repositories {
    pub async fn new(db: Arc<Database>, cache_capacity: usize) -> Self {
        Self {
            user: Arc::new(UserRepository::new(db.clone())),
            client: Arc::new(ClientRepository::new(db.clone())),
            quote: Arc::new(QuoteRepository::new(db.clone())),
            message: Arc::new(MessageRepository::new(db.clone())),
        }
    }
}
```

### 4. Service Usage

Services receive repositories, not database connections:

```rust
// ✅ CORRECT: Service receives repository
pub struct UserService {
    user_repo: Arc<UserRepository>,
}

impl UserService {
    pub fn new(user_repo: Arc<UserRepository>) -> Self {
        Self { user_repo }
    }

    pub fn get_user(&self, id: &str) -> Result<User, AppError> {
        self.user_repo.find_by_id(id)?
            .ok_or(AppError::NotFound("User not found".into()))
    }
}

// ❌ WRONG: Service receives database directly
pub struct UserService {
    db: Arc<Database>, // Don't do this
}
```

### 5. Query Organization

Complex queries are organized withint repository:

```rust
// src-tauri/src/domains/users/infrastructure/user_repository/query.rs
pub fn select_user_by_email(conn: &Connection, email: &str) -> Result<Option<User>, Error> {
    conn.query_row(
        "SELECT id, email, first_name, last_name, role, is_active
         FROM users
         WHERE email = ? AND deleted_at IS NULL",
        [email],
        |row| Ok(User { /* map fields */ }),
    ).optional()
}
```

### 6. Migrations

Migrations are SQL files with numbered prefixes:

```
src-tauri/migrations/
├── 001_initial_schema.sql
├── 002_rename_ppf_zone.sql
├── 037_quotes.sql
└── ...
```

Data migrations use Rust:

```rust
// src-tauri/src/db/migrations/rust_migrations/user_integrity.rs
pub fn migrate(conn: &Connection) -> Result<(), MigrationError> {
    // Complex data transformations in Rust
    conn.execute(/* ... */)?;
    Ok(())
}
```

## Consequences

### Positive

- Domain services testable with mock repositories
- Query optimization centralized in repository layer
- Schema changes don't propagate beyond infrastructure
- Clear separation between "what" (domain) and "how" (infrastructure)
- Easy to add caching at repository level
- SQL injection prevention is centralized

### Negative

- Additional abstraction layer adds complexity
- Complex queries may not fit repository pattern cleanly
- Some queries span multiple repositories (need application layer)
- Learning curve for developers new to DDD

## Repository Organization

```
domains/<name>/infrastructure/
├── <name>_repository/
│   ├── mod.rs            # Exports
│   ├── repository_impl.rs # Main implementation
│   ├── columns.rs        # Column mappings
│   ├── mapping.rs        # Row → Entity mapping
│   ├── query.rs          # Query functions
│   ├── read_ops.rs       # Read operations
│   ├── write_ops.rs      # Write operations
│   └── tests.rs          # Repository tests
```

## Testing Strategy

```rust
#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_repo() -> UserRepository {
        let db = Arc::new(Database::new_in_memory().unwrap());
        UserRepository::new(db)
    }

    #[test]
    fn test_find_by_email() {
        let repo = create_test_repo();
        // Test with in-memory database
    }
}
```

## Related Files

- `src-tauri/src/shared/repositories/mod.rs` - Repository exports
- `src-tauri/src/shared/repositories/base.rs` - Base trait
- `src-tauri/src/shared/repositories/factory.rs` - Repository factory
- `src-tauri/src/domains/users/infrastructure/user_repository/` - Example implementation
- `src-tauri/src/domains/quotes/infrastructure/quote_repository.rs` - Another example
- `src-tauri/migrations/` - SQL migrations

## When to Read This ADR

- Adding new database queries
- Creating new entities
- Testing domain services
- Modifying database schema
- Adding caching or performance optimizations
- Writing integration tests
- Understanding data access patterns

## References

- Domain-Driven Design by Eric Evans (Repository Pattern)
- Clean Architecture by Robert C. Martin
- AGENTS.md Database section
- Repository pattern implementations in each domain