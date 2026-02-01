mod events;

use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    AppHandle, Runtime,
};

pub use events::handle_menu_event;

pub fn create_app_menu<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<Menu<R>> {
    let menu = Menu::new(app)?;

    // File Menu
    let file_menu = create_file_menu(app)?;
    menu.append(&file_menu)?;

    // Edit Menu
    let edit_menu = create_edit_menu(app)?;
    menu.append(&edit_menu)?;

    // View Menu
    let view_menu = create_view_menu(app)?;
    menu.append(&view_menu)?;

    // Navigate Menu
    let navigate_menu = create_navigate_menu(app)?;
    menu.append(&navigate_menu)?;

    // Intervention Menu
    let intervention_menu = create_intervention_menu(app)?;
    menu.append(&intervention_menu)?;

    // Tools Menu
    let tools_menu = create_tools_menu(app)?;
    menu.append(&tools_menu)?;

    // Help Menu
    let help_menu = create_help_menu(app)?;
    menu.append(&help_menu)?;

    Ok(menu)
}

fn create_file_menu<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<Submenu<R>> {
    let submenu = Submenu::new(app, "File", true)?;

    let new_task = MenuItem::with_id(app, "new_task", "New Task", true, Some("Ctrl+N"))?;
    let new_client =
        MenuItem::with_id(app, "new_client", "New Client", true, Some("Ctrl+Shift+N"))?;
    let separator = PredefinedMenuItem::separator(app)?;
    let export = MenuItem::with_id(app, "export_report", "Export Report", true, Some("Ctrl+E"))?;
    let import = MenuItem::with_id(app, "import_data", "Import Data", true, Some("Ctrl+I"))?;
    let separator2 = PredefinedMenuItem::separator(app)?;
    let preferences = MenuItem::with_id(app, "preferences", "Preferences", true, Some("Ctrl+,"))?;
    let quit = PredefinedMenuItem::quit(app, Some("Exit"))?;

    submenu.append(&new_task)?;
    submenu.append(&new_client)?;
    submenu.append(&separator)?;
    submenu.append(&export)?;
    submenu.append(&import)?;
    submenu.append(&separator2)?;
    submenu.append(&preferences)?;
    submenu.append(&quit)?;

    Ok(submenu)
}

fn create_edit_menu<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<Submenu<R>> {
    let submenu = Submenu::new(app, "Edit", true)?;

    let undo = PredefinedMenuItem::undo(app, Some("Undo"))?;
    let redo = PredefinedMenuItem::redo(app, Some("Redo"))?;
    let separator = PredefinedMenuItem::separator(app)?;
    let cut = PredefinedMenuItem::cut(app, Some("Cut"))?;
    let copy = PredefinedMenuItem::copy(app, Some("Copy"))?;
    let paste = PredefinedMenuItem::paste(app, Some("Paste"))?;

    submenu.append(&undo)?;
    submenu.append(&redo)?;
    submenu.append(&separator)?;
    submenu.append(&cut)?;
    submenu.append(&copy)?;
    submenu.append(&paste)?;

    Ok(submenu)
}

fn create_view_menu<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<Submenu<R>> {
    let submenu = Submenu::new(app, "View", true)?;

    let dashboard = MenuItem::with_id(app, "view_dashboard", "Dashboard", true, Some("Ctrl+1"))?;
    let tasks = MenuItem::with_id(app, "view_tasks", "Tasks", true, Some("Ctrl+2"))?;
    let clients = MenuItem::with_id(app, "view_clients", "Clients", true, Some("Ctrl+3"))?;
    let calendar = MenuItem::with_id(app, "view_calendar", "Calendar", true, Some("Ctrl+4"))?;
    let reports = MenuItem::with_id(app, "view_reports", "Reports", true, Some("Ctrl+5"))?;
    let separator = PredefinedMenuItem::separator(app)?;
    let refresh = MenuItem::with_id(app, "refresh", "Refresh", true, Some("Ctrl+R"))?;
    let toggle_sidebar = MenuItem::with_id(
        app,
        "toggle_sidebar",
        "Toggle Sidebar",
        true,
        Some("Ctrl+B"),
    )?;
    let toggle_fullscreen = MenuItem::with_id(
        app,
        "toggle_fullscreen",
        "Toggle Fullscreen",
        true,
        Some("F11"),
    )?;

    submenu.append(&dashboard)?;
    submenu.append(&tasks)?;
    submenu.append(&clients)?;
    submenu.append(&calendar)?;
    submenu.append(&reports)?;
    submenu.append(&separator)?;
    submenu.append(&refresh)?;
    submenu.append(&toggle_sidebar)?;
    submenu.append(&toggle_fullscreen)?;

    Ok(submenu)
}

