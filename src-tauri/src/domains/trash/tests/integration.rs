//! Integration tests for the `trash` domain.
//!
//! These tests exercise the TrashService against a real in-memory database,
//! including soft-delete, restore, hard-delete, and empty-trash flows.

#[cfg(test)]
mod tests {
    use crate::db::Database;
    use crate::domains::trash::application::services::trash_service::TrashService;
    use crate::domains::trash::domain::models::trash::EntityType;
    use crate::shared::context::request_context::RequestContext;
    use crate::shared::contracts::auth::UserRole;
    use rusqlite::params;
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

    /// Soft-delete a task row so the trash service can see it.
    fn insert_soft_deleted_task(db: &Database, id: &str, task_number: &str) {
        db.execute(
            "INSERT INTO tasks (id, task_number, title, vehicle_plate, vehicle_model, ppf_zones, \
             scheduled_date, status, created_at, updated_at, deleted_at, deleted_by) \
             VALUES (?, ?, 'Deleted task', 'DEL-001', 'Model', '[\"hood\"]', \
             '2025-01-01', 'pending', \
             strftime('%s','now')*1000, strftime('%s','now')*1000, \
             strftime('%s','now')*1000, 'test-admin')",
            params![id, task_number],
        )
        .expect("insert soft-deleted task");
    }

    /// Insert a soft-deleted client row.
    fn insert_soft_deleted_client(db: &Database, id: &str, name: &str) {
        db.execute(
            "INSERT INTO clients (id, name, customer_type, created_at, updated_at, deleted_at, deleted_by) \
             VALUES (?, ?, 'individual', \
             strftime('%s','now')*1000, strftime('%s','now')*1000, \
             strftime('%s','now')*1000, 'test-admin')",
            params![id, name],
        )
        .expect("insert soft-deleted client");
    }

    // ── list_deleted ────────────────────────────────────────────────────────

    #[tokio::test]
    async fn test_list_deleted_returns_soft_deleted_tasks() {
        let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
        insert_soft_deleted_task(&db, "task-del-1", "TSK-DEL-001");

        let service = TrashService::new(db);
        let ctx = make_ctx(UserRole::Admin);

        let items = service
            .list_deleted(EntityType::Task, 10, 0, &ctx)
            .await
            .expect("list should succeed");

        assert_eq!(items.len(), 1);
        assert_eq!(items[0].id, "task-del-1");
        assert_eq!(items[0].display_name, "TSK-DEL-001");
    }

    #[tokio::test]
    async fn test_list_deleted_respects_limit() {
        let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
        insert_soft_deleted_task(&db, "t1", "TSK-1");
        insert_soft_deleted_task(&db, "t2", "TSK-2");
        insert_soft_deleted_task(&db, "t3", "TSK-3");

        let service = TrashService::new(db);
        let ctx = make_ctx(UserRole::Admin);

        let items = service
            .list_deleted(EntityType::Task, 2, 0, &ctx)
            .await
            .expect("list should succeed");

        assert_eq!(items.len(), 2);
    }

    #[tokio::test]
    async fn test_list_deleted_respects_offset() {
        let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
        insert_soft_deleted_task(&db, "t1", "TSK-1");
        insert_soft_deleted_task(&db, "t2", "TSK-2");
        insert_soft_deleted_task(&db, "t3", "TSK-3");

        let service = TrashService::new(db);
        let ctx = make_ctx(UserRole::Admin);

        let items = service
            .list_deleted(EntityType::Task, 10, 2, &ctx)
            .await
            .expect("list should succeed");

        assert_eq!(items.len(), 1);
    }

