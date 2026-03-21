//! Audit log repository implementation
//!
//! Provides consistent database access patterns for AuditLog entities.

/// ADR-005: Repository Pattern
use crate::db::Database;
use crate::shared::repositories::base::{RepoError, RepoResult, Repository};
use crate::shared::repositories::cache::{ttl, Cache, CacheKeyBuilder};
use async_trait::async_trait;
use chrono::{DateTime, Utc};
use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

// Canonical type definitions — single source of truth in audit_types.rs
pub use crate::shared::logging::audit_types::{ActionResult, AuditEventType};

/// Comprehensive audit event structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditLog {
    pub id: String,
    pub event_type: AuditEventType,
    pub user_id: String,
    pub action: String,
    pub resource_id: Option<String>,
    pub resource_type: Option<String>,
    pub description: String,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub result: ActionResult,
    pub previous_state: Option<serde_json::Value>,
    pub new_state: Option<serde_json::Value>,
    pub timestamp: DateTime<Utc>,
    pub metadata: Option<serde_json::Value>,
    pub session_id: Option<String>,
    pub request_id: Option<String>,
}

impl crate::db::FromSqlRow for AuditLog {
    fn from_row(row: &rusqlite::Row) -> rusqlite::Result<Self> {
        let event_type_str: String = row.get("event_type")?;
        let event_type = AuditEventType::from_str_or_default(&event_type_str);

        let result_str: String = row.get("result")?;
        let result = ActionResult::from_str_or_default(&result_str);

        let timestamp_ms: i64 = row.get("timestamp")?;
        let timestamp = DateTime::from_timestamp_millis(timestamp_ms).unwrap_or_else(|| Utc::now());

        let previous_state = row
            .get::<_, Option<String>>("previous_state")?
            .and_then(|s| serde_json::from_str(&s).ok());

        let new_state = row
            .get::<_, Option<String>>("new_state")?
            .and_then(|s| serde_json::from_str(&s).ok());

        let metadata = row
            .get::<_, Option<String>>("metadata")?
            .and_then(|s| serde_json::from_str(&s).ok());

        Ok(AuditLog {
            id: row.get("id")?,
            event_type,
            user_id: row.get("user_id")?,
            action: row.get("action")?,
            resource_id: row.get("resource_id")?,
            resource_type: row.get("resource_type")?,
            description: row.get("description")?,
            ip_address: row.get("ip_address")?,
            user_agent: row.get("user_agent")?,
            result,
            previous_state,
            new_state,
            timestamp,
            metadata,
            session_id: row.get("session_id")?,
            request_id: row.get("request_id")?,
        })
    }
}

/// Query for filtering audit logs
#[derive(Debug, Clone, Default)]
pub struct AuditQuery {
    pub user_id: Option<String>,
    pub event_type: Option<AuditEventType>,
    pub resource_type: Option<String>,
    pub resource_id: Option<String>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

impl AuditQuery {
    fn build_where_clause(&self) -> (String, Vec<rusqlite::types::Value>) {
        let mut conditions = vec!["1=1".to_string()];
        let mut params: Vec<rusqlite::types::Value> = Vec::new();

        if let Some(user_id) = &self.user_id {
            conditions.push("user_id = ?".to_string());
            params.push(user_id.clone().into());
        }

        if let Some(event_type) = &self.event_type {
            conditions.push("event_type = ?".to_string());
            params.push(event_type.to_str().to_string().into());
        }

        if let Some(resource_type) = &self.resource_type {
            conditions.push("resource_type = ?".to_string());
            params.push(resource_type.clone().into());
        }

        if let Some(resource_id) = &self.resource_id {
            conditions.push("resource_id = ?".to_string());
            params.push(resource_id.clone().into());
        }

        if let Some(start_date) = &self.start_date {
            conditions.push("timestamp >= ?".to_string());
            params.push(start_date.timestamp_millis().into());
        }

        if let Some(end_date) = &self.end_date {
            conditions.push("timestamp <= ?".to_string());
            params.push(end_date.timestamp_millis().into());
        }

        let where_clause = if conditions.is_empty() {
            String::new()
        } else {
            format!("WHERE {}", conditions.join(" AND "))
        };

        (where_clause, params)
    }
}

/// Audit log repository for database operations
pub struct AuditRepository {
    db: Arc<Database>,
    cache: Arc<Cache>,
    cache_key_builder: CacheKeyBuilder,
}

impl AuditRepository {
    /// Create a new AuditRepository
    pub fn new(db: Arc<Database>, cache: Arc<Cache>) -> Self {
        Self {
            db,
            cache,
            cache_key_builder: CacheKeyBuilder::new("audit"),
        }
    }

