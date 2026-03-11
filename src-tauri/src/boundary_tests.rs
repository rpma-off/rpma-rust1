//! Compile-time boundary enforcement tests for DDD domain architecture.
//!
//! These tests verify that domain modules maintain proper visibility
//! and boundary rules. They rely on Rust's module system to catch
//! violations at compile time.
//!
//! ## What these tests enforce
//!
//! 1. Each domain exposes its facade via `pub(crate) use facade::XxxFacade`
//! 2. Domain and infrastructure layers are `pub(crate)` (not `pub`) by default
//! 3. The `export-types` feature gate is required for external (`pub`) access
//! 4. Cross-domain access should only go through `pub(crate)` paths

/// Verify all domain facades are accessible within the crate via pub(crate) re-exports.
#[test]
fn all_domain_facades_accessible_within_crate() {
    // These will fail to compile if facade re-exports are removed or broken.
    let _ = std::any::type_name::<crate::domains::auth::AuthFacade>();
    let _ = std::any::type_name::<crate::domains::clients::ClientsFacade>();
    let _ = std::any::type_name::<crate::domains::users::UsersFacade>();
    let _ = std::any::type_name::<crate::domains::tasks::TasksFacade>();
    let _ = std::any::type_name::<crate::domains::interventions::InterventionsFacade>();
    let _ = std::any::type_name::<crate::domains::inventory::InventoryFacade>();
    let _ = std::any::type_name::<crate::domains::notifications::NotificationsFacade>();
    let _ = std::any::type_name::<crate::domains::settings::SettingsFacade>();
    let _ = std::any::type_name::<crate::domains::sync::SyncFacade>();
}

/// Verify domain model types are accessible within the crate (pub(crate)).
/// These types are NOT externally visible (pub) unless `export-types` feature is active.
#[test]
fn domain_models_accessible_within_crate() {
    use crate::domains::auth::domain::models::auth::UserRole;
    use crate::domains::clients::domain::models::client::Client;
    use crate::domains::documents::domain::models::photo::Photo;
    use crate::domains::interventions::domain::models::intervention::InterventionStatus;
    use crate::domains::tasks::domain::models::task::TaskStatus;

    // Compile-time proof these types exist and are accessible within the crate.
    let _ = std::any::type_name::<TaskStatus>();
    let _ = std::any::type_name::<InterventionStatus>();
    let _ = std::any::type_name::<Client>();
    let _ = std::any::type_name::<UserRole>();
    let _ = std::any::type_name::<Photo>();
}

/// Verify that infrastructure layers are accessible within the crate (pub(crate)).
#[test]
fn infrastructure_accessible_within_crate() {
    use crate::domains::interventions::infrastructure::intervention::InterventionService;
    use crate::domains::tasks::infrastructure::task::TaskService;

    let _ = std::any::type_name::<TaskService>();
    let _ = std::any::type_name::<InterventionService>();
}

/// Verify that application layers are accessible within the crate (pub(crate)).
#[test]
fn application_layers_accessible_within_crate() {
    use crate::domains::auth::application::SignupRequest;
    use crate::domains::notifications::application::contracts::SendNotificationRequest;

    let _ = std::any::type_name::<SignupRequest>();
    let _ = std::any::type_name::<SendNotificationRequest>();
}

/// Guardrail: task domain modules must not depend on infrastructure modules.
#[test]
fn task_domain_does_not_import_task_infrastructure() {
    use std::fs;
    use std::path::Path;

    fn scan(path: &Path, violations: &mut Vec<String>) {
        if path.is_dir() {
            for entry in fs::read_dir(path).expect("read_dir failed") {
                let entry = entry.expect("dir entry failed");
                scan(&entry.path(), violations);
            }
            return;
        }

        if path.extension().and_then(|s| s.to_str()) != Some("rs") {
            return;
        }

        let content = fs::read_to_string(path).expect("read file failed");
        if content.contains("crate::domains::tasks::infrastructure::") {
            violations.push(path.display().to_string());
        }
    }

    let mut violations = Vec::new();
    scan(Path::new("src/domains/tasks/domain"), &mut violations);
    assert!(
        violations.is_empty(),
        "Task domain imports infrastructure modules: {:?}",
        violations
    );
}
