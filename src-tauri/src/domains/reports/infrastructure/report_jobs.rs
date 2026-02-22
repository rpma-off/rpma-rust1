//! Background job processing for report generation
//!
//! This service handles asynchronous report generation for heavy reports
//! that would otherwise block the UI.

use crate::commands::AppError;
use crate::db::Database;
use crate::domains::reports::domain::models::reports::*;
use crate::shared::services::cache::CacheService;
use chrono::{Datelike, Utc};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::Mutex;
use tracing::{error, info};
use uuid::Uuid;

/// Report job status
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum ReportJobStatus {
    Pending,
    Processing,
    Completed,
    Failed,
}

/// Report job definition
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ReportJob {
    pub id: String,
    pub report_type: ReportType,
    pub date_range: DateRange,
    pub filters: ReportFilters,
    pub status: ReportJobStatus,
    pub created_at: chrono::DateTime<Utc>,
    pub started_at: Option<chrono::DateTime<Utc>>,
    pub completed_at: Option<chrono::DateTime<Utc>>,
    pub progress: f64,
    pub error_message: Option<String>,
}

/// Background report processing service
#[derive(Debug)]
pub struct ReportJobService {
    db: Arc<Database>,
    cache: Arc<CacheService>,
    active_jobs: Arc<Mutex<HashMap<String, tokio::task::JoinHandle<()>>>>,
}

