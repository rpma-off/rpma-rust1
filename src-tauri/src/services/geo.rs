//! Geospatial service module
//!
//! This module provides geospatial operations for location analytics,
//! including distance calculations, clustering, and geographic aggregations.

use crate::db::Database;
use chrono::{DateTime, Utc};
use geo::{point, HaversineDistance};
use serde::{Deserialize, Serialize};

/// Geographic point with metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeoPoint {
    pub latitude: f64,
    pub longitude: f64,
    pub intervention_id: String,
    pub technician_id: Option<String>,
    pub client_id: Option<String>,
    pub timestamp: DateTime<Utc>,
}

/// Geographic cluster for heat map data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeoCluster {
    pub center_lat: f64,
    pub center_lon: f64,
    pub count: u32,
    pub radius_meters: f64,
}

/// Service area coverage analysis
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeoServiceArea {
    pub center_lat: f64,
    pub center_lon: f64,
    pub coverage_radius_km: f64,
    pub intervention_count: u32,
    pub unique_clients: u32,
}

/// Geographic analytics service
pub struct GeoService;

impl GeoService {
    /// Extract GPS points from interventions within a date range
    pub async fn extract_gps_points(
        db: &Database,
        start_date: DateTime<Utc>,
        end_date: DateTime<Utc>,
    ) -> Result<Vec<GeoPoint>, String> {
        let start_timestamp = start_date.timestamp_millis();
        let end_timestamp = end_date.timestamp_millis();

        let sql = r#"
            SELECT
                id, start_location_lat, start_location_lon, end_location_lat, end_location_lon,
                technician_id, client_id, started_at, completed_at, created_at
            FROM interventions
            WHERE created_at >= ? AND created_at <= ?
                AND (start_location_lat IS NOT NULL OR end_location_lat IS NOT NULL)
        "#;

        let rows: Vec<LocationRow> = db
            .query_as(sql, rusqlite::params![start_timestamp, end_timestamp])
            .map_err(|e| format!("Failed to query GPS data: {}", e))?;

        let mut points = Vec::new();

        for row in rows {
            // Add start location if available
            if let (Some(lat), Some(lon)) = (row.start_location_lat, row.start_location_lon) {
                points.push(GeoPoint {
                    latitude: lat,
                    longitude: lon,
                    intervention_id: row.id.clone(),
                    technician_id: row.technician_id.clone(),
                    client_id: row.client_id.clone(),
                    timestamp: row
                        .started_at
                        .and_then(|ts| DateTime::from_timestamp_millis(ts))
                        .unwrap_or_else(|| Utc::now()),
                });
            }

            // Add end location if available and different from start
            if let (Some(lat), Some(lon)) = (row.end_location_lat, row.end_location_lon) {
                // Only add if different from start location
                let should_add = if let (Some(start_lat), Some(start_lon)) =
                    (row.start_location_lat, row.start_location_lon)
                {
                    (lat - start_lat).abs() > 0.0001 || (lon - start_lon).abs() > 0.0001
                } else {
                    true
                };

                if should_add {
                    points.push(GeoPoint {
                        latitude: lat,
                        longitude: lon,
                        intervention_id: row.id.clone(),
                        technician_id: row.technician_id.clone(),
                        client_id: row.client_id.clone(),
                        timestamp: row
                            .completed_at
                            .and_then(|ts| DateTime::from_timestamp_millis(ts))
                            .unwrap_or_else(|| Utc::now()),
                    });
                }
            }
        }

        Ok(points)
    }

