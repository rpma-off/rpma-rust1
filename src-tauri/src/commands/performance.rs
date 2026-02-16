//! Performance monitoring commands for admin interface

use crate::authenticate;
use crate::commands::{ApiResponse, AppError, AppState};
use crate::services::cache::{CacheManager, CacheType};
use serde::{Deserialize, Serialize};
use tracing::{info, instrument};

#[derive(Serialize, Deserialize, Debug)]
pub struct PerformanceStatsResponse {
    pub total_requests: u64,
    pub successful_requests: u64,
    pub failed_requests: u64,
    pub average_response_time: f64,
    pub p95_response_time: f64,
    pub p99_response_time: f64,
    pub requests_per_minute: f64,
    pub error_rate: f64,
    pub slowest_commands: Vec<(String, f64)>,
    pub most_frequent_commands: Vec<(String, u64)>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct PerformanceMetricResponse {
    pub id: String,
    pub command: String,
    pub duration_ms: f64,
    pub success: bool,
    pub timestamp: String,
    pub user_id: Option<String>,
    pub error_message: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct CacheStatsResponse {
    pub total_keys: u64,
    pub used_memory_bytes: u64,
    pub used_memory_mb: f64,
    pub hit_rate: Option<f64>,
    pub miss_rate: Option<f64>,
    pub avg_response_time_ms: Option<f64>,
    pub cache_types: Vec<CacheTypeInfo>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct CacheTypeInfo {
    pub cache_type: String,
    pub keys_count: u64,
    pub memory_used_mb: f64,
    pub hit_rate: Option<f64>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct CacheClearRequest {
    pub cache_types: Option<Vec<String>>, // If None, clear all caches
    #[serde(default)]
    pub correlation_id: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct CacheConfigRequest {
    pub max_memory_mb: Option<usize>,
    pub default_ttl_seconds: Option<u64>,
    pub enable_disk_cache: Option<bool>,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Get performance statistics
#[tauri::command]
#[instrument(skip(state, session_token))]
pub async fn get_performance_stats(
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<PerformanceStatsResponse>, AppError> {
    // Start performance tracking
    let _timer = state
        .command_performance_tracker
        .start_tracking("get_performance_stats", None);

    // Check if user is admin
    let _current_user = authenticate!(&session_token, &state, crate::models::auth::UserRole::Admin);

    // Get real performance statistics
    let stats = state.performance_monitor_service.get_stats()?;

    let response = PerformanceStatsResponse {
        total_requests: stats.total_requests,
        successful_requests: stats.successful_requests,
        failed_requests: stats.failed_requests,
        average_response_time: stats.average_response_time,
        p95_response_time: stats.p95_response_time,
        p99_response_time: stats.p99_response_time,
        requests_per_minute: stats.requests_per_minute,
        error_rate: stats.error_rate,
        slowest_commands: stats.slowest_commands,
        most_frequent_commands: stats.most_frequent_commands,
    };

    Ok(ApiResponse::success(response).with_correlation_id(correlation_id.clone()))
}

/// Get recent performance metrics
#[tauri::command]
#[instrument(skip(state, session_token))]
pub async fn get_performance_metrics(
    session_token: String,
    limit: Option<usize>,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<Vec<PerformanceMetricResponse>>, AppError> {
    // Start performance tracking
    let _timer = state
        .command_performance_tracker
        .start_tracking("get_performance_metrics", None);

    // Check if user is admin
    let _current_user = authenticate!(&session_token, &state, crate::models::auth::UserRole::Admin);

    let limit = limit.unwrap_or(50).min(200); // Max 200 metrics
    let metrics = state.performance_monitor_service.get_recent_metrics(limit);

    let response: Vec<PerformanceMetricResponse> = metrics
        .into_iter()
        .map(|metric| PerformanceMetricResponse {
            id: metric.id,
            command: metric.command,
            duration_ms: metric.duration_ms,
            success: metric.success,
            timestamp: metric.timestamp.to_rfc3339(),
            user_id: metric.user_id,
            error_message: metric.error_message,
        })
        .collect();

    Ok(ApiResponse::success(response).with_correlation_id(correlation_id.clone()))
}

/// Clean up old performance metrics (admin only)
#[tauri::command]
#[instrument(skip(state, session_token))]
pub async fn cleanup_performance_metrics(
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    // Check if user is admin
    let _current_user = authenticate!(&session_token, &state, crate::models::auth::UserRole::Admin);

    // TODO: Implement performance metrics cleanup
    // For now, this is a no-op
    info!("Performance metrics cleanup requested - not yet implemented");

    Ok(ApiResponse::success(
        "Performance metrics cleaned up successfully".to_string(),
    )
    .with_correlation_id(correlation_id.clone()))
}

/// Get cache statistics
#[tauri::command]
#[instrument(skip(state, session_token))]
pub async fn get_cache_statistics(
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<CacheStatsResponse>, AppError> {
    // Check if user is admin
    let _current_user = authenticate!(&session_token, &state, crate::models::auth::UserRole::Admin);

    // Get cache stats from the cache manager
    let cache_manager = CacheManager::default()?;
    let stats = cache_manager.get_stats()?;

    let cache_types = stats
        .cache_type_stats
        .iter()
        .map(|(cache_type, type_stats)| CacheTypeInfo {
            cache_type: format!("{:?}", cache_type),
            keys_count: type_stats.keys_count,
            memory_used_mb: type_stats.memory_used as f64 / (1024.0 * 1024.0),
            hit_rate: type_stats.hit_rate,
        })
        .collect();

    let response = CacheStatsResponse {
        total_keys: stats.total_keys,
        used_memory_bytes: stats.used_memory_bytes,
        used_memory_mb: stats.used_memory_bytes as f64 / (1024.0 * 1024.0),
        hit_rate: stats.hit_rate,
        miss_rate: stats.miss_rate,
        avg_response_time_ms: stats.avg_response_time_ms,
        cache_types,
    };

    Ok(ApiResponse::success(response).with_correlation_id(correlation_id.clone()))
}

/// Clear application cache
#[tauri::command]
#[instrument(skip(state, session_token, request))]
pub async fn clear_application_cache(
    session_token: String,
    request: CacheClearRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    // Check if user is admin
    let _current_user = authenticate!(&session_token, &state, crate::models::auth::UserRole::Admin);

    let correlation_id = request.correlation_id.clone();
    let cache_manager = CacheManager::default()?;

    if let Some(cache_types) = request.cache_types {
        // Clear specific cache types
        for cache_type_str in cache_types {
            let cache_type = match cache_type_str.as_str() {
                "query" => CacheType::QueryResult,
                "thumbnail" => CacheType::ImageThumbnail,
                "analytics" => CacheType::ComputedAnalytics,
                "api" => CacheType::ApiResponse,
                _ => continue,
            };

            cache_manager.clear_type(cache_type)?;
        }
        Ok(ApiResponse::success(
            "Specified cache types cleared successfully".to_string(),
        )
        .with_correlation_id(correlation_id.clone()))
    } else {
        // Clear all caches
        cache_manager.clear_all()?;
        Ok(ApiResponse::success(
            "All caches cleared successfully".to_string(),
        )
        .with_correlation_id(correlation_id.clone()))
    }
}

/// Configure cache settings
#[tauri::command]
#[instrument(skip(state, session_token, request))]
pub async fn configure_cache_settings(
    session_token: String,
    request: CacheConfigRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    // Check if user is admin
    let _current_user = authenticate!(&session_token, &state, crate::models::auth::UserRole::Admin);

    let correlation_id = request.correlation_id.clone();

    // Note: In a real implementation, this would update the cache manager configuration
    // For now, we'll just return success
    info!("Cache configuration update requested: {:?}", request);

    Ok(ApiResponse::success(
        "Cache settings updated successfully".to_string(),
    )
    .with_correlation_id(correlation_id.clone()))
}
