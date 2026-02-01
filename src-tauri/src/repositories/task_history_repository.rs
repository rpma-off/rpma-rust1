//! Task history repository implementation
//!
//! Provides consistent database access patterns for TaskHistory entities.

use crate::db::Database;
use crate::models::task::TaskHistory;
use crate::repositories::base::{Repository, RepoError, RepoResult};
use crate::repositories::cache::{Cache, CacheKeyBuilder, ttl};
use async_trait::async_trait;
use rusqlite::params;
use std::sync::Arc;

/// Query for filtering task history
#[derive(Debug, Clone, Default)]
pub struct TaskHistoryQuery {
    pub task_id: Option<String>,
    pub new_status: Option<String>,
    pub changed_by: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
    pub sort_by: Option<String>,
    pub sort_order: Option<String>,
}

impl TaskHistoryQuery {
    fn build_where_clause(&self) -> (String, Vec<rusqlite::types::Value>) {
        let mut conditions = vec!["1=1".to_string()];
        let mut params: Vec<rusqlite::types::Value> = Vec::new();

        if let Some(task_id) = &self.task_id {
            conditions.push("task_id = ?".to_string());
            params.push(task_id.clone().into());
        }

        if let Some(new_status) = &self.new_status {
            conditions.push("new_status = ?".to_string());
            params.push(new_status.clone().into());
        }

        if let Some(changed_by) = &self.changed_by {
            conditions.push("changed_by = ?".to_string());
            params.push(changed_by.clone().into());
        }

        let where_clause = if conditions.len() > 1 {
            format!("WHERE {}", conditions.join(" AND "))
        } else {
            String::new()
        };

        (where_clause, params)
    }

    fn build_order_by_clause(&self) -> Option<String> {
        let sort_by = self.sort_by.as_deref().unwrap_or("changed_at");
        let sort_order = self.sort_order.as_deref().unwrap_or("DESC");
        Some(format!("ORDER BY {} {}", sort_by, sort_order))
    }

    fn build_limit_offset(&self) -> Option<(i64, Option<i64>)> {
        match (self.limit, self.offset) {
            (Some(limit), offset) => Some((limit, offset)),
            _ => None,
        }
    }
}

/// Task history repository for database operations
pub struct TaskHistoryRepository {
    db: Arc<Database>,
    cache: Arc<Cache>,
    cache_key_builder: CacheKeyBuilder,
}

impl TaskHistoryRepository {
    pub fn new(db: Arc<Database>, cache: Arc<Cache>) -> Self {
        Self {
            db,
            cache,
            cache_key_builder: CacheKeyBuilder::new("task_history"),
        }
    }

