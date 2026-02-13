//! Sync Queue Service - PRD-07 Implementation
//!
//! Provides persistent queue for offline CRUD operations with retry logic
//! and dependency management.

use crate::models::sync::*;
use rusqlite::params;

use chrono::{DateTime, Utc};

/// Custom error type for sync queue operations
#[derive(Debug, thiserror::Error)]
pub enum SyncQueueError {
    #[error("Database error: {0}")]
    Database(String),
    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
    #[error("DateTime parse error: {0}")]
    DateTimeParse(#[from] chrono::ParseError),
    #[error("Operation not found: {0}")]
    NotFound(i64),
    #[error("Invalid operation state")]
    InvalidState,
}

impl From<String> for SyncQueueError {
    fn from(s: String) -> Self {
        Self::Database(s)
    }
}

impl From<rusqlite::Error> for SyncQueueError {
    fn from(e: rusqlite::Error) -> Self {
        Self::Database(e.to_string())
    }
}

fn normalize_legacy_enum_value(value: &str) -> String {
    let trimmed = value.trim();
    if let Ok(decoded) = serde_json::from_str::<String>(trimmed) {
        return decoded;
    }

    if trimmed.starts_with('"') && trimmed.ends_with('"') {
        trimmed.trim_matches('"').to_string()
    } else {
        trimmed.to_string()
    }
}

fn enum_conversion_error(field: &str, value: &str) -> rusqlite::Error {
    rusqlite::Error::FromSqlConversionFailure(
        0,
        rusqlite::types::Type::Text,
        Box::new(std::io::Error::new(
            std::io::ErrorKind::InvalidData,
            format!("Unknown {}: {}", field, value),
        )),
    )
}

fn parse_operation_type(operation_type: &str) -> Result<OperationType, rusqlite::Error> {
    let normalized = normalize_legacy_enum_value(operation_type);
    match normalized.as_str() {
        "create" => Ok(OperationType::Create),
        "update" => Ok(OperationType::Update),
        "delete" => Ok(OperationType::Delete),
        _ => Err(enum_conversion_error("operation type", operation_type)),
    }
}

fn parse_entity_type(entity_type: &str) -> Result<EntityType, rusqlite::Error> {
    let normalized = normalize_legacy_enum_value(entity_type);
    match normalized.as_str() {
        "task" => Ok(EntityType::Task),
        "client" => Ok(EntityType::Client),
        "intervention" => Ok(EntityType::Intervention),
        "step" => Ok(EntityType::Step),
        "photo" => Ok(EntityType::Photo),
        "user" => Ok(EntityType::User),
        _ => Err(enum_conversion_error("entity type", entity_type)),
    }
}

fn parse_status(status: &str) -> Result<SyncStatus, rusqlite::Error> {
    let normalized = normalize_legacy_enum_value(status);
    match normalized.as_str() {
        "pending" => Ok(SyncStatus::Pending),
        "processing" => Ok(SyncStatus::Processing),
        "completed" => Ok(SyncStatus::Completed),
        "failed" => Ok(SyncStatus::Failed),
        "abandoned" => Ok(SyncStatus::Abandoned),
        _ => Err(enum_conversion_error("sync status", status)),
    }
}

/// Sync queue service for managing offline operations
#[derive(Clone, Debug)]
pub struct SyncQueue {
    db: crate::db::Database,
}

impl SyncQueue {
    /// Create a new sync queue service
    pub fn new(db: crate::db::Database) -> Self {
        Self { db }
    }

