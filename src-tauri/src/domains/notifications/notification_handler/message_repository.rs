use std::sync::Arc;
use async_trait::async_trait;
use rusqlite::params;

use crate::db::Database;
use crate::domains::notifications::models::{Message, MessageStatus, MessageType};
use crate::shared::repositories::base::{RepoError, RepoResult, Repository};
use crate::shared::repositories::cache::{ttl, Cache, CacheKeyBuilder};

/// Internal query struct for MessageRepository (distinct from domain MessageQuery).
#[derive(Debug, Clone, Default)]
pub struct MessageRepoQuery {
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

impl MessageRepoQuery {
    pub fn build_where_clause(&self) -> (String, Vec<rusqlite::types::Value>) {
        let mut conditions = vec!["1=1".to_string()];
        let mut params: Vec<rusqlite::types::Value> = Vec::new();
        if let Some(search) = &self.search {
            conditions.push("(subject LIKE ? OR body LIKE ?)".to_string());
            params.push(format!("%{}%", search).into());
            params.push(format!("%{}%", search).into());
        }
        if let Some(mt) = &self.message_type {
            conditions.push("message_type = ?".to_string());
            params.push(mt.to_string().into());
        }
        if let Some(st) = &self.status {
            conditions.push("status = ?".to_string());
            params.push(st.to_string().into());
        }
        if let Some(sid) = &self.sender_id {
            conditions.push("sender_id = ?".to_string());
            params.push(sid.clone().into());
        }
        if let Some(rid) = &self.recipient_id {
            conditions.push("recipient_id = ?".to_string());
            params.push(rid.clone().into());
        }
        if let Some(tid) = &self.task_id {
            conditions.push("task_id = ?".to_string());
            params.push(tid.clone().into());
        }
        if let Some(cid) = &self.client_id {
            conditions.push("client_id = ?".to_string());
            params.push(cid.clone().into());
        }
        if let Some(df) = self.date_from {
            conditions.push("created_at >= ?".to_string());
            params.push(df.into());
        }
        if let Some(dt) = self.date_to {
            conditions.push("created_at <= ?".to_string());
            params.push(dt.into());
        }
        let where_clause = if conditions.len() > 1 {
            format!("WHERE {}", conditions.join(" AND "))
        } else {
            String::new()
        };
        (where_clause, params)
    }

    pub fn build_order_by_clause(&self) -> Result<String, RepoError> {
        let sort_by = crate::shared::repositories::base::validate_sort_column(
            self.sort_by.as_deref().unwrap_or("created_at"),
            &["created_at", "updated_at", "message_type", "status", "priority", "scheduled_at", "sent_at", "read_at", "subject"],
        )?;
        let sort_order = match self.sort_order.as_deref() {
            Some("ASC") => "ASC",
            _ => "DESC",
        };
        Ok(format!("ORDER BY {} {}", sort_by, sort_order))
    }

    pub fn build_limit_offset(&self) -> Option<(i64, Option<i64>)> {
        self.limit.map(|l| (l, self.offset))
    }
}

pub struct MessageRepository {
    db: Arc<Database>,
    cache: Arc<Cache>,
    cache_key_builder: CacheKeyBuilder,
}

impl MessageRepository {
    pub fn new(db: Arc<Database>, cache: Arc<Cache>) -> Self {
        Self { db, cache, cache_key_builder: CacheKeyBuilder::new("message") }
    }

