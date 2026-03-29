use async_trait::async_trait;
use rusqlite::{params, OptionalExtension};
use std::collections::HashMap;
use std::sync::Arc;

use crate::db::Database;
use crate::domains::integrations::domain::models::integrations::{
    DeliveryStatus, IntegrationConfig, IntegrationKind, IntegrationStatus, OutboundDelivery,
};
use crate::shared::error::{AppError, AppResult};

#[derive(Debug, Clone)]
pub struct StoredIntegrationSecret {
    pub config: IntegrationConfig,
    pub secret_token: Option<String>,
}

#[derive(Debug, Clone)]
pub struct DeliveryRecord {
    pub id: String,
    pub integration_id: String,
    pub event_name: String,
    pub payload: serde_json::Value,
    pub correlation_id: String,
    pub status: DeliveryStatus,
    pub attempt_count: i64,
    pub last_error: Option<String>,
    pub next_retry_at: Option<i64>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[async_trait]
pub trait IntegrationsRepository: Send + Sync {
    async fn list(&self) -> AppResult<Vec<IntegrationConfig>>;
    async fn get(&self, id: &str) -> AppResult<IntegrationConfig>;
    async fn get_with_secret(&self, id: &str) -> AppResult<StoredIntegrationSecret>;
    async fn create(
        &self,
        integration: &IntegrationConfig,
        encrypted_secret: Option<String>,
    ) -> AppResult<()>;
    async fn update(
        &self,
        integration: &IntegrationConfig,
        encrypted_secret: Option<String>,
    ) -> AppResult<()>;
    async fn update_last_tested_at(&self, id: &str, tested_at: i64) -> AppResult<()>;
    async fn retry_dead_letters(&self, integration_id: &str) -> AppResult<usize>;
    async fn list_active_for_event(
        &self,
        event_name: &str,
        requested_ids: Option<&Vec<String>>,
    ) -> AppResult<Vec<IntegrationConfig>>;
    async fn store_delivery(&self, delivery: &DeliveryRecord) -> AppResult<()>;
    async fn list_due_deliveries(&self, limit: usize) -> AppResult<Vec<OutboundDelivery>>;
    async fn mark_delivery_result(
        &self,
        delivery_id: &str,
        status: DeliveryStatus,
        attempt_count: i64,
        last_error: Option<String>,
        next_retry_at: Option<i64>,
        updated_at: i64,
    ) -> AppResult<()>;
}

pub struct SqliteIntegrationsRepository {
    db: Arc<Database>,
}

impl SqliteIntegrationsRepository {
    pub fn new(db: Arc<Database>) -> Self {
        Self { db }
    }

    fn map_integration(row: &rusqlite::Row<'_>) -> rusqlite::Result<IntegrationConfig> {
        let headers: String = row.get("headers_json")?;
        let events: String = row.get("subscribed_events_json")?;
        let status: String = row.get("status")?;
        Ok(IntegrationConfig {
            id: row.get("id")?,
            name: row.get("name")?,
            description: row.get("description")?,
            kind: IntegrationKind::Webhook,
            status: serde_json::from_str(&format!("\"{}\"", status)).map_err(|e| {
                rusqlite::Error::FromSqlConversionFailure(
                    0,
                    rusqlite::types::Type::Text,
                    Box::new(e),
                )
            })?,
            endpoint_url: row.get("endpoint_url")?,
            headers: serde_json::from_str::<HashMap<String, String>>(&headers).map_err(|e| {
                rusqlite::Error::FromSqlConversionFailure(
                    0,
                    rusqlite::types::Type::Text,
                    Box::new(e),
                )
            })?,
            subscribed_events: serde_json::from_str(&events).map_err(|e| {
                rusqlite::Error::FromSqlConversionFailure(
                    0,
                    rusqlite::types::Type::Text,
                    Box::new(e),
                )
            })?,
            has_secret: row.get::<_, Option<String>>("encrypted_secret")?.is_some(),
            last_tested_at: row.get("last_tested_at")?,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
            deleted_at: row.get("deleted_at")?,
        })
    }

