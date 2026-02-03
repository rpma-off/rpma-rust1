//! Notification template repository implementation
//!
//! Provides consistent database access patterns for NotificationTemplate entities.

use crate::db::Database;
use crate::models::notification::{NotificationChannel, NotificationTemplate, NotificationType};
use crate::repositories::base::{Repository, RepoError, RepoResult};
use crate::repositories::cache::{Cache, CacheKeyBuilder, ttl};
use async_trait::async_trait;
use rusqlite::params;
use std::sync::Arc;

/// Query for filtering notification templates
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

        if let Some(notification_type) = &self.notification_type {
            conditions.push("message_type = ?".to_string());
            params.push(notification_type.to_string().into());
        }

        if let Some(channel) = &self.channel {
            conditions.push("channel = ?".to_string());
            params.push(channel.to_string().into());
        }

        if let Some(is_active) = self.is_active {
            conditions.push("is_active = ?".to_string());
            params.push((if is_active { 1 } else { 0 }).into());
        }

        if let Some(category) = &self.category {
            conditions.push("category = ?".to_string());
            params.push(category.clone().into());
        }

        if let Some(created_by) = &self.created_by {
            conditions.push("created_by = ?".to_string());
            params.push(created_by.clone().into());
        }

        let where_clause = if conditions.len() > 1 {
            format!("WHERE {}", conditions.join(" AND "))
        } else {
            String::new()
        };

        (where_clause, params)
    }

    fn validate_sort_column(sort_by: &str) -> Result<String, RepoError> {
        let allowed_columns = [
            "created_at", "updated_at", "name", "message_type", "channel",
            "category", "is_active"
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

/// Notification template repository for database operations
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

    /// Find templates by notification type
    pub async fn find_by_type(&self, notification_type: NotificationType) -> RepoResult<Vec<NotificationTemplate>> {
        let cache_key = self.cache_key_builder.list(&["type", &notification_type.to_string()]);

        if let Some(templates) = self.cache.get::<Vec<NotificationTemplate>>(&cache_key) {
            return Ok(templates);
        }

        let templates = self
            .db
            .query_as::<NotificationTemplate>(
                "SELECT * FROM message_templates WHERE message_type = ? ORDER BY created_at DESC",
                params![notification_type.to_string()],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find templates by type: {}", e)))?;

        self.cache.set(&cache_key, templates.clone(), ttl::MEDIUM);

        Ok(templates)
    }

    /// Find templates by channel
    pub async fn find_by_channel(&self, channel: NotificationChannel) -> RepoResult<Vec<NotificationTemplate>> {
        let cache_key = self.cache_key_builder.list(&["channel", &channel.to_string()]);

        if let Some(templates) = self.cache.get::<Vec<NotificationTemplate>>(&cache_key) {
            return Ok(templates);
        }

        let templates = self
            .db
            .query_as::<NotificationTemplate>(
                "SELECT * FROM message_templates WHERE channel = ? ORDER BY created_at DESC",
                params![channel.to_string()],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find templates by channel: {}", e)))?;

        self.cache.set(&cache_key, templates.clone(), ttl::MEDIUM);

        Ok(templates)
    }

    /// Find active templates
    pub async fn find_active(&self) -> RepoResult<Vec<NotificationTemplate>> {
        let cache_key = self.cache_key_builder.list(&["active"]);

        if let Some(templates) = self.cache.get::<Vec<NotificationTemplate>>(&cache_key) {
            return Ok(templates);
        }

        let templates = self
            .db
            .query_as::<NotificationTemplate>(
                "SELECT * FROM message_templates WHERE is_active = 1 ORDER BY name ASC",
                [],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find active templates: {}", e)))?;

        self.cache.set(&cache_key, templates.clone(), ttl::MEDIUM);

        Ok(templates)
    }

    /// Find templates by category
    pub async fn find_by_category(&self, category: String) -> RepoResult<Vec<NotificationTemplate>> {
        let cache_key = self.cache_key_builder.list(&["category", &category]);

        if let Some(templates) = self.cache.get::<Vec<NotificationTemplate>>(&cache_key) {
            return Ok(templates);
        }

        let templates = self
            .db
            .query_as::<NotificationTemplate>(
                "SELECT * FROM message_templates WHERE category = ? ORDER BY name ASC",
                params![category],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find templates by category: {}", e)))?;

        self.cache.set(&cache_key, templates.clone(), ttl::MEDIUM);

        Ok(templates)
    }

    /// Find templates created by user
    pub async fn find_by_creator(&self, created_by: String) -> RepoResult<Vec<NotificationTemplate>> {
        let cache_key = self.cache_key_builder.list(&["creator", &created_by]);

        if let Some(templates) = self.cache.get::<Vec<NotificationTemplate>>(&cache_key) {
            return Ok(templates);
        }

        let templates = self
            .db
            .query_as::<NotificationTemplate>(
                "SELECT * FROM message_templates WHERE created_by = ? ORDER BY created_at DESC",
                params![created_by],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find templates by creator: {}", e)))?;

        self.cache.set(&cache_key, templates.clone(), ttl::MEDIUM);

        Ok(templates)
    }

    /// Activate template
    pub async fn activate(&self, template_id: String) -> RepoResult<NotificationTemplate> {
        let now = chrono::Utc::now().timestamp_millis();

        self.db
            .execute(
                "UPDATE message_templates SET is_active = 1, updated_at = ? WHERE id = ?",
                params![now, template_id],
            )
            .map_err(|e| RepoError::Database(format!("Failed to activate template: {}", e)))?;

        self.invalidate_template_cache(&template_id);
        self.invalidate_all_cache();

        self.find_by_id(template_id).await?
            .ok_or_else(|| RepoError::NotFound("Template not found after activation".to_string()))
    }

    /// Deactivate template
    pub async fn deactivate(&self, template_id: String) -> RepoResult<NotificationTemplate> {
        let now = chrono::Utc::now().timestamp_millis();

        self.db
            .execute(
                "UPDATE message_templates SET is_active = 0, updated_at = ? WHERE id = ?",
                params![now, template_id],
            )
            .map_err(|e| RepoError::Database(format!("Failed to deactivate template: {}", e)))?;

        self.invalidate_template_cache(&template_id);
        self.invalidate_all_cache();

        self.find_by_id(template_id).await?
            .ok_or_else(|| RepoError::NotFound("Template not found after deactivation".to_string()))
    }

    /// Search templates with query
    pub async fn search(&self, query: NotificationTemplateQuery) -> RepoResult<Vec<NotificationTemplate>> {
        let (where_clause, where_params) = query.build_where_clause();
        let order_by = query.build_order_by_clause().unwrap_or_else(|e| {
            eprintln!("Invalid order clause, using default: {}", e);
            "ORDER BY created_at DESC".to_string()
        });
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

        let params = rusqlite::params_from_iter(where_params);

        let templates = self
            .db
            .query_as::<NotificationTemplate>(&sql, params)
            .map_err(|e| RepoError::Database(format!("Failed to search templates: {}", e)))?;

        Ok(templates)
    }

    /// Count templates matching query
    pub async fn count(&self, query: NotificationTemplateQuery) -> RepoResult<i64> {
        let (where_clause, where_params) = query.build_where_clause();

        let sql = format!("SELECT COUNT(*) as count FROM message_templates {}", where_clause);
        let params = rusqlite::params_from_iter(where_params);

        let count = self
            .db
            .query_single_value::<i64>(&sql, params)
            .map_err(|e| RepoError::Database(format!("Failed to count templates: {}", e)))?;

        Ok(count)
    }

    fn invalidate_template_cache(&self, id: &str) {
        self.cache.remove(&self.cache_key_builder.id(id));
    }

    pub fn invalidate_all_cache(&self) {
        self.cache.clear();
    }
}

#[async_trait]
impl Repository<NotificationTemplate, String> for NotificationTemplateRepository {
    async fn find_by_id(&self, id: String) -> RepoResult<Option<NotificationTemplate>> {
        let cache_key = self.cache_key_builder.id(&id);

        if let Some(template) = self.cache.get::<NotificationTemplate>(&cache_key) {
            return Ok(Some(template));
        }

        let template = self
            .db
            .query_single_as::<NotificationTemplate>("SELECT * FROM message_templates WHERE id = ?", params![id])
            .map_err(|e| RepoError::Database(format!("Failed to find template by id: {}", e)))?;

        if let Some(ref template) = template {
            self.cache.set(&cache_key, template.clone(), ttl::LONG);
        }

        Ok(template)
    }

    async fn find_all(&self) -> RepoResult<Vec<NotificationTemplate>> {
        let cache_key = self.cache_key_builder.list(&["all"]);

        if let Some(templates) = self.cache.get::<Vec<NotificationTemplate>>(&cache_key) {
            return Ok(templates);
        }

        let templates = self
            .db
            .query_as::<NotificationTemplate>(
                "SELECT * FROM message_templates ORDER BY created_at DESC LIMIT 1000",
                [],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find all templates: {}", e)))?;

        self.cache.set(&cache_key, templates.clone(), ttl::MEDIUM);

        Ok(templates)
    }

    async fn save(&self, entity: NotificationTemplate) -> RepoResult<NotificationTemplate> {
        let exists = self.exists_by_id(entity.id.clone()).await?;

        let variables_json = serde_json::to_string(&entity.variables)
            .map_err(|e| RepoError::Database(format!("Failed to serialize variables: {}", e)))?;

        if exists {
            let now = chrono::Utc::now().timestamp_millis();

            self.db
                .execute(
                    "UPDATE message_templates SET
                        name = ?,
                        message_type = ?,
                        channel = ?,
                        subject = ?,
                        body = ?,
                        variables = ?,
                        category = ?,
                        is_active = ?,
                        created_by = ?,
                        updated_at = ?
                        WHERE id = ?",
                    params![
                        entity.name,
                        entity.notification_type.to_string(),
                        entity.channel.to_string(),
                        entity.subject_template,
                        entity.body_template,
                        variables_json,
                        "general",
                        if entity.is_active { 1 } else { 0 },
                        None::<String>,
                        now,
                        entity.id,
                    ],
                )
                .map_err(|e| RepoError::Database(format!("Failed to update template: {}", e)))?;
        } else {
            self.db
                .execute(
                    "INSERT INTO message_templates (
                        id, name, message_type, channel, subject, body,
                        variables, category, is_active, created_by,
                        created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    params![
                        entity.id,
                        entity.name,
                        entity.notification_type.to_string(),
                        entity.channel.to_string(),
                        entity.subject_template,
                        entity.body_template,
                        variables_json,
                        "general",
                        if entity.is_active { 1 } else { 0 },
                        None::<String>,
                        entity.created_at.timestamp_millis(),
                        entity.updated_at.timestamp_millis(),
                    ],
                )
                .map_err(|e| RepoError::Database(format!("Failed to create template: {}", e)))?;
        }

        self.invalidate_template_cache(&entity.id);
        self.invalidate_all_cache();

        self.find_by_id(entity.id).await?
            .ok_or_else(|| RepoError::NotFound("Template not found after save".to_string()))
    }

    async fn delete_by_id(&self, id: String) -> RepoResult<bool> {
        let result = self
            .db
            .execute("DELETE FROM message_templates WHERE id = ?", params![id])
            .map_err(|e| RepoError::Database(format!("Failed to delete template: {}", e)))?;

        self.invalidate_template_cache(&id);
        self.invalidate_all_cache();

        Ok(result > 0)
    }

    async fn exists_by_id(&self, id: String) -> RepoResult<bool> {
        let exists = self
            .db
            .query_single_value::<i64>("SELECT COUNT(*) FROM message_templates WHERE id = ?", params![id])
            .map_err(|e| RepoError::Database(format!("Failed to check template existence: {}", e)))?;

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
        let cache = Arc::new(Cache::new(100));
        let repo = NotificationTemplateRepository::new(Arc::new(db), Arc::clone(&cache));

        let template = NotificationTemplate::new(
            uuid::Uuid::new_v4().to_string(),
            "Test Template".to_string(),
            NotificationType::TaskAssignment,
            NotificationChannel::Email,
            "Test Subject".to_string(),
            "Test Body".to_string(),
            vec!["var1".to_string()],
        );

        repo.save(template.clone()).await.unwrap();

        let found = repo.find_by_id(template.id.clone()).await.unwrap();
        assert!(found.is_some());
        assert_eq!(found.unwrap().name, template.name);
    }

    #[tokio::test]
    async fn test_find_by_id_not_found() {
        let db = setup_test_db().await;
        let cache = Arc::new(Cache::new(100));
        let repo = NotificationTemplateRepository::new(Arc::new(db), Arc::clone(&cache));

        let found = repo.find_by_id("nonexistent".to_string()).await.unwrap();
        assert!(found.is_none());
    }

    #[tokio::test]
    async fn test_find_all() {
        let db = setup_test_db().await;
        let cache = Arc::new(Cache::new(100));
        let repo = NotificationTemplateRepository::new(Arc::new(db), Arc::clone(&cache));

        let template1 = NotificationTemplate::new(
            uuid::Uuid::new_v4().to_string(),
            "Test Template 1".to_string(),
            NotificationType::TaskAssignment,
            NotificationChannel::Email,
            "Test Subject 1".to_string(),
            "Test Body 1".to_string(),
            vec!["var1".to_string()],
        );
        let template2 = NotificationTemplate::new(
            uuid::Uuid::new_v4().to_string(),
            "Test Template 2".to_string(),
            NotificationType::TaskCompletion,
            NotificationChannel::Sms,
            "Test Subject 2".to_string(),
            "Test Body 2".to_string(),
            vec!["var2".to_string()],
        );

        repo.save(template1.clone()).await.unwrap();
        repo.save(template2).await.unwrap();

        let all = repo.find_all().await.unwrap();
        assert_eq!(all.len(), 2);
    }

    #[tokio::test]
    async fn test_save_create() {
        let db = setup_test_db().await;
        let cache = Arc::new(Cache::new(100));
        let repo = NotificationTemplateRepository::new(Arc::new(db), Arc::clone(&cache));

        let template = NotificationTemplate::new(
            uuid::Uuid::new_v4().to_string(),
            "Test Template".to_string(),
            NotificationType::TaskAssignment,
            NotificationChannel::Email,
            "Test Subject".to_string(),
            "Test Body".to_string(),
            vec!["var1".to_string()],
        );

        let saved = repo.save(template.clone()).await.unwrap();
        assert_eq!(saved.name, template.name);
        assert!(repo.exists_by_id(saved.id).await.unwrap());
    }

    #[tokio::test]
    async fn test_save_update() {
        let db = setup_test_db().await;
        let cache = Arc::new(Cache::new(100));
        let repo = NotificationTemplateRepository::new(Arc::new(db), Arc::clone(&cache));

        let mut template = NotificationTemplate::new(
            uuid::Uuid::new_v4().to_string(),
            "Test Template".to_string(),
            NotificationType::TaskAssignment,
            NotificationChannel::Email,
            "Test Subject".to_string(),
            "Test Body".to_string(),
            vec!["var1".to_string()],
        );
        repo.save(template.clone()).await.unwrap();

        template.name = "Updated Template".to_string();
        let updated = repo.save(template).await.unwrap();
        assert_eq!(updated.name, "Updated Template".to_string());
    }

    #[tokio::test]
    async fn test_delete_by_id() {
        let db = setup_test_db().await;
        let cache = Arc::new(Cache::new(100));
        let repo = NotificationTemplateRepository::new(Arc::new(db), Arc::clone(&cache));

        let template = NotificationTemplate::new(
            uuid::Uuid::new_v4().to_string(),
            "Test Template".to_string(),
            NotificationType::TaskAssignment,
            NotificationChannel::Email,
            "Test Subject".to_string(),
            "Test Body".to_string(),
            vec!["var1".to_string()],
        );
        repo.save(template.clone()).await.unwrap();

        let deleted = repo.delete_by_id(template.id.clone()).await.unwrap();
        assert!(deleted);
        assert!(!repo.exists_by_id(template.id).await.unwrap());
    }

    #[tokio::test]
    async fn test_find_by_type() {
        let db = setup_test_db().await;
        let cache = Arc::new(Cache::new(100));
        let repo = NotificationTemplateRepository::new(Arc::new(db), Arc::clone(&cache));

        let template1 = NotificationTemplate::new(
            uuid::Uuid::new_v4().to_string(),
            "Test Template 1".to_string(),
            NotificationType::TaskAssignment,
            NotificationChannel::Email,
            "Test Subject 1".to_string(),
            "Test Body 1".to_string(),
            vec!["var1".to_string()],
        );
        let template2 = NotificationTemplate::new(
            uuid::Uuid::new_v4().to_string(),
            "Test Template 2".to_string(),
            NotificationType::TaskAssignment,
            NotificationChannel::Sms,
            "Test Subject 2".to_string(),
            "Test Body 2".to_string(),
            vec!["var2".to_string()],
        );
        let template3 = NotificationTemplate::new(
            uuid::Uuid::new_v4().to_string(),
            "Test Template 3".to_string(),
            NotificationType::TaskCompletion,
            NotificationChannel::Email,
            "Test Subject 3".to_string(),
            "Test Body 3".to_string(),
            vec!["var3".to_string()],
        );

        repo.save(template1.clone()).await.unwrap();
        repo.save(template2).await.unwrap();
        repo.save(template3).await.unwrap();

        let assignment_templates = repo.find_by_type(NotificationType::TaskAssignment).await.unwrap();
        assert_eq!(assignment_templates.len(), 2);
    }

    #[tokio::test]
    async fn test_find_active() {
        let db = setup_test_db().await;
        let cache = Arc::new(Cache::new(100));
        let repo = NotificationTemplateRepository::new(Arc::new(db), Arc::clone(&cache));

        let template1 = NotificationTemplate::new(
            uuid::Uuid::new_v4().to_string(),
            "Test Template 1".to_string(),
            NotificationType::TaskAssignment,
            NotificationChannel::Email,
            "Test Subject 1".to_string(),
            "Test Body 1".to_string(),
            vec!["var1".to_string()],
        );
        repo.save(template1.clone()).await.unwrap();

        let all = repo.find_active().await.unwrap();
        assert_eq!(all.len(), 1);

        repo.deactivate(template1.id.clone()).await.unwrap();
        let active = repo.find_active().await.unwrap();
        assert_eq!(active.len(), 0);
    }
}