    /// Find audit logs by user ID
    pub async fn find_by_user(&self, user_id: &str, limit: i64) -> RepoResult<Vec<AuditLog>> {
        let cache_key = self
            .cache_key_builder
            .query(&["user", user_id, &limit.to_string()]);

        if let Some(logs) = self.cache.get::<Vec<AuditLog>>(&cache_key) {
            return Ok(logs);
        }

        let logs = self
            .db
            .query_as::<AuditLog>(
                r#"
                SELECT
                    id, event_type, user_id, action, resource_id, resource_type,
                    description, ip_address, user_agent, result, previous_state,
                    new_state, timestamp, metadata, session_id, request_id
                FROM audit_events
                WHERE user_id = ?
                ORDER BY timestamp DESC
                LIMIT ?
                "#,
                params![user_id, limit],
            )
            .map_err(|e| {
                RepoError::Database(format!("Failed to find audit logs by user: {}", e))
            })?;

        self.cache.set(&cache_key, logs.clone(), ttl::SHORT);

        Ok(logs)
    }

    /// Find audit logs by resource
    pub async fn find_by_resource(
        &self,
        resource_type: &str,
        resource_id: &str,
        limit: i64,
    ) -> RepoResult<Vec<AuditLog>> {
        let cache_key = self.cache_key_builder.query(&[
            "resource",
            resource_type,
            resource_id,
            &limit.to_string(),
        ]);

        if let Some(logs) = self.cache.get::<Vec<AuditLog>>(&cache_key) {
            return Ok(logs);
        }

        let logs = self
            .db
            .query_as::<AuditLog>(
                r#"
                SELECT
                    id, event_type, user_id, action, resource_id, resource_type,
                    description, ip_address, user_agent, result, previous_state,
                    new_state, timestamp, metadata, session_id, request_id
                FROM audit_events
                WHERE resource_type = ? AND resource_id = ?
                ORDER BY timestamp DESC
                LIMIT ?
                "#,
                params![resource_type, resource_id, limit],
            )
            .map_err(|e| {
                RepoError::Database(format!("Failed to find audit logs by resource: {}", e))
            })?;

        self.cache.set(&cache_key, logs.clone(), ttl::SHORT);

        Ok(logs)
    }

    /// Find audit logs by event type
    pub async fn find_by_event_type(
        &self,
        event_type: AuditEventType,
        limit: i64,
    ) -> RepoResult<Vec<AuditLog>> {
        let event_type_str = event_type.to_str();
        let cache_key =
            self.cache_key_builder
                .query(&["event_type", event_type_str, &limit.to_string()]);

        if let Some(logs) = self.cache.get::<Vec<AuditLog>>(&cache_key) {
            return Ok(logs);
        }

        let logs = self
            .db
            .query_as::<AuditLog>(
                r#"
                SELECT
                    id, event_type, user_id, action, resource_id, resource_type,
                    description, ip_address, user_agent, result, previous_state,
                    new_state, timestamp, metadata, session_id, request_id
                FROM audit_events
                WHERE event_type = ?
                ORDER BY timestamp DESC
                LIMIT ?
                "#,
                params![event_type_str.to_string(), limit],
            )
            .map_err(|e| {
                RepoError::Database(format!("Failed to find audit logs by event type: {}", e))
            })?;

        self.cache.set(&cache_key, logs.clone(), ttl::SHORT);

        Ok(logs)
    }

    /// Count audit logs matching query
    pub async fn count_by_query(&self, query: AuditQuery) -> RepoResult<i64> {
        let (where_clause, params) = query.build_where_clause();

        let sql = format!("SELECT COUNT(*) FROM audit_events {}", where_clause);

        let count: i64 = self
            .db
            .query_single_value(&sql, rusqlite::params_from_iter(params.iter()))
            .map_err(|e| RepoError::Database(format!("Failed to count audit logs: {}", e)))?;

        Ok(count)
    }

    /// Search audit logs with filters
    pub async fn search(&self, query: AuditQuery) -> RepoResult<Vec<AuditLog>> {
        let (where_clause, params) = query.build_where_clause();
        let limit = query.limit.unwrap_or(100);

        let sql = format!(
            r#"
            SELECT
                id, event_type, user_id, action, resource_id, resource_type,
                description, ip_address, user_agent, result, previous_state,
                new_state, timestamp, metadata, session_id, request_id
            FROM audit_events
            {}
            ORDER BY timestamp DESC
            LIMIT ?
            "#,
            where_clause
        );

        let mut params_vec: Vec<rusqlite::types::Value> = params;
        params_vec.push(limit.into());

        let logs = self
            .db
            .query_as::<AuditLog>(&sql, rusqlite::params_from_iter(params_vec.iter()))
            .map_err(|e| RepoError::Database(format!("Failed to search audit logs: {}", e)))?;

        Ok(logs)
    }

