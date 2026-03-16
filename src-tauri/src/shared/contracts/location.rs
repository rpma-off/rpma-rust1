//! Location types (GPS coordinates)

use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// GPS coordinates
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct GpsLocation {
    pub latitude: f64,
    pub longitude: f64,
    pub accuracy: Option<f64>,
}

impl GpsLocation {
    /// Create a new GpsLocation with latitude and longitude
    pub fn new(lat: f64, lon: f64) -> Self {
        Self {
            latitude: lat,
            longitude: lon,
            accuracy: None,
        }
    }

    /// Create a new GpsLocation with latitude, longitude, and accuracy
    pub fn with_accuracy(lat: f64, lon: f64, accuracy: f64) -> Self {
        Self {
            latitude: lat,
            longitude: lon,
            accuracy: Some(accuracy),
        }
    }

    /// Validate coordinates are within valid ranges
    pub fn validate(&self) -> Result<(), String> {
        if self.latitude < -90.0 || self.latitude > 90.0 {
            return Err(format!("Invalid latitude: {}", self.latitude));
        }
        if self.longitude < -180.0 || self.longitude > 180.0 {
            return Err(format!("Invalid longitude: {}", self.longitude));
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_gps_validation() {
        let valid = GpsLocation::new(48.8566, 2.3522); // Paris
        assert!(valid.validate().is_ok());

        let invalid_lat = GpsLocation::new(91.0, 2.0);
        assert!(invalid_lat.validate().is_err());

        let invalid_lon = GpsLocation::new(48.0, 181.0);
        assert!(invalid_lon.validate().is_err());
    }
}
