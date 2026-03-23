//! Backward-compatibility shim — real implementation in `crate::domains::clients::application::client_statistics_service`.
//! ClientOverviewStats and ClientActivityMetrics are re-exported via domain::models::* in the parent.
pub use crate::domains::clients::application::client_statistics_service::ClientStatisticsService;
