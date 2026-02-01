//! Base repository trait definitions
//!
//! Provides consistent repository patterns for all entities.

use async_trait::async_trait;

/// Result type for repository operations
pub type RepoResult<T> = Result<T, RepoError>;

/// Repository error types
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

impl From<rusqlite::Error> for RepoError {
    fn from(err: rusqlite::Error) -> Self {
        RepoError::Database(err.to_string())
    }
}

impl From<String> for RepoError {
    fn from(err: String) -> Self {
        RepoError::Database(err)
    }
}

impl From<&str> for RepoError {
    fn from(err: &str) -> Self {
        RepoError::Database(err.to_string())
    }
}

/// Base repository trait with CRUD operations
#[async_trait]
pub trait Repository<T: Send, ID: Send + Sync + Clone + 'static> {
    /// Find entity by ID
    async fn find_by_id(&self, id: ID) -> RepoResult<Option<T>>;

    /// Find all entities
    async fn find_all(&self) -> RepoResult<Vec<T>>;

    /// Save entity (create or update)
    async fn save(&self, entity: T) -> RepoResult<T>;

    /// Delete entity by ID (soft delete if supported)
    async fn delete_by_id(&self, id: ID) -> RepoResult<bool>;

    /// Check if entity exists
    async fn exists_by_id(&self, id: ID) -> RepoResult<bool>;

    /// Delete multiple entities by IDs
    async fn delete_by_ids(&self, ids: Vec<ID>) -> RepoResult<i64> {
        let mut deleted_count = 0;
        for id in ids {
            if self.delete_by_id(id).await? {
                deleted_count += 1;
            }
        }
        Ok(deleted_count)
    }

    /// Find multiple entities by IDs
    async fn find_by_ids(&self, ids: Vec<ID>) -> RepoResult<Vec<T>> {
        let mut entities = Vec::new();
        for id in ids {
            if let Some(entity) = self.find_by_id(id).await? {
                entities.push(entity);
            }
        }
        Ok(entities)
    }
}

/// Queryable repository trait for filtering
#[async_trait]
pub trait Queryable<T, Q>: Repository<T, Q::Id>
where
    T: Send,
    Q: Query + Send + Sync + Clone + 'static,
    <Q as Query>::Id: 'static,
{
    /// Find entities matching query
    async fn find_by_query(&self, query: Q) -> RepoResult<Vec<T>>;

    /// Find one entity matching query
    async fn find_one_by_query(&self, query: Q) -> RepoResult<Option<T>> {
        let results = self.find_by_query(query).await?;
        Ok(results.into_iter().next())
    }

    /// Count entities matching query
    async fn count_by_query(&self, query: Q) -> RepoResult<i64>;

    /// Check if any entity matches query
    async fn exists_by_query(&self, query: Q) -> RepoResult<bool> {
        Ok(self.count_by_query(query).await? > 0)
    }
}

/// Query trait for filtering
pub trait Query: Send + Sync {
    type Id: Send + Sync + Clone;

    /// Build WHERE clause for SQL query
    fn build_where_clause(&self) -> (String, Vec<rusqlite::types::Value>);

    /// Build ORDER BY clause for SQL query
    fn build_order_by_clause(&self) -> Option<String> {
        None
    }

    /// Build LIMIT and OFFSET clauses for SQL query
    fn build_limit_offset(&self) -> Option<(i64, Option<i64>)> {
        None
    }

    /// Get limit value
    fn get_limit(&self) -> Option<i64> {
        self.build_limit_offset().map(|(limit, _)| limit)
    }

    /// Get offset value
    fn get_offset(&self) -> Option<i64> {
        self.build_limit_offset().and_then(|(_, offset)| offset)
    }
}

/// Paginated query trait
pub trait PaginatedQuery: Query {
    fn get_page(&self) -> Option<i64> {
        None
    }

    fn get_page_size(&self) -> Option<i64> {
        self.get_limit()
    }
}

/// Pagination metadata
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[cfg_attr(feature = "ts-rs", derive(ts_rs::TS))]
pub struct PaginationInfo {
    pub page: i32,
    pub limit: i32,
    pub total: i64,
    pub total_pages: i32,
}

impl PaginationInfo {
    pub fn new(page: i32, limit: i32, total: i64) -> Self {
        let total_pages = ((total as f64) / (limit as f64)).ceil() as i32;
        Self {
            page,
            limit,
            total,
            total_pages,
        }
    }

    pub fn has_next(&self) -> bool {
        self.page < self.total_pages
    }

    pub fn has_prev(&self) -> bool {
        self.page > 1
    }
}

/// Paginated result
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[cfg_attr(feature = "ts-rs", derive(ts_rs::TS))]
pub struct PaginatedResult<T> {
    pub data: Vec<T>,
    pub pagination: PaginationInfo,
}

impl<T> PaginatedResult<T> {
    pub fn new(data: Vec<T>, pagination: PaginationInfo) -> Self {
        Self { data, pagination }
    }
}

/// Repository with pagination support
#[async_trait]
pub trait PaginatedRepository<T: Send, ID: Send + Sync + Clone + 'static, Q: PaginatedQuery + Send + Sync + Clone + 'static>:
    Queryable<T, Q>
where
    <Q as Query>::Id: 'static,
{
    /// Find entities with pagination
    async fn find_paginated(&self, query: Q) -> RepoResult<PaginatedResult<T>> {
        let total = self.count_by_query(query.clone()).await?;
        let pagination = PaginationInfo::new(
            query.get_page().unwrap_or(1) as i32,
            query.get_page_size().unwrap_or(20) as i32,
            total,
        );

        let data = self.find_by_query(query).await?;

        Ok(PaginatedResult::new(data, pagination))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pagination_info() {
        let pagination = PaginationInfo::new(1, 10, 25);
        assert_eq!(pagination.page, 1);
        assert_eq!(pagination.limit, 10);
        assert_eq!(pagination.total, 25);
        assert_eq!(pagination.total_pages, 3);
        assert!(pagination.has_next());
        assert!(!pagination.has_prev());

        let pagination = PaginationInfo::new(2, 10, 25);
        assert!(pagination.has_next());
        assert!(pagination.has_prev());

        let pagination = PaginationInfo::new(3, 10, 25);
        assert!(!pagination.has_next());
        assert!(pagination.has_prev());
    }

    #[test]
    fn test_repo_error_display() {
        let err = RepoError::Database("test".to_string());
        assert_eq!(err.to_string(), "Database error: test");

        let err = RepoError::NotFound("test".to_string());
        assert_eq!(err.to_string(), "Not found: test");
    }
}
