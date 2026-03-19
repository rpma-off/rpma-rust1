//! Permission (RBAC) tests for the settings domain.
//!
//! These tests verify that `SettingsService` enforces RBAC at the application
//! layer — independent of the IPC boundary.
//!
//! ADR-007 permission matrix:
//!
//! | Operation | Admin | Supervisor | Technician | Viewer |
//! |-----------|-------|------------|------------|--------|
//! | get_app_settings | ✓ | ✗ | ✗ | ✗ |
//! | update_*_settings (app) | ✓ | ✗ | ✗ | ✗ |
//! | get_user_settings | ✓ | ✓ | ✓ | ✓ |
//! | update_user_* | ✓ | ✓ | ✓ | ✓ |
//! | get_organization | ✓ | ✓ | ✓ | ✓ |
//! | update_organization | ✓ | ✗ | ✗ | ✗ |
//! | get_organization_settings | ✓ | ✓ | ✓ | ✓ |
//! | update_organization_settings | ✓ | ✗ | ✗ | ✗ |

#[cfg(test)]
mod tests {
    use crate::domains::settings::application::settings_service::SettingsService;
    use crate::domains::settings::models::GeneralSettings;
    use crate::shared::contracts::auth::UserRole;
    use crate::shared::ipc::errors::AppError;
    use crate::test_utils::{build_test_app_state, make_test_session};
    use crate::shared::context::session_resolver::resolve_request_context;

    // ── get_app_settings ─────────────────────────────────────────────────────

    #[tokio::test]
    async fn test_get_app_settings_admin_succeeds() {
        let state = build_test_app_state().await;
        state.session_store.set(make_test_session(UserRole::Admin));
        let ctx = resolve_request_context(&state, None, &None).expect("ctx");

        let service = SettingsService::new(state.db.clone());
        let result = service.get_app_settings(&ctx);
        assert!(result.is_ok(), "Admin should read app settings: {:?}", result);
    }

    #[tokio::test]
    async fn test_get_app_settings_supervisor_rejected() {
        let state = build_test_app_state().await;
        state.session_store.set(make_test_session(UserRole::Supervisor));
        let ctx = resolve_request_context(&state, None, &None).expect("ctx");

        let service = SettingsService::new(state.db.clone());
        let result = service.get_app_settings(&ctx);
        assert!(matches!(result, Err(AppError::Authorization(_))),
            "Supervisor should not read app settings, got: {:?}", result);
    }

    #[tokio::test]
    async fn test_get_app_settings_technician_rejected() {
        let state = build_test_app_state().await;
        state.session_store.set(make_test_session(UserRole::Technician));
        let ctx = resolve_request_context(&state, None, &None).expect("ctx");

        let service = SettingsService::new(state.db.clone());
        let result = service.get_app_settings(&ctx);
        assert!(matches!(result, Err(AppError::Authorization(_))),
            "Technician should not read app settings, got: {:?}", result);
    }

    #[tokio::test]
    async fn test_get_app_settings_viewer_rejected() {
        let state = build_test_app_state().await;
        state.session_store.set(make_test_session(UserRole::Viewer));
        let ctx = resolve_request_context(&state, None, &None).expect("ctx");

        let service = SettingsService::new(state.db.clone());
        let result = service.get_app_settings(&ctx);
        assert!(matches!(result, Err(AppError::Authorization(_))),
            "Viewer should not read app settings, got: {:?}", result);
    }

    // ── update_general_settings ───────────────────────────────────────────────

    #[tokio::test]
    async fn test_update_general_settings_admin_succeeds() {
        let state = build_test_app_state().await;
        state.session_store.set(make_test_session(UserRole::Admin));
        let ctx = resolve_request_context(&state, None, &None).expect("ctx");

        let service = SettingsService::new(state.db.clone());
        let result = service.update_general_settings(&ctx, GeneralSettings::default());
        assert!(result.is_ok(), "Admin should update general settings: {:?}", result);
    }

    #[tokio::test]
    async fn test_update_general_settings_supervisor_rejected() {
        let state = build_test_app_state().await;
        state.session_store.set(make_test_session(UserRole::Supervisor));
        let ctx = resolve_request_context(&state, None, &None).expect("ctx");

        let service = SettingsService::new(state.db.clone());
        let result = service.update_general_settings(&ctx, GeneralSettings::default());
        assert!(matches!(result, Err(AppError::Authorization(_))),
            "Supervisor should not update general settings, got: {:?}", result);
    }

