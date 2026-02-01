#[cfg(test)]
mod tests {
    use super::*;
    use crate::commands::settings::{upload_user_avatar, UploadAvatarRequest};
    use crate::commands::AppStateType;
    use crate::db::Database;
    use crate::repositories::{Repositories, Cache};
    use crate::services::auth::AuthService;
    use crate::services::SettingsService;
    use std::sync::Arc;
    use tempfile::tempdir;

    async fn setup_test_state() -> AppStateType {
        let temp_dir = tempdir().expect("Failed to create temp directory");
        let db_path = temp_dir.path().join("test.db");

        let db =
            Database::new(db_path.to_str().unwrap(), "").expect("Failed to create test database");

        db.init().expect("Failed to initialize database");
        db.migrate(11).expect("Failed to run migrations");

        let auth_service = AuthService::new(db.clone()).expect("Failed to create auth service");
        auth_service
            .init()
            .expect("Failed to initialize auth service");

        let settings_service = SettingsService::new(db.clone());

        // Initialize repositories
        let repositories = Arc::new(
            Repositories::new(Arc::new(db.clone()), 100).await
        );

        AppStateType {
            db: Arc::new(db),
            task_service: Arc::new(crate::services::TaskService::new(db.clone())),
            client_service: Arc::new(crate::services::ClientService::new(repositories.client.clone())),
            dashboard_service: Arc::new(crate::services::DashboardService::new(Arc::new(db))),
            intervention_service: Arc::new(crate::services::InterventionService::new(db.clone())),
            material_service: Arc::new(crate::services::MaterialService::new(db.clone())),
            photo_service: Arc::new(crate::services::PhotoService::new(
                db.clone(),
                temp_dir.path().to_path_buf(),
            )),
            auth_service: Arc::new(auth_service),
            settings_service: Arc::new(settings_service),
            cache_service: Arc::new(crate::services::cache::CacheService::default().unwrap()),
            report_job_service: Arc::new(crate::services::report_jobs::ReportJobService::new(
                db.clone(),
                Arc::new(crate::services::cache::CacheService::default().unwrap()),
            )),
            performance_monitor_service: Arc::new(
                crate::services::performance_monitor::PerformanceMonitorService::new(db.clone()),
            ),
            prediction_service: Arc::new(crate::services::prediction::PredictionService::new(
                db.clone(),
            )),
            sync_queue: Arc::new(crate::sync::SyncQueue::new(db.clone())),
            background_sync: Arc::new(std::sync::Mutex::new(
                crate::sync::BackgroundSyncService::new(Arc::new(crate::sync::SyncQueue::new(
                    db.clone(),
                ))),
            )),
        }
    }

    #[tokio::test]
    async fn test_upload_user_avatar_valid_image() {
        let state = setup_test_state().await;

        // Create a test user
        let user = state
            .auth_service
            .create_account(
                "test@example.com",
                "testuser",
                "Test",
                "User",
                crate::models::auth::UserRole::Technician,
                "password123",
            )
            .expect("Failed to create test user");

        // Login to get session token
        let session = state
            .auth_service
            .login("test4@example.com", "password123")
            .await
            .expect("Failed to login");

        let request = UploadAvatarRequest {
            file_data: "invalid_base64_data!!!".to_string(),
            file_name: "test.png".to_string(),
            mime_type: "image/png".to_string(),
        };

        let result = upload_user_avatar(request, session.token, tauri::State(state)).await;

        assert!(result.is_ok(), "Avatar upload should succeed");
        let avatar_url = result.unwrap();
        assert!(
            avatar_url.starts_with("/avatars/"),
            "Avatar URL should start with /avatars/"
        );
        assert!(
            avatar_url.contains("testuser"),
            "Avatar URL should contain user ID"
        );
    }

    #[tokio::test]
    async fn test_upload_user_avatar_invalid_file_type() {
        let state = setup_test_state().await;

        // Create a test user
        let user = state
            .auth_service
            .create_account(
                "test2@example.com",
                "testuser2",
                "Test",
                "User",
                crate::models::auth::UserRole::Technician,
                "password123",
            )
            .expect("Failed to create test user");

        // Login to get session token
        let session = state
            .auth_service
            .login("test2@example.com", "password123")
            .await
            .expect("Failed to login");

        let request = UploadAvatarRequest {
            file_data: test_file_base64.to_string(),
            file_name: "test.txt".to_string(),
            mime_type: "text/plain".to_string(),
        };

        let result = upload_user_avatar(request, session.token, tauri::State(state)).await;

        assert!(
            result.is_err(),
            "Avatar upload should fail for invalid file type"
        );
        let error = result.unwrap_err();
        assert!(
            error.contains("Invalid file type"),
            "Error should mention invalid file type"
        );
    }

    #[tokio::test]
    async fn test_upload_user_avatar_file_too_large() {
        let state = setup_test_state().await;

        // Create a test user
        let user = state
            .auth_service
            .create_account(
                "test3@example.com",
                "testuser3",
                "Test",
                "User",
                crate::models::auth::UserRole::Technician,
                "password123",
            )
            .expect("Failed to create test user");

        // Login to get session token
        let session = state
            .auth_service
            .login("test3@example.com", "password123")
            .await
            .expect("Failed to login");

        // Create a large base64 string (over 5MB when decoded)
        let large_data = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==".repeat(100000);

        let request = UploadAvatarRequest {
            file_data: large_data,
            file_name: "large.png".to_string(),
            mime_type: "image/png".to_string(),
        };

        let result = upload_user_avatar(request, session.token, tauri::State(state)).await;

        assert!(
            result.is_err(),
            "Avatar upload should fail for file too large"
        );
        let error = result.unwrap_err();
        assert!(
            error.contains("File too large"),
            "Error should mention file size"
        );
    }

    #[tokio::test]
    async fn test_upload_user_avatar_invalid_session() {
        let state = setup_test_state().await;

        let request = UploadAvatarRequest {
            file_data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==".to_string(),
            file_name: "test.png".to_string(),
            mime_type: "image/png".to_string(),
        };

        let result =
            upload_user_avatar(request, "invalid_token".to_string(), tauri::State(state)).await;

        assert!(
            result.is_err(),
            "Avatar upload should fail with invalid session"
        );
        let error = result.unwrap_err();
        assert!(
            error.contains("Authentication failed"),
            "Error should mention authentication"
        );
    }

    #[tokio::test]
    async fn test_upload_user_avatar_invalid_base64() {
        let state = setup_test_state().await;

        // Create a test user
        let user = state
            .auth_service
            .create_account(
                "test4@example.com",
                "testuser4",
                "Test",
                "User",
                crate::models::auth::UserRole::Technician,
                "password123",
            )
            .expect("Failed to create test user");

        // Login to get session token
        let session = state
            .auth_service
            .login("test@example.com", "password123")
            .await
            .expect("Failed to login");

        let request = UploadAvatarRequest {
            file_data: test_image_base64.to_string(),
            file_name: "test.png".to_string(),
            mime_type: "image/png".to_string(),
        };

        let result = upload_user_avatar(request, session.token, tauri::State(state)).await;

        assert!(
            result.is_err(),
            "Avatar upload should fail with invalid base64"
        );
        let error = result.unwrap_err();
        assert!(
            error.contains("Invalid base64 data"),
            "Error should mention invalid base64"
        );
    }
}
