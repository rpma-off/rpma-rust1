use std::sync::Arc;

use crate::domains::analytics::infrastructure::analytics::AnalyticsService;
use crate::domains::analytics::infrastructure::dashboard::DashboardService;
use crate::shared::ipc::errors::AppError;

/// Facade for the Analytics bounded context.
///
/// Provides a unified entry point for analytics and dashboard operations,
/// handling input validation and error mapping.
#[derive(Debug)]
pub struct AnalyticsFacade {
    analytics_service: Arc<AnalyticsService>,
    dashboard_service: Arc<DashboardService>,
}

impl AnalyticsFacade {
    pub fn new(
        analytics_service: Arc<AnalyticsService>,
        dashboard_service: Arc<DashboardService>,
    ) -> Self {
        Self {
            analytics_service,
            dashboard_service,
        }
    }

    pub fn is_ready(&self) -> bool {
        true
    }

    /// Access the underlying analytics service.
    pub fn analytics_service(&self) -> &Arc<AnalyticsService> {
        &self.analytics_service
    }

    /// Access the underlying dashboard service.
    pub fn dashboard_service(&self) -> &Arc<DashboardService> {
        &self.dashboard_service
    }

    /// Map a raw analytics error into a structured AppError.
    pub fn map_analytics_error(&self, context: &str, error: &str) -> AppError {
        AppError::Internal(format!("Analytics error in {}: {}", context, error))
    }
}