    #[tokio::test]
    async fn test_update_general_settings_technician_rejected() {
        let state = build_test_app_state().await;
        state.session_store.set(make_test_session(UserRole::Technician));
        let ctx = resolve_request_context(&state, None, &None).expect("ctx");

        let service = SettingsService::new(state.db.clone());
        let result = service.update_general_settings(&ctx, GeneralSettings::default());
        assert!(matches!(result, Err(AppError::Authorization(_))),
            "Technician should not update general settings, got: {:?}", result);
    }

    #[tokio::test]
    async fn test_update_general_settings_viewer_rejected() {
        let state = build_test_app_state().await;
        state.session_store.set(make_test_session(UserRole::Viewer));
        let ctx = resolve_request_context(&state, None, &None).expect("ctx");

        let service = SettingsService::new(state.db.clone());
        let result = service.update_general_settings(&ctx, GeneralSettings::default());
        assert!(matches!(result, Err(AppError::Authorization(_))),
            "Viewer should not update general settings, got: {:?}", result);
    }

    // ── get_user_settings ─────────────────────────────────────────────────────

    #[tokio::test]
    async fn test_get_user_settings_all_roles_succeed() {
        // User settings require the caller's user_id to exist in the users table
        // (FK constraint). We verify only the RBAC gate here — the FK is a
        // DB-setup concern tested separately in the integration harness.
        for role in [UserRole::Admin, UserRole::Supervisor, UserRole::Technician, UserRole::Viewer] {
            let state = build_test_app_state().await;
            state.session_store.set(make_test_session(role.clone()));
            let ctx = resolve_request_context(&state, None, &None).expect("ctx");

            let service = SettingsService::new(state.db.clone());
            // RBAC: all roles are permitted; any error must NOT be Authorization.
            let result = service.get_user_settings(&ctx);
            assert!(
                !matches!(result, Err(crate::shared::ipc::errors::AppError::Authorization(_))),
                "Role {:?} should not be rejected by RBAC for user settings, got: {:?}", role, result
            );
        }
    }

    // ── get_organization_settings ─────────────────────────────────────────────

    #[tokio::test]
    async fn test_get_organization_settings_all_roles_succeed() {
        for role in [UserRole::Admin, UserRole::Supervisor, UserRole::Technician, UserRole::Viewer] {
            let state = build_test_app_state().await;
            state.session_store.set(make_test_session(role.clone()));
            let ctx = resolve_request_context(&state, None, &None).expect("ctx");

            let service = SettingsService::new(state.db.clone());
            let result = service.get_organization_settings(&ctx);
            assert!(result.is_ok(), "Role {:?} should read org settings: {:?}", role, result);
        }
    }

    // ── update_organization_settings ──────────────────────────────────────────

    #[tokio::test]
    async fn test_update_organization_settings_admin_succeeds() {
        let state = build_test_app_state().await;
        state.session_store.set(make_test_session(UserRole::Admin));
        let ctx = resolve_request_context(&state, None, &None).expect("ctx");

        let service = SettingsService::new(state.db.clone());
        let req = crate::domains::settings::models::UpdateOrganizationSettingsRequest {
            settings: std::collections::HashMap::new(),
        };
        let result = service.update_organization_settings(&ctx, &req);
        assert!(result.is_ok(), "Admin should update org settings: {:?}", result);
    }

    #[tokio::test]
    async fn test_update_organization_settings_supervisor_rejected() {
        let state = build_test_app_state().await;
        state.session_store.set(make_test_session(UserRole::Supervisor));
        let ctx = resolve_request_context(&state, None, &None).expect("ctx");

        let service = SettingsService::new(state.db.clone());
        let req = crate::domains::settings::models::UpdateOrganizationSettingsRequest {
            settings: std::collections::HashMap::new(),
        };
        let result = service.update_organization_settings(&ctx, &req);
        assert!(matches!(result, Err(AppError::Authorization(_))),
            "Supervisor should not update org settings, got: {:?}", result);
    }

    #[tokio::test]
    async fn test_update_organization_settings_viewer_rejected() {
        let state = build_test_app_state().await;
        state.session_store.set(make_test_session(UserRole::Viewer));
        let ctx = resolve_request_context(&state, None, &None).expect("ctx");

        let service = SettingsService::new(state.db.clone());
        let req = crate::domains::settings::models::UpdateOrganizationSettingsRequest {
            settings: std::collections::HashMap::new(),
        };
        let result = service.update_organization_settings(&ctx, &req);
        assert!(matches!(result, Err(AppError::Authorization(_))),
            "Viewer should not update org settings, got: {:?}", result);
    }
}