    pub async fn find_by_type(&self, message_type: MessageType) -> RepoResult<Vec<Message>> {
        let cache_key = self.cache_key_builder.query(&["type", &message_type.to_string()]);
        if let Some(m) = self.cache.get::<Vec<Message>>(&cache_key) {
            return Ok(m);
        }
        let messages = self.db
            .query_as::<Message>(
                "SELECT id, message_type, sender_id, recipient_id, recipient_email, recipient_phone, subject, body, template_id, task_id, client_id, status, priority, scheduled_at, sent_at, read_at, error_message, metadata, created_at, updated_at FROM messages WHERE message_type = ? ORDER BY created_at DESC",
                params![message_type.to_string()],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find by type: {}", e)))?;
        self.cache.set(&cache_key, messages.clone(), ttl::SHORT);
        Ok(messages)
    }

    pub async fn find_by_status(&self, status: MessageStatus) -> RepoResult<Vec<Message>> {
        let cache_key = self.cache_key_builder.query(&["status", &status.to_string()]);
        if let Some(m) = self.cache.get::<Vec<Message>>(&cache_key) {
            return Ok(m);
        }
        let messages = self.db
            .query_as::<Message>(
                "SELECT id, message_type, sender_id, recipient_id, recipient_email, recipient_phone, subject, body, template_id, task_id, client_id, status, priority, scheduled_at, sent_at, read_at, error_message, metadata, created_at, updated_at FROM messages WHERE status = ? ORDER BY created_at DESC",
                params![status.to_string()],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find by status: {}", e)))?;
        self.cache.set(&cache_key, messages.clone(), ttl::SHORT);
        Ok(messages)
    }

    pub async fn find_by_recipient(&self, recipient_id: &str) -> RepoResult<Vec<Message>> {
        let cache_key = self.cache_key_builder.query(&["recipient", recipient_id]);
        if let Some(m) = self.cache.get::<Vec<Message>>(&cache_key) {
            return Ok(m);
        }
        let messages = self.db
            .query_as::<Message>(
                "SELECT id, message_type, sender_id, recipient_id, recipient_email, recipient_phone, subject, body, template_id, task_id, client_id, status, priority, scheduled_at, sent_at, read_at, error_message, metadata, created_at, updated_at FROM messages WHERE recipient_id = ? ORDER BY created_at DESC LIMIT 100",
                params![recipient_id],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find by recipient: {}", e)))?;
        self.cache.set(&cache_key, messages.clone(), ttl::SHORT);
        Ok(messages)
    }

    pub async fn find_unsent(&self) -> RepoResult<Vec<Message>> {
        let cache_key = self.cache_key_builder.query(&["unsent"]);
        if let Some(m) = self.cache.get::<Vec<Message>>(&cache_key) {
            return Ok(m);
        }
        let messages = self.db
            .query_as::<Message>(
                "SELECT id, message_type, sender_id, recipient_id, recipient_email, recipient_phone, subject, body, template_id, task_id, client_id, status, priority, scheduled_at, sent_at, read_at, error_message, metadata, created_at, updated_at FROM messages WHERE status IN ('pending', 'failed') AND (scheduled_at IS NULL OR scheduled_at <= strftime('%s', 'now')) ORDER BY priority DESC, created_at ASC LIMIT 50",
                [],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find unsent: {}", e)))?;
        self.cache.set(&cache_key, messages.clone(), ttl::SHORT);
        Ok(messages)
    }

    pub async fn update_status(&self, message_id: &str, status: MessageStatus) -> RepoResult<()> {
        let timestamp = chrono::Utc::now().timestamp();
        let (sent_at, read_at) = match status {
            MessageStatus::Sent | MessageStatus::Delivered => (Some(timestamp), None),
            MessageStatus::Read => (Some(timestamp), Some(timestamp)),
            _ => (None, None),
        };
        self.db.execute(
            "UPDATE messages SET status=?, sent_at=COALESCE(?,sent_at), read_at=COALESCE(?,read_at), updated_at=strftime('%s','now') WHERE id=?",
            params![status.to_string(), sent_at, read_at, message_id],
        ).map_err(|e| RepoError::Database(format!("Failed to update status: {}", e)))?;
        self.cache.remove(&self.cache_key_builder.id(message_id));
        Ok(())
    }

    pub async fn search(&self, query: MessageRepoQuery) -> RepoResult<Vec<Message>> {
        let cache_key = self.cache_key_builder.query(&[&format!("{:?}", query)]);
        if let Some(m) = self.cache.get::<Vec<Message>>(&cache_key) {
            return Ok(m);
        }
        let (where_clause, params) = query.build_where_clause();
        let order_clause = query.build_order_by_clause().unwrap_or_else(|_| "ORDER BY created_at DESC".to_string());
        let (limit, _offset) = query.build_limit_offset().unwrap_or((100, None));
        let sql = format!(
            "SELECT id, message_type, sender_id, recipient_id, recipient_email, recipient_phone, subject, body, template_id, task_id, client_id, status, priority, scheduled_at, sent_at, read_at, error_message, metadata, created_at, updated_at FROM messages {} {} LIMIT ?",
            where_clause, order_clause
        );
        let mut params_vec: Vec<rusqlite::types::Value> = params;
        params_vec.push(limit.into());
        let messages = self.db
            .query_as::<Message>(&sql, rusqlite::params_from_iter(params_vec.iter()))
            .map_err(|e| RepoError::Database(format!("Failed to search: {}", e)))?;
        self.cache.set(&cache_key, messages.clone(), ttl::SHORT);
        Ok(messages)
    }

    pub async fn count(&self, query: MessageRepoQuery) -> RepoResult<i64> {
        let (where_clause, params) = query.build_where_clause();
        let sql = format!("SELECT COUNT(*) FROM messages {}", where_clause);
        self.db
            .query_single_value(&sql, rusqlite::params_from_iter(params.iter()))
            .map_err(|e| RepoError::Database(format!("Failed to count: {}", e)))
    }

    pub fn invalidate_all_cache(&self) {
        self.cache.clear();
    }
}

#[async_trait]
impl Repository<Message, String> for MessageRepository {
    async fn find_by_id(&self, id: String) -> RepoResult<Option<Message>> {
        let cache_key = self.cache_key_builder.id(&id);
        if let Some(m) = self.cache.get::<Message>(&cache_key) {
            return Ok(Some(m));
        }
        let message = self.db
            .query_single_as::<Message>(
                "SELECT id, message_type, sender_id, recipient_id, recipient_email, recipient_phone, subject, body, template_id, task_id, client_id, status, priority, scheduled_at, sent_at, read_at, error_message, metadata, created_at, updated_at FROM messages WHERE id = ?",
                params![id],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find message: {}", e)))?;
        if let Some(ref m) = message {
            self.cache.set(&cache_key, m.clone(), ttl::MEDIUM);
        }
        Ok(message)
    }

    async fn find_all(&self) -> RepoResult<Vec<Message>> {
        let cache_key = self.cache_key_builder.list(&["all"]);
        if let Some(m) = self.cache.get::<Vec<Message>>(&cache_key) {
            return Ok(m);
        }
        let messages = self.db
            .query_as::<Message>(
                "SELECT id, message_type, sender_id, recipient_id, recipient_email, recipient_phone, subject, body, template_id, task_id, client_id, status, priority, scheduled_at, sent_at, read_at, error_message, metadata, created_at, updated_at FROM messages ORDER BY created_at DESC LIMIT 1000",
                [],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find all: {}", e)))?;
        self.cache.set(&cache_key, messages.clone(), ttl::SHORT);
        Ok(messages)
    }

    async fn save(&self, entity: Message) -> RepoResult<Message> {
        let exists = self.exists_by_id(entity.id.clone()).await?;
        if exists {
            self.db.execute(
                "UPDATE messages SET message_type=?, sender_id=?, recipient_id=?, recipient_email=?, recipient_phone=?, subject=?, body=?, template_id=?, task_id=?, client_id=?, status=?, priority=?, scheduled_at=?, sent_at=?, read_at=?, error_message=?, metadata=?, updated_at=strftime('%s','now') WHERE id=?",
                params![entity.message_type, entity.sender_id, entity.recipient_id, entity.recipient_email, entity.recipient_phone, entity.subject, entity.body, entity.template_id, entity.task_id, entity.client_id, entity.status, entity.priority, entity.scheduled_at, entity.sent_at, entity.read_at, entity.error_message, entity.metadata, entity.id],
            ).map_err(|e| RepoError::Database(format!("Failed to update message: {}", e)))?;
        } else {
            self.db.execute(
                "INSERT INTO messages (id, message_type, sender_id, recipient_id, recipient_email, recipient_phone, subject, body, template_id, task_id, client_id, status, priority, scheduled_at, sent_at, read_at, error_message, metadata, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%s','now'), strftime('%s','now'))",
                params![entity.id, entity.message_type, entity.sender_id, entity.recipient_id, entity.recipient_email, entity.recipient_phone, entity.subject, entity.body, entity.template_id, entity.task_id, entity.client_id, entity.status, entity.priority, entity.scheduled_at, entity.sent_at, entity.read_at, entity.error_message, entity.metadata],
            ).map_err(|e| RepoError::Database(format!("Failed to create message: {}", e)))?;
        }
        self.cache.remove(&self.cache_key_builder.id(&entity.id));
        self.find_by_id(entity.id).await?.ok_or_else(|| RepoError::NotFound("Message not found after save".to_string()))
    }

    async fn delete_by_id(&self, id: String) -> RepoResult<bool> {
        let rows = self.db
            .execute("DELETE FROM messages WHERE id = ?", params![id])
            .map_err(|e| RepoError::Database(format!("Failed to delete: {}", e)))?;
        if rows > 0 { self.cache.remove(&self.cache_key_builder.id(&id)); }
        Ok(rows > 0)
    }

    async fn exists_by_id(&self, id: String) -> RepoResult<bool> {
        let count = self.db
            .query_single_value::<i64>("SELECT COUNT(*) FROM messages WHERE id = ?", params![id])
            .map_err(|e| RepoError::Database(format!("Failed to check existence: {}", e)))?;
        Ok(count > 0)
    }
}
