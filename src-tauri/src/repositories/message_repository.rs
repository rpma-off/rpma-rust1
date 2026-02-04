//! Message repository implementation
//!
//! Provides consistent database access patterns for Message entities.

use crate::db::Database;
use crate::models::message::{Message, MessageType, MessageStatus};
use crate::repositories::base::{Repository, RepoError, RepoResult};
use crate::repositories::cache::{Cache, CacheKeyBuilder, ttl};
use async_trait::async_trait;
use rusqlite::params;
use std::sync::Arc;

/// Query for filtering messages
#[derive(Debug, Clone, Default)]
pub struct MessageQuery {
    pub search: Option<String>,
    pub message_type: Option<MessageType>,
    pub status: Option<MessageStatus>,
    pub sender_id: Option<String>,
    pub recipient_id: Option<String>,
    pub task_id: Option<String>,
    pub client_id: Option<String>,
    pub date_from: Option<i64>,
    pub date_to: Option<i64>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
    pub sort_by: Option<String>,
    pub sort_order: Option<String>,
}

impl MessageQuery {
    fn build_where_clause(&self) -> (String, Vec<rusqlite::types::Value>) {
        let mut conditions = vec!["1=1".to_string()];
        let mut params: Vec<rusqlite::types::Value> = Vec::new();

        if let Some(search) = &self.search {
            conditions.push("(subject LIKE ? OR body LIKE ?)".to_string());
            params.push(format!("%{}%", search).into());
            params.push(format!("%{}%", search).into());
        }

        if let Some(message_type) = &self.message_type {
            conditions.push("message_type = ?".to_string());
            params.push(message_type.to_string().into());
        }

        if let Some(status) = &self.status {
            conditions.push("status = ?".to_string());
            params.push(status.to_string().into());
        }

        if let Some(sender_id) = &self.sender_id {
            conditions.push("sender_id = ?".to_string());
            params.push(sender_id.clone().into());
        }

        if let Some(recipient_id) = &self.recipient_id {
            conditions.push("recipient_id = ?".to_string());
            params.push(recipient_id.clone().into());
        }

        if let Some(task_id) = &self.task_id {
            conditions.push("task_id = ?".to_string());
            params.push(task_id.clone().into());
        }

        if let Some(client_id) = &self.client_id {
            conditions.push("client_id = ?".to_string());
            params.push(client_id.clone().into());
        }

        if let Some(date_from) = self.date_from {
            conditions.push("created_at >= ?".to_string());
            params.push(date_from.into());
        }

        if let Some(date_to) = self.date_to {
            conditions.push("created_at <= ?".to_string());
            params.push(date_to.into());
        }

        let where_clause = if conditions.is_empty() {
            String::new()
        } else {
            format!("WHERE {}", conditions.join(" AND "))
        };

        (where_clause, params)
    }

    fn validate_sort_column(sort_by: &str) -> Result<String, RepoError> {
        let allowed_columns = [
            "created_at", "updated_at", "message_type", "status", "priority",
            "scheduled_at", "sent_at", "read_at", "subject"
        ];
        allowed_columns.iter()
            .find(|&&col| col == sort_by)
            .map(|s| s.to_string())
            .ok_or_else(|| RepoError::Validation(format!("Invalid sort column: {}", sort_by)))
    }

    fn build_order_by_clause(&self) -> Result<String, RepoError> {
        let sort_by = Self::validate_sort_column(
            self.sort_by.as_deref().unwrap_or("created_at")
        )?;
        let sort_order = match self.sort_order.as_deref() {
            Some("ASC") => "ASC",
            Some("DESC") => "DESC",
            _ => "DESC",
        };
        Ok(format!("ORDER BY {} {}", sort_by, sort_order))
    }

    fn build_limit_offset(&self) -> Option<(i64, Option<i64>)> {
        match (self.limit, self.offset) {
            (Some(limit), offset) => Some((limit, offset)),
            _ => None,
        }
    }
}

/// Message repository for database operations
pub struct MessageRepository {
    db: Arc<Database>,
    cache: Arc<Cache>,
    cache_key_builder: CacheKeyBuilder,
}

impl MessageRepository {
    /// Create a new MessageRepository
    pub fn new(db: Arc<Database>, cache: Arc<Cache>) -> Self {
        Self {
            db,
            cache,
            cache_key_builder: CacheKeyBuilder::new("message"),
        }
    }