    /// Enqueue a new sync operation
    pub fn enqueue(&self, operation: SyncOperation) -> Result<i64, SyncQueueError> {
        let conn = self.db.get_connection().map_err(SyncQueueError::Database)?;

        let data_json = serde_json::to_string(&operation.data)?;
        let dependencies_json = serde_json::to_string(&operation.dependencies)?;

        let id = conn.execute(
            "INSERT INTO sync_queue
             (operation_type, entity_type, entity_id, data, dependencies,
              timestamp_utc, retry_count, max_retries, status, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            params![
                operation.operation_type.to_string(),
                operation.entity_type.to_string(),
                operation.entity_id,
                data_json,
                dependencies_json,
                operation.timestamp_utc.to_rfc3339(),
                operation.retry_count,
                operation.max_retries,
                operation.status.to_string(),
                operation.created_at.to_rfc3339(),
                operation.updated_at.to_rfc3339(),
            ],
        )?;

        Ok(id as i64)
    }

    /// Dequeue a batch of pending operations for processing
    pub fn dequeue_batch(&self, limit: usize) -> Result<Vec<SyncOperation>, SyncQueueError> {
        let conn = self.db.get_connection().map_err(SyncQueueError::Database)?;

        // Legacy compatibility: support JSON-encoded status values until migration completes.
        let mut stmt = conn.prepare(
            "SELECT id, operation_type, entity_type, entity_id, data, dependencies,
                    timestamp_utc, retry_count, max_retries, last_error, status,
                    created_at, updated_at
             FROM sync_queue sq
             WHERE sq.status IN ('pending', '\"pending\"')
               AND NOT EXISTS (
                 SELECT 1
                 FROM json_each(sq.dependencies) dep
                 JOIN sync_queue q ON q.entity_id = dep.value
                 WHERE q.status NOT IN ('completed', '\"completed\"')
               )
             ORDER BY timestamp_utc ASC
             LIMIT ?",
        )?;

        let operations: Vec<SyncOperation> = stmt
            .query_map([limit], |row| {
                let operation_type_str: String = row.get(1)?;
                let entity_type_str: String = row.get(2)?;
                let data_str: String = row.get(4)?;
                let dependencies_str: String = row.get(5)?;
                let timestamp_str: String = row.get(6)?;
                let status_str: String = row.get(10)?;
                let created_at_str: String = row.get(11)?;
                let updated_at_str: String = row.get(12)?;

                Ok(SyncOperation {
                    id: Some(row.get(0)?),
                    operation_type: parse_operation_type(&operation_type_str)?,
                    entity_type: parse_entity_type(&entity_type_str)?,
                    entity_id: row.get(3)?,
                    data: serde_json::from_str(&data_str).map_err(|e| {
                        rusqlite::Error::FromSqlConversionFailure(
                            0,
                            rusqlite::types::Type::Text,
                            Box::new(e),
                        )
                    })?,
                    dependencies: serde_json::from_str(&dependencies_str).map_err(|e| {
                        rusqlite::Error::FromSqlConversionFailure(
                            0,
                            rusqlite::types::Type::Text,
                            Box::new(e),
                        )
                    })?,
                    timestamp_utc: DateTime::parse_from_rfc3339(&timestamp_str)
                        .map_err(|e| {
                            rusqlite::Error::FromSqlConversionFailure(
                                0,
                                rusqlite::types::Type::Text,
                                Box::new(e),
                            )
                        })?
                        .with_timezone(&Utc),
                    retry_count: row.get(7)?,
                    max_retries: row.get(8)?,
                    last_error: row.get(9)?,
                    status: parse_status(&status_str)?,
                    created_at: DateTime::parse_from_rfc3339(&created_at_str)
                        .map_err(|e| {
                            rusqlite::Error::FromSqlConversionFailure(
                                0,
                                rusqlite::types::Type::Text,
                                Box::new(e),
                            )
                        })?
                        .with_timezone(&Utc),
                    updated_at: DateTime::parse_from_rfc3339(&updated_at_str)
                        .map_err(|e| {
                            rusqlite::Error::FromSqlConversionFailure(
                                0,
                                rusqlite::types::Type::Text,
                                Box::new(e),
                            )
                        })?
                        .with_timezone(&Utc),
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        // Mark operations as processing
        for op in &operations {
            if let Some(id) = op.id {
                conn.execute(
                    "UPDATE sync_queue SET status = 'processing', updated_at = ? WHERE id = ?",
                    params![Utc::now().to_rfc3339(), id],
                )?;
            }
        }

        Ok(operations)
    }

    /// Mark an operation as completed
    pub fn mark_completed(&self, operation_id: i64) -> Result<(), SyncQueueError> {
        let conn = self.db.get_connection().map_err(SyncQueueError::Database)?;
        let updated_at = Utc::now().to_rfc3339();

        let rows_affected = conn.execute(
            "UPDATE sync_queue SET status = 'completed', updated_at = ? WHERE id = ?",
            params![updated_at, operation_id],
        )?;

        if rows_affected == 0 {
            return Err(SyncQueueError::NotFound(operation_id));
        }

        Ok(())
    }

    /// Mark an operation as failed and handle retry logic
    pub fn mark_failed(&self, operation_id: i64, error: &str) -> Result<(), SyncQueueError> {
        let conn = self.db.get_connection().map_err(SyncQueueError::Database)?;
        let updated_at = Utc::now().to_rfc3339();

        // Get current retry count and max retries
        let (retry_count, max_retries): (i32, i32) = conn.query_row(
            "SELECT retry_count, max_retries FROM sync_queue WHERE id = ?",
            [operation_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )?;

        let new_retry_count = retry_count + 1;
        let new_status = if new_retry_count >= max_retries {
            "abandoned"
        } else {
            "pending"
        };

        let rows_affected = conn.execute(
            "UPDATE sync_queue SET
             status = ?1,
             retry_count = ?2,
             last_error = ?3,
             updated_at = ?4
             WHERE id = ?5",
            params![new_status, new_retry_count, error, updated_at, operation_id],
        )?;

        if rows_affected == 0 {
            return Err(SyncQueueError::NotFound(operation_id));
        }

        Ok(())
    }

    /// Get queue metrics for monitoring
    pub fn get_metrics(&self) -> Result<SyncQueueMetrics, SyncQueueError> {
        let conn = self.db.get_connection().map_err(SyncQueueError::Database)?;

        let (pending, processing, completed, failed, abandoned) = conn.query_row(
            "SELECT
             COUNT(CASE WHEN status IN ('pending', '\"pending\"') THEN 1 END),
             COUNT(CASE WHEN status IN ('processing', '\"processing\"') THEN 1 END),
             COUNT(CASE WHEN status IN ('completed', '\"completed\"') THEN 1 END),
             COUNT(CASE WHEN status IN ('failed', '\"failed\"') THEN 1 END),
             COUNT(CASE WHEN status IN ('abandoned', '\"abandoned\"') THEN 1 END)
             FROM sync_queue",
            [],
            |row| {
                Ok((
                    row.get(0)?,
                    row.get(1)?,
                    row.get(2)?,
                    row.get(3)?,
                    row.get(4)?,
                ))
            },
        )?;

        let oldest_pending_age_seconds = conn
            .query_row(
                "SELECT strftime('%s', 'now') - strftime('%s', timestamp_utc)
             FROM sync_queue
             WHERE status IN ('pending', '\"pending\"')
             ORDER BY timestamp_utc ASC
             LIMIT 1",
                [],
                |row| row.get(0),
            )
            .ok();

        let average_retry_count: f64 = conn
            .query_row(
                "SELECT AVG(retry_count) FROM sync_queue WHERE status IN ('failed', '\"failed\"', 'abandoned', '\"abandoned\"')",
                [],
                |row| row.get(0),
            )
            .unwrap_or(0.0);

        Ok(SyncQueueMetrics {
            pending_operations: pending,
            processing_operations: processing,
            completed_operations: completed,
            failed_operations: failed,
            abandoned_operations: abandoned,
            oldest_pending_age_seconds,
            average_retry_count,
        })
    }

    /// Get a specific operation by ID
    pub fn get_operation(&self, operation_id: i64) -> Result<SyncOperation, SyncQueueError> {
        let conn = self.db.get_connection().map_err(SyncQueueError::Database)?;

        let result = conn.query_row(
            "SELECT id, operation_type, entity_type, entity_id, data, dependencies,
                    timestamp_utc, retry_count, max_retries, last_error, status,
                    created_at, updated_at
             FROM sync_queue WHERE id = ?",
            [operation_id],
            |row| {
                let operation_type_str: String = row.get(1)?;
                let entity_type_str: String = row.get(2)?;
                let data_str: String = row.get(4)?;
                let dependencies_str: String = row.get(5)?;
                let timestamp_str: String = row.get(6)?;
                let status_str: String = row.get(10)?;
                let created_at_str: String = row.get(11)?;
                let updated_at_str: String = row.get(12)?;

                Ok(SyncOperation {
                    id: Some(row.get(0)?),
                    operation_type: parse_operation_type(&operation_type_str)?,
                    entity_type: parse_entity_type(&entity_type_str)?,
                    entity_id: row.get(3)?,
                    data: serde_json::from_str(&data_str).map_err(|e| {
                        rusqlite::Error::FromSqlConversionFailure(
                            0,
                            rusqlite::types::Type::Text,
                            Box::new(e),
                        )
                    })?,
                    dependencies: serde_json::from_str(&dependencies_str).map_err(|e| {
                        rusqlite::Error::FromSqlConversionFailure(
                            0,
                            rusqlite::types::Type::Text,
                            Box::new(e),
                        )
                    })?,
                    timestamp_utc: DateTime::parse_from_rfc3339(&timestamp_str)
                        .map_err(|e| {
                            rusqlite::Error::FromSqlConversionFailure(
                                0,
                                rusqlite::types::Type::Text,
                                Box::new(e),
                            )
                        })?
                        .with_timezone(&Utc),
                    retry_count: row.get(7)?,
                    max_retries: row.get(8)?,
                    last_error: row.get(9)?,
                    status: parse_status(&status_str)?,
                    created_at: DateTime::parse_from_rfc3339(&created_at_str)
                        .map_err(|e| {
                            rusqlite::Error::FromSqlConversionFailure(
                                0,
                                rusqlite::types::Type::Text,
                                Box::new(e),
                            )
                        })?
                        .with_timezone(&Utc),
                    updated_at: DateTime::parse_from_rfc3339(&updated_at_str)
                        .map_err(|e| {
                            rusqlite::Error::FromSqlConversionFailure(
                                0,
                                rusqlite::types::Type::Text,
                                Box::new(e),
                            )
                        })?
                        .with_timezone(&Utc),
                })
            },
        );

        match result {
            Ok(operation) => Ok(operation),
            Err(rusqlite::Error::QueryReturnedNoRows) => {
                Err(SyncQueueError::NotFound(operation_id))
            }
            Err(other) => Err(SyncQueueError::Database(other.to_string())),
        }
    }

    /// Get operations for a specific entity
    pub fn get_operations_for_entity(
        &self,
        entity_id: &str,
        entity_type: &str,
    ) -> Result<Vec<SyncOperation>, SyncQueueError> {
        let conn = self.db.get_connection().map_err(SyncQueueError::Database)?;
        let legacy_entity_type = serde_json::to_string(entity_type)?;

        let mut stmt = conn.prepare(
            "SELECT id, operation_type, entity_type, entity_id, data, dependencies,
                    timestamp_utc, retry_count, max_retries, last_error, status,
                    created_at, updated_at
             FROM sync_queue
             WHERE entity_id = ?1 AND entity_type IN (?2, ?3)
             ORDER BY timestamp_utc DESC",
        )?;

        let operations: Vec<SyncOperation> = stmt
            .query_map(params![entity_id, entity_type, legacy_entity_type], |row| {
                let operation_type_str: String = row.get(1)?;
                let entity_type_str: String = row.get(2)?;
                let data_str: String = row.get(4)?;
                let dependencies_str: String = row.get(5)?;
                let timestamp_str: String = row.get(6)?;
                let status_str: String = row.get(10)?;
                let created_at_str: String = row.get(11)?;
                let updated_at_str: String = row.get(12)?;

                Ok(SyncOperation {
                    id: Some(row.get(0)?),
                    operation_type: parse_operation_type(&operation_type_str)?,
                    entity_type: parse_entity_type(&entity_type_str)?,
                    entity_id: row.get(3)?,
                    data: serde_json::from_str(&data_str).map_err(|e| {
                        rusqlite::Error::FromSqlConversionFailure(
                            0,
                            rusqlite::types::Type::Text,
                            Box::new(e),
                        )
                    })?,
                    dependencies: serde_json::from_str(&dependencies_str).map_err(|e| {
                        rusqlite::Error::FromSqlConversionFailure(
                            0,
                            rusqlite::types::Type::Text,
                            Box::new(e),
                        )
                    })?,
                    timestamp_utc: DateTime::parse_from_rfc3339(&timestamp_str)
                        .map_err(|e| {
                            rusqlite::Error::FromSqlConversionFailure(
                                0,
                                rusqlite::types::Type::Text,
                                Box::new(e),
                            )
                        })?
                        .with_timezone(&Utc),
                    retry_count: row.get(7)?,
                    max_retries: row.get(8)?,
                    last_error: row.get(9)?,
                    status: parse_status(&status_str)?,
                    created_at: DateTime::parse_from_rfc3339(&created_at_str)
                        .map_err(|e| {
                            rusqlite::Error::FromSqlConversionFailure(
                                0,
                                rusqlite::types::Type::Text,
                                Box::new(e),
                            )
                        })?
                        .with_timezone(&Utc),
                    updated_at: DateTime::parse_from_rfc3339(&updated_at_str)
                        .map_err(|e| {
                            rusqlite::Error::FromSqlConversionFailure(
                                0,
                                rusqlite::types::Type::Text,
                                Box::new(e),
                            )
                        })?
                        .with_timezone(&Utc),
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(operations)
    }

    /// Clean up old completed operations (older than specified days)
    pub fn cleanup_old_operations(&self, days_old: i64) -> Result<i64, SyncQueueError> {
        let conn = self.db.get_connection().map_err(SyncQueueError::Database)?;
        let cutoff_date = Utc::now() - chrono::Duration::days(days_old);

        let rows_affected = conn.execute(
            "DELETE FROM sync_queue WHERE status IN ('completed', '\"completed\"') AND updated_at < ?",
            [cutoff_date.to_rfc3339()],
        )?;

        Ok(rows_affected as i64)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::Database;
    use crate::models::sync::{EntityType, OperationType, SyncOperation, SyncStatus};
    use chrono::Utc;

    fn build_operation(entity_id: &str, dependencies: Vec<String>) -> SyncOperation {
        SyncOperation {
            id: None,
            operation_type: OperationType::Create,
            entity_type: EntityType::Task,
            entity_id: entity_id.to_string(),
            data: serde_json::json!({}),
            dependencies,
            timestamp_utc: Utc::now(),
            retry_count: 0,
            max_retries: 3,
            last_error: None,
            status: SyncStatus::Pending,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }

    #[tokio::test]
    async fn test_enqueue_stores_plain_status() {
        let db = Database::new_in_memory().await.expect("create db");
        let queue = SyncQueue::new(db.clone());
        let operation = build_operation("task-1", vec![]);

        let id = queue.enqueue(operation).expect("enqueue");

        let conn = db.get_connection().expect("connection");
        let status: String = conn
            .query_row("SELECT status FROM sync_queue WHERE id = ?", [id], |row| {
                row.get(0)
            })
            .expect("query status");

        assert_eq!(status, "pending");
    }

    #[tokio::test]
    async fn test_dequeue_respects_dependencies() {
        let db = Database::new_in_memory().await.expect("create db");
        let queue = SyncQueue::new(db.clone());

        let parent = build_operation("task-1", vec![]);
        let dependent = build_operation("task-2", vec!["task-1".to_string()]);

        let parent_id = queue.enqueue(parent).expect("enqueue parent");
        queue.enqueue(dependent).expect("enqueue dependent");

        let first_batch = queue.dequeue_batch(10).expect("dequeue");
        assert_eq!(first_batch.len(), 1);
        assert_eq!(first_batch[0].entity_id, "task-1");

        queue.mark_completed(parent_id).expect("mark completed");

        let second_batch = queue.dequeue_batch(10).expect("dequeue second");
        assert_eq!(second_batch.len(), 1);
        assert_eq!(second_batch[0].entity_id, "task-2");
    }
}
