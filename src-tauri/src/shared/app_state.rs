//! Shared Tauri application state used across IPC entrypoints.

use crate::db::Database;
use crate::domains::inventory::InventoryFacade;
use crate::domains::clients::infrastructure::client::ClientService;
use crate::domains::settings::infrastructure::settings::SettingsService;
use crate::domains::tasks::infrastructure::task::TaskService;
use crate::domains::users::infrastructure::user::UserService;
use std::sync::{Arc, Mutex, OnceLock};
use tauri::State;

/// App state containing database and long-lived services.
pub struct AppStateType {
    pub db: Arc<Database>,
    pub async_db: Arc<crate::db::AsyncDatabase>,
    pub repositories: Arc<crate::repositories::Repositories>,
    pub task_service: Arc<TaskService>,
    pub client_service: Arc<ClientService>,
    pub task_import_service:
        Arc<crate::domains::tasks::infrastructure::task_import::TaskImportService>,
    pub dashboard_service: Arc<crate::domains::analytics::infrastructure::dashboard::DashboardService>,
    pub intervention_service: Arc<crate::domains::interventions::infrastructure::intervention::InterventionService>,
    pub material_service: Arc<crate::domains::inventory::infrastructure::material::MaterialService>,
    pub inventory_service: Arc<InventoryFacade>,
    pub message_service: Arc<crate::domains::notifications::infrastructure::message::MessageService>,
    pub photo_service: Arc<crate::domains::documents::infrastructure::photo::PhotoService>,
    pub quote_service: Arc<crate::domains::quotes::infrastructure::quote::QuoteService>,
    pub analytics_service: Arc<crate::domains::analytics::infrastructure::analytics::AnalyticsService>,
    pub auth_service: Arc<crate::domains::auth::infrastructure::auth::AuthService>,
    pub session_service: Arc<crate::domains::auth::infrastructure::session::SessionService>,
    pub two_factor_service: Arc<crate::domains::auth::infrastructure::two_factor::TwoFactorService>,
    pub settings_service: Arc<SettingsService>,
    pub user_service: Arc<UserService>,
    pub cache_service: Arc<crate::shared::services::cache::CacheService>,
    pub report_job_service: OnceLock<Arc<crate::domains::reports::infrastructure::report_jobs::ReportJobService>>,
    pub performance_monitor_service:
        Arc<crate::shared::services::performance_monitor::PerformanceMonitorService>,
    pub command_performance_tracker:
        Arc<crate::shared::services::performance_monitor::CommandPerformanceTracker>,
    pub prediction_service: Arc<crate::domains::analytics::infrastructure::prediction::PredictionService>,
    pub sync_queue: Arc<crate::domains::sync::infrastructure::sync::SyncQueue>,
    pub background_sync:
        Arc<Mutex<crate::domains::sync::infrastructure::sync::BackgroundSyncService>>,
    pub event_bus: Arc<crate::shared::services::event_bus::InMemoryEventBus>,
    pub app_data_dir: std::path::PathBuf,
}

pub type AppState<'a> = State<'a, AppStateType>;

impl AppStateType {
    pub fn report_job_service(&self) -> &Arc<crate::domains::reports::infrastructure::report_jobs::ReportJobService> {
        self.report_job_service.get_or_init(|| {
            Arc::new(crate::domains::reports::infrastructure::report_jobs::ReportJobService::new(
                self.db.clone(),
                self.cache_service.clone(),
            ))
        })
    }
}
