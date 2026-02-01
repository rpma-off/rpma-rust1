//! Geographic report generation
//!
//! This module handles geographic distribution analytics.

use crate::commands::AppResult;
use crate::db::Database;
use crate::models::reports::*;
use crate::services::reports::validation::{validate_date_range, validate_filters};
use chrono::{DateTime, Utc};
use tracing::info;

/// Generate geographic report
#[tracing::instrument(skip(db))]
pub async fn generate_geographic_report(
    date_range: &DateRange,
    filters: &ReportFilters,
    db: &Database,
) -> AppResult<GeographicReport> {
    info!("Generating geographic report");

    // Validate inputs
    validate_date_range(date_range).map_err(crate::commands::AppError::from)?;
    validate_filters(filters).map_err(crate::commands::AppError::from)?;

    let start_date = DateTime::<Utc>::from_timestamp(date_range.start.timestamp(), 0)
        .ok_or_else(|| {
            crate::commands::AppError::Database("Invalid start date".to_string())
        })?;
    let end_date = DateTime::<Utc>::from_timestamp(date_range.end.timestamp(), 0)
        .ok_or_else(|| {
            crate::commands::AppError::Database("Invalid end date".to_string())
        })?;

    // Query geographic data from interventions with GPS coordinates
    let geo_sql = format!(
        r#"
        SELECT
            i.start_location_lat,
            i.start_location_lon,
            i.end_location_lat,
            i.end_location_lon,
            COUNT(*) as intervention_count,
            COUNT(DISTINCT i.client_id) as unique_clients
        FROM interventions i
        WHERE i.created_at >= ?1 AND i.created_at <= ?2 AND (i.start_location_lat IS NOT NULL OR i.end_location_lat IS NOT NULL)
        GROUP BY i.start_location_lat, i.start_location_lon, i.end_location_lat, i.end_location_lon
        HAVING intervention_count > 0
        ORDER BY intervention_count DESC
        LIMIT 100
        "#,
    );

    let geo_data: Vec<(Option<f64>, Option<f64>, Option<f64>, Option<f64>, i64, i64)> = db
        .query_multiple(
            &geo_sql,
            rusqlite::params![start_date.timestamp(), end_date.timestamp()],
            |row| {
                Ok((
                    row.get(0)?,
                    row.get(1)?,
                    row.get(2)?,
                    row.get(3)?,
                    row.get(4)?,
                    row.get(5)?,
                ))
            },
        )
        .unwrap_or(vec![]);

    let mut heat_map_data = Vec::new();
    let mut total_points = 0u32;
    let mut unique_locations = 0u32;

    for (start_lat, start_lon, end_lat, end_lon, intervention_count, _unique_clients) in geo_data {
        // Use start location if available, otherwise end location
        if let (Some(lat), Some(lon)) = (start_lat.or(end_lat), start_lon.or(end_lon)) {
            heat_map_data.push(HeatMapPoint {
                latitude: lat,
                longitude: lon,
                intensity: intervention_count as u32,
                intervention_count: intervention_count as u32,
            });
            total_points += intervention_count as u32;
            unique_locations += 1;
        }
    }

    // Query for geographic statistics
    let stats_sql = format!(
        r#"
        SELECT
            COUNT(*) as total_with_gps,
            COUNT(DISTINCT i.client_id) as unique_clients,
            AVG(i.start_location_lat) as avg_lat,
            AVG(i.start_location_lon) as avg_lon
        FROM interventions i
        WHERE i.created_at >= ?1 AND i.created_at <= ?2 AND i.start_location_lat IS NOT NULL AND i.start_location_lon IS NOT NULL
        "#,
    );

    let stats_result: (i64, i64, Option<f64>, Option<f64>) = db
        .query_row_tuple(
            &stats_sql,
            rusqlite::params![start_date.timestamp(), end_date.timestamp()],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
        )
        .unwrap_or((0, 0, None, None));

    let total_with_gps = stats_result.0 as u64;
    let unique_clients_with_gps = stats_result.1 as u64;

    // Calculate service areas (simplified clustering)
    let mut service_areas = Vec::new();

    if !heat_map_data.is_empty() {
        let avg_lat = stats_result.2.unwrap_or(0.0);
        let avg_lon = stats_result.3.unwrap_or(0.0);

        service_areas.push(ServiceArea {
            center_lat: avg_lat,
            center_lon: avg_lon,
            coverage_radius_km: 50.0,
            intervention_count: total_points,
            unique_clients: unique_clients_with_gps as u32,
        });
    }

    // Geographic statistics
    let average_cluster_density = if service_areas.len() > 0 {
        total_points as f64 / service_areas.len() as f64
    } else {
        0.0
    };

    let coverage_area_km2 = service_areas.len() as f64 * 314.16; // Rough estimate: π * r² * area_factor

    let geographic_stats = GeographicStats {
        total_points,
        unique_locations,
        average_cluster_density,
        coverage_area_km2,
    };

    let metadata = ReportMetadata {
        title: "Geographic Report".to_string(),
        date_range: date_range.clone(),
        filters: filters.clone(),
        generated_at: Utc::now(),
        total_records: total_with_gps,
    };

    Ok(GeographicReport {
        metadata,
        heat_map_data,
        service_areas,
        geographic_stats,
    })
}