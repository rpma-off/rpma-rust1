//! Unit tests for `UserRepository`.

#[cfg(test)]
mod tests {
    use crate::db::Database;
    use crate::domains::users::domain::models::user::{User, UserRole};
    use crate::domains::users::infrastructure::user_repository::query::UserQuery;
    use crate::domains::users::infrastructure::user_repository::UserRepository;
    use crate::shared::repositories::base::RepoError;
    use crate::shared::repositories::base::Repository;
    use crate::shared::repositories::cache::Cache;
    use std::sync::Arc;

    async fn setup_test_db() -> Database {
        crate::test_utils::setup_test_db().await
    }

    #[tokio::test]
    async fn test_find_by_id() {
        let db = Arc::new(setup_test_db().await);
        let cache = Arc::new(Cache::new(100));
        let repo = UserRepository::new(db, cache);

        // Create test user
        let user = User {
            id: "test-1".to_string(),
            email: "test@example.com".to_string(),
            username: "testuser".to_string(),
            password_hash: "hashed".to_string(),
            full_name: "Test User".to_string(),
            role: UserRole::Technician,
            phone: None,
            is_active: true,
            last_login_at: None,
            login_count: 0,
            preferences: None,
            synced: false,
            last_synced_at: None,
            created_at: chrono::Utc::now().timestamp_millis(),
            updated_at: chrono::Utc::now().timestamp_millis(),
        };

        repo.save(user.clone()).await.unwrap();

        // Find by ID
        let found = repo.find_by_id("test-1".to_string()).await.unwrap();
        assert!(found.is_some());
        assert_eq!(found.unwrap().id, "test-1");
    }

    #[tokio::test]
    async fn test_find_by_email() {
        let db = Arc::new(setup_test_db().await);
        let cache = Arc::new(Cache::new(100));
        let repo = UserRepository::new(db, cache);

        // Create test user
        let user = User {
            id: "email-test".to_string(),
            email: "email@example.com".to_string(),
            username: "emailuser".to_string(),
            password_hash: "hashed".to_string(),
            full_name: "Email Test User".to_string(),
            role: UserRole::Technician,
            phone: None,
            is_active: true,
            last_login_at: None,
            login_count: 0,
            preferences: None,
            synced: false,
            last_synced_at: None,
            created_at: chrono::Utc::now().timestamp_millis(),
            updated_at: chrono::Utc::now().timestamp_millis(),
        };

        repo.save(user).await.unwrap();

        // Find by email
        let found = repo.find_by_email("email@example.com").await.unwrap();
        assert!(found.is_some());
        assert_eq!(found.unwrap().full_name, "Email Test User");
    }

    #[tokio::test]
    async fn test_find_by_role() {
        let db = Arc::new(setup_test_db().await);
        let cache = Arc::new(Cache::new(100));
        let repo = UserRepository::new(db, cache);

        // Create test users with different roles
        for i in 0..2 {
            let user = User {
                id: format!("role-test-{}", i),
                email: format!("role{}@example.com", i),
                username: format!("roleuser{}", i),
                password_hash: "hashed".to_string(),
                full_name: format!("Role Test User {}", i),
                role: UserRole::Admin,
                phone: None,
                is_active: true,
                last_login_at: None,
                login_count: 0,
                preferences: None,
                synced: false,
                last_synced_at: None,
                created_at: chrono::Utc::now().timestamp_millis(),
                updated_at: chrono::Utc::now().timestamp_millis(),
            };
            repo.save(user).await.unwrap();
        }

        // Find by role
        let admins = repo.find_by_role(UserRole::Admin).await.unwrap();
        assert!(admins.len() >= 2);
    }