impl ReportJobService {
    /// Create a new report job service
    pub fn new(db: Arc<Database>, cache: Arc<CacheService>) -> Self {
        Self {
            db,
            cache,
            active_jobs: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Submit a report generation job
    pub async fn submit_job(
        &self,
        report_type: ReportType,
        date_range: DateRange,
        filters: ReportFilters,
    ) -> Result<String, AppError> {
        let job_id = Uuid::new_v4().to_string();

        let job = ReportJob {
            id: job_id.clone(),
            report_type: report_type.clone(),
            date_range,
            filters,
            status: ReportJobStatus::Pending,
            created_at: Utc::now(),
            started_at: None,
            completed_at: None,
            progress: 0.0,
            error_message: None,
        };

        // Store job in cache for status tracking
        let cache_key = format!("report_job:{}", job_id);
        self.cache.set(
            crate::shared::services::cache::CacheType::ApiResponse,
            &cache_key,
            &job,
            Some(Duration::from_secs(24 * 3600)),
        )?;

        // Start background processing
        let db_clone = self.db.clone();
        let cache_clone = self.cache.clone();
        let job_clone = job.clone();

        let handle = tokio::spawn(async move {
            Self::process_job(job_clone, db_clone, cache_clone).await;
        });

        // Track the active job
        let mut active_jobs = self.active_jobs.lock().await;
        active_jobs.insert(job_id.clone(), handle);

        info!(
            "Submitted report job: {} for type {:?}",
            job_id, report_type
        );
        Ok(job_id)
    }

    /// Get job status
    pub async fn get_job_status(&self, job_id: &str) -> Result<Option<ReportJob>, AppError> {
        let cache_key = format!("report_job:{}", job_id);
        self.cache
            .get::<ReportJob>(crate::shared::services::cache::CacheType::ApiResponse, &cache_key)
    }

    /// Cancel a job
    pub async fn cancel_job(&self, job_id: &str) -> Result<bool, AppError> {
        let mut active_jobs = self.active_jobs.lock().await;

        if let Some(handle) = active_jobs.remove(job_id) {
            handle.abort();
            info!("Cancelled report job: {}", job_id);

            // Update job status in cache
            let cache_key = format!("report_job:{}", job_id);
            if let Ok(Some(mut job)) = self
                .cache
                .get::<ReportJob>(crate::shared::services::cache::CacheType::ApiResponse, &cache_key)
            {
                job.status = ReportJobStatus::Failed;
                job.error_message = Some("Job cancelled by user".to_string());
                job.completed_at = Some(Utc::now());
                let _ = self.cache.set(
                    crate::shared::services::cache::CacheType::ApiResponse,
                    &cache_key,
                    &job,
                    Some(Duration::from_secs(24 * 3600)),
                );
            }

            Ok(true)
        } else {
            Ok(false)
        }
    }

    /// Process a report job
    async fn process_job(job: ReportJob, db: Arc<Database>, cache: Arc<CacheService>) {
        let job_id = job.id.clone();
        let cache_key = format!("report_job:{}", job_id);

        // Update job status to processing
        let mut updated_job = job.clone();
        updated_job.status = ReportJobStatus::Processing;
        updated_job.started_at = Some(Utc::now());
        updated_job.progress = 10.0;

        if let Err(e) = cache.set_with_ttl(&cache_key, &updated_job, Duration::from_secs(24 * 3600))
        {
            error!("Failed to update job status: {}", e);
            return;
        }

        info!("Started processing report job: {}", job_id);

        // Generate the report based on type
        let result = match job.report_type {
            ReportType::Tasks => {
                Self::generate_task_report(job.date_range, job.filters, &db, &cache, &job_id).await
            }
            ReportType::Technicians => {
                Self::generate_technician_report(job.date_range, &db, &cache, &job_id).await
            }
            ReportType::Clients => {
                Self::generate_client_report(job.date_range, job.filters, &db, &cache, &job_id)
                    .await
            }
            ReportType::Quality => {
                Self::generate_quality_report(job.date_range, job.filters, &db, &cache, &job_id)
                    .await
            }
            ReportType::Materials => {
                Self::generate_material_report(job.date_range, job.filters, &db, &cache, &job_id)
                    .await
            }
            ReportType::Geographic => {
                Self::generate_geographic_report(job.date_range, job.filters, &db, &cache, &job_id)
                    .await
            }
            ReportType::Seasonal => {
                Self::generate_seasonal_report(job.date_range, job.filters, &db, &cache, &job_id)
                    .await
            }
            ReportType::Overview => {
                Self::generate_overview_report(job.date_range, job.filters, &db, &cache, &job_id)
                    .await
            }
            ReportType::OperationalIntelligence => {
                Self::generate_operational_intelligence_report(
                    job.date_range,
                    job.filters,
                    &db,
                    &cache,
                    &job_id,
                )
                .await
            }
            ReportType::DataExplorer => {
                // Data Explorer doesn't use background job processing
                Err(crate::commands::errors::AppError::Validation(
                    "Data Explorer reports are processed interactively, not as background jobs"
                        .to_string(),
                ))
            }
        };

        // Update final job status
        let mut final_job = updated_job;
        final_job.completed_at = Some(Utc::now());
        final_job.progress = 100.0;

        match result {
            Ok(_) => {
                final_job.status = ReportJobStatus::Completed;
                info!("Completed report job: {}", job_id);
            }
            Err(e) => {
                final_job.status = ReportJobStatus::Failed;
                final_job.error_message = Some(e.to_string());
                error!("Failed report job {}: {}", job_id, e);
            }
        }

        if let Err(e) = cache.set_with_ttl(&cache_key, &final_job, Duration::from_secs(24 * 3600)) {
            error!("Failed to update final job status: {}", e);
        }
    }

    // Report generation methods (simplified versions that update progress)
    async fn generate_task_report(
        date_range: DateRange,
        filters: ReportFilters,
        db: &Database,
        cache: &CacheService,
        job_id: &str,
    ) -> Result<(), AppError> {
        // Import the function from services
        use crate::domains::reports::infrastructure::reports::task_report::generate_task_completion_report;

        let report = generate_task_completion_report(&date_range, &filters, db).await?;

        // Cache the result
        let report_cache_key = format!("report:task_completion:{}", job_id);
        cache.set(
            crate::shared::services::cache::CacheType::ComputedAnalytics,
            &report_cache_key,
            &report,
            None,
        )?;

        Ok(())
    }

    async fn generate_technician_report(
        date_range: DateRange,
        db: &Database,
        cache: &CacheService,
        job_id: &str,
    ) -> Result<(), AppError> {
        use crate::domains::reports::infrastructure::reports::technician_report::generate_technician_performance_report;

        let report = generate_technician_performance_report(&date_range, None, db).await?;

        let report_cache_key = format!("report:technician_performance:{}", job_id);
        cache.set(
            crate::shared::services::cache::CacheType::ComputedAnalytics,
            &report_cache_key,
            &report,
            None,
        )?;

        Ok(())
    }

    async fn generate_client_report(
        date_range: DateRange,
        filters: ReportFilters,
        db: &Database,
        cache: &CacheService,
        job_id: &str,
    ) -> Result<(), AppError> {
        use crate::domains::reports::infrastructure::reports::client_report::generate_client_analytics_report;

        let report = generate_client_analytics_report(&date_range, &filters, db).await?;

        let report_cache_key = format!("report:client_analytics:{}", job_id);
        cache.set(
            crate::shared::services::cache::CacheType::ComputedAnalytics,
            &report_cache_key,
            &report,
            None,
        )?;

        Ok(())
    }

    async fn generate_quality_report(
        date_range: DateRange,
        filters: ReportFilters,
        db: &Database,
        cache: &CacheService,
        job_id: &str,
    ) -> Result<(), AppError> {
        use crate::domains::reports::infrastructure::reports::quality_report::generate_quality_compliance_report;

        let report = generate_quality_compliance_report(&date_range, &filters, db).await?;

        let report_cache_key = format!("report:quality_compliance:{}", job_id);
        cache.set(
            crate::shared::services::cache::CacheType::ComputedAnalytics,
            &report_cache_key,
            &report,
            None,
        )?;

        Ok(())
    }

    async fn generate_material_report(
        date_range: DateRange,
        filters: ReportFilters,
        db: &Database,
        cache: &CacheService,
        job_id: &str,
    ) -> Result<(), AppError> {
        use crate::domains::reports::infrastructure::reports::material_report::generate_material_usage_report;

        let report = generate_material_usage_report(&date_range, &filters, db).await?;

        let report_cache_key = format!("report:material_usage:{}", job_id);
        cache.set(
            crate::shared::services::cache::CacheType::ComputedAnalytics,
            &report_cache_key,
            &report,
            None,
        )?;

        Ok(())
    }

    async fn generate_geographic_report(
        date_range: DateRange,
        filters: ReportFilters,
        db: &Database,
        cache: &CacheService,
        job_id: &str,
    ) -> Result<(), AppError> {
        use crate::domains::reports::infrastructure::reports::geographic_report::generate_geographic_report;

        let report = generate_geographic_report(&date_range, &filters, db).await?;

        let report_cache_key = format!("report:geographic:{}", job_id);
        cache.set(
            crate::shared::services::cache::CacheType::ComputedAnalytics,
            &report_cache_key,
            &report,
            None,
        )?;

        Ok(())
    }

    async fn generate_seasonal_report(
        date_range: DateRange,
        _filters: ReportFilters,
        db: &Database,
        cache: &CacheService,
        job_id: &str,
    ) -> Result<(), AppError> {
        use crate::domains::reports::infrastructure::reports::seasonal_report::generate_seasonal_report;

        let year = date_range.start.year() as i32;
        let report = generate_seasonal_report(year, db).await?;

        let report_cache_key = format!("report:seasonal:{}", job_id);
        cache.set(
            crate::shared::services::cache::CacheType::ComputedAnalytics,
            &report_cache_key,
            &report,
            None,
        )?;

        Ok(())
    }

    async fn generate_overview_report(
        date_range: DateRange,
        filters: ReportFilters,
        db: &Database,
        cache: &CacheService,
        job_id: &str,
    ) -> Result<(), AppError> {
        // Generate all individual reports
        let _task_completion =
            Self::generate_task_report(date_range.clone(), filters.clone(), db, cache, job_id)
                .await?;
        let _technician_performance =
            Self::generate_technician_report(date_range.clone(), db, cache, job_id).await?;
        let _client_analytics =
            Self::generate_client_report(date_range.clone(), filters.clone(), db, cache, job_id)
                .await?;
        let _quality_compliance =
            Self::generate_quality_report(date_range.clone(), filters.clone(), db, cache, job_id)
                .await?;
        let _material_usage =
            Self::generate_material_report(date_range.clone(), filters.clone(), db, cache, job_id)
                .await?;
        let _geographic = Self::generate_geographic_report(
            date_range.clone(),
            filters.clone(),
            db,
            cache,
            job_id,
        )
        .await?;
        let _seasonal =
            Self::generate_seasonal_report(date_range.clone(), filters.clone(), db, cache, job_id)
                .await?;
        let _operational_intelligence = Self::generate_operational_intelligence_report(
            date_range.clone(),
            filters.clone(),
            db,
            cache,
            job_id,
        )
        .await?;

        // Note: This is simplified - in practice we'd need to retrieve the actual report data
        // For now, this just ensures all components are generated
        let _report_cache_key = format!("report:overview:{}", job_id);
        // cache.set(&report_cache_key, &overview_report)?;

        Ok(())
    }

    async fn generate_operational_intelligence_report(
        date_range: DateRange,
        filters: ReportFilters,
        db: &Database,
        cache: &CacheService,
        job_id: &str,
    ) -> Result<(), AppError> {
        use crate::domains::reports::infrastructure::operational_intelligence::OperationalIntelligenceService;

        let service = OperationalIntelligenceService::new(db.clone().into());
        let report = service.generate_operational_report(&date_range, &filters)?;

        let report_cache_key = format!("report:operational_intelligence:{}", job_id);
        cache.set(
            crate::shared::services::cache::CacheType::ComputedAnalytics,
            &report_cache_key,
            &report,
            None,
        )?;

        Ok(())
    }

    /// Clean up completed jobs older than specified duration
    pub async fn cleanup_old_jobs(&self, _max_age: Duration) -> Result<usize, AppError> {
        // This would need to be implemented with a proper job storage system
        // For now, just return 0
        Ok(0)
    }
}