    #[tokio::test]
    async fn test_list_deleted_does_not_return_non_deleted_items() {
        let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));

        // Insert a non-deleted task
        db.execute(
            "INSERT INTO tasks (id, task_number, title, vehicle_plate, vehicle_model, ppf_zones, \
             scheduled_date, status, created_at, updated_at) \
             VALUES ('active-1', 'TSK-ACTIVE', 'Active task', 'ACT-001', 'Model', '[\"hood\"]', \
             '2025-01-01', 'pending', \
             strftime('%s','now')*1000, strftime('%s','now')*1000)",
            [],
        )
        .expect("insert active task");

        let service = TrashService::new(db);
        let ctx = make_ctx(UserRole::Admin);

        let items = service
            .list_deleted(EntityType::Task, 10, 0, &ctx)
            .await
            .expect("list should succeed");

        assert!(items.is_empty(), "non-deleted tasks must not appear in trash");
    }

    // ── restore ─────────────────────────────────────────────────────────────

    #[tokio::test]
    async fn test_restore_clears_deleted_at_and_deleted_by() {
        let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
        insert_soft_deleted_task(&db, "task-restore-1", "TSK-REST-001");

        let service = TrashService::new(db.clone());
        let ctx = make_ctx(UserRole::Admin);

        service
            .restore(EntityType::Task, "task-restore-1".to_string(), &ctx)
            .await
            .expect("restore should succeed");

        // Verify the task is no longer in trash
        let items = service
            .list_deleted(EntityType::Task, 10, 0, &ctx)
            .await
            .expect("list should succeed");

        assert!(items.is_empty(), "restored task should not appear in trash");

        // Verify deleted_at is NULL
        let deleted_at: Option<i64> = db
            .query_single_value(
                "SELECT deleted_at FROM tasks WHERE id = ?",
                params!["task-restore-1"],
            )
            .expect("query should succeed");

        assert!(deleted_at.is_none(), "deleted_at should be NULL after restore");
    }

    // ── hard_delete ─────────────────────────────────────────────────────────

    #[tokio::test]
    async fn test_hard_delete_removes_row_permanently() {
        let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
        insert_soft_deleted_task(&db, "task-hd-1", "TSK-HD-001");

        let service = TrashService::new(db.clone());
        let ctx = make_ctx(UserRole::Admin);

        service
            .hard_delete(EntityType::Task, "task-hd-1".to_string(), &ctx)
            .await
            .expect("hard_delete should succeed");

        let count: i64 = db
            .query_single_value(
                "SELECT COUNT(*) FROM tasks WHERE id = ?",
                params!["task-hd-1"],
            )
            .expect("count query should succeed");

        assert_eq!(count, 0, "row should be permanently deleted");
    }

    // ── empty_trash ─────────────────────────────────────────────────────────

    #[tokio::test]
    async fn test_empty_trash_for_specific_type_deletes_only_that_type() {
        let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
        insert_soft_deleted_task(&db, "t-empty-1", "TSK-E-1");
        insert_soft_deleted_client(&db, "c-empty-1", "Client E1");

        let service = TrashService::new(db.clone());
        let ctx = make_ctx(UserRole::Admin);

        let deleted = service
            .empty_trash(Some(EntityType::Task), &ctx)
            .await
            .expect("empty_trash should succeed");

        assert_eq!(deleted, 1, "should delete 1 soft-deleted task");

        // Client should still exist
        let client_count: i64 = db
            .query_single_value(
                "SELECT COUNT(*) FROM clients WHERE id = ?",
                params!["c-empty-1"],
            )
            .expect("count query");

        assert_eq!(client_count, 1, "client should not be affected");
    }

    #[tokio::test]
    async fn test_empty_trash_all_types_deletes_everything() {
        let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
        insert_soft_deleted_task(&db, "t-all-1", "TSK-ALL-1");
        insert_soft_deleted_client(&db, "c-all-1", "Client ALL");

        let service = TrashService::new(db.clone());
        let ctx = make_ctx(UserRole::Admin);

        let deleted = service
            .empty_trash(None, &ctx)
            .await
            .expect("empty_trash should succeed");

        assert!(deleted >= 2, "should delete at least 2 soft-deleted items");
    }
}