    /// Cluster GPS points for heat map visualization
    pub fn cluster_points(points: &[GeoPoint], cluster_radius_meters: f64) -> Vec<GeoCluster> {
        let mut clusters = Vec::new();
        let mut processed = vec![false; points.len()];

        for i in 0..points.len() {
            if processed[i] {
                continue;
            }

            let center_point = point!(x: points[i].longitude, y: points[i].latitude);
            let mut cluster_points = vec![i];
            processed[i] = true;

            // Find all points within radius
            for j in (i + 1)..points.len() {
                if processed[j] {
                    continue;
                }

                let other_point = point!(x: points[j].longitude, y: points[j].latitude);
                let distance = center_point.haversine_distance(&other_point);

                if distance <= cluster_radius_meters {
                    cluster_points.push(j);
                    processed[j] = true;
                }
            }

            // Calculate cluster center
            let mut total_lat = 0.0;
            let mut total_lon = 0.0;

            for &idx in &cluster_points {
                total_lat += points[idx].latitude;
                total_lon += points[idx].longitude;
            }

            let count = cluster_points.len() as u32;
            let center_lat = total_lat / count as f64;
            let center_lon = total_lon / count as f64;

            clusters.push(GeoCluster {
                center_lat,
                center_lon,
                count,
                radius_meters: cluster_radius_meters,
            });
        }

        clusters
    }

    /// Analyze service area coverage
    pub async fn analyze_service_coverage(
        db: &Database,
        center_lat: f64,
        center_lon: f64,
        radius_km: f64,
        start_date: DateTime<Utc>,
        end_date: DateTime<Utc>,
    ) -> Result<GeoServiceArea, String> {
        let center_point = point!(x: center_lon, y: center_lat);
        let radius_meters = radius_km * 1000.0;

        let start_timestamp = start_date.timestamp_millis();
        let end_timestamp = end_date.timestamp_millis();

        let sql = r#"
            SELECT
                id, client_id, start_location_lat, start_location_lon,
                end_location_lat, end_location_lon
            FROM interventions
            WHERE created_at >= ? AND created_at <= ?
                AND (start_location_lat IS NOT NULL OR end_location_lat IS NOT NULL)
        "#;

        let rows: Vec<CoverageRow> = db
            .query_as(sql, rusqlite::params![start_timestamp, end_timestamp])
            .map_err(|e| format!("Failed to query coverage data: {}", e))?;

        let mut intervention_count = 0;
        let mut unique_clients = std::collections::HashSet::new();

        for row in rows {
            let mut point_found = false;

            // Check start location
            if let (Some(lat), Some(lon)) = (row.start_location_lat, row.start_location_lon) {
                let intervention_point = point!(x: lon, y: lat);
                if center_point.haversine_distance(&intervention_point) <= radius_meters {
                    point_found = true;
                }
            }

            // Check end location if start wasn't in range
            if !point_found {
                if let (Some(lat), Some(lon)) = (row.end_location_lat, row.end_location_lon) {
                    let intervention_point = point!(x: lon, y: lat);
                    if center_point.haversine_distance(&intervention_point) <= radius_meters {
                        point_found = true;
                    }
                }
            }

            if point_found {
                intervention_count += 1;
                if let Some(client_id) = row.client_id {
                    unique_clients.insert(client_id);
                }
            }
        }

        Ok(GeoServiceArea {
            center_lat,
            center_lon,
            coverage_radius_km: radius_km,
            intervention_count,
            unique_clients: unique_clients.len() as u32,
        })
    }

    /// Calculate distance between two GPS coordinates in kilometers
    pub fn calculate_distance(lat1: f64, lon1: f64, lat2: f64, lon2: f64) -> f64 {
        let point1 = point!(x: lon1, y: lat1);
        let point2 = point!(x: lon2, y: lat2);
        point1.haversine_distance(&point2) / 1000.0 // Convert meters to kilometers
    }

