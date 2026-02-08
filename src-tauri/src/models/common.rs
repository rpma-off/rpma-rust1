//! Common types and enums used across models

use serde::{Deserialize, Serialize};
use std::str::FromStr;
// Conditional import removed
use ts_rs::TS;

// rusqlite for database operations

/// Weather conditions for intervention
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[derive(TS)]
#[serde(rename_all = "lowercase")]
pub enum WeatherCondition {
    Sunny,
    Cloudy,
    Rainy,
    Foggy,
    Windy,
    Other,
}

impl Default for WeatherCondition {
    fn default() -> Self {
        Self::Sunny
    }
}

impl FromStr for WeatherCondition {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "sunny" => Ok(Self::Sunny),
            "cloudy" => Ok(Self::Cloudy),
            "rainy" => Ok(Self::Rainy),
            "foggy" => Ok(Self::Foggy),
            "windy" => Ok(Self::Windy),
            "other" => Ok(Self::Other),
            _ => Err(format!("Unknown weather condition: {}", s)),
        }
    }
}

impl std::fmt::Display for WeatherCondition {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = match self {
            Self::Sunny => "sunny",
            Self::Cloudy => "cloudy",
            Self::Rainy => "rainy",
            Self::Foggy => "foggy",
            Self::Windy => "windy",
            Self::Other => "other",
        };
        write!(f, "{}", s)
    }
}

/// Lighting conditions
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[derive(TS)]
#[serde(rename_all = "lowercase")]
pub enum LightingCondition {
    Natural,
    Artificial,
    Mixed,
}

impl FromStr for LightingCondition {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "natural" => Ok(Self::Natural),
            "artificial" => Ok(Self::Artificial),
            "mixed" => Ok(Self::Mixed),
            _ => Err(format!("Unknown lighting condition: {}", s)),
        }
    }
}

impl std::fmt::Display for LightingCondition {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = match self {
            Self::Natural => "natural",
            Self::Artificial => "artificial",
            Self::Mixed => "mixed",
        };
        write!(f, "{}", s)
    }
}

/// Work location type
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[derive(TS)]
#[serde(rename_all = "snake_case")]
pub enum WorkLocation {
    Indoor,
    Outdoor,
    SemiCovered,
}

impl FromStr for WorkLocation {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "indoor" => Ok(Self::Indoor),
            "outdoor" => Ok(Self::Outdoor),
            "semi_covered" | "semicovered" => Ok(Self::SemiCovered),
            _ => Err(format!("Unknown work location: {}", s)),
        }
    }
}

impl std::fmt::Display for WorkLocation {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = match self {
            Self::Indoor => "indoor",
            Self::Outdoor => "outdoor",
            Self::SemiCovered => "semi_covered",
        };
        write!(f, "{}", s)
    }
}

/// Film type for PPF
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[derive(TS)]
#[serde(rename_all = "lowercase")]
pub enum FilmType {
    Standard,
    Premium,
    Matte,
    Colored,
}

impl FromStr for FilmType {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "standard" => Ok(Self::Standard),
            "premium" => Ok(Self::Premium),
            "matte" => Ok(Self::Matte),
            "colored" => Ok(Self::Colored),
            _ => Err(format!("Unknown film type: {}", s)),
        }
    }
}

impl std::fmt::Display for FilmType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = match self {
            Self::Standard => "standard",
            Self::Premium => "premium",
            Self::Matte => "matte",
            Self::Colored => "colored",
        };
        write!(f, "{}", s)
    }
}

impl rusqlite::ToSql for FilmType {
    fn to_sql(&self) -> rusqlite::Result<rusqlite::types::ToSqlOutput<'_>> {
        Ok(self.to_string().into())
    }
}

impl rusqlite::types::FromSql for FilmType {
    fn column_result(value: rusqlite::types::ValueRef<'_>) -> rusqlite::types::FromSqlResult<Self> {
        let s = String::column_result(value)?;
        Self::from_str(&s).map_err(|_| rusqlite::types::FromSqlError::InvalidType)
    }
}

