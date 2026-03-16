//! Intervention-specific enumeration types
//!
//! This module contains enums that are specific to the intervention workflow
//! (weather, lighting, work location, film type).

use serde::{Deserialize, Serialize};
use std::str::FromStr;
use ts_rs::TS;

/// Weather conditions for intervention
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, TS)]
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
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, TS)]
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
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, TS)]
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
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, TS)]
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

#[cfg(test)]
mod tests {
    use super::*;

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
