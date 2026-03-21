//! Photo Validation Service (Group D — Photo Validation)
//!
//! Extracted from `InterventionService` to provide a focused interface
//! for photo-related operations: querying and validating intervention photos.
//!
//! The underlying business rules remain in the domain layer;
//! this service only *coordinates* them.

use crate::db::Database;
use crate::db::InterventionResult;
use crate::domains::interventions::infrastructure::intervention_data::InterventionDataService;
use crate::domains::interventions::infrastructure::intervention_types::InterventionPhoto;
use std::sync::Arc;

/// Service responsible for intervention photo validation and queries.
#[derive(Debug)]
pub struct PhotoValidationService {
    data: InterventionDataService,
}

impl PhotoValidationService {
    /// Create a new photo validation service from a database handle.
    pub fn new(db: Arc<Database>) -> Self {
        Self {
            data: InterventionDataService::new(db),
        }
    }

    /// Get all photos for an intervention.
    pub fn get_intervention_photos(
        &self,
        intervention_id: &str,
    ) -> InterventionResult<Vec<InterventionPhoto>> {
        self.data.get_intervention_photos(intervention_id)
    }
}
