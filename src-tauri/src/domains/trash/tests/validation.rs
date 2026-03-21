//! Validation tests for the `trash` domain.
//!
//! Target the application layer directly with invalid inputs — never through IPC.
//! Cover: empty fields, type violations, business-rule violations.

#[cfg(test)]
mod tests {
    use crate::db::Database;
    use crate::domains::trash::application::services::trash_service::TrashService;
    use crate::domains::trash::domain::models::trash::EntityType;
    use crate::shared::context::request_context::RequestContext;
    use crate::shared::contracts::auth::UserRole;
    use std::sync::Arc;

    fn make_ctx(role: UserRole) -> RequestContext {
        let auth = crate::shared::context::auth_context::AuthContext {
            user_id: "test-user".into(),
            role,
            session_id: "sess-1".into(),
            username: "test".into(),
            email: "test@example.com".into(),
        };
        RequestContext::new(auth, "corr-1".into())
    }

    #[tokio::test]
    async fn test_restore_nonexistent_entity_returns_not_found() {
        let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
        let service = TrashService::new(db);
        let ctx = make_ctx(UserRole::Admin);

        let result = service
            .restore(EntityType::Task, "nonexistent-id".to_string(), &ctx)
            .await;

        assert!(result.is_err());
        let err_msg = format!("{:?}", result.unwrap_err());
        assert!(
            err_msg.contains("not found") || err_msg.contains("NotFound"),
            "Expected not found error, got: {}",
            err_msg
        );
    }

    #[tokio::test]
    async fn test_hard_delete_nonexistent_entity_returns_not_found() {
        let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
        let service = TrashService::new(db);
        let ctx = make_ctx(UserRole::Admin);

        let result = service
            .hard_delete(EntityType::Client, "nonexistent-id".to_string(), &ctx)
            .await;

        assert!(result.is_err());
        let err_msg = format!("{:?}", result.unwrap_err());
        assert!(
            err_msg.contains("not found") || err_msg.contains("NotFound"),
            "Expected not found error, got: {}",
            err_msg
        );
    }

    #[tokio::test]
    async fn test_list_deleted_empty_database_returns_empty_vec() {
        let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
        let service = TrashService::new(db);
        let ctx = make_ctx(UserRole::Admin);

        let result = service.list_deleted(EntityType::Task, 10, 0, &ctx).await;

        assert!(result.is_ok());
        assert!(result.unwrap().is_empty());
    }

    #[tokio::test]
    async fn test_empty_trash_on_empty_database_returns_zero() {
        let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
        let service = TrashService::new(db);
        let ctx = make_ctx(UserRole::Admin);

        let result = service.empty_trash(Some(EntityType::Task), &ctx).await;

        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 0);
    }

    #[tokio::test]
    async fn test_empty_trash_all_types_on_empty_database_returns_zero() {
        let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
        let service = TrashService::new(db);
        let ctx = make_ctx(UserRole::Admin);

        let result = service.empty_trash(None, &ctx).await;

        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 0);
    }
}
