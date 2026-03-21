//! Unit tests for extracted intervention sub-services.
//!
//! Validates that InterventionStepService, PhotoValidationService,
//! InterventionScoringService, and MaterialConsumptionService can be
//! constructed and that InterventionService delegates correctly.

#[cfg(test)]
mod step_service_tests {
    use crate::db::Database;
    use crate::domains::interventions::infrastructure::intervention_step_service::InterventionStepService;
    use std::sync::Arc;

    #[tokio::test]
    async fn test_step_service_construction_succeeds() {
        let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
        let service = InterventionStepService::new(db);
        // get_step on a non-existent ID should return Ok(None)
        let result = service.get_step("nonexistent-step-id");
        assert!(result.is_ok());
        assert!(result.unwrap().is_none());
    }

    #[tokio::test]
    async fn test_step_service_get_intervention_steps_empty() {
        let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
        let service = InterventionStepService::new(db);
        let result = service.get_intervention_steps("nonexistent-intervention");
        assert!(result.is_ok());
        assert!(result.unwrap().is_empty());
    }
}

#[cfg(test)]
mod photo_validation_service_tests {
    use crate::db::Database;
    use crate::domains::interventions::infrastructure::photo_validation_service::PhotoValidationService;
    use std::sync::Arc;

    #[tokio::test]
    async fn test_photo_validation_service_construction_succeeds() {
        let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
        let service = PhotoValidationService::new(db);
        let result = service.get_intervention_photos("nonexistent-intervention");
        assert!(result.is_ok());
        assert!(result.unwrap().is_empty());
    }
}

#[cfg(test)]
mod scoring_service_tests {
    use crate::db::Database;
    use crate::domains::interventions::infrastructure::intervention_scoring_service::InterventionScoringService;
    use std::sync::Arc;

    #[tokio::test]
    async fn test_scoring_service_construction_succeeds() {
        let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
        let _service = InterventionScoringService::new(db);
    }

    #[tokio::test]
    async fn test_scoring_service_get_progress_not_found() {
        let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
        let service = InterventionScoringService::new(db);
        let result = service.get_progress("nonexistent-id");
        assert!(result.is_err(), "get_progress on missing intervention should error");
    }

    #[tokio::test]
    async fn test_scoring_service_get_stats_empty_db() {
        let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
        let service = InterventionScoringService::new(db);
        let stats = service.get_stats_by_technician(None).expect("stats should work on empty db");
        assert_eq!(stats.total_interventions, 0);
        assert_eq!(stats.completed_interventions, 0);
        assert_eq!(stats.in_progress_interventions, 0);
    }
}

#[cfg(test)]
mod material_consumption_service_tests {
    use crate::db::Database;
    use crate::domains::interventions::infrastructure::material_consumption_service::MaterialConsumptionService;
    use std::sync::Arc;

    #[tokio::test]
    async fn test_material_consumption_service_construction_succeeds() {
        let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
        let _service = MaterialConsumptionService::new(db);
    }
}

#[cfg(test)]
mod delegation_tests {
    use crate::db::Database;
    use crate::domains::interventions::infrastructure::intervention::InterventionService;
    use crate::domains::interventions::infrastructure::intervention_scoring_service::InterventionScoringService;
    use crate::domains::interventions::infrastructure::intervention_step_service::InterventionStepService;
    use crate::domains::interventions::infrastructure::material_consumption_service::MaterialConsumptionService;
    use crate::domains::interventions::infrastructure::photo_validation_service::PhotoValidationService;
    use std::sync::Arc;

    #[tokio::test]
    async fn test_intervention_service_with_services_constructor() {
        let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
        let step = Arc::new(InterventionStepService::new(db.clone()));
        let photo = Arc::new(PhotoValidationService::new(db.clone()));
        let scoring = Arc::new(InterventionScoringService::new(db.clone()));
        let material = Arc::new(MaterialConsumptionService::new(db.clone()));
        let service = InterventionService::with_services(db, step, photo, scoring, material);

        // Verify delegation: step service
        let result = service.get_step("nonexistent");
        assert!(result.is_ok());
        assert!(result.unwrap().is_none());

        // Verify delegation: photo service
        let photos = service.get_intervention_photos("nonexistent");
        assert!(photos.is_ok());
        assert!(photos.unwrap().is_empty());

        // Verify delegation: scoring service
        let stats = service.get_stats_by_technician(None);
        assert!(stats.is_ok());
        assert_eq!(stats.unwrap().total_interventions, 0);
    }

    #[tokio::test]
    async fn test_intervention_service_convenience_constructor_matches_with_services() {
        let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
        let service = InterventionService::new(db);

        // Both constructors should produce equivalent behavior
        let result = service.get_step("nonexistent");
        assert!(result.is_ok());
        assert!(result.unwrap().is_none());

        let stats = service.get_stats_by_technician(None);
        assert!(stats.is_ok());
        assert_eq!(stats.unwrap().total_interventions, 0);
    }
}
