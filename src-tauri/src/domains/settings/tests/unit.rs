//! Unit tests for `SettingsService` methods.
//!
//! These tests verify round-trip read/write behaviour of the application
//! service without going through the IPC layer.

#[cfg(test)]
mod tests {
    use crate::domains::settings::application::settings_service::SettingsService;
    use crate::domains::settings::models::{GeneralSettings, SecuritySettings};
    use crate::shared::contracts::auth::UserRole;
    use crate::test_utils::{build_test_app_state, make_test_session};
    use crate::shared::context::session_resolver::resolve_request_context;

    // ── App settings round-trip ───────────────────────────────────────────────

    #[tokio::test]
    async fn test_get_app_settings_returns_defaults_from_migration() {
        let state = build_test_app_state().await;
        state.session_store.set(make_test_session(UserRole::Admin));
        let ctx = resolve_request_context(&state, None, &None).expect("ctx");

        let service = SettingsService::new(state.db.clone());
        let result = service.get_app_settings(&ctx);

        assert!(result.is_ok(), "get_app_settings should return seeded defaults: {:?}", result);
    }

    #[tokio::test]
    async fn test_update_general_settings_persists_language_change() {
        let state = build_test_app_state().await;
        state.session_store.set(make_test_session(UserRole::Admin));
        let ctx = resolve_request_context(&state, None, &None).expect("ctx");

        let service = SettingsService::new(state.db.clone());

        let mut new_general = GeneralSettings::default();
        new_general.language = "en".to_string();
        service.update_general_settings(&ctx, new_general).expect("update general");

        let loaded = service.get_app_settings(&ctx).expect("get after update");
        assert_eq!(loaded.general.language, "en");
    }

    #[tokio::test]
    async fn test_update_security_settings_persists_session_timeout() {
        let state = build_test_app_state().await;
        state.session_store.set(make_test_session(UserRole::Admin));
        let ctx = resolve_request_context(&state, None, &None).expect("ctx");

        let service = SettingsService::new(state.db.clone());

        let mut sec = SecuritySettings::default();
        sec.session_timeout = 120;
        service.update_security_settings(&ctx, sec).expect("update security");

        let loaded = service.get_app_settings(&ctx).expect("get after update");
        assert_eq!(loaded.security.session_timeout, 120);
    }

    // ── User settings round-trip ──────────────────────────────────────────────

    #[tokio::test]
    #[ignore = "requires seeded user in DB (FK constraint); covered in integration harness"]
    async fn test_get_user_settings_returns_defaults_on_first_call() {
        let state = build_test_app_state().await;
        state.session_store.set(make_test_session(UserRole::Admin));
        let ctx = resolve_request_context(&state, None, &None).expect("ctx");

        let service = SettingsService::new(state.db.clone());
        let result = service.get_user_settings(&ctx);
        assert!(result.is_ok(), "get_user_settings should return defaults: {:?}", result);
    }

    #[tokio::test]
    #[ignore = "requires seeded user in DB (FK constraint); covered in integration harness"]
    async fn test_update_user_profile_persists_full_name() {
        let state = build_test_app_state().await;
        state.session_store.set(make_test_session(UserRole::Admin));
        let ctx = resolve_request_context(&state, None, &None).expect("ctx");

        let service = SettingsService::new(state.db.clone());

        let mut profile = crate::domains::settings::models::UserProfileSettings::default();
        profile.full_name = "Alice Dupont".to_string();
        service.update_user_profile(&ctx, profile).expect("update profile");

        let loaded = service.get_user_settings(&ctx).expect("get after update");
        assert_eq!(loaded.profile.full_name, "Alice Dupont");
    }

    // ── Org settings ──────────────────────────────────────────────────────────

    #[tokio::test]
    async fn test_get_organization_settings_returns_ok() {
        let state = build_test_app_state().await;
        state.session_store.set(make_test_session(UserRole::Viewer));
        let ctx = resolve_request_context(&state, None, &None).expect("ctx");

        let service = SettingsService::new(state.db.clone());
        let result = service.get_organization_settings(&ctx);
        assert!(result.is_ok(), "get_organization_settings should succeed: {:?}", result);
    }

    #[tokio::test]
    async fn test_get_onboarding_status_returns_incomplete_before_onboarding() {
        let state = build_test_app_state().await;
        let service = SettingsService::new(state.db.clone());
        let status = service.get_onboarding_status().expect("get onboarding status");
        assert!(!status.completed, "Onboarding should not be complete in fresh DB");
    }
}

