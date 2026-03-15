//! Shared Tauri application state used across IPC entrypoints.

use crate::db::Database;
use crate::domains::clients::client_handler::ClientService;
use crate::domains::inventory::InventoryFacade;
use crate::domains::tasks::infrastructure::task::TaskService;
use crate::domains::users::infrastructure::user::UserService;
use crate::infrastructure::auth::session_store::SessionStore;
use std::sync::Arc;
use tauri::State;

/// App state containing database and long-lived services.
pub struct AppStateType {
    pub db: Arc<Database>,
    pub async_db: Arc<crate::db::AsyncDatabase>,
    pub repositories: Arc<crate::shared::repositories::Repositories>,
    pub task_service: Arc<TaskService>,
    pub client_service: Arc<ClientService>,
    pub task_import_service:
        Arc<crate::domains::tasks::infrastructure::task_import::TaskImportService>,
    pub calendar_service: Arc<crate::domains::calendar::calendar_handler::CalendarService>,
    pub intervention_service:
        Arc<crate::domains::interventions::infrastructure::intervention::InterventionService>,
    pub material_service: Arc<crate::domains::inventory::infrastructure::material::MaterialService>,
    pub inventory_service: Arc<InventoryFacade>,
    pub message_service: Arc<crate::domains::notifications::MessageService>,
    pub photo_service: Arc<crate::domains::documents::PhotoService>,
    pub quote_service: Arc<crate::domains::quotes::infrastructure::quote::QuoteService>,
    pub auth_service: Arc<crate::domains::auth::infrastructure::auth::AuthService>,
    pub session_service: Arc<crate::domains::auth::infrastructure::session::SessionService>,
    pub session_store: Arc<SessionStore>,
    pub settings_repository: Arc<crate::domains::settings::SettingsRepository>,
    pub user_settings_repository: Arc<crate::domains::settings::UserSettingsRepository>,
    pub user_service: Arc<UserService>,
    pub cache_service: Arc<crate::shared::services::cache::CacheService>,
    pub event_bus: Arc<crate::shared::services::event_bus::InMemoryEventBus>,
    pub app_data_dir: std::path::PathBuf,
    pub trash_service: Arc<crate::domains::trash::application::services::trash_service::TrashService>,
}

pub type AppState<'a> = State<'a, AppStateType>;
