//! Shared Tauri application state used across IPC entrypoints.

use crate::db::Database;
use crate::domains::inventory::InventoryFacade;
use crate::services::{ClientService, SettingsService, TaskService};
use std::sync::{Arc, Mutex, OnceLock};
use tauri::State;

/// App state containing database and long-lived services.
pub struct AppStateType {
    pub db: Arc<Database>,
    pub async_db: Arc<crate::db::AsyncDatabase>,
    pub repositories: Arc<crate::repositories::Repositories>,
    pub task_service: Arc<TaskService>,
    pub client_service: Arc<ClientService>,
    pub task_import_service: Arc<crate::services::task_import::TaskImportService>,
    pub dashboard_service: Arc<crate::services::DashboardService>,
    pub intervention_service: Arc<crate::services::InterventionService>,
    pub material_service: Arc<crate::services::MaterialService>,
    pub inventory_service: Arc<InventoryFacade>,
    pub message_service: Arc<crate::services::MessageService>,
    pub photo_service: Arc<crate::services::PhotoService>,
    pub quote_service: Arc<crate::services::QuoteService>,
    pub analytics_service: Arc<crate::services::AnalyticsService>,
    pub auth_service: Arc<crate::services::auth::AuthService>,
    pub session_service: Arc<crate::services::session::SessionService>,
    pub two_factor_service: Arc<crate::services::two_factor::TwoFactorService>,
    pub settings_service: Arc<SettingsService>,
    pub cache_service: Arc<crate::services::cache::CacheService>,
    pub report_job_service: OnceLock<Arc<crate::services::report_jobs::ReportJobService>>,
    pub performance_monitor_service:
        Arc<crate::services::performance_monitor::PerformanceMonitorService>,
    pub command_performance_tracker:
        Arc<crate::services::performance_monitor::CommandPerformanceTracker>,
    pub prediction_service: Arc<crate::services::prediction::PredictionService>,
    pub sync_queue: Arc<crate::sync::SyncQueue>,
    pub background_sync: Arc<Mutex<crate::sync::BackgroundSyncService>>,
    pub event_bus: Arc<crate::services::event_bus::InMemoryEventBus>,
    pub app_data_dir: std::path::PathBuf,
}

pub type AppState<'a> = State<'a, AppStateType>;

impl AppStateType {
    pub fn report_job_service(&self) -> &Arc<crate::services::report_jobs::ReportJobService> {
        self.report_job_service.get_or_init(|| {
            Arc::new(crate::services::report_jobs::ReportJobService::new(
                self.db.clone(),
                self.cache_service.clone(),
            ))
        })
    }
}
