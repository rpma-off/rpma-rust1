use async_trait::async_trait;
use rusqlite::{params, OptionalExtension};
use std::sync::Arc;

use crate::db::Database;
use crate::domains::rules::domain::models::rules::{
    RuleAction, RuleDefinition, RuleMode, RuleStatus, RuleTrigger,
};
use crate::shared::error::{AppError, AppResult};

#[derive(Debug, Clone)]
pub struct RuleExecutionRecord {
    pub id: String,
    pub rule_id: String,
    pub trigger: String,
    pub entity_id: Option<String>,
    pub correlation_id: String,
    pub allowed: bool,
    pub message: Option<String>,
    pub created_at: i64,
}

#[async_trait]
pub trait RulesRepository: Send + Sync {
    async fn list(&self) -> AppResult<Vec<RuleDefinition>>;
    async fn get(&self, id: &str) -> AppResult<RuleDefinition>;
    async fn create(&self, rule: &RuleDefinition) -> AppResult<()>;
    async fn update(&self, rule: &RuleDefinition) -> AppResult<()>;
    async fn list_active_by_trigger(&self, trigger: &str) -> AppResult<Vec<RuleDefinition>>;
    async fn log_execution(&self, record: &RuleExecutionRecord) -> AppResult<()>;
}

pub struct SqliteRulesRepository {
    db: Arc<Database>,
}

impl SqliteRulesRepository {
    pub fn new(db: Arc<Database>) -> Self {
        Self { db }
    }

