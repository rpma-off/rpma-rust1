//! Integration tests for IPC command availability and basic functionality
//!
//! These tests ensure that IPC commands are properly registered and can be called
//! without runtime errors.

use rpma_ppf_intervention::commands;
use rpma_ppf_intervention::db::Database;
use rpma_ppf_intervention::models::auth::UserRole;
use rpma_ppf_intervention::services::auth::AuthService;
use std::sync::{Arc, Mutex};
use tauri::test::{mock_context, MockRuntime};
use tauri::{App, Manager};

#[cfg(test)]
mod tests {
    use super::*;

    fn setup_test_app() -> App<MockRuntime> {
        let app = tauri::test::mock_app();
        app
    }

    fn setup_test_db_and_user() -> (Database, String) {
        let temp_file = tempfile::NamedTempFile::new().unwrap();
        let db = Database::new(temp_file.path()).unwrap();
        db.init().unwrap();

        let auth_service = AuthService::new(db.clone());
        let user = auth_service
            .create_account(
                "test@example.com",
                "testuser",
                "Test",
                "User",
                UserRole::Admin,
                "password123",
            )
            .unwrap();

        let session_token = auth_service
            .create_session(&user.user_id, "127.0.0.1".to_string())
            .unwrap();

        (db, session_token)
    }

    #[test]
    fn test_health_check_command_available() {
        let app = setup_test_app();

        // Test that health check command is registered and callable
        let result = app.invoke_handler(
            tauri::generate_handler![commands::health_check],
            "health_check",
            serde_json::Value::Null,
        );
        assert!(result.is_ok(), "Health check command should be available");
    }

    #[test]
    fn test_database_status_command_available() {
        let app = setup_test_app();

        // Test that database status command is registered
        let result = app.invoke_handler(
            tauri::generate_handler![commands::get_database_status],
            "get_database_status",
            serde_json::Value::Null,
        );
        assert!(
            result.is_ok(),
            "Database status command should be available"
        );
    }

    #[test]
    fn test_user_crud_commands_available() {
        let app = setup_test_app();

        // Test that user CRUD commands are registered
        let commands = vec![
            "get_users",
            "create_user",
            "update_user",
            "update_user_status",
            "delete_user",
        ];

        for command in commands {
            let result = app.invoke_handler(
                tauri::generate_handler![
                    commands::get_users,
                    commands::create_user,
                    commands::update_user,
                    commands::update_user_status,
                    commands::delete_user
                ],
                command,
                serde_json::Value::Null,
            );
            assert!(
                result.is_ok(),
                "User command '{}' should be available",
                command
            );
        }
    }

    #[test]
    fn test_intervention_commands_available() {
        let app = setup_test_app();

        // Test that intervention commands are registered
        let commands = vec![
            "intervention_workflow",
            "intervention_progress",
            "intervention_management",
            "intervention_start",
            "intervention_get",
            "intervention_get_active_by_task",
            "intervention_get_latest_by_task",
            "intervention_update",
            "intervention_delete",
            "intervention_finalize",
            "intervention_advance_step",
            "intervention_save_step_progress",
            "intervention_get_progress",
            "intervention_get_step",
        ];

        for command in commands {
            let result = app.invoke_handler(
                tauri::generate_handler![
                    commands::intervention_workflow,
                    commands::intervention_progress,
                    commands::intervention_management,
                    commands::intervention_start,
                    commands::intervention_get,
                    commands::intervention_get_active_by_task,
                    commands::intervention_get_latest_by_task,
                    commands::intervention_update,
                    commands::intervention_delete,
                    commands::intervention_finalize,
                    commands::intervention_advance_step,
                    commands::intervention_save_step_progress,
                    commands::intervention_get_progress,
                    commands::intervention_get_step
                ],
                command,
                serde_json::Value::Null,
            );
            assert!(
                result.is_ok(),
                "Intervention command '{}' should be available",
                command
            );
        }
    }

    #[test]
    fn test_report_commands_available() {
        let app = setup_test_app();

        // Test that report commands are registered
        let commands = vec![
            "get_task_completion_report",
            "get_technician_performance_report",
            "get_client_analytics_report",
            "get_quality_compliance_report",
            "get_material_usage_report",
            "get_geographic_report",
            "get_seasonal_report",
            "get_operational_intelligence_report",
            "get_overview_report",
            "export_report_data",
            "get_available_report_types",
            "get_report_status",
            "cancel_report",
        ];

        for command in commands {
            let result = app.invoke_handler(
                tauri::generate_handler![
                    commands::get_task_completion_report,
                    commands::get_technician_performance_report,
                    commands::get_client_analytics_report,
                    commands::get_quality_compliance_report,
                    commands::get_material_usage_report,
                    commands::get_geographic_report,
                    commands::get_seasonal_report,
                    commands::get_operational_intelligence_report,
                    commands::get_overview_report,
                    commands::export_report_data,
                    commands::get_available_report_types,
                    commands::get_report_status,
                    commands::cancel_report
                ],
                command,
                serde_json::Value::Null,
            );
            assert!(
                result.is_ok(),
                "Report command '{}' should be available",
                command
            );
        }
    }

    #[test]
    fn test_task_commands_available() {
        let app = setup_test_app();

        // Test that task commands are registered
        let commands = vec!["task_crud", "edit_task", "add_task_note"];

        for command in commands {
            let result = app.invoke_handler(
                tauri::generate_handler![
                    commands::task::task_crud,
                    commands::task::edit_task,
                    commands::task::add_task_note
                ],
                command,
                serde_json::Value::Null,
            );
            assert!(
                result.is_ok(),
                "Task command '{}' should be available",
                command
            );
        }
    }

    #[test]
    fn test_client_commands_available() {
        let app = setup_test_app();

        // Test that client commands are registered
        let result = app.invoke_handler(
            tauri::generate_handler![commands::client::client_crud],
            "client_crud",
            serde_json::Value::Null,
        );
        assert!(result.is_ok(), "Client CRUD command should be available");
    }

    #[test]
    fn test_photo_commands_available() {
        let app = setup_test_app();

        // Test that photo commands are registered
        let commands = vec!["photo_crud", "store_photo_with_data"];

        for command in commands {
            let result = app.invoke_handler(
                tauri::generate_handler![
                    commands::photo::photo_crud,
                    commands::photo::store_photo_with_data
                ],
                command,
                serde_json::Value::Null,
            );
            assert!(
                result.is_ok(),
                "Photo command '{}' should be available",
                command
            );
        }
    }
}