    fn map_delivery(row: &rusqlite::Row<'_>) -> rusqlite::Result<OutboundDelivery> {
        let status: String = row.get("status")?;
        let payload: String = row.get("payload_json")?;
        Ok(OutboundDelivery {
            id: row.get("id")?,
            integration_id: row.get("integration_id")?,
            event_name: row.get("event_name")?,
            payload: serde_json::from_str(&payload).map_err(|e| {
                rusqlite::Error::FromSqlConversionFailure(
                    0,
                    rusqlite::types::Type::Text,
                    Box::new(e),
                )
            })?,
            status: serde_json::from_str(&format!("\"{}\"", status)).map_err(|e| {
                rusqlite::Error::FromSqlConversionFailure(
                    0,
                    rusqlite::types::Type::Text,
                    Box::new(e),
                )
            })?,
            attempt_count: row.get("attempt_count")?,
            last_error: row.get("last_error")?,
            next_retry_at: row.get("next_retry_at")?,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
        })
    }
}

#[async_trait]
impl IntegrationsRepository for SqliteIntegrationsRepository {
    async fn list(&self) -> AppResult<Vec<IntegrationConfig>> {
        let conn = self
            .db
            .get_connection()
            .map_err(|error| AppError::db_sanitized("integrations.list.get_connection", error))?;
        let mut stmt = conn
            .prepare(
                "SELECT id, name, description, endpoint_url, headers_json, subscribed_events_json, encrypted_secret, status, last_tested_at, created_at, updated_at, deleted_at
                 FROM integration_configs
                 WHERE deleted_at IS NULL
                 ORDER BY updated_at DESC",
            )
            .map_err(|error| AppError::db_sanitized("integrations.list.prepare", error))?;
        let rows = stmt
            .query_map([], Self::map_integration)
            .map_err(|error| AppError::db_sanitized("integrations.list.query", error))?;
        let mut integrations = Vec::new();
        for row in rows {
            integrations
                .push(row.map_err(|error| AppError::db_sanitized("integrations.list.row", error))?);
        }
        Ok(integrations)
    }

    async fn get(&self, id: &str) -> AppResult<IntegrationConfig> {
        let conn = self
            .db
            .get_connection()
            .map_err(|error| AppError::db_sanitized("integrations.get.get_connection", error))?;
        conn.query_row(
            "SELECT id, name, description, endpoint_url, headers_json, subscribed_events_json, encrypted_secret, status, last_tested_at, created_at, updated_at, deleted_at
             FROM integration_configs
             WHERE id = ?1 AND deleted_at IS NULL",
            params![id],
            Self::map_integration,
        )
        .optional()
        .map_err(|error| AppError::db_sanitized("integrations.get.query", error))?
        .ok_or_else(|| AppError::NotFound(format!("Integration not found: {}", id)))
    }

    async fn get_with_secret(&self, id: &str) -> AppResult<StoredIntegrationSecret> {
        let conn = self.db.get_connection().map_err(|error| {
            AppError::db_sanitized("integrations.get_with_secret.get_connection", error)
        })?;
        let record = conn
            .query_row(
                "SELECT id, name, description, endpoint_url, headers_json, subscribed_events_json, encrypted_secret, status, last_tested_at, created_at, updated_at, deleted_at
                 FROM integration_configs
                 WHERE id = ?1 AND deleted_at IS NULL",
                params![id],
                |row| {
                    let config = Self::map_integration(row)?;
                    let secret_token: Option<String> = row.get("encrypted_secret")?;
                    Ok(StoredIntegrationSecret { config, secret_token })
                },
            )
            .optional()
            .map_err(|error| AppError::db_sanitized("integrations.get_with_secret.query", error))?;
        record.ok_or_else(|| AppError::NotFound(format!("Integration not found: {}", id)))
    }