    /// Get geographic distribution statistics
    pub async fn get_geographic_stats(
        db: &Database,
        start_date: DateTime<Utc>,
        end_date: DateTime<Utc>,
    ) -> Result<GeoStats, String> {
        let points = Self::extract_gps_points(db, start_date, end_date).await?;

        if points.is_empty() {
            return Ok(GeoStats {
                total_points: 0,
                unique_locations: 0,
                average_cluster_density: 0.0,
                coverage_area_km2: 0.0,
            });
        }

        // Calculate unique locations (rounded to ~10m precision)
        let mut unique_locations = std::collections::HashSet::new();
        for point in &points {
            let lat_rounded = (point.latitude * 1000.0).round() / 1000.0;
            let lon_rounded = (point.longitude * 1000.0).round() / 1000.0;
            unique_locations.insert(format!("{:.3},{:.3}", lat_rounded, lon_rounded));
        }

        // Create clusters with 500m radius for density analysis
        let clusters = Self::cluster_points(&points, 500.0);
        let average_cluster_density = if !clusters.is_empty() {
            clusters.iter().map(|c| c.count).sum::<u32>() as f64 / clusters.len() as f64
        } else {
            0.0
        };

        // Estimate coverage area (simplified bounding box calculation)
        let mut min_lat = f64::MAX;
        let mut max_lat = f64::MIN;
        let mut min_lon = f64::MAX;
        let mut max_lon = f64::MIN;

        for point in &points {
            min_lat = min_lat.min(point.latitude);
            max_lat = max_lat.max(point.latitude);
            min_lon = min_lon.min(point.longitude);
            max_lon = max_lon.max(point.longitude);
        }

        // Rough area calculation (degrees squared, not accurate for large areas)
        let coverage_area_km2 = if min_lat != f64::MAX {
            let lat_diff = max_lat - min_lat;
            let lon_diff = max_lon - min_lon;
            // Convert to approximate km² (rough approximation)
            (lat_diff * 111.0) * (lon_diff * 111.0 * (lat_diff.cos() * lat_diff.cos()))
        } else {
            0.0
        };

        Ok(GeoStats {
            total_points: points.len() as u32,
            unique_locations: unique_locations.len() as u32,
            average_cluster_density,
            coverage_area_km2,
        })
    }
}

/// Geographic statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeoStats {
    pub total_points: u32,
    pub unique_locations: u32,
    pub average_cluster_density: f64,
    pub coverage_area_km2: f64,
}

// Internal structs for database queries
#[derive(Debug, Clone)]
struct LocationRow {
    pub id: String,
    pub start_location_lat: Option<f64>,
    pub start_location_lon: Option<f64>,
    pub end_location_lat: Option<f64>,
    pub end_location_lon: Option<f64>,
    pub technician_id: Option<String>,
    pub client_id: Option<String>,
    pub started_at: Option<i64>,
    pub completed_at: Option<i64>,
    #[allow(dead_code)]
    pub created_at: i64,
}

#[derive(Debug, Clone)]
struct CoverageRow {
    #[allow(dead_code)]
    pub id: String,
    pub client_id: Option<String>,
    pub start_location_lat: Option<f64>,
    pub start_location_lon: Option<f64>,
    pub end_location_lat: Option<f64>,
    pub end_location_lon: Option<f64>,
}

// Implement FromSqlRow for internal structs
impl crate::db::FromSqlRow for LocationRow {
    fn from_row(row: &rusqlite::Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            start_location_lat: row.get("start_location_lat")?,
            start_location_lon: row.get("start_location_lon")?,
            end_location_lat: row.get("end_location_lat")?,
            end_location_lon: row.get("end_location_lon")?,
            technician_id: row.get("technician_id")?,
            client_id: row.get("client_id")?,
            started_at: row.get("started_at")?,
            completed_at: row.get("completed_at")?,
            created_at: row.get("created_at")?,
        })
    }
}

impl crate::db::FromSqlRow for CoverageRow {
    fn from_row(row: &rusqlite::Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            client_id: row.get("client_id")?,
            start_location_lat: row.get("start_location_lat")?,
            start_location_lon: row.get("start_location_lon")?,
            end_location_lat: row.get("end_location_lat")?,
            end_location_lon: row.get("end_location_lon")?,
        })
    }
}
