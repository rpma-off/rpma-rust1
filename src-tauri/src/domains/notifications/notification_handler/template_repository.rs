use async_trait::async_trait;
use rusqlite::params;
use std::sync::Arc;

use crate::db::Database;
use crate::domains::notifications::models::{
    NotificationChannel, NotificationTemplate, NotificationType,
};
use crate::shared::repositories::base::{RepoError, RepoResult, Repository};
use crate::shared::repositories::cache::{ttl, Cache, CacheKeyBuilder};

#[derive(Debug, Clone, Default)]
pub struct NotificationTemplateQuery {
    pub search: Option<String>,
    pub notification_type: Option<NotificationType>,
    pub channel: Option<NotificationChannel>,
    pub is_active: Option<bool>,
    pub category: Option<String>,
    pub created_by: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
    pub sort_by: Option<String>,
    pub sort_order: Option<String>,
}

impl NotificationTemplateQuery {
    fn build_where_clause(&self) -> (String, Vec<rusqlite::types::Value>) {
        let mut conditions = vec!["1=1".to_string()];
        let mut params: Vec<rusqlite::types::Value> = Vec::new();
        if let Some(search) = &self.search {
            conditions.push("(name LIKE ? OR description LIKE ?)".to_string());
            let pattern = format!("%{}%", search);
            params.push(pattern.clone().into());
            params.push(pattern.into());
        }
        if let Some(nt) = &self.notification_type {
            conditions.push("message_type = ?".to_string());
            params.push(nt.to_string().into());
        }
        if let Some(ch) = &self.channel {
            conditions.push("channel = ?".to_string());
            params.push(ch.to_string().into());
        }
        if let Some(is_active) = self.is_active {
            conditions.push("is_active = ?".to_string());
            params.push((if is_active { 1i64 } else { 0i64 }).into());
        }
        if let Some(cat) = &self.category {
            conditions.push("category = ?".to_string());
            params.push(cat.clone().into());
        }
        if let Some(cb) = &self.created_by {
            conditions.push("created_by = ?".to_string());
            params.push(cb.clone().into());
        }
        let where_clause = if conditions.len() > 1 {
            format!("WHERE {}", conditions.join(" AND "))
        } else {
            String::new()
        };
        (where_clause, params)
    }

    fn build_order_by_clause(&self) -> Result<String, RepoError> {
        let sort_by = crate::shared::repositories::base::validate_sort_column(
            self.sort_by.as_deref().unwrap_or("created_at"),
            &[
                "created_at",
                "updated_at",
                "name",
                "message_type",
                "channel",
                "category",
                "is_active",
            ],
        )?;
        let sort_order = match self.sort_order.as_deref() {
            Some("ASC") => "ASC",
            _ => "DESC",
        };
        Ok(format!("ORDER BY {} {}", sort_by, sort_order))
    }

    fn build_limit_offset(&self) -> Option<(i64, Option<i64>)> {
        self.limit.map(|l| (l, self.offset))
    }
}

pub struct NotificationTemplateRepository {
    db: Arc<Database>,
    cache: Arc<Cache>,
    cache_key_builder: CacheKeyBuilder,
}

impl NotificationTemplateRepository {
    pub fn new(db: Arc<Database>, cache: Arc<Cache>) -> Self {
        Self {
            db,
            cache,
            cache_key_builder: CacheKeyBuilder::new("notification_template"),
        }
    }