    async fn create(
        &self,
        integration: &IntegrationConfig,
        encrypted_secret: Option<String>,
    ) -> AppResult<()> {
        let conn = self
            .db
            .get_connection()
            .map_err(|error| AppError::db_sanitized("integrations.create.get_connection", error))?;
        conn.execute(
            "INSERT INTO integration_configs (
                id, name, description, endpoint_url, headers_json, subscribed_events_json, encrypted_secret, status, last_tested_at, created_at, updated_at, deleted_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            params![
                integration.id,
                integration.name,
                integration.description,
                integration.endpoint_url,
                serde_json::to_string(&integration.headers).unwrap_or_else(|_| "{}".to_string()),
                serde_json::to_string(&integration.subscribed_events).unwrap_or_else(|_| "[]".to_string()),
                encrypted_secret,
                serde_json::to_string(&integration.status).unwrap_or_else(|_| "\"draft\"".to_string()).trim_matches('"').to_string(),
                integration.last_tested_at,
                integration.created_at,
                integration.updated_at,
                integration.deleted_at,
            ],
        )
        .map_err(|error| AppError::db_sanitized("integrations.create.execute", error))?;
        Ok(())
    }

    async fn update(
        &self,
        integration: &IntegrationConfig,
        encrypted_secret: Option<String>,
    ) -> AppResult<()> {
        let conn = self
            .db
            .get_connection()
            .map_err(|error| AppError::db_sanitized("integrations.update.get_connection", error))?;
        conn.execute(
            "UPDATE integration_configs
             SET name = ?2,
                 description = ?3,
                 endpoint_url = ?4,
                 headers_json = ?5,
                 subscribed_events_json = ?6,
                 encrypted_secret = COALESCE(?7, encrypted_secret),
                 status = ?8,
                 last_tested_at = ?9,
                 updated_at = ?10,
                 deleted_at = ?11
             WHERE id = ?1",
            params![
                integration.id,
                integration.name,
                integration.description,
                integration.endpoint_url,
                serde_json::to_string(&integration.headers).unwrap_or_else(|_| "{}".to_string()),
                serde_json::to_string(&integration.subscribed_events)
                    .unwrap_or_else(|_| "[]".to_string()),
                encrypted_secret,
                serde_json::to_string(&integration.status)
                    .unwrap_or_else(|_| "\"draft\"".to_string())
                    .trim_matches('"')
                    .to_string(),
                integration.last_tested_at,
                integration.updated_at,
                integration.deleted_at,
            ],
        )
        .map_err(|error| AppError::db_sanitized("integrations.update.execute", error))?;
        Ok(())
    }

    async fn update_last_tested_at(&self, id: &str, tested_at: i64) -> AppResult<()> {
        let conn = self.db.get_connection().map_err(|error| {
            AppError::db_sanitized("integrations.update_last_tested_at.get_connection", error)
        })?;
        conn.execute(
            "UPDATE integration_configs SET last_tested_at = ?2, updated_at = ?2 WHERE id = ?1",
            params![id, tested_at],
        )
        .map_err(|error| {
            AppError::db_sanitized("integrations.update_last_tested_at.execute", error)
        })?;
        Ok(())
    }

    async fn retry_dead_letters(&self, integration_id: &str) -> AppResult<usize> {
        let conn = self.db.get_connection().map_err(|error| {
            AppError::db_sanitized("integrations.retry_dead_letters.get_connection", error)
        })?;
        let now = chrono::Utc::now().timestamp_millis();
        conn.execute(
            "UPDATE integration_outbox
             SET status = 'pending', next_retry_at = ?2, updated_at = ?2
             WHERE integration_id = ?1 AND status = 'dead_letter'",
            params![integration_id, now],
        )
        .map_err(|error| AppError::db_sanitized("integrations.retry_dead_letters.execute", error))
    }

