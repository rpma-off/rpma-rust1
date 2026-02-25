//! Integration tests for the new sessions repository.

use crate::domains::auth::domain::models::auth::{UserRole, UserSession};
use crate::domains::auth::infrastructure::session_repository::SessionRepository;
use crate::test_db;
use chrono::Utc;
use std::sync::Arc;

#[cfg(test)]
mod tests {
    use super::*;

    fn make_repo() -> (SessionRepository, crate::test_utils::TestDatabase) {
        let db = test_db!();
        let repo = SessionRepository::new(Arc::new(db.db().clone()));
        (repo, db)
    }

    fn make_session(user_id: &str, username: &str) -> UserSession {
        UserSession::new(
            user_id.to_string(),
            username.to_string(),
            format!("{}@example.com", username),
            UserRole::Technician,
            uuid::Uuid::new_v4().to_string(),
            8 * 3600,
        )
    }

    fn insert_user(db: &crate::db::Database, user_id: &str) {
        let conn = db.get_connection().expect("conn");
        conn.execute(
            "INSERT INTO users (id, email, username, password_hash, full_name, role, is_active, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            rusqlite::params![
                user_id,
                format!("{}@test.com", user_id),
                format!("user_{}", user_id),
                "hash",
                "Test User",
                "technician",
                1,
                Utc::now().timestamp_millis(),
                Utc::now().timestamp_millis(),
            ],
        ).expect("insert user");
    }

    #[test]
    fn test_insert_and_find_session() {
        let (repo, db) = make_repo();
        insert_user(&db.db(), "user-001");
        let session = make_session("user-001", "tester");

        repo.insert_session(&session).expect("insert");

        let now_ms = Utc::now().timestamp_millis();
        let found = repo
            .find_valid_session(&session.token, now_ms)
            .expect("find");
        assert!(found.is_some(), "Session should be found");
        let found = found.unwrap();
        assert_eq!(found.user_id, "user-001");
        assert_eq!(found.token, session.token);
        assert_eq!(found.id, session.id);
    }

    #[test]
    fn test_find_expired_session_returns_none() {
        let (repo, db) = make_repo();
        insert_user(&db.db(), "user-002");
        let session = make_session("user-002", "expired_user");

        repo.insert_session(&session).expect("insert");

        // Query with a future "now" so the session looks expired
        let future_ms = Utc::now().timestamp_millis() + 9 * 3600 * 1000; // 9h from now
        let found = repo
            .find_valid_session(&session.token, future_ms)
            .expect("find");
        assert!(found.is_none(), "Session should appear expired");
    }

    #[test]
    fn test_update_last_activity() {
        let (repo, db) = make_repo();
        insert_user(&db.db(), "user-003");
        let session = make_session("user-003", "active_user");

        repo.insert_session(&session).expect("insert");

        let new_time = Utc::now().timestamp_millis() + 1000;
        repo.update_last_activity(&session.token, new_time)
            .expect("update");

        let conn = db.db().get_connection().expect("conn");
        let stored: i64 = conn
            .query_row(
                "SELECT last_activity FROM sessions WHERE id = ?1",
                rusqlite::params![session.token],
                |row| row.get(0),
            )
            .expect("query");
        assert_eq!(stored, new_time);
    }

    #[test]
    fn test_delete_session() {
        let (repo, db) = make_repo();
        insert_user(&db.db(), "user-004");
        let session = make_session("user-004", "delete_user");

        repo.insert_session(&session).expect("insert");
        repo.delete_session(&session.token).expect("delete");

        let now_ms = Utc::now().timestamp_millis();
        let found = repo
            .find_valid_session(&session.token, now_ms)
            .expect("find");
        assert!(found.is_none(), "Deleted session should not be found");
    }

    #[test]
    fn test_delete_user_sessions() {
        let (repo, db) = make_repo();
        insert_user(&db.db(), "user-005");
        let s1 = make_session("user-005", "multi_user");
        let s2 = make_session("user-005", "multi_user");
        let s3 = make_session("user-005", "multi_user");

        repo.insert_session(&s1).expect("insert s1");
        repo.insert_session(&s2).expect("insert s2");
        repo.insert_session(&s3).expect("insert s3");

        let deleted = repo.delete_user_sessions("user-005").expect("delete all");
        assert_eq!(deleted, 3);
    }

    #[test]
    fn test_delete_user_sessions_except() {
        let (repo, db) = make_repo();
        insert_user(&db.db(), "user-006");
        let keep = make_session("user-006", "keep_user");
        let other = make_session("user-006", "keep_user");

        repo.insert_session(&keep).expect("insert keep");
        repo.insert_session(&other).expect("insert other");

        let deleted = repo
            .delete_user_sessions_except("user-006", &keep.token)
            .expect("delete except");
        assert_eq!(deleted, 1);

        let now_ms = Utc::now().timestamp_millis();
        let found = repo
            .find_valid_session(&keep.token, now_ms)
            .expect("find kept");
        assert!(found.is_some(), "Kept session should still exist");
    }

    #[test]
    fn test_cleanup_expired() {
        let (repo, db) = make_repo();
        insert_user(&db.db(), "user-007");
        let session = make_session("user-007", "cleanup_user");
        repo.insert_session(&session).expect("insert");

        // Manually expire it
        let conn = db.db().get_connection().expect("conn");
        conn.execute(
            "UPDATE sessions SET expires_at = ?1 WHERE id = ?2",
            rusqlite::params![Utc::now().timestamp_millis() - 1000, session.token,],
        )
        .expect("expire");

        let removed = repo
            .cleanup_expired(Utc::now().timestamp_millis())
            .expect("cleanup");
        assert_eq!(removed, 1);
    }

    #[test]
    fn test_list_user_sessions() {
        let (repo, db) = make_repo();
        insert_user(&db.db(), "user-008");
        let s1 = make_session("user-008", "list_user");
        let s2 = make_session("user-008", "list_user");

        repo.insert_session(&s1).expect("insert s1");
        repo.insert_session(&s2).expect("insert s2");

        let now_ms = Utc::now().timestamp_millis();
        let sessions = repo.list_user_sessions("user-008", now_ms).expect("list");
        assert_eq!(sessions.len(), 2);
    }
}