    /// Delete old audit logs (for cleanup)
    pub async fn delete_before_date(&self, date: DateTime<Utc>) -> RepoResult<i64> {
        let rows_affected = self
            .db
            .execute(
                "DELETE FROM audit_events WHERE timestamp < ?",
                params![date.timestamp_millis()],
            )
            .map_err(|e| RepoError::Database(format!("Failed to delete old audit logs: {}", e)))?
            as i64;

        self.cache.clear();
        Ok(rows_affected)
    }

    /// Invalidate cache for audit logs
    fn invalidate_cache(&self) {
        self.cache.clear();
    }
}

#[async_trait]
impl Repository<AuditLog, String> for AuditRepository {
    async fn find_by_id(&self, id: String) -> RepoResult<Option<AuditLog>> {
        let cache_key = self.cache_key_builder.id(&id);

        if let Some(log) = self.cache.get::<AuditLog>(&cache_key) {
            return Ok(Some(log));
        }

        let log = self
            .db
            .query_single_as::<AuditLog>(
                r#"
                SELECT
                    id, event_type, user_id, action, resource_id, resource_type,
                    description, ip_address, user_agent, result, previous_state,
                    new_state, timestamp, metadata, session_id, request_id
                FROM audit_events
                WHERE id = ?
                "#,
                params![id],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find audit log by id: {}", e)))?;

        if let Some(ref log) = log {
            self.cache.set(&cache_key, log.clone(), ttl::MEDIUM);
        }

        Ok(log)
    }

    async fn find_all(&self) -> RepoResult<Vec<AuditLog>> {
        let cache_key = self.cache_key_builder.list(&["all"]);

        if let Some(logs) = self.cache.get::<Vec<AuditLog>>(&cache_key) {
            return Ok(logs);
        }

        let logs = self
            .db
            .query_as::<AuditLog>(
                r#"
                SELECT
                    id, event_type, user_id, action, resource_id, resource_type,
                    description, ip_address, user_agent, result, previous_state,
                    new_state, timestamp, metadata, session_id, request_id
                FROM audit_events
                ORDER BY timestamp DESC
                LIMIT 1000
                "#,
                [],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find all audit logs: {}", e)))?;

        self.cache.set(&cache_key, logs.clone(), ttl::SHORT);

        Ok(logs)
    }

    async fn save(&self, entity: AuditLog) -> RepoResult<AuditLog> {
        let exists = self.exists_by_id(entity.id.clone()).await?;

        let event_type_str = entity.event_type.to_str();
        let result_str = entity.result.to_str();

        let previous_state_json = entity
            .previous_state
            .map(|v| serde_json::to_string(&v).unwrap_or_default())
            .unwrap_or_default();

        let new_state_json = entity
            .new_state
            .map(|v| serde_json::to_string(&v).unwrap_or_default())
            .unwrap_or_default();

        let metadata_json = entity
            .metadata
            .map(|v| serde_json::to_string(&v).unwrap_or_default())
            .unwrap_or_default();

        if !exists {
            self.db
                .execute(
                    r#"
                    INSERT INTO audit_events (
                        id, event_type, user_id, action, resource_id, resource_type,
                        description, ip_address, user_agent, result, previous_state,
                        new_state, timestamp, metadata, session_id, request_id
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    "#,
                    params![
                        entity.id,
                        event_type_str,
                        entity.user_id,
                        entity.action,
                        entity.resource_id,
                        entity.resource_type,
                        entity.description,
                        entity.ip_address,
                        entity.user_agent,
                        result_str,
                        previous_state_json,
                        new_state_json,
                        entity.timestamp.timestamp_millis(),
                        metadata_json,
                        entity.session_id,
                        entity.request_id,
                    ],
                )
                .map_err(|e| RepoError::Database(format!("Failed to create audit log: {}", e)))?;
        }

        self.invalidate_cache();

        self.find_by_id(entity.id)
            .await?
            .ok_or_else(|| RepoError::NotFound("Audit log not found after save".to_string()))
    }

    async fn delete_by_id(&self, id: String) -> RepoResult<bool> {
        let rows_affected = self
            .db
            .execute("DELETE FROM audit_events WHERE id = ?", params![id])
            .map_err(|e| RepoError::Database(format!("Failed to delete audit log: {}", e)))?
            as i64;

        if rows_affected > 0 {
            self.invalidate_cache();
        }

        Ok(rows_affected > 0)
    }

    async fn exists_by_id(&self, id: String) -> RepoResult<bool> {
        let count: i64 = self
            .db
            .query_single_value(
                "SELECT COUNT(*) FROM audit_events WHERE id = ?",
                params![id],
            )
            .map_err(|e| {
                RepoError::Database(format!("Failed to check audit log existence: {}", e))
            })?;

        Ok(count > 0)
    }
}