    /// Find messages by type
    pub async fn find_by_type(&self, message_type: MessageType) -> RepoResult<Vec<Message>> {
        let cache_key = self
            .cache_key_builder
            .query(&["type", &message_type.to_string()]);

        if let Some(messages) = self.cache.get::<Vec<Message>>(&cache_key) {
            return Ok(messages);
        }

        let messages = self
            .db
            .query_as::<Message>(
                r#"
                SELECT
                    id, message_type, sender_id, recipient_id, recipient_email, recipient_phone,
                    subject, body, template_id, task_id, client_id,
                    status, priority, scheduled_at, sent_at, read_at, error_message, metadata,
                    created_at, updated_at
                FROM messages
                WHERE message_type = ?
                ORDER BY created_at DESC
                "#,
                params![message_type.to_string()],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find messages by type: {}", e)))?;

        self.cache
            .set(&cache_key, messages.clone(), ttl::SHORT);

        Ok(messages)
    }

    /// Find messages by status
    pub async fn find_by_status(&self, status: MessageStatus) -> RepoResult<Vec<Message>> {
        let cache_key = self
            .cache_key_builder
            .query(&["status", &status.to_string()]);

        if let Some(messages) = self.cache.get::<Vec<Message>>(&cache_key) {
            return Ok(messages);
        }

        let messages = self
            .db
            .query_as::<Message>(
                r#"
                SELECT
                    id, message_type, sender_id, recipient_id, recipient_email, recipient_phone,
                    subject, body, template_id, task_id, client_id,
                    status, priority, scheduled_at, sent_at, read_at, error_message, metadata,
                    created_at, updated_at
                FROM messages
                WHERE status = ?
                ORDER BY created_at DESC
                "#,
                params![status.to_string()],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find messages by status: {}", e)))?;

        self.cache
            .set(&cache_key, messages.clone(), ttl::SHORT);

        Ok(messages)
    }

    /// Find messages for a specific recipient
    pub async fn find_by_recipient(&self, recipient_id: &str) -> RepoResult<Vec<Message>> {
        let cache_key = self
            .cache_key_builder
            .query(&["recipient", recipient_id]);

        if let Some(messages) = self.cache.get::<Vec<Message>>(&cache_key) {
            return Ok(messages);
        }

        let messages = self
            .db
            .query_as::<Message>(
                r#"
                SELECT
                    id, message_type, sender_id, recipient_id, recipient_email, recipient_phone,
                    subject, body, template_id, task_id, client_id,
                    status, priority, scheduled_at, sent_at, read_at, error_message, metadata,
                    created_at, updated_at
                FROM messages
                WHERE recipient_id = ?
                ORDER BY created_at DESC
                LIMIT 100
                "#,
                params![recipient_id],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find messages for recipient: {}", e)))?;

        self.cache
            .set(&cache_key, messages.clone(), ttl::SHORT);

        Ok(messages)
    }

    /// Find unsent messages (status = pending or failed)
    pub async fn find_unsent(&self) -> RepoResult<Vec<Message>> {
        let cache_key = self.cache_key_builder.query(&["unsent"]);

        if let Some(messages) = self.cache.get::<Vec<Message>>(&cache_key) {
            return Ok(messages);
        }

        let messages = self
            .db
            .query_as::<Message>(
                r#"
                SELECT
                    id, message_type, sender_id, recipient_id, recipient_email, recipient_phone,
                    subject, body, template_id, task_id, client_id,
                    status, priority, scheduled_at, sent_at, read_at, error_message, metadata,
                    created_at, updated_at
                FROM messages
                WHERE status IN ('pending', 'failed')
                  AND (scheduled_at IS NULL OR scheduled_at <= strftime('%s', 'now'))
                ORDER BY priority DESC, created_at ASC
                LIMIT 50
                "#,
                [],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find unsent messages: {}", e)))?;

        self.cache
            .set(&cache_key, messages.clone(), ttl::SHORT);

        Ok(messages)
    }

    /// Update message status
    pub async fn update_status(&self, message_id: &str, status: MessageStatus) -> RepoResult<()> {
        let timestamp = chrono::Utc::now().timestamp();

        let (sent_at, read_at) = match status {
            MessageStatus::Sent => (Some(timestamp), None),
            MessageStatus::Delivered => (Some(timestamp), None),
            MessageStatus::Read => (Some(timestamp), Some(timestamp)),
            _ => (None, None),
        };

        self.db
            .execute(
                r#"
                UPDATE messages SET
                    status = ?,
                    sent_at = COALESCE(?, sent_at),
                    read_at = COALESCE(?, read_at),
                    updated_at = strftime('%s', 'now')
                WHERE id = ?
                "#,
                params![status.to_string(), sent_at, read_at, message_id],
            )
            .map_err(|e| RepoError::Database(format!("Failed to update message status: {}", e)))?;

        // Invalidate cache for this message
        self.invalidate_message_cache(message_id);

        Ok(())
    }

    /// Search messages
    pub async fn search(&self, query: MessageQuery) -> RepoResult<Vec<Message>> {
        let cache_key = self.cache_key_builder.query(&[
            &format!("{:?}", query),
        ]);

        if let Some(messages) = self.cache.get::<Vec<Message>>(&cache_key) {
            return Ok(messages);
        }

        let (where_clause, params) = query.build_where_clause();
        let order_clause = query.build_order_by_clause().unwrap_or_else(|e| {
            eprintln!("Invalid order clause, using default: {}", e);
            "ORDER BY created_at DESC".to_string()
        });
        let (limit, _offset) = query.build_limit_offset().unwrap_or((100, None));

        let sql = format!(
            r#"
            SELECT
                id, message_type, sender_id, recipient_id, recipient_email, recipient_phone,
                subject, body, template_id, task_id, client_id,
                status, priority, scheduled_at, sent_at, read_at, error_message, metadata,
                created_at, updated_at
            FROM messages
            {}
            {}
            LIMIT ?
            "#,
            where_clause, order_clause
        );

        let mut params_vec: Vec<rusqlite::types::Value> = params;
        params_vec.push(limit.into());

        let messages = self
            .db
            .query_as::<Message>(&sql, rusqlite::params_from_iter(params_vec.iter()))
            .map_err(|e| RepoError::Database(format!("Failed to search messages: {}", e)))?;

        self.cache
            .set(&cache_key, messages.clone(), ttl::SHORT);

        Ok(messages)
    }

    /// Count messages matching query
    pub async fn count(&self, query: MessageQuery) -> RepoResult<i64> {
        let (where_clause, params) = query.build_where_clause();

        let sql = format!("SELECT COUNT(*) FROM messages {}", where_clause);

        let count: i64 = self
            .db
            .query_single_value(&sql, rusqlite::params_from_iter(params.iter()))
            .map_err(|e| RepoError::Database(format!("Failed to count messages: {}", e)))?;

        Ok(count)
    }

    /// Invalidate cache for a specific message
    fn invalidate_message_cache(&self, message_id: &str) {
        self.cache.remove(&self.cache_key_builder.id(message_id));
    }

    /// Invalidate all message caches
    pub fn invalidate_all_cache(&self) {
        self.cache.clear();
    }
}

#[async_trait]
impl Repository<Message, String> for MessageRepository {
    async fn find_by_id(&self, id: String) -> RepoResult<Option<Message>> {
        let cache_key = self.cache_key_builder.id(&id);

        if let Some(message) = self.cache.get::<Message>(&cache_key) {
            return Ok(Some(message));
        }

        let message = self
            .db
            .query_single_as::<Message>(
                r#"
                SELECT
                    id, message_type, sender_id, recipient_id, recipient_email, recipient_phone,
                    subject, body, template_id, task_id, client_id,
                    status, priority, scheduled_at, sent_at, read_at, error_message, metadata,
                    created_at, updated_at
                FROM messages
                WHERE id = ?
                "#,
                params![id],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find message by id: {}", e)))?;

        if let Some(ref message) = message {
            self.cache
                .set(&cache_key, message.clone(), ttl::MEDIUM);
        }

        Ok(message)
    }

    async fn find_all(&self) -> RepoResult<Vec<Message>> {
        let cache_key = self.cache_key_builder.list(&["all"]);

        if let Some(messages) = self.cache.get::<Vec<Message>>(&cache_key) {
            return Ok(messages);
        }

        let messages = self
            .db
            .query_as::<Message>(
                r#"
                SELECT
                    id, message_type, sender_id, recipient_id, recipient_email, recipient_phone,
                    subject, body, template_id, task_id, client_id,
                    status, priority, scheduled_at, sent_at, read_at, error_message, metadata,
                    created_at, updated_at
                FROM messages
                ORDER BY created_at DESC
                LIMIT 1000
                "#,
                [],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find all messages: {}", e)))?;

        self.cache
            .set(&cache_key, messages.clone(), ttl::SHORT);

        Ok(messages)
    }

    async fn save(&self, entity: Message) -> RepoResult<Message> {
        let exists = self.exists_by_id(entity.id.clone()).await?;

        if exists {
            // Update existing message
            self.db
                .execute(
                    r#"
                    UPDATE messages SET
                        message_type = ?, sender_id = ?, recipient_id = ?, recipient_email = ?, recipient_phone = ?,
                        subject = ?, body = ?, template_id = ?, task_id = ?, client_id = ?,
                        status = ?, priority = ?, scheduled_at = ?, sent_at = ?, read_at = ?, error_message = ?, metadata = ?,
                        updated_at = strftime('%s', 'now')
                    WHERE id = ?
                    "#,
                    params![
                        entity.message_type,
                        entity.sender_id,
                        entity.recipient_id,
                        entity.recipient_email,
                        entity.recipient_phone,
                        entity.subject,
                        entity.body,
                        entity.template_id,
                        entity.task_id,
                        entity.client_id,
                        entity.status,
                        entity.priority,
                        entity.scheduled_at,
                        entity.sent_at,
                        entity.read_at,
                        entity.error_message,
                        entity.metadata,
                        entity.id,
                    ],
                )
                .map_err(|e| RepoError::Database(format!("Failed to update message: {}", e)))?;
        } else {
            // Create new message
            self.db
                .execute(
                    r#"
                    INSERT INTO messages (
                        id, message_type, sender_id, recipient_id, recipient_email, recipient_phone,
                        subject, body, template_id, task_id, client_id,
                        status, priority, scheduled_at, sent_at, read_at, error_message, metadata,
                        created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'), strftime('%s', 'now'))
                    "#,
                    params![
                        entity.id,
                        entity.message_type,
                        entity.sender_id,
                        entity.recipient_id,
                        entity.recipient_email,
                        entity.recipient_phone,
                        entity.subject,
                        entity.body,
                        entity.template_id,
                        entity.task_id,
                        entity.client_id,
                        entity.status,
                        entity.priority,
                        entity.scheduled_at,
                        entity.sent_at,
                        entity.read_at,
                        entity.error_message,
                        entity.metadata,
                    ],
                )
                .map_err(|e| RepoError::Database(format!("Failed to create message: {}", e)))?;
        }

        // Invalidate cache
        self.invalidate_message_cache(&entity.id);

        // Return the saved message
        self.find_by_id(entity.id)
            .await?
            .ok_or_else(|| RepoError::NotFound("Message not found after save".to_string()))
    }

    async fn delete_by_id(&self, id: String) -> RepoResult<bool> {
        let rows_affected = self
            .db
            .execute(
                "DELETE FROM messages WHERE id = ?",
                params![id],
            )
            .map_err(|e| RepoError::Database(format!("Failed to delete message: {}", e)))?;

        if rows_affected > 0 {
            // Invalidate cache
            self.invalidate_message_cache(&id);
        }

        Ok(rows_affected > 0)
    }

    async fn exists_by_id(&self, id: String) -> RepoResult<bool> {
        let count: i64 = self
            .db
            .query_single_value(
                "SELECT COUNT(*) FROM messages WHERE id = ?",
                params![id],
            )
            .map_err(|e| RepoError::Database(format!("Failed to check message existence: {}", e)))?;

        Ok(count > 0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::Database;
    use rusqlite::params;

    fn seed_user(db: &Database, user_id: &str) {
        db.execute(
            r#"
            INSERT INTO users (
                id, email, username, password_hash, full_name, role,
                is_active, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
            params![
                user_id,
                format!("{}@example.com", user_id),
                user_id,
                "hash",
                "Test User",
                "technician",
                1,
                chrono::Utc::now().timestamp_millis(),
                chrono::Utc::now().timestamp_millis(),
            ],
        )
        .unwrap();
    }

    async fn setup_test_db() -> Database {
        let db = Database::new_in_memory().await.unwrap();
        seed_user(&db, "sender-1");
        seed_user(&db, "recipient-0");
        seed_user(&db, "recipient-1");
        db
    }

    #[tokio::test]
    async fn test_find_by_id() {
        let db = Arc::new(setup_test_db().await);
        let cache = Arc::new(Cache::new(100));
        let repo = MessageRepository::new(db, cache);

        // Create test message
        let message = Message {
            id: "test-1".to_string(),
            message_type: "email".to_string(),
            sender_id: Some("sender-1".to_string()),
            recipient_id: Some("recipient-1".to_string()),
            recipient_email: Some("recipient@example.com".to_string()),
            recipient_phone: None,
            subject: Some("Test Subject".to_string()),
            body: "Test body".to_string(),
            template_id: None,
            task_id: None,
            client_id: None,
            status: "pending".to_string(),
            priority: "normal".to_string(),
            scheduled_at: None,
            sent_at: None,
            read_at: None,
            error_message: None,
            metadata: None,
            created_at: chrono::Utc::now().timestamp(),
            updated_at: chrono::Utc::now().timestamp(),
        };

        repo.save(message.clone()).await.unwrap();

        // Find by ID
        let found = repo.find_by_id("test-1".to_string()).await.unwrap();
        assert!(found.is_some());
        assert_eq!(found.unwrap().id, "test-1");
    }

    #[tokio::test]
    async fn test_find_by_type() {
        let db = Arc::new(setup_test_db().await);
        let cache = Arc::new(Cache::new(100));
        let repo = MessageRepository::new(db, cache);

        // Create test messages
        for i in 0..2 {
            let message = Message {
                id: format!("type-test-{}", i),
                message_type: "email".to_string(),
                sender_id: Some("sender-1".to_string()),
                recipient_id: Some(format!("recipient-{}", i)),
                recipient_email: None,
                recipient_phone: None,
                subject: Some(format!("Test Subject {}", i)),
                body: format!("Test body {}", i),
                template_id: None,
                task_id: None,
                client_id: None,
                status: "pending".to_string(),
                priority: "normal".to_string(),
                scheduled_at: None,
                sent_at: None,
                read_at: None,
                error_message: None,
                metadata: None,
                created_at: chrono::Utc::now().timestamp(),
                updated_at: chrono::Utc::now().timestamp(),
            };
            repo.save(message).await.unwrap();
        }

        // Find by type
        let messages = repo.find_by_type(MessageType::Email).await.unwrap();
        assert!(messages.len() >= 2);
    }

    #[tokio::test]
    async fn test_find_by_status() {
        let db = Arc::new(setup_test_db().await);
        let cache = Arc::new(Cache::new(100));
        let repo = MessageRepository::new(db, cache);

        // Create test message
        let message = Message {
            id: "status-test".to_string(),
            message_type: "email".to_string(),
            sender_id: Some("sender-1".to_string()),
            recipient_id: Some("recipient-1".to_string()),
            recipient_email: None,
            recipient_phone: None,
            subject: Some("Status Test".to_string()),
            body: "Test body".to_string(),
            template_id: None,
            task_id: None,
            client_id: None,
            status: "pending".to_string(),
            priority: "normal".to_string(),
            scheduled_at: None,
            sent_at: None,
            read_at: None,
            error_message: None,
            metadata: None,
            created_at: chrono::Utc::now().timestamp(),
            updated_at: chrono::Utc::now().timestamp(),
        };
        repo.save(message).await.unwrap();

        // Find by status
        let messages = repo.find_by_status(MessageStatus::Pending).await.unwrap();
        assert!(messages.len() >= 1);
    }

    #[tokio::test]
    async fn test_find_by_recipient() {
        let db = Arc::new(setup_test_db().await);
        let cache = Arc::new(Cache::new(100));
        let repo = MessageRepository::new(db, cache);

        // Create test messages
        for i in 0..2 {
            let message = Message {
                id: format!("recipient-test-{}", i),
                message_type: "in_app".to_string(),
                sender_id: Some("sender-1".to_string()),
                recipient_id: Some("recipient-1".to_string()),
                recipient_email: None,
                recipient_phone: None,
                subject: Some(format!("Subject {}", i)),
                body: format!("Body {}", i),
                template_id: None,
                task_id: None,
                client_id: None,
                status: "pending".to_string(),
                priority: "normal".to_string(),
                scheduled_at: None,
                sent_at: None,
                read_at: None,
                error_message: None,
                metadata: None,
                created_at: chrono::Utc::now().timestamp(),
                updated_at: chrono::Utc::now().timestamp(),
            };
            repo.save(message).await.unwrap();
        }

        // Find by recipient
        let messages = repo.find_by_recipient("recipient-1").await.unwrap();
        assert!(messages.len() >= 2);
    }

    #[tokio::test]
    async fn test_find_unsent() {
        let db = Arc::new(setup_test_db().await);
        let cache = Arc::new(Cache::new(100));
        let repo = MessageRepository::new(db, cache);

        // Create pending message
        let pending = Message {
            id: "pending-msg".to_string(),
            message_type: "email".to_string(),
            sender_id: None,
            recipient_id: Some("recipient-1".to_string()),
            recipient_email: Some("recipient@example.com".to_string()),
            recipient_phone: None,
            subject: Some("Pending Message".to_string()),
            body: "Test body".to_string(),
            template_id: None,
            task_id: None,
            client_id: None,
            status: "pending".to_string(),
            priority: "normal".to_string(),
            scheduled_at: None,
            sent_at: None,
            read_at: None,
            error_message: None,
            metadata: None,
            created_at: chrono::Utc::now().timestamp(),
            updated_at: chrono::Utc::now().timestamp(),
        };
        repo.save(pending).await.unwrap();

        // Find unsent messages
        let unsent = repo.find_unsent().await.unwrap();
        assert!(unsent.len() >= 1);
    }

    #[tokio::test]
    async fn test_update_status() {
        let db = Arc::new(setup_test_db().await);
        let cache = Arc::new(Cache::new(100));
        let repo = MessageRepository::new(db, cache);

        // Create test message
        let message = Message {
            id: "update-status-msg".to_string(),
            message_type: "email".to_string(),
            sender_id: None,
            recipient_id: Some("recipient-1".to_string()),
            recipient_email: Some("recipient@example.com".to_string()),
            recipient_phone: None,
            subject: Some("Status Update Test".to_string()),
            body: "Test body".to_string(),
            template_id: None,
            task_id: None,
            client_id: None,
            status: "pending".to_string(),
            priority: "normal".to_string(),
            scheduled_at: None,
            sent_at: None,
            read_at: None,
            error_message: None,
            metadata: None,
            created_at: chrono::Utc::now().timestamp(),
            updated_at: chrono::Utc::now().timestamp(),
        };
        repo.save(message).await.unwrap();

        // Update status to sent
        repo.update_status("update-status-msg", MessageStatus::Sent).await.unwrap();

        // Verify status updated
        let updated = repo.find_by_id("update-status-msg".to_string()).await.unwrap().unwrap();
        assert_eq!(updated.status, "sent");
        assert!(updated.sent_at.is_some());
    }

    #[tokio::test]
    async fn test_search() {
        let db = Arc::new(setup_test_db().await);
        let cache = Arc::new(Cache::new(100));
        let repo = MessageRepository::new(db, cache);

        // Create test messages
        for i in 0..3 {
            let message = Message {
                id: format!("search-{}", i),
                message_type: "in_app".to_string(),
                sender_id: Some("sender-1".to_string()),
                recipient_id: Some("recipient-1".to_string()),
                recipient_email: None,
                recipient_phone: None,
                subject: Some(format!("Search Subject {}", i)),
                body: format!("Search body {}", i),
                template_id: None,
                task_id: None,
                client_id: None,
                status: "pending".to_string(),
                priority: "normal".to_string(),
                scheduled_at: None,
                sent_at: None,
                read_at: None,
                error_message: None,
                metadata: None,
                created_at: chrono::Utc::now().timestamp(),
                updated_at: chrono::Utc::now().timestamp(),
            };
            repo.save(message).await.unwrap();
        }

        // Search messages
        let query = MessageQuery {
            search: Some("Search".to_string()),
            ..Default::default()
        };

        let results = repo.search(query).await.unwrap();
        assert!(results.len() >= 3);
    }

    #[tokio::test]
    async fn test_cache_hit() {
        let db = Arc::new(setup_test_db().await);
        let cache = Arc::new(Cache::new(100));
        let repo = MessageRepository::new(Arc::clone(&db), Arc::clone(&cache));

        // Create test message
        let message = Message {
            id: "cache-test".to_string(),
            message_type: "email".to_string(),
            sender_id: None,
            recipient_id: Some("recipient-1".to_string()),
            recipient_email: Some("recipient@example.com".to_string()),
            recipient_phone: None,
            subject: Some("Cache Test".to_string()),
            body: "Test body".to_string(),
            template_id: None,
            task_id: None,
            client_id: None,
            status: "pending".to_string(),
            priority: "normal".to_string(),
            scheduled_at: None,
            sent_at: None,
            read_at: None,
            error_message: None,
            metadata: None,
            created_at: chrono::Utc::now().timestamp(),
            updated_at: chrono::Utc::now().timestamp(),
        };

        repo.save(message).await.unwrap();

        // First call - cache miss, hit database
        let _ = repo.find_by_id("cache-test".to_string()).await.unwrap();

        // Second call - cache hit
        let found = repo.find_by_id("cache-test".to_string()).await.unwrap();
        assert!(found.is_some());
        assert_eq!(found.unwrap().subject, Some("Cache Test".to_string()));
    }
}