fn create_navigate_menu<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<Submenu<R>> {
    let submenu = Submenu::new(app, "Navigate", true)?;

    let go_back = MenuItem::with_id(app, "go_back", "Go Back", true, Some("Alt+Left"))?;
    let go_forward = MenuItem::with_id(app, "go_forward", "Go Forward", true, Some("Alt+Right"))?;
    let separator = PredefinedMenuItem::separator(app)?;
    let search = MenuItem::with_id(app, "search", "Search", true, Some("Ctrl+K"))?;
    let quick_actions =
        MenuItem::with_id(app, "quick_actions", "Quick Actions", true, Some("Ctrl+P"))?;

    submenu.append(&go_back)?;
    submenu.append(&go_forward)?;
    submenu.append(&separator)?;
    submenu.append(&search)?;
    submenu.append(&quick_actions)?;

    Ok(submenu)
}

fn create_intervention_menu<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<Submenu<R>> {
    let submenu = Submenu::new(app, "Intervention", true)?;

    let start = MenuItem::with_id(
        app,
        "start_intervention",
        "Start New Intervention",
        true,
        Some("Ctrl+Shift+I"),
    )?;
    let resume = MenuItem::with_id(
        app,
        "resume_intervention",
        "Resume Intervention",
        true,
        Some("Ctrl+Shift+R"),
    )?;
    let separator = PredefinedMenuItem::separator(app)?;
    let photo = MenuItem::with_id(
        app,
        "photo_capture",
        "Photo Capture",
        true,
        Some("Ctrl+Shift+P"),
    )?;
    let material = MenuItem::with_id(
        app,
        "material_usage",
        "Material Usage",
        true,
        Some("Ctrl+Shift+M"),
    )?;
    let quality = MenuItem::with_id(
        app,
        "quality_check",
        "Quality Check",
        true,
        Some("Ctrl+Shift+Q"),
    )?;

    submenu.append(&start)?;
    submenu.append(&resume)?;
    submenu.append(&separator)?;
    submenu.append(&photo)?;
    submenu.append(&material)?;
    submenu.append(&quality)?;

    Ok(submenu)
}

fn create_tools_menu<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<Submenu<R>> {
    let submenu = Submenu::new(app, "Tools", true)?;

    let sync_now = MenuItem::with_id(app, "sync_now", "Sync Now", true, Some("Ctrl+Shift+S"))?;
    let sync_status = MenuItem::with_id(app, "sync_status", "Sync Status", true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let db_status = MenuItem::with_id(app, "db_status", "Database Status", true, None::<&str>)?;
    let vacuum_db = MenuItem::with_id(app, "vacuum_db", "Vacuum Database", true, None::<&str>)?;
    let separator2 = PredefinedMenuItem::separator(app)?;
    let dev_tools = MenuItem::with_id(app, "dev_tools", "Developer Tools", true, Some("F12"))?;

    submenu.append(&sync_now)?;
    submenu.append(&sync_status)?;
    submenu.append(&separator)?;
    submenu.append(&db_status)?;
    submenu.append(&vacuum_db)?;
    submenu.append(&separator2)?;
    submenu.append(&dev_tools)?;

    Ok(submenu)
}

fn create_help_menu<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<Submenu<R>> {
    let submenu = Submenu::new(app, "Help", true)?;

    let documentation = MenuItem::with_id(app, "documentation", "Documentation", true, Some("F1"))?;
    let keyboard_shortcuts = MenuItem::with_id(
        app,
        "keyboard_shortcuts",
        "Keyboard Shortcuts",
        true,
        Some("Ctrl+/"),
    )?;
    let separator = PredefinedMenuItem::separator(app)?;
    let check_updates = MenuItem::with_id(
        app,
        "check_updates",
        "Check for Updates",
        true,
        None::<&str>,
    )?;
    let about = MenuItem::with_id(app, "about", "About RPMA", true, None::<&str>)?;
    let report_issue = MenuItem::with_id(app, "report_issue", "Report Issue", true, None::<&str>)?;

    submenu.append(&documentation)?;
    submenu.append(&keyboard_shortcuts)?;
    submenu.append(&separator)?;
    submenu.append(&check_updates)?;
    submenu.append(&about)?;
    submenu.append(&report_issue)?;

    Ok(submenu)
}