    #[tokio::test]
    async fn test_find_active() {
        let db = Arc::new(setup_test_db().await);
        let cache = Arc::new(Cache::new(100));
        let repo = UserRepository::new(db, cache);

        // Create active user
        let active_user = User {
            id: "active-test".to_string(),
            email: "active@example.com".to_string(),
            username: "activeuser".to_string(),
            password_hash: "hashed".to_string(),
            full_name: "Active User".to_string(),
            role: UserRole::Technician,
            phone: None,
            is_active: true,
            last_login_at: None,
            login_count: 0,
            preferences: None,
            synced: false,
            last_synced_at: None,
            created_at: chrono::Utc::now().timestamp_millis(),
            updated_at: chrono::Utc::now().timestamp_millis(),
        };
        repo.save(active_user).await.unwrap();

        // Create inactive user
        let inactive_user = User {
            id: "inactive-test".to_string(),
            email: "inactive@example.com".to_string(),
            username: "inactiveuser".to_string(),
            password_hash: "hashed".to_string(),
            full_name: "Inactive User".to_string(),
            role: UserRole::Technician,
            phone: None,
            is_active: false,
            last_login_at: None,
            login_count: 0,
            preferences: None,
            synced: false,
            last_synced_at: None,
            created_at: chrono::Utc::now().timestamp_millis(),
            updated_at: chrono::Utc::now().timestamp_millis(),
        };
        repo.save(inactive_user).await.unwrap();

        // Find active users
        let active_users = repo.find_active().await.unwrap();
        assert!(active_users.len() >= 1);
    }

    #[tokio::test]
    async fn test_update_last_login() {
        let db = Arc::new(setup_test_db().await);
        let cache = Arc::new(Cache::new(100));
        let repo = UserRepository::new(db, cache);

        // Create test user
        let user = User {
            id: "login-test".to_string(),
            email: "login@example.com".to_string(),
            username: "loginuser".to_string(),
            password_hash: "hashed".to_string(),
            full_name: "Login Test User".to_string(),
            role: UserRole::Technician,
            phone: None,
            is_active: true,
            last_login_at: None,
            login_count: 0,
            preferences: None,
            synced: false,
            last_synced_at: None,
            created_at: chrono::Utc::now().timestamp_millis(),
            updated_at: chrono::Utc::now().timestamp_millis(),
        };
        repo.save(user).await.unwrap();

        // Update last login
        repo.update_last_login("login-test").await.unwrap();

        // Verify login count increased
        let updated_user = repo
            .find_by_id("login-test".to_string())
            .await
            .unwrap()
            .unwrap();
        assert_eq!(updated_user.login_count, 1);
        assert!(updated_user.last_login_at.is_some());
    }

    #[tokio::test]
    async fn test_cache_hit() {
        let db = Arc::new(setup_test_db().await);
        let cache = Arc::new(Cache::new(100));
        let repo = UserRepository::new(Arc::clone(&db), Arc::clone(&cache));

        // Create test user
        let user = User {
            id: "cache-test".to_string(),
            email: "cache@example.com".to_string(),
            username: "cacheuser".to_string(),
            password_hash: "hashed".to_string(),
            full_name: "Cache Test User".to_string(),
            role: UserRole::Technician,
            phone: None,
            is_active: true,
            last_login_at: None,
            login_count: 0,
            preferences: None,
            synced: false,
            last_synced_at: None,
            created_at: chrono::Utc::now().timestamp_millis(),
            updated_at: chrono::Utc::now().timestamp_millis(),
        };

        repo.save(user).await.unwrap();

        // First call - cache miss, hit database
        let _ = repo.find_by_id("cache-test".to_string()).await.unwrap();

        // Second call - cache hit
        let found = repo.find_by_id("cache-test".to_string()).await.unwrap();
        assert!(found.is_some());
        assert_eq!(found.unwrap().full_name, "Cache Test User");
    }

    #[tokio::test]
    async fn test_search() {
        let db = Arc::new(setup_test_db().await);
        let cache = Arc::new(Cache::new(100));
        let repo = UserRepository::new(db, cache);

        // Create test users
        for i in 0..3 {
            let user = User {
                id: format!("search-{}", i),
                email: format!("search{}@example.com", i),
                username: format!("searchuser{}", i),
                password_hash: "hashed".to_string(),
                full_name: format!("Search User {}", i),
                role: UserRole::Technician,
                phone: None,
                is_active: true,
                last_login_at: None,
                login_count: 0,
                preferences: None,
                synced: false,
                last_synced_at: None,
                created_at: chrono::Utc::now().timestamp_millis(),
                updated_at: chrono::Utc::now().timestamp_millis(),
            };

            repo.save(user).await.unwrap();
        }

        // Search users
        let query = UserQuery {
            search: Some("Search".to_string()),
            ..Default::default()
        };

        let results = repo.search(query).await.unwrap();
        assert!(results.len() >= 3);
    }

