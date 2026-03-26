//! Shared repository infrastructure.
//!
//! Base repository traits, caching layer, and factory for creating
//! domain-specific repository instances.

use async_trait::async_trait;

pub mod base;
pub mod cache;
pub mod cached_repo;
pub mod factory;

/// Cross-domain repository contracts used to avoid direct domain-internal imports
/// while keeping repository dependencies explicit at the application boundary.
pub use crate::domains::calendar::calendar_handler::event_repository::CalendarEventRepository;

/// Shared contract for calendar event persistence used outside the calendar
/// domain without importing calendar internals directly.
#[async_trait]
pub trait CalendarEventRepositoryContract: Send + Sync {
    async fn find_by_id(
        &self,
        id: String,
    ) -> crate::shared::repositories::base::RepoResult<
        Option<crate::domains::calendar::models::CalendarEvent>,
    >;

    async fn create(
        &self,
        input: crate::domains::calendar::models::CreateEventInput,
        created_by: Option<String>,
    ) -> crate::shared::repositories::base::RepoResult<
        crate::domains::calendar::models::CalendarEvent,
    >;

    async fn update(
        &self,
        id: &str,
        input: crate::domains::calendar::models::UpdateEventInput,
        updated_by: Option<String>,
    ) -> crate::shared::repositories::base::RepoResult<
        Option<crate::domains::calendar::models::CalendarEvent>,
    >;

    async fn delete_by_id(
        &self,
        id: String,
    ) -> crate::shared::repositories::base::RepoResult<bool>;

    async fn find_by_technician(
        &self,
        technician_id: &str,
    ) -> crate::shared::repositories::base::RepoResult<
        Vec<crate::domains::calendar::models::CalendarEvent>,
    >;

    async fn find_by_task(
        &self,
        task_id: &str,
    ) -> crate::shared::repositories::base::RepoResult<
        Vec<crate::domains::calendar::models::CalendarEvent>,
    >;

    async fn find_events_in_range(
        &self,
        from: i64,
        to: i64,
        technician_id: Option<&str>,
    ) -> crate::shared::repositories::base::RepoResult<
        Vec<crate::domains::calendar::models::CalendarEvent>,
    >;
}

#[async_trait]
impl CalendarEventRepositoryContract for CalendarEventRepository {
    async fn find_by_id(
        &self,
        id: String,
    ) -> crate::shared::repositories::base::RepoResult<
        Option<crate::domains::calendar::models::CalendarEvent>,
    > {
        crate::shared::repositories::base::Repository::find_by_id(self, id).await
    }

    async fn create(
        &self,
        input: crate::domains::calendar::models::CreateEventInput,
        created_by: Option<String>,
    ) -> crate::shared::repositories::base::RepoResult<
        crate::domains::calendar::models::CalendarEvent,
    > {
        CalendarEventRepository::create(self, input, created_by).await
    }

    async fn update(
        &self,
        id: &str,
        input: crate::domains::calendar::models::UpdateEventInput,
        updated_by: Option<String>,
    ) -> crate::shared::repositories::base::RepoResult<
        Option<crate::domains::calendar::models::CalendarEvent>,
    > {
        CalendarEventRepository::update(self, id, input, updated_by).await
    }

    async fn delete_by_id(
        &self,
        id: String,
    ) -> crate::shared::repositories::base::RepoResult<bool> {
        crate::shared::repositories::base::Repository::delete_by_id(self, id).await
    }

    async fn find_by_technician(
        &self,
        technician_id: &str,
    ) -> crate::shared::repositories::base::RepoResult<
        Vec<crate::domains::calendar::models::CalendarEvent>,
    > {
        CalendarEventRepository::find_by_technician(self, technician_id).await
    }

    async fn find_by_task(
        &self,
        task_id: &str,
    ) -> crate::shared::repositories::base::RepoResult<
        Vec<crate::domains::calendar::models::CalendarEvent>,
    > {
        CalendarEventRepository::find_by_task(self, task_id).await
    }

    async fn find_events_in_range(
        &self,
        from: i64,
        to: i64,
        technician_id: Option<&str>,
    ) -> crate::shared::repositories::base::RepoResult<
        Vec<crate::domains::calendar::models::CalendarEvent>,
    > {
        let start_date = chrono::DateTime::<chrono::Utc>::from_timestamp_millis(from)
            .map(|dt| dt.format("%Y-%m-%dT%H:%M:%S").to_string())
            .ok_or_else(|| {
                crate::shared::repositories::base::RepoError::Database(
                    format!("Invalid calendar range start timestamp: {}", from),
                )
            })?;

        let end_date = chrono::DateTime::<chrono::Utc>::from_timestamp_millis(to)
            .map(|dt| dt.format("%Y-%m-%dT%H:%M:%S").to_string())
            .ok_or_else(|| {
                crate::shared::repositories::base::RepoError::Database(
                    format!("Invalid calendar range end timestamp: {}", to),
                )
            })?;

        CalendarEventRepository::find_by_date_range(self, &start_date, &end_date, technician_id)
            .await
    }
}

// Convenience re-exports for commonly used types
pub use base::Repository;
pub use cache::Cache;
pub use cached_repo::CachedRepository;
pub use factory::Repositories;
