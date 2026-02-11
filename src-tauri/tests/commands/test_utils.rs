//! Integration tests for Tauri IPC command handlers
//!
//! These tests verify that the frontend-backend communication works correctly,
//! including validation, authentication, and error handling.

pub mod auth_commands_test;
pub mod client_commands_test;
pub mod intervention_commands_test;
pub mod task_commands_test;
pub mod user_commands_test;

// Test utilities for command testing
use crate::test_utils::TestDatabase;
use rpma_ppf_intervention::models::*;
use serde_json::json;

/// Test context for command tests
pub struct TestContext {
    pub db: std::sync::Arc<crate::db::Database>,
    pub app_state: std::sync::Arc<rpma_ppf_intervention::commands::AppStateType>,
}

/// Create test database with app state
pub async fn create_test_db() -> TestContext {
    use rpma_ppf_intervention::commands::AppStateType;
    use rpma_ppf_intervention::repositories;
    use std::sync::Arc;

    let test_db = TestDatabase::new().expect("Failed to create test database");
    let db = test_db.db();

    // Create repositories
    let repos =
        Arc::new(repositories::Repositories::new(&db).expect("Failed to create repositories"));

    // Create services
    let auth_service = Arc::new(rpma_ppf_intervention::services::AuthService::new(
        db.clone(),
    ));
    let session_service =
        Arc::new(rpma_ppf_intervention::services::session::SessionService::new(db.clone()));
    let two_factor_service =
        Arc::new(rpma_ppf_intervention::services::two_factor::TwoFactorService::new(db.clone()));
    let client_service = Arc::new(rpma_ppf_intervention::services::ClientService::new(
        db.clone(),
    ));
    let task_service = Arc::new(rpma_ppf_intervention::services::TaskService::new(
        db.clone(),
    ));
    let task_import_service =
        Arc::new(rpma_ppf_intervention::services::task_import::TaskImportService::new(db.clone()));
    let dashboard_service = Arc::new(rpma_ppf_intervention::services::DashboardService::new(
        db.clone(),
    ));
    let intervention_service = Arc::new(rpma_ppf_intervention::services::InterventionService::new(
        db.clone(),
    ));
    let material_service = Arc::new(rpma_ppf_intervention::services::MaterialService::new(
        db.clone(),
    ));
    let photo_service = Arc::new(rpma_ppf_intervention::services::PhotoService::new(
        db.clone(),
    ));
    let analytics_service = Arc::new(rpma_ppf_intervention::services::AnalyticsService::new(
        db.clone(),
    ));
    let settings_service = Arc::new(rpma_ppf_intervention::services::SettingsService::new(
        db.clone(),
    ));
    let cache_service =
        Arc::new(rpma_ppf_intervention::services::cache::CacheService::new(100).unwrap());
    let report_job_service =
        Arc::new(rpma_ppf_intervention::services::report_jobs::ReportJobService::new(db.clone()));
    let performance_monitor_service = Arc::new(
        rpma_ppf_intervention::services::performance_monitor::PerformanceMonitorService::new(),
    );
    let command_performance_tracker = Arc::new(
        rpma_ppf_intervention::services::performance_monitor::CommandPerformanceTracker::new(),
    );
    let prediction_service =
        Arc::new(rpma_ppf_intervention::services::prediction::PredictionService::new(db.clone()));
    let sync_queue = std::sync::Arc::new(rpma_ppf_intervention::sync::SyncQueue::new(100));
    let background_sync = std::sync::Arc::new(std::sync::Mutex::new(
        rpma_ppf_intervention::sync::BackgroundSyncService::new(db.clone()),
    ));
    let event_bus =
        std::sync::Arc::new(rpma_ppf_intervention::services::event_bus::InMemoryEventBus::new());
    let app_data_dir = std::env::temp_dir();

    // Create async db
    let async_db = Arc::new(rpma_ppf_intervention::db::AsyncDatabase::new(db.clone()));

    let app_state = Arc::new(AppStateType {
        db,
        async_db,
        repositories: repos,
        task_service,
        client_service,
        task_import_service,
        dashboard_service,
        intervention_service,
        material_service,
        photo_service,
        analytics_service,
        auth_service,
        session_service,
        two_factor_service,
        settings_service,
        cache_service,
        report_job_service,
        performance_monitor_service,
        command_performance_tracker,
        prediction_service,
        sync_queue,
        background_sync,
        event_bus,
        app_data_dir,
    });

    TestContext {
        db: test_db.db(),
        app_state,
    }
}

/// Helper to create a valid authentication session for testing
pub async fn create_test_session(ctx: &TestContext) -> String {
    use rpma_ppf_intervention::models::auth::{CreateUserRequest, UserRole};
    use rpma_ppf_intervention::services::auth::AuthService;

    // Create admin user
    let user_req = CreateUserRequest {
        email: "admin@test.com".to_string(),
        username: "testadmin".to_string(),
        first_name: "Test",
        last_name: "Admin",
        password: "SecurePass123!".to_string(),
        role: UserRole::Admin,
        is_active: true,
    };

    // Need to create user through auth service
    let auth = AuthService::new(ctx.db.clone());
    let user = auth
        .create_account(
            &user_req.email,
            &user_req.username,
            &user_req.first_name,
            &user_req.last_name,
            user_req.role,
            &user_req.password,
        )
        .unwrap();

    // Authenticate and get session token
    let session = auth
        .authenticate_by_email("admin@test.com", "SecurePass123!", None)
        .await
        .unwrap();
    session.token
}

/// Helper to create a test technician user
pub async fn create_test_technician(
    ctx: &TestContext,
) -> rpma_ppf_intervention::models::auth::UserAccount {
    use rpma_ppf_intervention::models::auth::{CreateUserRequest, UserRole};
    use rpma_ppf_intervention::services::auth::AuthService;

    let user_req = CreateUserRequest {
        email: "tech1@test.com".to_string(),
        username: "tech1".to_string(),
        first_name: "Test",
        last_name: "Technician",
        password: "TechPass123!".to_string(),
        role: UserRole::Technician,
        is_active: true,
    };

    let auth = AuthService::new(ctx.db.clone());
    auth.create_account(
        &user_req.email,
        &user_req.username,
        &user_req.first_name,
        &user_req.last_name,
        user_req.role,
        &user_req.password,
    )
    .unwrap()
}