/// GPS coordinates
#[derive(Debug, Clone, Serialize, Deserialize)]
#[derive(TS)]
pub struct GpsLocation {
    pub latitude: f64,
    pub longitude: f64,
    pub accuracy: Option<f64>,
}

impl GpsLocation {
    pub fn new(lat: f64, lon: f64) -> Self {
        Self {
            latitude: lat,
            longitude: lon,
            accuracy: None,
        }
    }

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

/// Unix timestamp in milliseconds (compatible with JavaScript Date.now())
pub type Timestamp = i64;

/// Wrapper type for timestamps that serializes to ISO string
#[derive(Debug, Clone, Serialize, Deserialize)]
#[derive(TS)]
pub struct TimestampString(pub Option<i64>);

impl TimestampString {
    pub fn new(timestamp: Option<i64>) -> Self {
        Self(timestamp)
    }

    pub fn inner(&self) -> Option<i64> {
        self.0
    }

    pub fn now() -> Self {
        Self(Some(now()))
    }
}

impl From<Option<i64>> for TimestampString {
    fn from(timestamp: Option<i64>) -> Self {
        Self(timestamp)
    }
}

impl From<TimestampString> for Option<i64> {
    fn from(ts: TimestampString) -> Self {
        ts.0
    }
}

/// Helper to get current timestamp
pub fn now() -> Timestamp {
    chrono::Utc::now().timestamp_millis()
}

/// Serialize i64 timestamp to ISO string
pub fn serialize_timestamp<S>(timestamp: &i64, serializer: S) -> Result<S::Ok, S::Error>
where
    S: serde::Serializer,
{
    use chrono::{DateTime, Utc};
    match DateTime::from_timestamp(*timestamp / 1000, ((*timestamp % 1000) * 1_000_000) as u32) {
        Some(dt) => serializer.serialize_str(&dt.to_rfc3339()),
        None => serializer.serialize_str(&Utc::now().to_rfc3339()),
    }
}

/// Deserialize ISO string to i64 timestamp
pub fn deserialize_timestamp<'de, D>(deserializer: D) -> Result<i64, D::Error>
where
    D: serde::Deserializer<'de>,
{
    use chrono::{DateTime, Utc};
    let s: String = serde::Deserialize::deserialize(deserializer)?;
    match DateTime::parse_from_rfc3339(&s) {
        Ok(dt) => Ok(dt.timestamp_millis()),
        Err(_) => Ok(Utc::now().timestamp_millis()),
    }
}

/// Serialize Option<i64> timestamp to Option<String>
pub fn serialize_optional_timestamp<S>(
    timestamp: &Option<i64>,
    serializer: S,
) -> Result<S::Ok, S::Error>
where
    S: serde::Serializer,
{
    match timestamp {
        Some(ts) => serialize_timestamp(ts, serializer),
        None => serializer.serialize_none(),
    }
}

/// Deserialize Option<String> to Option<i64>
pub fn deserialize_optional_timestamp<'de, D>(deserializer: D) -> Result<Option<i64>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    use chrono::{DateTime, Utc};
    let opt: Option<String> = serde::Deserialize::deserialize(deserializer)?;
    match opt {
        Some(s) => match DateTime::parse_from_rfc3339(&s) {
            Ok(dt) => Ok(Some(dt.timestamp_millis())),
            Err(_) => Ok(Some(Utc::now().timestamp_millis())),
        },
        None => Ok(None),
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

    #[test]
    fn test_serde_weather() {
        let weather = WeatherCondition::Sunny;
        let json = serde_json::to_string(&weather).expect("Failed to serialize WeatherCondition");
        assert_eq!(json, r#""sunny""#);

        let deserialized: WeatherCondition =
            serde_json::from_str(&json).expect("Failed to deserialize WeatherCondition");
        assert_eq!(deserialized, weather);
    }
}