    async fn list_active_for_event(
        &self,
        event_name: &str,
        requested_ids: Option<&Vec<String>>,
    ) -> AppResult<Vec<IntegrationConfig>> {
        let integrations = self.list().await?;
        Ok(integrations
            .into_iter()
            .filter(|integration| {
                integration.status == IntegrationStatus::Active
                    && integration
                        .subscribed_events
                        .iter()
                        .any(|value| value == event_name)
                    && requested_ids
                        .map(|ids| ids.iter().any(|value| value == &integration.id))
                        .unwrap_or(true)
            })
            .collect())
    }

    async fn store_delivery(&self, delivery: &DeliveryRecord) -> AppResult<()> {
        let conn = self.db.get_connection().map_err(|error| {
            AppError::db_sanitized("integrations.store_delivery.get_connection", error)
        })?;
        conn.execute(
            "INSERT INTO integration_outbox (
                id, integration_id, event_name, payload_json, correlation_id, status, attempt_count, last_error, next_retry_at, created_at, updated_at
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            params![
                delivery.id,
                delivery.integration_id,
                delivery.event_name,
                serde_json::to_string(&delivery.payload).unwrap_or_else(|_| "{}".to_string()),
                delivery.correlation_id,
                serde_json::to_string(&delivery.status).unwrap_or_else(|_| "\"pending\"".to_string()).trim_matches('"').to_string(),
                delivery.attempt_count,
                delivery.last_error,
                delivery.next_retry_at,
                delivery.created_at,
                delivery.updated_at,
            ],
        )
        .map_err(|error| AppError::db_sanitized("integrations.store_delivery.execute", error))?;
        Ok(())
    }

    async fn list_due_deliveries(&self, limit: usize) -> AppResult<Vec<OutboundDelivery>> {
        let conn = self.db.get_connection().map_err(|error| {
            AppError::db_sanitized("integrations.list_due_deliveries.get_connection", error)
        })?;
        let now = chrono::Utc::now().timestamp_millis();
        let mut stmt = conn
            .prepare(
                "SELECT id, integration_id, event_name, payload_json, status, attempt_count, last_error, next_retry_at, created_at, updated_at
                 FROM integration_outbox
                 WHERE status IN ('pending', 'retrying') AND COALESCE(next_retry_at, 0) <= ?1
                 ORDER BY created_at ASC
                 LIMIT ?2",
            )
            .map_err(|error| AppError::db_sanitized("integrations.list_due_deliveries.prepare", error))?;
        let rows = stmt
            .query_map(params![now, limit as i64], Self::map_delivery)
            .map_err(|error| {
                AppError::db_sanitized("integrations.list_due_deliveries.query", error)
            })?;
        let mut deliveries = Vec::new();
        for row in rows {
            deliveries.push(row.map_err(|error| {
                AppError::db_sanitized("integrations.list_due_deliveries.row", error)
            })?);
        }
        Ok(deliveries)
    }

    async fn mark_delivery_result(
        &self,
        delivery_id: &str,
        status: DeliveryStatus,
        attempt_count: i64,
        last_error: Option<String>,
        next_retry_at: Option<i64>,
        updated_at: i64,
    ) -> AppResult<()> {
        let conn = self.db.get_connection().map_err(|error| {
            AppError::db_sanitized("integrations.mark_delivery_result.get_connection", error)
        })?;
        conn.execute(
            "UPDATE integration_outbox
             SET status = ?2,
                 attempt_count = ?3,
                 last_error = ?4,
                 next_retry_at = ?5,
                 updated_at = ?6
             WHERE id = ?1",
            params![
                delivery_id,
                serde_json::to_string(&status)
                    .unwrap_or_else(|_| "\"pending\"".to_string())
                    .trim_matches('"')
                    .to_string(),
                attempt_count,
                last_error,
                next_retry_at,
                updated_at,
            ],
        )
        .map_err(|error| {
            AppError::db_sanitized("integrations.mark_delivery_result.execute", error)
        })?;
        Ok(())
    }
}
