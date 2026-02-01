use tauri::{AppHandle, Emitter, Runtime};
use tracing::{info, warn};

pub fn handle_menu_event<R: Runtime>(app: &AppHandle<R>, event_id: &str) {
    info!("Menu event triggered: {}", event_id);

    match event_id {
        // Navigation events
        "view_dashboard" => emit_navigation(app, "dashboard"),
        "view_tasks" => emit_navigation(app, "tasks"),
        "view_clients" => emit_navigation(app, "clients"),
        "view_calendar" => emit_navigation(app, "calendar"),
        "view_reports" => emit_navigation(app, "reports"),

        // Action events
        "new_task" => emit_action(app, "new_task"),
        "new_client" => emit_action(app, "new_client"),
        "start_intervention" => emit_action(app, "start_intervention"),
        "resume_intervention" => emit_action(app, "resume_intervention"),
        "photo_capture" => emit_action(app, "photo_capture"),
        "material_usage" => emit_action(app, "material_usage"),
        "quality_check" => emit_action(app, "quality_check"),

        // Tool events
        "sync_now" => {
            if let Err(e) = trigger_sync(app) {
                warn!("Failed to trigger sync: {}", e);
            }
        }
        "sync_status" => emit_action(app, "sync_status"),
        "db_status" => emit_action(app, "db_status"),
        "vacuum_db" => emit_action(app, "vacuum_db"),
        "dev_tools" => emit_action(app, "dev_tools"),

        // Navigation actions
        "go_back" => emit_action(app, "go_back"),
        "go_forward" => emit_action(app, "go_forward"),
        "search" => emit_action(app, "search"),
        "quick_actions" => emit_action(app, "quick_actions"),

        // General actions
        "preferences" => emit_navigation(app, "settings"),
        "refresh" => emit_action(app, "refresh"),
        "toggle_sidebar" => emit_action(app, "toggle_sidebar"),
        "toggle_fullscreen" => emit_action(app, "toggle_fullscreen"),

        // Help actions
        "documentation" => emit_action(app, "documentation"),
        "keyboard_shortcuts" => emit_action(app, "keyboard_shortcuts"),
        "check_updates" => emit_action(app, "check_updates"),
        "about" => emit_action(app, "about"),
        "report_issue" => emit_action(app, "report_issue"),

        // Export/Import
        "export_report" => emit_action(app, "export_report"),
        "import_data" => emit_action(app, "import_data"),

        _ => warn!("Unhandled menu event: {}", event_id),
    }
}

fn emit_navigation<R: Runtime>(app: &AppHandle<R>, view: &str) {
    if let Err(e) = app.emit("menu-navigate", view) {
        warn!("Failed to emit navigation event: {}", e);
    }
}

fn emit_action<R: Runtime>(app: &AppHandle<R>, action: &str) {
    if let Err(e) = app.emit("menu-action", action) {
        warn!("Failed to emit action event: {}", e);
    }
}

fn trigger_sync<R: Runtime>(app: &AppHandle<R>) -> Result<(), String> {
    // Access sync service from app state
    // This integrates with your existing sync system
    // For now, just emit an action - sync logic should be handled by existing sync service
    emit_action(app, "sync_now");
    Ok(())
}