    /// Find history entries by task ID
    pub async fn find_by_task_id(&self, task_id: String) -> RepoResult<Vec<TaskHistory>> {
        let cache_key = self.cache_key_builder.list(&["task", &task_id]);

        if let Some(history) = self.cache.get::<Vec<TaskHistory>>(&cache_key) {
            return Ok(history);
        }

        let history = self
            .db
            .query_as::<TaskHistory>(
                "SELECT * FROM task_history WHERE task_id = ? ORDER BY changed_at DESC",
                params![task_id],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find history by task: {}", e)))?;

        self.cache.set(&cache_key, history.clone(), ttl::MEDIUM);

        Ok(history)
    }

    /// Find history entries by status
    pub async fn find_by_status(&self, new_status: String) -> RepoResult<Vec<TaskHistory>> {
        let cache_key = self.cache_key_builder.list(&["status", &new_status]);

        if let Some(history) = self.cache.get::<Vec<TaskHistory>>(&cache_key) {
            return Ok(history);
        }

        let history = self
            .db
            .query_as::<TaskHistory>(
                "SELECT * FROM task_history WHERE new_status = ? ORDER BY changed_at DESC LIMIT 1000",
                params![new_status],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find history by status: {}", e)))?;

        self.cache.set(&cache_key, history.clone(), ttl::MEDIUM);

        Ok(history)
    }

    /// Find history entries by user (changed_by)
    pub async fn find_by_changed_by(&self, changed_by: String) -> RepoResult<Vec<TaskHistory>> {
        let cache_key = self.cache_key_builder.list(&["user", &changed_by]);

        if let Some(history) = self.cache.get::<Vec<TaskHistory>>(&cache_key) {
            return Ok(history);
        }

        let history = self
            .db
            .query_as::<TaskHistory>(
                "SELECT * FROM task_history WHERE changed_by = ? ORDER BY changed_at DESC LIMIT 1000",
                params![changed_by],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find history by user: {}", e)))?;

        self.cache.set(&cache_key, history.clone(), ttl::MEDIUM);

        Ok(history)
    }

    /// Find recent history entries (last N entries)
    pub async fn find_recent(&self, limit: i64) -> RepoResult<Vec<TaskHistory>> {
        let cache_key = self.cache_key_builder.list(&["recent", &limit.to_string()]);

        if let Some(history) = self.cache.get::<Vec<TaskHistory>>(&cache_key) {
            return Ok(history);
        }

        let history = self
            .db
            .query_as::<TaskHistory>(
                "SELECT * FROM task_history ORDER BY changed_at DESC LIMIT ?",
                params![limit],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find recent history: {}", e)))?;

        self.cache.set(&cache_key, history.clone(), ttl::SHORT);

        Ok(history)
    }

    /// Get count of history entries for task
    pub async fn count_for_task(&self, task_id: String) -> RepoResult<i64> {
        let count = self
            .db
            .query_single_value::<i64>(
                "SELECT COUNT(*) FROM task_history WHERE task_id = ?",
                params![task_id],
            )
            .map_err(|e| RepoError::Database(format!("Failed to count history for task: {}", e)))?;

        Ok(count)
    }

    /// Search history with query
    pub async fn search(&self, query: TaskHistoryQuery) -> RepoResult<Vec<TaskHistory>> {
        let (where_clause, where_params) = query.build_where_clause();
        let order_by = query.build_order_by_clause().unwrap_or_default();
        let limit_offset = query.build_limit_offset();

        let sql = format!(
            "SELECT * FROM task_history {} {} {}",
            where_clause,
            order_by,
            if let Some((limit, offset)) = limit_offset {
                match offset {
                    Some(offset) => format!("LIMIT {} OFFSET {}", limit, offset),
                    None => format!("LIMIT {}", limit),
                }
            } else {
                "LIMIT 1000".to_string()
            }
        );

        let params = rusqlite::params_from_iter(where_params);

        let history = self
            .db
            .query_as::<TaskHistory>(&sql, params)
            .map_err(|e| RepoError::Database(format!("Failed to search history: {}", e)))?;

        Ok(history)
    }

    /// Count history entries matching query
    pub async fn count(&self, query: TaskHistoryQuery) -> RepoResult<i64> {
        let (where_clause, where_params) = query.build_where_clause();

        let sql = format!("SELECT COUNT(*) as count FROM task_history {}", where_clause);
        let params = rusqlite::params_from_iter(where_params);

        let count = self
            .db
            .query_single_value::<i64>(&sql, params)
            .map_err(|e| RepoError::Database(format!("Failed to count history: {}", e)))?;

        Ok(count)
    }

    fn invalidate_history_cache(&self, id: &str) {
        self.cache.remove(&self.cache_key_builder.id(id));
    }

    pub fn invalidate_all_cache(&self) {
        self.cache.clear();
    }
}

#[async_trait]
impl Repository<TaskHistory, String> for TaskHistoryRepository {
    async fn find_by_id(&self, id: String) -> RepoResult<Option<TaskHistory>> {
        let cache_key = self.cache_key_builder.id(&id);

        if let Some(history) = self.cache.get::<TaskHistory>(&cache_key) {
            return Ok(Some(history));
        }

        let history = self
            .db
            .query_single_as::<TaskHistory>("SELECT * FROM task_history WHERE id = ?", params![id])
            .map_err(|e| RepoError::Database(format!("Failed to find history by id: {}", e)))?;

        if let Some(ref history) = history {
            self.cache.set(&cache_key, history.clone(), ttl::LONG);
        }

        Ok(history)
    }

    async fn find_all(&self) -> RepoResult<Vec<TaskHistory>> {
        let cache_key = self.cache_key_builder.list(&["all"]);

        if let Some(history) = self.cache.get::<Vec<TaskHistory>>(&cache_key) {
            return Ok(history);
        }

        let history = self
            .db
            .query_as::<TaskHistory>(
                "SELECT * FROM task_history ORDER BY changed_at DESC LIMIT 1000",
                [],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find all history: {}", e)))?;

        self.cache.set(&cache_key, history.clone(), ttl::MEDIUM);

        Ok(history)
    }

    async fn save(&self, entity: TaskHistory) -> RepoResult<TaskHistory> {
        let exists = self.exists_by_id(entity.id.clone()).await?;

        if exists {
            return Err(RepoError::Database(
                "Cannot update task history - entries are immutable".to_string(),
            ));
        } else {
            self.db
                .execute(
                    "INSERT INTO task_history (
                        id, task_id, old_status, new_status, reason,
                        changed_at, changed_by
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    params![
                        entity.id,
                        entity.task_id,
                        entity.old_status,
                        entity.new_status,
                        entity.reason,
                        entity.changed_at,
                        entity.changed_by,
                    ],
                )
                .map_err(|e| RepoError::Database(format!("Failed to create history entry: {}", e)))?;
        }

        self.invalidate_history_cache(&entity.id);
        self.invalidate_all_cache();

        self.find_by_id(entity.id).await?
            .ok_or_else(|| RepoError::NotFound("History entry not found after save".to_string()))
    }

    async fn delete_by_id(&self, id: String) -> RepoResult<bool> {
        let result = self
            .db
            .execute("DELETE FROM task_history WHERE id = ?", params![id])
            .map_err(|e| RepoError::Database(format!("Failed to delete history: {}", e)))?;

        self.invalidate_history_cache(&id);
        self.invalidate_all_cache();

        Ok(result > 0)
    }

    async fn exists_by_id(&self, id: String) -> RepoResult<bool> {
        let exists = self
            .db
            .query_single_value::<i64>("SELECT COUNT(*) FROM task_history WHERE id = ?", params![id])
            .map_err(|e| RepoError::Database(format!("Failed to check history existence: {}", e)))?;

        Ok(exists > 0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::Database;

    async fn setup_test_db() -> Database {
        Database::new_in_memory().await.unwrap()
    }

    #[tokio::test]
    async fn test_find_by_id() {
        let db = setup_test_db().await;
        let cache = Arc::new(Cache::new());
        let repo = TaskHistoryRepository::new(Arc::new(db), Arc::clone(&cache));

        let task_id = uuid::Uuid::new_v4().to_string();
        let history = TaskHistory::new(task_id, Some("draft".to_string()), "scheduled".to_string(), Some("Task scheduled".to_string()), None);

        repo.save(history.clone()).await.unwrap();

        let found = repo.find_by_id(history.id.clone()).await.unwrap();
        assert!(found.is_some());
        assert_eq!(found.unwrap().task_id, history.task_id);
    }

    #[tokio::test]
    async fn test_find_by_id_not_found() {
        let db = setup_test_db().await;
        let cache = Arc::new(Cache::new());
        let repo = TaskHistoryRepository::new(Arc::new(db), Arc::clone(&cache));

        let found = repo.find_by_id("nonexistent".to_string()).await.unwrap();
        assert!(found.is_none());
    }

    #[tokio::test]
    async fn test_find_all() {
        let db = setup_test_db().await;
        let cache = Arc::new(Cache::new());
        let repo = TaskHistoryRepository::new(Arc::new(db), Arc::clone(&cache));

        let task_id = uuid::Uuid::new_v4().to_string();
        let history1 = TaskHistory::new(task_id.clone(), Some("draft".to_string()), "scheduled".to_string(), Some("Reason 1".to_string()), None);
        let history2 = TaskHistory::new(task_id.clone(), Some("scheduled".to_string()), "in_progress".to_string(), Some("Reason 2".to_string()), None);

        repo.save(history1).await.unwrap();
        repo.save(history2).await.unwrap();

        let all = repo.find_all().await.unwrap();
        assert_eq!(all.len(), 2);
    }

    #[tokio::test]
    async fn test_save_create() {
        let db = setup_test_db().await;
        let cache = Arc::new(Cache::new());
        let repo = TaskHistoryRepository::new(Arc::new(db), Arc::clone(&cache));

        let task_id = uuid::Uuid::new_v4().to_string();
        let history = TaskHistory::new(task_id, Some("draft".to_string()), "scheduled".to_string(), Some("Task scheduled".to_string()), None);

        let saved = repo.save(history.clone()).await.unwrap();
        assert_eq!(saved.task_id, history.task_id);
        assert!(repo.exists_by_id(saved.id).await.unwrap());
    }

    #[tokio::test]
    async fn test_save_update_fails() {
        let db = setup_test_db().await;
        let cache = Arc::new(Cache::new());
        let repo = TaskHistoryRepository::new(Arc::new(db), Arc::clone(&cache));

        let task_id = uuid::Uuid::new_v4().to_string();
        let mut history = TaskHistory::new(task_id, Some("draft".to_string()), "scheduled".to_string(), Some("Task scheduled".to_string()), None);
        repo.save(history.clone()).await.unwrap();

        history.new_status = "completed".to_string();
        let result = repo.save(history).await;
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("immutable"));
    }

    #[tokio::test]
    async fn test_delete_by_id() {
        let db = setup_test_db().await;
        let cache = Arc::new(Cache::new());
        let repo = TaskHistoryRepository::new(Arc::new(db), Arc::clone(&cache));

        let task_id = uuid::Uuid::new_v4().to_string();
        let history = TaskHistory::new(task_id, Some("draft".to_string()), "scheduled".to_string(), Some("Task scheduled".to_string()), None);
        repo.save(history.clone()).await.unwrap();

        let deleted = repo.delete_by_id(history.id.clone()).await.unwrap();
        assert!(deleted);
        assert!(!repo.exists_by_id(history.id).await.unwrap());
    }

    #[tokio::test]
    async fn test_find_by_task_id() {
        let db = setup_test_db().await;
        let cache = Arc::new(Cache::new());
        let repo = TaskHistoryRepository::new(Arc::new(db), Arc::clone(&cache));

        let task_id = uuid::Uuid::new_v4().to_string();
        let history1 = TaskHistory::new(task_id.clone(), Some("draft".to_string()), "scheduled".to_string(), Some("Reason 1".to_string()), None);
        let history2 = TaskHistory::new(task_id.clone(), Some("scheduled".to_string()), "in_progress".to_string(), Some("Reason 2".to_string()), None);

        repo.save(history1).await.unwrap();
        repo.save(history2).await.unwrap();

        let task_history = repo.find_by_task_id(task_id).await.unwrap();
        assert_eq!(task_history.len(), 2);
    }

    #[tokio::test]
    async fn test_count_for_task() {
        let db = setup_test_db().await;
        let cache = Arc::new(Cache::new());
        let repo = TaskHistoryRepository::new(Arc::new(db), Arc::clone(&cache));

        let task_id = uuid::Uuid::new_v4().to_string();
        repo.save(TaskHistory::new(task_id.clone(), Some("draft".to_string()), "scheduled".to_string(), Some("Reason 1".to_string()), None)).await.unwrap();
        repo.save(TaskHistory::new(task_id.clone(), Some("scheduled".to_string()), "in_progress".to_string(), Some("Reason 2".to_string()), None)).await.unwrap();
        repo.save(TaskHistory::new(task_id.clone(), Some("in_progress".to_string()), "completed".to_string(), Some("Reason 3".to_string()), None)).await.unwrap();

        let count = repo.count_for_task(task_id).await.unwrap();
        assert_eq!(count, 3);
    }

    #[tokio::test]
    async fn test_find_recent() {
        let db = setup_test_db().await;
        let cache = Arc::new(Cache::new());
        let repo = TaskHistoryRepository::new(Arc::new(db), Arc::clone(&cache));

        for i in 0..10 {
            let task_id = uuid::Uuid::new_v4().to_string();
            let history = TaskHistory::new(task_id, Some("draft".to_string()), "scheduled".to_string(), Some(format!("Entry {}", i)), None);
            repo.save(history).await.unwrap();
        }

        let recent = repo.find_recent(5).await.unwrap();
        assert_eq!(recent.len(), 5);
    }
}
