//! Permission tests for the `trash` domain.
//!
//! Verify RBAC enforcement at the service layer.
//! - restore: requires Admin or Supervisor
//! - hard_delete: requires Admin only
//! - empty_trash: requires Admin only

#[cfg(test)]
mod tests {
    use crate::db::Database;
    use crate::domains::trash::application::services::trash_service::TrashService;
    use crate::domains::trash::domain::models::trash::EntityType;
    use crate::shared::context::request_context::RequestContext;
    use crate::shared::contracts::auth::UserRole;
    use crate::shared::ipc::errors::AppError;
    use std::sync::Arc;

    fn make_ctx(role: UserRole) -> RequestContext {
        RequestContext::new_for_test(role)
    }

    // ── restore permissions ─────────────────────────────────────────────────

    #[tokio::test]
    async fn test_restore_as_viewer_returns_authorization_error() {
        let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
        let service = TrashService::new(db);
        let ctx = make_ctx(UserRole::Viewer);

        let result = service
            .restore(EntityType::Task, "some-id".to_string(), &ctx)
            .await;

        assert!(result.is_err());
        assert!(
            matches!(result.unwrap_err(), AppError::Authorization(_)),
            "Viewer should not be able to restore"
        );
    }

    #[tokio::test]
    async fn test_restore_as_technician_returns_authorization_error() {
        let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
        let service = TrashService::new(db);
        let ctx = make_ctx(UserRole::Technician);

        let result = service
            .restore(EntityType::Task, "some-id".to_string(), &ctx)
            .await;

        assert!(result.is_err());
        assert!(
            matches!(result.unwrap_err(), AppError::Authorization(_)),
            "Technician should not be able to restore"
        );
    }

    #[tokio::test]
    async fn test_restore_as_supervisor_passes_auth_check() {
        let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
        let service = TrashService::new(db);
        let ctx = make_ctx(UserRole::Supervisor);

        let result = service
            .restore(EntityType::Task, "nonexistent".to_string(), &ctx)
            .await;

        // Should fail with NotFound, NOT Authorization
        assert!(result.is_err());
        assert!(
            !matches!(result.as_ref().unwrap_err(), AppError::Authorization(_)),
            "Supervisor should pass auth for restore, got: {:?}",
            result.unwrap_err()
        );
    }

    #[tokio::test]
    async fn test_restore_as_admin_passes_auth_check() {
        let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
        let service = TrashService::new(db);
        let ctx = make_ctx(UserRole::Admin);

        let result = service
            .restore(EntityType::Task, "nonexistent".to_string(), &ctx)
            .await;

        // Should fail with NotFound, NOT Authorization
        assert!(result.is_err());
        assert!(
            !matches!(result.as_ref().unwrap_err(), AppError::Authorization(_)),
            "Admin should pass auth for restore, got: {:?}",
            result.unwrap_err()
        );
    }

    // ── hard_delete permissions ──────────────────────────────────────────────

    #[tokio::test]
    async fn test_hard_delete_as_viewer_returns_authorization_error() {
        let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
        let service = TrashService::new(db);
        let ctx = make_ctx(UserRole::Viewer);

        let result = service
            .hard_delete(EntityType::Client, "some-id".to_string(), &ctx)
            .await;

        assert!(matches!(result.unwrap_err(), AppError::Authorization(_)));
    }

    #[tokio::test]
    async fn test_hard_delete_as_technician_returns_authorization_error() {
        let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
        let service = TrashService::new(db);
        let ctx = make_ctx(UserRole::Technician);

        let result = service
            .hard_delete(EntityType::Client, "some-id".to_string(), &ctx)
            .await;

        assert!(matches!(result.unwrap_err(), AppError::Authorization(_)));
    }

    #[tokio::test]
    async fn test_hard_delete_as_supervisor_returns_authorization_error() {
        let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
        let service = TrashService::new(db);
        let ctx = make_ctx(UserRole::Supervisor);

        let result = service
            .hard_delete(EntityType::Client, "some-id".to_string(), &ctx)
            .await;

        assert!(matches!(result.unwrap_err(), AppError::Authorization(_)));
    }

    #[tokio::test]
    async fn test_hard_delete_as_admin_passes_auth_check() {
        let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
        let service = TrashService::new(db);
        let ctx = make_ctx(UserRole::Admin);

        let result = service
            .hard_delete(EntityType::Client, "nonexistent".to_string(), &ctx)
            .await;

        // Should fail with NotFound, NOT Authorization
        assert!(result.is_err());
        assert!(
            !matches!(result.as_ref().unwrap_err(), AppError::Authorization(_)),
            "Admin should pass auth for hard_delete"
        );
    }

    // ── empty_trash permissions ─────────────────────────────────────────────

    #[tokio::test]
    async fn test_empty_trash_as_viewer_returns_authorization_error() {
        let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
        let service = TrashService::new(db);
        let ctx = make_ctx(UserRole::Viewer);

        let result = service.empty_trash(None, &ctx).await;

        assert!(matches!(result.unwrap_err(), AppError::Authorization(_)));
    }

    #[tokio::test]
    async fn test_empty_trash_as_technician_returns_authorization_error() {
        let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
        let service = TrashService::new(db);
        let ctx = make_ctx(UserRole::Technician);

        let result = service.empty_trash(None, &ctx).await;

        assert!(matches!(result.unwrap_err(), AppError::Authorization(_)));
    }

    #[tokio::test]
    async fn test_empty_trash_as_supervisor_returns_authorization_error() {
        let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
        let service = TrashService::new(db);
        let ctx = make_ctx(UserRole::Supervisor);

        let result = service.empty_trash(None, &ctx).await;

        assert!(matches!(result.unwrap_err(), AppError::Authorization(_)));
    }

    #[tokio::test]
    async fn test_empty_trash_as_admin_succeeds() {
        let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
        let service = TrashService::new(db);
        let ctx = make_ctx(UserRole::Admin);

        let result = service.empty_trash(None, &ctx).await;

        assert!(result.is_ok());
    }
}
