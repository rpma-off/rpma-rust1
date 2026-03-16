//! Timestamp utilities and serialization helpers

use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// Unix timestamp in milliseconds (compatible with JavaScript Date.now())
pub type Timestamp = i64;

/// Wrapper type for timestamps that serializes to ISO string
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct TimestampString(pub Option<i64>);

impl TimestampString {
    /// Create a new TimestampString
    pub fn new(timestamp: Option<i64>) -> Self {
        Self(timestamp)
    }

    /// Get the inner timestamp value
    pub fn inner(&self) -> Option<i64> {
        self.0
    }

    /// Create a TimestampString with the current time
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