    pub async fn find_by_type(
        &self,
        notification_type: NotificationType,
    ) -> RepoResult<Vec<NotificationTemplate>> {
        let cache_key = self
            .cache_key_builder
            .list(&["type", &notification_type.to_string()]);
        if let Some(t) = self.cache.get::<Vec<NotificationTemplate>>(&cache_key) {
            return Ok(t);
        }
        let templates = self.db
            .query_as::<NotificationTemplate>(
                "SELECT * FROM message_templates WHERE message_type = ? ORDER BY created_at DESC LIMIT 500",
                params![notification_type.to_string()],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find by type: {}", e)))?;
        self.cache.set(&cache_key, templates.clone(), ttl::MEDIUM);
        Ok(templates)
    }

    pub async fn find_by_channel(
        &self,
        channel: NotificationChannel,
    ) -> RepoResult<Vec<NotificationTemplate>> {
        let cache_key = self
            .cache_key_builder
            .list(&["channel", &channel.to_string()]);
        if let Some(t) = self.cache.get::<Vec<NotificationTemplate>>(&cache_key) {
            return Ok(t);
        }
        let templates = self.db
            .query_as::<NotificationTemplate>(
                "SELECT * FROM message_templates WHERE channel = ? ORDER BY created_at DESC LIMIT 500",
                params![channel.to_string()],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find by channel: {}", e)))?;
        self.cache.set(&cache_key, templates.clone(), ttl::MEDIUM);
        Ok(templates)
    }

    pub async fn find_active(&self) -> RepoResult<Vec<NotificationTemplate>> {
        let cache_key = self.cache_key_builder.list(&["active"]);
        if let Some(t) = self.cache.get::<Vec<NotificationTemplate>>(&cache_key) {
            return Ok(t);
        }
        let templates = self
            .db
            .query_as::<NotificationTemplate>(
                "SELECT * FROM message_templates WHERE is_active = 1 ORDER BY name ASC LIMIT 500",
                [],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find active: {}", e)))?;
        self.cache.set(&cache_key, templates.clone(), ttl::MEDIUM);
        Ok(templates)
    }

    pub async fn find_by_category(
        &self,
        category: String,
    ) -> RepoResult<Vec<NotificationTemplate>> {
        let cache_key = self.cache_key_builder.list(&["category", &category]);
        if let Some(t) = self.cache.get::<Vec<NotificationTemplate>>(&cache_key) {
            return Ok(t);
        }
        let templates = self
            .db
            .query_as::<NotificationTemplate>(
                "SELECT * FROM message_templates WHERE category = ? ORDER BY name ASC LIMIT 500",
                params![category],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find by category: {}", e)))?;
        self.cache.set(&cache_key, templates.clone(), ttl::MEDIUM);
        Ok(templates)
    }

    pub async fn activate(&self, template_id: String) -> RepoResult<NotificationTemplate> {
        let now = chrono::Utc::now().timestamp_millis();
        self.db
            .execute(
                "UPDATE message_templates SET is_active = 1, updated_at = ? WHERE id = ?",
                params![now, template_id],
            )
            .map_err(|e| RepoError::Database(format!("Failed to activate: {}", e)))?;
        self.cache.remove(&self.cache_key_builder.id(&template_id));
        self.cache.clear();
        self.find_by_id(template_id)
            .await?
            .ok_or_else(|| RepoError::NotFound("Template not found".to_string()))
    }

    pub async fn deactivate(&self, template_id: String) -> RepoResult<NotificationTemplate> {
        let now = chrono::Utc::now().timestamp_millis();
        self.db
            .execute(
                "UPDATE message_templates SET is_active = 0, updated_at = ? WHERE id = ?",
                params![now, template_id],
            )
            .map_err(|e| RepoError::Database(format!("Failed to deactivate: {}", e)))?;
        self.cache.remove(&self.cache_key_builder.id(&template_id));
        self.cache.clear();
        self.find_by_id(template_id)
            .await?
            .ok_or_else(|| RepoError::NotFound("Template not found".to_string()))
    }

    pub async fn search(
        &self,
        query: NotificationTemplateQuery,
    ) -> RepoResult<Vec<NotificationTemplate>> {
        let (where_clause, where_params) = query.build_where_clause();
        let order_by = query
            .build_order_by_clause()
            .unwrap_or_else(|_| "ORDER BY created_at DESC".to_string());
        let limit_offset = query.build_limit_offset();
        let sql = format!(
            "SELECT * FROM message_templates {} {} {}",
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
        self.db
            .query_as::<NotificationTemplate>(&sql, rusqlite::params_from_iter(where_params))
            .map_err(|e| RepoError::Database(format!("Failed to search templates: {}", e)))
    }

    pub async fn count(&self, query: NotificationTemplateQuery) -> RepoResult<i64> {
        let (where_clause, where_params) = query.build_where_clause();
        let sql = format!(
            "SELECT COUNT(*) as count FROM message_templates {}",
            where_clause
        );
        self.db
            .query_single_value::<i64>(&sql, rusqlite::params_from_iter(where_params))
            .map_err(|e| RepoError::Database(format!("Failed to count: {}", e)))
    }

    pub fn invalidate_all_cache(&self) {
        self.cache.clear();
    }

    /// Fetch active message templates from the `message_templates` table,
    /// optionally filtered by category and/or message_type string.
    ///
    /// Returns the lightweight [`crate::domains::notifications::models::MessageTemplate`]
    /// DTO rather than the richer [`NotificationTemplate`] entity, because the
    /// IPC surface for this query predates the typed `NotificationTemplate` model.
    pub async fn find_active_message_templates(
        &self,
        category: Option<&str>,
        message_type: Option<&str>,
    ) -> RepoResult<Vec<crate::domains::notifications::models::MessageTemplate>> {
        let conn = self
            .db
            .get_connection()
            .map_err(|e| RepoError::Database(format!("Failed to get DB connection: {}", e)))?;
        let mut sql = String::from(
            "SELECT id, name, description, message_type, subject, body, variables, \
             category, is_active, created_by, created_at, updated_at \
             FROM message_templates WHERE is_active = 1",
        );
        let mut owned_params: Vec<String> = Vec::new();
        if let Some(cat) = category {
            // SAFETY: only the `?` placeholder is appended to the SQL string.
            // The value itself is bound via `params_from_iter` — not interpolated.
            sql.push_str(" AND category = ?");
            owned_params.push(cat.to_string());
        }
        if let Some(msg_type) = message_type {
            // SAFETY: same — value is bound as a parameter, not embedded in SQL.
            sql.push_str(" AND message_type = ?");
            owned_params.push(msg_type.to_string());
        }
        sql.push_str(" ORDER BY name");
        let mut stmt = conn
            .prepare(&sql)
            .map_err(|e| RepoError::Database(format!("Failed to query templates: {}", e)))?;
        let templates = stmt
            .query_map(rusqlite::params_from_iter(owned_params), |row| {
                Ok(crate::domains::notifications::models::MessageTemplate {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    description: row.get(2)?,
                    message_type: row.get(3)?,
                    subject: row.get(4)?,
                    body: row.get(5)?,
                    variables: row.get(6)?,
                    category: row.get(7)?,
                    is_active: row.get(8)?,
                    created_by: row.get(9)?,
                    created_at: row.get(10)?,
                    updated_at: row.get(11)?,
                })
            })
            .map_err(|e| RepoError::Database(format!("Failed to query templates: {}", e)))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| RepoError::Database(format!("Failed to collect templates: {}", e)))?;
        Ok(templates)
    }
}

#[async_trait]
impl Repository<NotificationTemplate, String> for NotificationTemplateRepository {
    async fn find_by_id(&self, id: String) -> RepoResult<Option<NotificationTemplate>> {
        let cache_key = self.cache_key_builder.id(&id);
        if let Some(t) = self.cache.get::<NotificationTemplate>(&cache_key) {
            return Ok(Some(t));
        }
        let template = self
            .db
            .query_single_as::<NotificationTemplate>(
                "SELECT * FROM message_templates WHERE id = ?",
                params![id],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find template: {}", e)))?;
        if let Some(ref t) = template {
            self.cache.set(&cache_key, t.clone(), ttl::LONG);
        }
        Ok(template)
    }

    async fn find_all(&self) -> RepoResult<Vec<NotificationTemplate>> {
        let cache_key = self.cache_key_builder.list(&["all"]);
        if let Some(t) = self.cache.get::<Vec<NotificationTemplate>>(&cache_key) {
            return Ok(t);
        }
        let templates = self
            .db
            .query_as::<NotificationTemplate>(
                "SELECT * FROM message_templates ORDER BY created_at DESC LIMIT 1000",
                [],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find all: {}", e)))?;
        self.cache.set(&cache_key, templates.clone(), ttl::MEDIUM);
        Ok(templates)
    }

    async fn save(&self, entity: NotificationTemplate) -> RepoResult<NotificationTemplate> {
        let exists = self.exists_by_id(entity.id.clone()).await?;
        let variables_json = serde_json::to_string(&entity.variables)
            .map_err(|e| RepoError::Database(format!("Failed to serialize variables: {}", e)))?;
        if exists {
            let now = chrono::Utc::now().timestamp_millis();
            self.db.execute(
                "UPDATE message_templates SET name=?, message_type=?, channel=?, subject=?, body=?, variables=?, category=?, is_active=?, created_by=?, updated_at=? WHERE id=?",
                params![entity.name, entity.notification_type.to_string(), entity.channel.to_string(), entity.subject_template, entity.body_template, variables_json, "general", if entity.is_active { 1 } else { 0 }, None::<String>, now, entity.id],
            ).map_err(|e| RepoError::Database(format!("Failed to update template: {}", e)))?;
        } else {
            self.db.execute(
                "INSERT INTO message_templates (id, name, message_type, channel, subject, body, variables, category, is_active, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                params![entity.id, entity.name, entity.notification_type.to_string(), entity.channel.to_string(), entity.subject_template, entity.body_template, variables_json, "general", if entity.is_active { 1 } else { 0 }, None::<String>, entity.created_at, entity.updated_at],
            ).map_err(|e| RepoError::Database(format!("Failed to create template: {}", e)))?;
        }
        self.cache.remove(&self.cache_key_builder.id(&entity.id));
        self.cache.clear();
        self.find_by_id(entity.id)
            .await?
            .ok_or_else(|| RepoError::NotFound("Template not found after save".to_string()))
    }

    async fn delete_by_id(&self, id: String) -> RepoResult<bool> {
        let result = self
            .db
            .execute("DELETE FROM message_templates WHERE id = ?", params![id])
            .map_err(|e| RepoError::Database(format!("Failed to delete template: {}", e)))?;
        self.cache.remove(&self.cache_key_builder.id(&id));
        self.cache.clear();
        Ok(result > 0)
    }

    async fn exists_by_id(&self, id: String) -> RepoResult<bool> {
        let count = self
            .db
            .query_single_value::<i64>(
                "SELECT COUNT(*) FROM message_templates WHERE id = ?",
                params![id],
            )
            .map_err(|e| RepoError::Database(format!("Failed to check existence: {}", e)))?;
        Ok(count > 0)
    }
}