    fn map_rule(row: &rusqlite::Row<'_>) -> rusqlite::Result<RuleDefinition> {
        let trigger: String = row.get("trigger")?;
        let mode: String = row.get("mode")?;
        let status: String = row.get("status")?;
        let conditions: String = row.get("conditions_json")?;
        let actions: String = row.get("actions_json")?;
        Ok(RuleDefinition {
            id: row.get("id")?,
            name: row.get("name")?,
            description: row.get("description")?,
            template_key: row.get("template_key")?,
            trigger: serde_json::from_str(&format!("\"{}\"", trigger)).map_err(|e| {
                rusqlite::Error::FromSqlConversionFailure(
                    0,
                    rusqlite::types::Type::Text,
                    Box::new(e),
                )
            })?,
            mode: serde_json::from_str(&format!("\"{}\"", mode)).map_err(|e| {
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
            conditions: serde_json::from_str(&conditions).map_err(|e| {
                rusqlite::Error::FromSqlConversionFailure(
                    0,
                    rusqlite::types::Type::Text,
                    Box::new(e),
                )
            })?,
            actions: serde_json::from_str::<Vec<RuleAction>>(&actions).map_err(|e| {
                rusqlite::Error::FromSqlConversionFailure(
                    0,
                    rusqlite::types::Type::Text,
                    Box::new(e),
                )
            })?,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
            deleted_at: row.get("deleted_at")?,
        })
    }
}

#[async_trait]
impl RulesRepository for SqliteRulesRepository {
    async fn list(&self) -> AppResult<Vec<RuleDefinition>> {
        let conn = self
            .db
            .get_connection()
            .map_err(|error| AppError::db_sanitized("rules.list.get_connection", error))?;
        let mut stmt = conn
            .prepare(
                "SELECT id, name, description, template_key, trigger, mode, status, conditions_json, actions_json, created_at, updated_at, deleted_at
                 FROM rule_definitions
                 WHERE deleted_at IS NULL
                 ORDER BY updated_at DESC",
            )
            .map_err(|error| AppError::db_sanitized("rules.list.prepare", error))?;
        let rows = stmt
            .query_map([], Self::map_rule)
            .map_err(|error| AppError::db_sanitized("rules.list.query", error))?;
        let mut rules = Vec::new();
        for row in rows {
            rules.push(row.map_err(|error| AppError::db_sanitized("rules.list.row", error))?);
        }
        Ok(rules)
    }

    async fn get(&self, id: &str) -> AppResult<RuleDefinition> {
        let conn = self
            .db
            .get_connection()
            .map_err(|error| AppError::db_sanitized("rules.get.get_connection", error))?;
        conn.query_row(
            "SELECT id, name, description, template_key, trigger, mode, status, conditions_json, actions_json, created_at, updated_at, deleted_at
             FROM rule_definitions
             WHERE id = ?1 AND deleted_at IS NULL",
            params![id],
            Self::map_rule,
        )
        .optional()
        .map_err(|error| AppError::db_sanitized("rules.get.query", error))?
        .ok_or_else(|| AppError::NotFound(format!("Rule not found: {}", id)))
    }

    async fn create(&self, rule: &RuleDefinition) -> AppResult<()> {
        let conn = self
            .db
            .get_connection()
            .map_err(|error| AppError::db_sanitized("rules.create.get_connection", error))?;
        conn.execute(
            "INSERT INTO rule_definitions (
                id, name, description, template_key, trigger, mode, status, conditions_json, actions_json, created_at, updated_at, deleted_at
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            params![
                rule.id,
                rule.name,
                rule.description,
                rule.template_key,
                rule.trigger.as_str(),
                serde_json::to_string(&rule.mode).unwrap_or_else(|_| "\"blocking\"".to_string()).trim_matches('"').to_string(),
                serde_json::to_string(&rule.status).unwrap_or_else(|_| "\"draft\"".to_string()).trim_matches('"').to_string(),
                serde_json::to_string(&rule.conditions).unwrap_or_else(|_| "{}".to_string()),
                serde_json::to_string(&rule.actions).unwrap_or_else(|_| "[]".to_string()),
                rule.created_at,
                rule.updated_at,
                rule.deleted_at,
            ],
        )
        .map_err(|error| AppError::db_sanitized("rules.create.execute", error))?;
        Ok(())
    }

    async fn update(&self, rule: &RuleDefinition) -> AppResult<()> {
        let conn = self
            .db
            .get_connection()
            .map_err(|error| AppError::db_sanitized("rules.update.get_connection", error))?;
        conn.execute(
            "UPDATE rule_definitions
             SET name = ?2,
                 description = ?3,
                 template_key = ?4,
                 trigger = ?5,
                 mode = ?6,
                 status = ?7,
                 conditions_json = ?8,
                 actions_json = ?9,
                 updated_at = ?10,
                 deleted_at = ?11
             WHERE id = ?1",
            params![
                rule.id,
                rule.name,
                rule.description,
                rule.template_key,
                rule.trigger.as_str(),
                serde_json::to_string(&rule.mode)
                    .unwrap_or_else(|_| "\"blocking\"".to_string())
                    .trim_matches('"')
                    .to_string(),
                serde_json::to_string(&rule.status)
                    .unwrap_or_else(|_| "\"draft\"".to_string())
                    .trim_matches('"')
                    .to_string(),
                serde_json::to_string(&rule.conditions).unwrap_or_else(|_| "{}".to_string()),
                serde_json::to_string(&rule.actions).unwrap_or_else(|_| "[]".to_string()),
                rule.updated_at,
                rule.deleted_at,
            ],
        )
        .map_err(|error| AppError::db_sanitized("rules.update.execute", error))?;
        Ok(())
    }

    async fn list_active_by_trigger(&self, trigger: &str) -> AppResult<Vec<RuleDefinition>> {
        let conn = self
            .db
            .get_connection()
            .map_err(|error| AppError::db_sanitized("rules.active.get_connection", error))?;
        let mut stmt = conn
            .prepare(
                "SELECT id, name, description, template_key, trigger, mode, status, conditions_json, actions_json, created_at, updated_at, deleted_at
                 FROM rule_definitions
                 WHERE deleted_at IS NULL AND status = 'active' AND trigger = ?1",
            )
            .map_err(|error| AppError::db_sanitized("rules.active.prepare", error))?;
        let rows = stmt
            .query_map(params![trigger], Self::map_rule)
            .map_err(|error| AppError::db_sanitized("rules.active.query", error))?;
        let mut rules = Vec::new();
        for row in rows {
            rules.push(row.map_err(|error| AppError::db_sanitized("rules.active.row", error))?);
        }
        Ok(rules)
    }

    async fn log_execution(&self, record: &RuleExecutionRecord) -> AppResult<()> {
        let conn = self
            .db
            .get_connection()
            .map_err(|error| AppError::db_sanitized("rules.log.get_connection", error))?;
        conn.execute(
            "INSERT INTO rule_execution_logs (
                id, rule_id, trigger, entity_id, correlation_id, allowed, message, created_at
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                record.id,
                record.rule_id,
                record.trigger,
                record.entity_id,
                record.correlation_id,
                if record.allowed { 1 } else { 0 },
                record.message,
                record.created_at,
            ],
        )
        .map_err(|error| AppError::db_sanitized("rules.log.execute", error))?;
        Ok(())
    }
}
