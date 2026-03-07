//! GPS coordinate and accuracy validators for PPF interventions.

use super::ValidationError;

impl super::ValidationService {
    /// Validate GPS coordinates
    pub fn validate_gps_coordinates(&self, lat: f64, lon: f64) -> Result<(), ValidationError> {
        if !(-90.0..=90.0).contains(&lat) {
            return Err(ValidationError::InvalidGPSCoordinates(format!(
                "Latitude {} is out of valid range (-90 to 90)",
                lat
            )));
        }

        if !(-180.0..=180.0).contains(&lon) {
            return Err(ValidationError::InvalidGPSCoordinates(format!(
                "Longitude {} is out of valid range (-180 to 180)",
                lon
            )));
        }

        Ok(())
    }

    /// Validate GPS accuracy for PPF work
    pub fn validate_gps_accuracy(
        &self,
        accuracy: f64,
        required_accuracy: Option<f64>,
    ) -> Result<(), ValidationError> {
        let min_accuracy = required_accuracy.unwrap_or(100.0); // Default 100m for PPF work

        if accuracy > min_accuracy {
            return Err(ValidationError::GPSAccuracyTooLow {
                accuracy,
                required: min_accuracy,
            });
        }

        Ok(())
    }

    /// Validate GPS data freshness
    pub fn validate_gps_freshness(
        &self,
        timestamp_ms: i64,
        max_age_seconds: Option<i64>,
    ) -> Result<(), ValidationError> {
        let max_age = max_age_seconds.unwrap_or(300); // Default 5 minutes
        let now = chrono::Utc::now().timestamp_millis();
        let age_seconds = (now - timestamp_ms) / 1000;

        if age_seconds > max_age {
            return Err(ValidationError::GPSDataTooOld {
                age_seconds,
                max_age,
            });
        }

        Ok(())
    }

    /// Comprehensive GPS validation for PPF interventions
    pub fn validate_gps_for_ppf(
        &self,
        lat: Option<f64>,
        lon: Option<f64>,
        accuracy: Option<f64>,
        timestamp_ms: Option<i64>,
    ) -> Result<(), ValidationError> {
        // Check if coordinates are provided
        let (lat, lon) = match (lat, lon) {
            (Some(lat), Some(lon)) => (lat, lon),
            _ => return Ok(()), // Optional for PPF work
        };

        // Validate coordinate ranges
        self.validate_gps_coordinates(lat, lon)?;

        // Validate accuracy if provided
        if let Some(acc) = accuracy {
            // For PPF work, we require at least 100m accuracy
            self.validate_gps_accuracy(acc, Some(100.0))?;
        }

        // Validate freshness if timestamp provided
        if let Some(ts) = timestamp_ms {
            self.validate_gps_freshness(ts, Some(600))?; // 10 minutes for PPF work
        }

        Ok(())
    }
}
