---
title: "Streaming Queries for Large Result Sets"
summary: "Implement chunked streaming queries to handle large datasets without loading entire results into memory, using async streams for efficient pagination."
domain: performance
status: accepted
created: 2026-03-12
---

## Context

Some database queries return large result sets:

- Task history with thousands of entries
- Client lists with full task history
- Inventory transaction logs
- Report exports

Loading entire results into memory causes:

- High memory consumption
- Slow initial response time
- UI freezing during data transfer
- Risk of out-of-memory errors

## Decision

**Implement streaming queries with chunked results using async streams.**

### Streaming Query Trait

Defined in `src-tauri/src/db/connection.rs`:

```rust
pub trait StreamingQuery<T> {
    /// Get the next chunk of results
    fn next_chunk(&mut self, chunk_size: usize) -> Result<Option<Vec<T>>, rusqlite::Error>;
    
    /// Check if there are more results available
    fn has_more(&self) -> bool;
    
    /// Get total count of results (if known)
    fn total_count(&self) -> Option<usize>;
}
```

### ChunkedQuery Implementation

```rust
pub struct ChunkedQuery<T, F>
where
    F: Fn(&rusqlite::Row) -> Result<T, rusqlite::Error>,
{
    query: String,
    params: Vec<rusqlite::types::Value>,
    row_mapper: F,
    pool: Pool<SqliteConnectionManager>,
    offset: usize,
    total_count: Option<usize>,
    exhausted: bool,
}

impl<T, F> StreamingQuery<T> for ChunkedQuery<T, F>
where
    F: Fn(&rusqlite::Row) -> Result<T, rusqlite::Error>,
{
    fn next_chunk(&mut self, chunk_size: usize) -> Result<Option<Vec<T>>, rusqlite::Error> {
        if self.exhausted {
            return Ok(None);
        }
        
        let conn = self.pool.get()?;
        let mut stmt = conn.prepare(&format!(
            "{} LIMIT ? OFFSET ?", 
            self.query
        ))?;
        
        // Bind parameters + LIMIT + OFFSET
        // ...
        
        let results: Vec<T> = stmt.query_map([], &self.row_mapper)?
            .collect::<Result<Vec<_>, _>>()?;
        
        if results.len() < chunk_size {
            self.exhausted = true;
        }
        
        self.offset += results.len();
        
        if results.is_empty() {
            Ok(None)
        } else {
            Ok(Some(results))
        }
    }
    
    fn has_more(&self) -> bool {
        !self.exhausted
    }
}
```

### Database Methods

```rust
impl Database {
    pub fn create_streaming_query<T, F>(
        &self,
        query: &str,
        params: Vec<rusqlite::types::Value>,
        row_mapper: F,
    ) -> ChunkedQuery<T, F>
    where
        F: Fn(&rusqlite::Row) -> Result<T, rusqlite::Error>,
    {
        ChunkedQuery::new(query.to_string(), params, row_mapper, self.pool.clone())
    }
    
    pub fn execute_streaming_query<T, F>(
        &self,
        query: &str,
        count_query: Option<&str>,
        params: Vec<rusqlite::types::Value>,
        row_mapper: F,
    ) -> DbResult<ChunkedQuery<T, F>>
    {
        let mut streaming_query = self.create_streaming_query(query, params, row_mapper);
        
        if let Some(count_sql) = count_query {
            let conn = self.get_connection()?;
            let count: i64 = conn.query_row(count_sql, [], |row| row.get(0))?;
            streaming_query = streaming_query.with_total_count(count as usize);
        }
        
        Ok(streaming_query)
    }
}
```

### Async Stream Conversion

```rust
use futures::stream::{Stream, StreamExt};

pub fn into_stream<T, F>(
    mut query: ChunkedQuery<T, F>,
    chunk_size: usize,
) -> impl Stream<Item = Result<Vec<T>, rusqlite::Error>>
where
    F: Fn(&rusqlite::Row) -> Result<T, rusqlite::Error> + Send + 'static,
    T: Send + 'static,
{
    async_stream::stream! {
        while query.has_more() {
            match query.next_chunk(chunk_size) {
                Ok(Some(chunk)) => yield Ok(chunk),
                Ok(None) => break,
                Err(e) => {
                    yield Err(e);
                    break;
                }
            }
        }
    }
}
```

### Async Database Support

```rust
impl AsyncDatabase {
    pub async fn execute_streaming_query_async<T, F>(
        &self,
        query: &str,
        count_query: Option<&str>,
        params: Vec<rusqlite::types::Value>,
        row_mapper: F,
    ) -> DbResult<ChunkedQuery<T, F>>
    where
        T: Send + 'static,
        F: Fn(&rusqlite::Row) -> Result<T, rusqlite::Error> + Send + 'static,
    {
        tokio::task::spawn_blocking(move || {
            // ... synchronous streaming query setup
        }).await?
    }
    
    pub fn streaming_query_to_stream<T, F>(
        query: ChunkedQuery<T, F>,
        chunk_size: usize,
    ) -> impl Stream<Item = Result<Vec<T>, rusqlite::Error>> + Send
    {
        into_stream(query, chunk_size)
    }
}
```

### Usage Example

```rust
// Backend
let streaming = db.execute_streaming_query(
    "SELECT * FROM tasks WHERE client_id = ?",
    Some("SELECT COUNT(*) FROM tasks WHERE client_id = ?"),
    vec![client_id.into()],
    |row| Task::from_row(row),
)?;

// Process chunks
while streaming.has_more() {
    let chunk = streaming.next_chunk(100)?;
    for task in chunk.unwrap_or_default() {
        process_task(task);
    }
}
```

## Consequences

### Positive

- **Memory Efficiency**: Only one chunk in memory at a time
- **Responsive UI**: First results available immediately
- **Progress Tracking**: Total count enables progress bars
- **Async Compatible**: Works with tokio runtime

### Negative

- **Complexity**: More complex than simple queries
- **Connection Holding**: Connection held across chunks
- **Pagination Drift**: Data changes between chunks
- **Transaction Scope**: Cannot stream within transaction

## Related Files

- `src-tauri/src/db/connection.rs` — StreamingQuery trait and ChunkedQuery
- `src-tauri/src/db/mod.rs` — Database streaming methods
- `src-tauri/src/db/operation_pool.rs` — Pool management

## Read When

- Implementing large data exports
- Building paginated list views
- Processing batch operations
- Handling report generation
- Investigating memory issues with large queries
- Implementing infinite scroll UI
