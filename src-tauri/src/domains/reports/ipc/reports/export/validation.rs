//! Data integrity validation for report exports
//!
//! This module provides validation functions to ensure data integrity
//! before processing reports, preventing crashes from corrupted data.

use crate::domains::reports::domain::models::reports::CompleteInterventionData;

/// CRASH PROTECTION: Validate intervention data integrity before processing
/// This prevents crashes from corrupted or invalid data
#[allow(dead_code)]
pub fn validate_intervention_data_integrity(
    intervention_data: &CompleteInterventionData,
) -> Result<(), String> {
    // Validate basic intervention fields
    if intervention_data.intervention.id.is_empty() {
        return Err("Intervention ID is empty".to_string());
    }

    if intervention_data.intervention.vehicle_plate.is_empty() {
        return Err("Vehicle plate is empty".to_string());
    }

    // Validate workflow steps
    for (index, step) in intervention_data.workflow_steps.iter().enumerate() {
        if step.step_name.is_empty() {
            return Err(format!("Workflow step {} has empty name", index));
        }

        // Check for reasonable duration values
        if let Some(duration) = step.duration_seconds {
            if duration > 86400 {
                // More than 24 hours
                return Err(format!(
                    "Workflow step {} has unreasonable duration: {} seconds",
                    index, duration
                ));
            }
        }
    }

    // Validate photos
    for (index, photo) in intervention_data.photos.iter().enumerate() {
        // Check for valid GPS coordinates if present
        if let Some(lat) = photo.gps_location_lat {
            if !(-90.0..=90.0).contains(&lat) {
                return Err(format!("Photo {} has invalid latitude: {}", index, lat));
            }
        }

        if let Some(lon) = photo.gps_location_lon {
            if !(-180.0..=180.0).contains(&lon) {
                return Err(format!("Photo {} has invalid longitude: {}", index, lon));
            }
        }

        // Check for reasonable quality scores
        if let Some(score) = photo.quality_score {
            if !(0..=100).contains(&score) {
                return Err(format!(
                    "Photo {} has invalid quality score: {}",
                    index, score
                ));
            }
        }
    }

    // Validate client data if present
    if let Some(client) = &intervention_data.client {
        if client.name.is_empty() {
            return Err("Client name is empty".to_string());
        }

        // Basic email validation
        if let Some(email) = &client.email {
            if !email.contains('@') || !email.contains('.') {
                return Err(format!("Client email appears invalid: {}", email));
            }
        }
    }

    Ok(())
}