    #[tokio::test]
    async fn test_bootstrap_first_admin_success() {
        let db = Arc::new(setup_test_db().await);
        let cache = Arc::new(Cache::new(100));
        let repo = UserRepository::new(Arc::clone(&db), cache);

        let user = User {
            id: "bootstrap-user".to_string(),
            email: "bootstrap@example.com".to_string(),
            username: "bootstrap".to_string(),
            password_hash: "hashed".to_string(),
            full_name: "Bootstrap User".to_string(),
            role: UserRole::Viewer,
            phone: None,
            is_active: true,
            last_login_at: None,
            login_count: 0,
            preferences: None,
            synced: false,
            last_synced_at: None,
            created_at: chrono::Utc::now().timestamp_millis(),
            updated_at: chrono::Utc::now().timestamp_millis(),
        };

        repo.save(user.clone()).await.unwrap();

        let email = repo.bootstrap_first_admin(&user.id).await.unwrap();
        assert_eq!(email, user.email);

        let updated = repo.find_by_id(user.id.clone()).await.unwrap().unwrap();
        assert_eq!(updated.role, UserRole::Admin);

        let conn = db.get_connection().unwrap();
        let audit_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM audit_logs WHERE action = 'bootstrap_admin'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(audit_count, 1);
    }

    #[tokio::test]
    async fn test_bootstrap_first_admin_conflict() {
        let db = Arc::new(setup_test_db().await);
        let cache = Arc::new(Cache::new(100));
        let repo = UserRepository::new(db, cache);

        let admin = User {
            id: "existing-admin".to_string(),
            email: "admin@example.com".to_string(),
            username: "admin".to_string(),
            password_hash: "hashed".to_string(),
            full_name: "Admin User".to_string(),
            role: UserRole::Admin,
            phone: None,
            is_active: true,
            last_login_at: None,
            login_count: 0,
            preferences: None,
            synced: false,
            last_synced_at: None,
            created_at: chrono::Utc::now().timestamp_millis(),
            updated_at: chrono::Utc::now().timestamp_millis(),
        };
        repo.save(admin).await.unwrap();

        let user = User {
            id: "other-user".to_string(),
            email: "other@example.com".to_string(),
            username: "other".to_string(),
            password_hash: "hashed".to_string(),
            full_name: "Other User".to_string(),
            role: UserRole::Viewer,
            phone: None,
            is_active: true,
            last_login_at: None,
            login_count: 0,
            preferences: None,
            synced: false,
            last_synced_at: None,
            created_at: chrono::Utc::now().timestamp_millis(),
            updated_at: chrono::Utc::now().timestamp_millis(),
        };
        repo.save(user.clone()).await.unwrap();

        let err = repo.bootstrap_first_admin(&user.id).await.unwrap_err();
        assert!(matches!(err, RepoError::Conflict(_)));
    }

    #[tokio::test]
    async fn test_bootstrap_first_admin_inactive_user() {
        let db = Arc::new(setup_test_db().await);
        let cache = Arc::new(Cache::new(100));
        let repo = UserRepository::new(db, cache);

        let user = User {
            id: "inactive-user".to_string(),
            email: "inactive@example.com".to_string(),
            username: "inactive".to_string(),
            password_hash: "hashed".to_string(),
            full_name: "Inactive User".to_string(),
            role: UserRole::Viewer,
            phone: None,
            is_active: false,
            last_login_at: None,
            login_count: 0,
            preferences: None,
            synced: false,
            last_synced_at: None,
            created_at: chrono::Utc::now().timestamp_millis(),
            updated_at: chrono::Utc::now().timestamp_millis(),
        };
        repo.save(user.clone()).await.unwrap();

        let err = repo.bootstrap_first_admin(&user.id).await.unwrap_err();
        assert!(matches!(err, RepoError::Validation(_)));
    }
}
