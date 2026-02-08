//! Repository factory for centralized repository creation
//!
//! Provides a centralized way to create and manage repository instances.

use crate::db::Database;
use crate::repositories::cache;
use std::sync::Arc;

// Re-export from base and cache
pub use cache::Cache;
// Export only what's used publicly

// Import existing repositories
pub use crate::repositories::calendar_event_repository::CalendarEventRepository;
pub use crate::repositories::intervention_repository::InterventionRepository;
pub use crate::repositories::session_repository::SessionRepository;
pub use crate::repositories::task_repository::TaskRepository;

// Import new repositories
pub use crate::repositories::client_repository::ClientRepository;
pub use crate::repositories::material_repository::MaterialRepository;
pub use crate::repositories::message_repository::MessageRepository;
pub use crate::repositories::notification_preferences_repository::NotificationPreferencesRepository;
pub use crate::repositories::notification_repository::NotificationTemplateRepository;
pub use crate::repositories::photo_repository::PhotoRepository;
pub use crate::repositories::task_history_repository::TaskHistoryRepository;
pub use crate::repositories::user_repository::UserRepository;

/// Repository container holding all repository instances
#[derive(Clone)]
pub struct Repositories {
    pub db: Arc<Database>,
    pub cache: Arc<Cache>,

    // Existing repositories
    pub task: Arc<TaskRepository>,
    pub intervention: Arc<InterventionRepository>,
    pub calendar_event: Arc<CalendarEventRepository>,
    pub session: Arc<SessionRepository>,

    // New repositories
    pub client: Arc<ClientRepository>,
    pub user: Arc<UserRepository>,
    pub material: Arc<MaterialRepository>,
    pub message: Arc<MessageRepository>,
    pub photo: Arc<PhotoRepository>,
    pub notification_template: Arc<NotificationTemplateRepository>,
    pub notification_preferences: Arc<NotificationPreferencesRepository>,
    pub task_history: Arc<TaskHistoryRepository>,
}

impl Repositories {
    /// Create a new repository container
    pub async fn new(db: Arc<Database>, cache_size: usize) -> Self {
        let cache = Arc::new(Cache::new(cache_size));

        Self {
            db: Arc::clone(&db),
            cache: Arc::clone(&cache),

            // Initialize existing repositories
            task: Arc::new(TaskRepository::new(Arc::clone(&db))),
            intervention: Arc::new(InterventionRepository::new(Arc::clone(&db))),
            calendar_event: Arc::new(CalendarEventRepository::new(Arc::clone(&db))),
            session: Arc::new(SessionRepository::new(Arc::clone(&db))),

            // Initialize new repositories
            client: Arc::new(ClientRepository::new(Arc::clone(&db), Arc::clone(&cache))),
            user: Arc::new(UserRepository::new(Arc::clone(&db), Arc::clone(&cache))),
            material: Arc::new(MaterialRepository::new(Arc::clone(&db), Arc::clone(&cache))),
            message: Arc::new(MessageRepository::new(Arc::clone(&db), Arc::clone(&cache))),
            photo: Arc::new(PhotoRepository::new(Arc::clone(&db), Arc::clone(&cache))),
            notification_template: Arc::new(NotificationTemplateRepository::new(
                Arc::clone(&db),
                Arc::clone(&cache),
            )),
            notification_preferences: Arc::new(NotificationPreferencesRepository::new(
                Arc::clone(&db),
                Arc::clone(&cache),
            )),
            task_history: Arc::new(TaskHistoryRepository::new(
                Arc::clone(&db),
                Arc::clone(&cache),
            )),
        }
    }

    /// Get database reference
    pub fn db(&self) -> &Arc<Database> {
        &self.db
    }

    /// Get cache reference
    pub fn cache(&self) -> &Arc<Cache> {
        &self.cache
    }

    /// Clear all caches
    pub fn clear_cache(&self) {
        self.cache.clear();
    }

    /// Get cache statistics
    pub fn cache_stats(&self) -> cache::CacheStats {
        cache::CacheStats {
            size: self.cache.size(),
        }
    }
}

/// Builder for creating repositories
pub struct RepositoryBuilder {
    db: Option<Arc<Database>>,
    cache_size: usize,
}

impl RepositoryBuilder {
    pub fn new() -> Self {
        Self {
            db: None,
            cache_size: 1000, // Default cache size
        }
    }

    pub fn with_database(mut self, db: Arc<Database>) -> Self {
        self.db = Some(db);
        self
    }

    pub fn with_cache_size(mut self, size: usize) -> Self {
        self.cache_size = size;
        self
    }

    pub async fn build(self) -> Result<Repositories, String> {
        let db = self.db.ok_or_else(|| "Database not provided".to_string())?;

        Ok(Repositories::new(db, self.cache_size).await)
    }
}

impl Default for RepositoryBuilder {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_repositories_creation() {
        let db = Arc::new(Database::new_in_memory().await.unwrap());
        let repos = Repositories::new(db, 100).await;

        assert_eq!(repos.cache.size(), 0);
        assert_eq!(repos.cache_stats().size, 0);
    }

    #[tokio::test]
    async fn test_repository_builder() {
        let db = Arc::new(Database::new_in_memory().await.unwrap());

        let repos = RepositoryBuilder::new()
            .with_database(db)
            .with_cache_size(200)
            .build()
            .await
            .unwrap();

        assert_eq!(repos.cache.size(), 0);
    }

    #[tokio::test]
    async fn test_repository_builder_missing_db() {
        let result = RepositoryBuilder::new().build().await;

        assert!(result.is_err());
    }
}
