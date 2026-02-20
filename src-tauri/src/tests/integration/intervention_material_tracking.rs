//! Integration tests for Intervention -> Material Tracking workflow
//!
//! This module tests how interventions track material usage, waste, costs,
//! and batch/expiry information during PPF installation processes.

use crate::commands::AppResult;
use crate::domains::tasks::infrastructure::task_crud::TaskCrudService;
use crate::models::material::{InventoryTransactionType, Material, MaterialType, UnitOfMeasure};
use crate::services::intervention_types::{
    AdvanceStepRequest, FinalizeInterventionRequest, StartInterventionRequest,
};
use crate::services::intervention_workflow::InterventionWorkflowService;
use crate::services::material::{
    CreateInventoryTransactionRequest, CreateMaterialRequest, MaterialService,
    RecordConsumptionRequest, UpdateStockRequest,
};
use crate::test_task;
use crate::test_utils::TestDatabase;
use chrono::{DateTime, TimeZone, Utc};
use serde_json::json;
use std::sync::Arc;
use uuid::Uuid;

/// Test fixture for intervention-material tracking integration tests
pub struct InterventionMaterialTrackingTestFixture {
    pub db: TestDatabase,
    pub task_service: TaskCrudService,
    pub material_service: MaterialService,
    pub intervention_service: InterventionWorkflowService,
}

impl InterventionMaterialTrackingTestFixture {
    /// Create a new test fixture with all required services
    pub fn new() -> AppResult<Self> {
        let db = TestDatabase::new().expect("Failed to create test database");
        let task_service = TaskCrudService::new(db.db());
        let material_service = MaterialService::new(db.db());
        let intervention_service = InterventionWorkflowService::new(db.db());

        Ok(InterventionMaterialTrackingTestFixture {
            db,
            task_service,
            material_service,
            intervention_service,
        })
    }

    /// Create materials with batch numbers and expiry dates for tracking
    pub fn create_materials_with_tracking(&self) -> AppResult<(Material, Material, Material)> {
        // Create PPF film with batch and expiry
        let film_request = CreateMaterialRequest {
            sku: "TRACK-FILM-001".to_string(),
            name: "Premium PPF Film".to_string(),
            description: Some("High quality PPF film with batch tracking".to_string()),
            material_type: MaterialType::PpfFilm,
            category: Some("Films".to_string()),
            subcategory: None,
            category_id: None,
            brand: Some("PremiumFilm".to_string()),
            model: Some("PF-100".to_string()),
            specifications: Some(json!({"thickness": "8mil", "gloss": "high"})),
            unit_of_measure: UnitOfMeasure::Meter,
            minimum_stock: Some(10.0),
            maximum_stock: Some(100.0),
            reorder_point: Some(20.0),
            unit_cost: Some(25.50),
            currency: Some("EUR".to_string()),
            supplier_id: None,
            supplier_name: Some("Film Supplier".to_string()),
            supplier_sku: Some("SUP-PF-001".to_string()),
            quality_grade: Some("A+".to_string()),
            certification: Some("ISO-9001".to_string()),
            expiry_date: Some(Utc.with_ymd_and_hms(2025, 12, 31, 0, 0, 0).unwrap()),
            batch_number: Some("BATCH-FILM-2024-001".to_string()),
            storage_location: Some("Cool Storage".to_string()),
            warehouse_id: Some("WH-001".to_string()),
        };

        let film = self
            .material_service
            .create_material(film_request, Some("test_user".to_string()))?;

        // Create adhesive with batch and expiry
        let adhesive_request = CreateMaterialRequest {
            sku: "TRACK-ADH-001".to_string(),
            name: "PPF Adhesive".to_string(),
            description: Some("Professional PPF adhesive with batch tracking".to_string()),
            material_type: MaterialType::Adhesive,
            category: Some("Adhesives".to_string()),
            subcategory: None,
            category_id: None,
            brand: Some("AdhesivePro".to_string()),
            model: Some("AP-200".to_string()),
            specifications: Some(json!({"viscosity": "medium", "cure_time": "24h"})),
            unit_of_measure: UnitOfMeasure::Liter,
            minimum_stock: Some(5.0),
            maximum_stock: Some(50.0),
            reorder_point: Some(10.0),
            unit_cost: Some(45.75),
            currency: Some("EUR".to_string()),
            supplier_id: None,
            supplier_name: Some("Adhesive Supplier".to_string()),
            supplier_sku: Some("SUP-ADH-001".to_string()),
            quality_grade: Some("A".to_string()),
            certification: Some("ISO-9001".to_string()),
            expiry_date: Some(Utc.with_ymd_and_hms(2025, 8, 15, 0, 0, 0).unwrap()),
            batch_number: Some("BATCH-ADH-2024-001".to_string()),
            storage_location: Some("Temperature Controlled".to_string()),
            warehouse_id: Some("WH-001".to_string()),
        };

        let adhesive = self
            .material_service
            .create_material(adhesive_request, Some("test_user".to_string()))?;

        // Create cleaning solution with batch and expiry
        let cleaner_request = CreateMaterialRequest {
            sku: "TRACK-CLN-001".to_string(),
            name: "Surface Cleaner".to_string(),
            description: Some("Surface preparation cleaner".to_string()),
            material_type: MaterialType::CleaningSolution,
            category: Some("Cleaning".to_string()),
            subcategory: None,
            category_id: None,
            brand: Some("CleanPro".to_string()),
            model: Some("CP-300".to_string()),
            specifications: Some(json!({"ph": "neutral", "evaporation": "fast"})),
            unit_of_measure: UnitOfMeasure::Liter,
            minimum_stock: Some(2.0),
            maximum_stock: Some(20.0),
            reorder_point: Some(5.0),
            unit_cost: Some(12.30),
            currency: Some("EUR".to_string()),
            supplier_id: None,
            supplier_name: Some("Clean Supplier".to_string()),
            supplier_sku: Some("SUP-CLN-001".to_string()),
            quality_grade: Some("B+".to_string()),
            certification: None,
            expiry_date: Some(Utc.with_ymd_and_hms(2025, 10, 30, 0, 0, 0).unwrap()),
            batch_number: Some("BATCH-CLN-2024-001".to_string()),
            storage_location: Some("Standard Storage".to_string()),
            warehouse_id: Some("WH-002".to_string()),
        };

        let cleaner = self
            .material_service
            .create_material(cleaner_request, Some("test_user".to_string()))?;

        // Add initial stock to all materials
        for material in [&film, &adhesive, &cleaner] {
            let update_request = UpdateStockRequest {
                material_id: material.id.clone().unwrap(),
                quantity_change: 50.0,
                reason: "Initial stock for tracking test".to_string(),
                recorded_by: Some("test_user".to_string()),
            };
            self.material_service.update_stock(update_request)?;
        }

        Ok((film, adhesive, cleaner))
    }

    /// Create a task for material tracking testing
    pub fn create_tracking_test_task(&self, title: &str) -> AppResult<crate::models::task::Task> {
        let task_request = test_task!(
            title: title.to_string(),
            vehicle_plate: Some("TRACK001".to_string()),
            status: "pending".to_string(),
            notes: Some("Task for material tracking integration test".to_string())
        );

        self.task_service
            .create_task_async(task_request, "test_user")
            .await
    }

    /// Start an intervention for material tracking
    pub fn start_tracking_intervention(
        &self,
        task: &crate::models::task::Task,
    ) -> AppResult<crate::models::intervention::Intervention> {
        let intervention_request = StartInterventionRequest {
            task_id: task.id.clone(),
            intervention_number: None,
            ppf_zones: vec![
                "hood".to_string(),
                "fender".to_string(),
                "mirrors".to_string(),
            ],
            custom_zones: None,
            film_type: "premium".to_string(),
            film_brand: Some("PremiumFilm".to_string()),
            film_model: Some("PF-100".to_string()),
            weather_condition: "clear".to_string(),
            lighting_condition: "good".to_string(),
            work_location: "shop".to_string(),
            temperature: Some(22.5),
            humidity: Some(45.0),
            technician_id: "test_technician".to_string(),
            assistant_ids: Some(vec!["assistant_001".to_string()]),
            scheduled_start: Utc::now().to_rfc3339(),
            estimated_duration: 180,
            gps_coordinates: Some((48.8566, 2.3522)), // Paris coordinates
            address: Some("123 Test Street, Test City".to_string()),
            notes: Some("Material tracking test intervention".to_string()),
            customer_requirements: Some(vec!["High quality finish".to_string()]),
            special_instructions: Some("Use batch BATCH-FILM-2024-001 for hood".to_string()),
        };

        let response = self.intervention_service.start_intervention(
            intervention_request,
            "test_user",
            "tracking-test-correlation-id",
        )?;

        self.intervention_service
            .get_intervention_by_id(&response.intervention_id)
    }

    /// Record material usage during intervention steps with photos
    pub async fn record_material_usage_with_photos(
        &self,
        intervention: &crate::models::intervention::Intervention,
        film: &Material,
        adhesive: &Material,
        cleaner: &Material,
    ) -> AppResult<()> {
        // Step 1: Surface preparation with cleaner
        let prep_step = &intervention.steps[0];

        // Start the step
        let start_request = AdvanceStepRequest {
            intervention_id: intervention.id.clone(),
            step_id: prep_step.id.clone(),
            collected_data: json!({}),
            photos: None,
            notes: Some("Starting surface preparation".to_string()),
            quality_check_passed: true,
            issues: None,
        };

        self.intervention_service
            .advance_step(start_request, "tracking-test", Some("test_technician"))
            .await?;

        // Record cleaner usage
        let cleaner_consumption = RecordConsumptionRequest {
            intervention_id: intervention.id.clone(),
            material_id: cleaner.id.clone().unwrap(),
            step_id: Some(prep_step.id.clone()),
            step_number: Some(1),
            quantity_used: 0.5,
            waste_quantity: Some(0.1),
            waste_reason: Some("Evaporation during application".to_string()),
            batch_used: Some("BATCH-CLN-2024-001".to_string()),
            quality_notes: Some("Surface properly cleaned".to_string()),
            recorded_by: Some("test_technician".to_string()),
        };

        self.material_service
            .record_consumption(cleaner_consumption)?;

        // Complete the step with photos
        let complete_prep_request = AdvanceStepRequest {
            intervention_id: intervention.id.clone(),
            step_id: prep_step.id.clone(),
            collected_data: json!({"surface_condition": "clean"}),
            photos: Some(vec![
                "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=".to_string()
            ]),
            notes: Some("Surface preparation completed".to_string()),
            quality_check_passed: true,
            issues: None,
        };

        self.intervention_service
            .advance_step(
                complete_prep_request,
                "tracking-test",
                Some("test_technician"),
            )
            .await?;

        // Step 2: Film application
        let film_step = &intervention.steps[1];

        // Start the step
        let start_film_request = AdvanceStepRequest {
            intervention_id: intervention.id.clone(),
            step_id: film_step.id.clone(),
            collected_data: json!({}),
            photos: None,
            notes: Some("Starting film application".to_string()),
            quality_check_passed: true,
            issues: None,
        };

        self.intervention_service
            .advance_step(start_film_request, "tracking-test", Some("test_technician"))
            .await?;

        // Record film usage with special batch as per instructions
        let film_consumption = RecordConsumptionRequest {
            intervention_id: intervention.id.clone(),
            material_id: film.id.clone().unwrap(),
            step_id: Some(film_step.id.clone()),
            step_number: Some(2),
            quantity_used: 3.5,
            waste_quantity: Some(0.7),
            waste_reason: Some("Hood curve trimming and pattern adjustment".to_string()),
            batch_used: Some("BATCH-FILM-2024-001".to_string()),
            quality_notes: Some("Premium batch used for hood as requested".to_string()),
            recorded_by: Some("test_technician".to_string()),
        };

        self.material_service.record_consumption(film_consumption)?;

        // Complete the step with photos
        let complete_film_request = AdvanceStepRequest {
            intervention_id: intervention.id.clone(),
            step_id: film_step.id.clone(),
            collected_data: json!({"film_type": "premium", "coverage": "full"}),
            photos: Some(vec![
                "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=".to_string(),
                "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=".to_string()
            ]),
            notes: Some("Film application completed with excellent adhesion".to_string()),
            quality_check_passed: true,
            issues: None,
        };

        self.intervention_service
            .advance_step(
                complete_film_request,
                "tracking-test",
                Some("test_technician"),
            )
            .await?;

        // Step 3: Final sealing with adhesive
        let seal_step = &intervention.steps[2];

        // Start the step
        let start_seal_request = AdvanceStepRequest {
            intervention_id: intervention.id.clone(),
            step_id: seal_step.id.clone(),
            collected_data: json!({}),
            photos: None,
            notes: Some("Starting final sealing".to_string()),
            quality_check_passed: true,
            issues: None,
        };

        self.intervention_service
            .advance_step(start_seal_request, "tracking-test", Some("test_technician"))
            .await?;

        // Record adhesive usage
        let adhesive_consumption = RecordConsumptionRequest {
            intervention_id: intervention.id.clone(),
            material_id: adhesive.id.clone().unwrap(),
            step_id: Some(seal_step.id.clone()),
            step_number: Some(3),
            quantity_used: 0.2,
            waste_quantity: Some(0.02),
            waste_reason: Some("Edge application waste".to_string()),
            batch_used: Some("BATCH-ADH-2024-001".to_string()),
            quality_notes: Some("Adhesive applied evenly".to_string()),
            recorded_by: Some("test_technician".to_string()),
        };

        self.material_service
            .record_consumption(adhesive_consumption)?;

        // Complete the step with photos
        let complete_seal_request = AdvanceStepRequest {
            intervention_id: intervention.id.clone(),
            step_id: seal_step.id.clone(),
            collected_data: json!({"seal_quality": "excellent"}),
            photos: Some(vec![
                "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=".to_string()
            ]),
            notes: Some("Final sealing completed".to_string()),
            quality_check_passed: true,
            issues: None,
        };

        self.intervention_service
            .advance_step(
                complete_seal_request,
                "tracking-test",
                Some("test_technician"),
            )
            .await?;

        Ok(())
    }

    /// Get material consumption history for an intervention
    pub fn get_consumption_history(
        &self,
        intervention_id: &str,
    ) -> AppResult<Vec<crate::models::material::MaterialConsumption>> {
        Ok(self
            .material_service
            .get_intervention_consumption(intervention_id)?)
    }

    /// Get material consumption summary for an intervention
    pub fn get_consumption_summary(
        &self,
        intervention_id: &str,
    ) -> AppResult<crate::models::material::InterventionMaterialSummary> {
        Ok(self
            .material_service
            .get_intervention_material_summary(intervention_id)?)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_materials_used_during_intervention_steps_are_tracked() -> AppResult<()> {
        let fixture = InterventionMaterialTrackingTestFixture::new();

        // Create materials with tracking information
        let (film, adhesive, cleaner) = fixture.create_materials_with_tracking()?;

        // Create task and intervention
        let task = fixture.create_tracking_test_task("Material tracking test")?;
        let intervention = fixture.start_tracking_intervention(&task)?;

        // Record material usage during intervention
        fixture
            .record_material_usage_with_photos(&intervention, &film, &adhesive, &cleaner)
            .await?;

        // Get consumption history
        let consumptions = fixture.get_consumption_history(&intervention.id)?;

        // Verify all materials were tracked
        assert_eq!(consumptions.len(), 3); // One for each material

        // Verify cleaner usage
        let cleaner_consumption = consumptions
            .iter()
            .find(|c| c.material_id == cleaner.id.unwrap())
            .unwrap();
        assert_eq!(cleaner_consumption.quantity_used, 0.5);
        assert_eq!(cleaner_consumption.waste_quantity, 0.1);
        assert_eq!(
            cleaner_consumption.batch_used,
            Some("BATCH-CLN-2024-001".to_string())
        );
        assert_eq!(cleaner_consumption.step_number, Some(1));

        // Verify film usage
        let film_consumption = consumptions
            .iter()
            .find(|c| c.material_id == film.id.unwrap())
            .unwrap();
        assert_eq!(film_consumption.quantity_used, 3.5);
        assert_eq!(film_consumption.waste_quantity, 0.7);
        assert_eq!(
            film_consumption.batch_used,
            Some("BATCH-FILM-2024-001".to_string())
        );
        assert_eq!(film_consumption.step_number, Some(2));
        assert_eq!(
            film_consumption.quality_notes,
            Some("Premium batch used for hood as requested".to_string())
        );

        // Verify adhesive usage
        let adhesive_consumption = consumptions
            .iter()
            .find(|c| c.material_id == adhesive.id.unwrap())
            .unwrap();
        assert_eq!(adhesive_consumption.quantity_used, 0.2);
        assert_eq!(adhesive_consumption.waste_quantity, 0.02);
        assert_eq!(
            adhesive_consumption.batch_used,
            Some("BATCH-ADH-2024-001".to_string())
        );
        assert_eq!(adhesive_consumption.step_number, Some(3));

        Ok(())
    }

    #[tokio::test]
    async fn test_material_waste_is_properly_recorded() -> AppResult<()> {
        let fixture = InterventionMaterialTrackingTestFixture::new();

        // Create materials
        let (film, _, _) = fixture.create_materials_with_tracking()?;

        // Create task and intervention
        let task = fixture.create_tracking_test_task("Waste tracking test")?;
        let intervention = fixture.start_tracking_intervention(&task)?;

        // Record material consumption with various waste scenarios
        let consumption_request = RecordConsumptionRequest {
            intervention_id: intervention.id.clone(),
            material_id: film.id.clone().unwrap(),
            step_id: Some(intervention.steps[0].id.clone()),
            step_number: Some(1),
            quantity_used: 5.0,
            waste_quantity: Some(1.2),
            waste_reason: Some("Complex pattern trimming and adjustments".to_string()),
            batch_used: Some("BATCH-FILM-2024-001".to_string()),
            quality_notes: Some("High waste due to complex vehicle shape".to_string()),
            recorded_by: Some("test_technician".to_string()),
        };

        let consumption = fixture
            .material_service
            .record_consumption(consumption_request)?;

        // Verify waste details are properly recorded
        assert_eq!(consumption.waste_quantity, 1.2);
        assert_eq!(
            consumption.waste_reason,
            Some("Complex pattern trimming and adjustments".to_string())
        );

        // Verify stock was updated including waste
        let updated_film = fixture
            .material_service
            .get_material_by_id(&film.id.clone().unwrap())?;
        assert_eq!(updated_film.current_stock, 50.0 - 5.0 - 1.2); // Initial stock - used - waste

        // Get consumption history and verify waste tracking
        let consumptions = fixture.get_consumption_history(&intervention.id)?;
        let film_consumption = consumptions
            .iter()
            .find(|c| c.material_id == film.id.unwrap())
            .unwrap();
        assert_eq!(film_consumption.waste_quantity, 1.2);
        assert_eq!(
            film_consumption.waste_reason,
            Some("Complex pattern trimming and adjustments".to_string())
        );

        // Verify waste percentage calculation
        let waste_percentage = (film_consumption.waste_quantity
            / (film_consumption.quantity_used + film_consumption.waste_quantity))
            * 100.0;
        assert!(waste_percentage > 15.0); // Should be around 19.4%

        Ok(())
    }

    #[tokio::test]
    async fn test_intervention_completion_calculates_total_material_costs() -> AppResult<()> {
        let fixture = InterventionMaterialTrackingTestFixture::new();

        // Create materials with known costs
        let (film, adhesive, cleaner) = fixture.create_materials_with_tracking()?;

        // Create task and intervention
        let task = fixture.create_tracking_test_task("Cost calculation test")?;
        let intervention = fixture.start_tracking_intervention(&task)?;

        // Record material usage
        fixture
            .record_material_usage_with_photos(&intervention, &film, &adhesive, &cleaner)
            .await?;

        // Complete the intervention
        let finalize_request = FinalizeInterventionRequest {
            intervention_id: intervention.id.clone(),
            collected_data: Some(json!({"duration": 180})),
            photos: None,
            customer_satisfaction: Some(9),
            quality_score: Some(95),
            final_observations: Some(vec![
                "High quality installation with premium materials".to_string()
            ]),
            customer_signature: None,
            customer_comments: None,
        };

        fixture
            .intervention_service
            .finalize_intervention(finalize_request, "cost-test", Some("test_technician"))
            .await?;

        // Get consumption summary
        let summary = fixture.get_consumption_summary(&intervention.id)?;

        // Verify total materials used
        assert_eq!(summary.total_materials_used, 3);

        // Verify total cost calculation
        let expected_film_cost = 3.5 * film.unit_cost.unwrap(); // 3.5 * 25.50 = 89.25
        let expected_adhesive_cost = 0.2 * adhesive.unit_cost.unwrap(); // 0.2 * 45.75 = 9.15
        let expected_cleaner_cost = 0.5 * cleaner.unit_cost.unwrap(); // 0.5 * 12.30 = 6.15
        let expected_total_cost =
            expected_film_cost + expected_adhesive_cost + expected_cleaner_cost;

        assert!((summary.total_cost - expected_total_cost).abs() < 0.01);

        // Verify individual material costs
        let film_summary = summary
            .materials
            .iter()
            .find(|m| m.material_id == film.id.unwrap())
            .unwrap();
        assert!((film_summary.total_cost.unwrap() - expected_film_cost).abs() < 0.01);

        let adhesive_summary = summary
            .materials
            .iter()
            .find(|m| m.material_id == adhesive.id.unwrap())
            .unwrap();
        assert!((adhesive_summary.total_cost.unwrap() - expected_adhesive_cost).abs() < 0.01);

        let cleaner_summary = summary
            .materials
            .iter()
            .find(|m| m.material_id == cleaner.id.unwrap())
            .unwrap();
        assert!((cleaner_summary.total_cost.unwrap() - expected_cleaner_cost).abs() < 0.01);

        // Get updated intervention to verify cost tracking
        let updated_intervention = fixture
            .intervention_service
            .get_intervention_by_id(&intervention.id)?;
        // Note: The intervention model would need to have material_cost field for this assertion
        // assert_eq!(updated_intervention.material_cost, Some(expected_total_cost));

        Ok(())
    }

    #[tokio::test]
    async fn test_photos_attached_to_intervention_steps_with_material_usage() -> AppResult<()> {
        let fixture = InterventionMaterialTrackingTestFixture::new();

        // Create materials
        let (film, _, _) = fixture.create_materials_with_tracking()?;

        // Create task and intervention
        let task = fixture.create_tracking_test_task("Photo tracking test")?;
        let intervention = fixture.start_tracking_intervention(&task)?;

        // Start first step and record material usage
        let step = &intervention.steps[0];

        let start_request = AdvanceStepRequest {
            intervention_id: intervention.id.clone(),
            step_id: step.id.clone(),
            collected_data: json!({}),
            photos: None,
            notes: Some("Starting step with photos".to_string()),
            quality_check_passed: true,
            issues: None,
        };

        fixture
            .intervention_service
            .advance_step(start_request, "photo-test", Some("test_technician"))
            .await?;

        // Record material consumption
        let consumption_request = RecordConsumptionRequest {
            intervention_id: intervention.id.clone(),
            material_id: film.id.clone().unwrap(),
            step_id: Some(step.id.clone()),
            step_number: Some(1),
            quantity_used: 2.0,
            waste_quantity: Some(0.3),
            waste_reason: Some("Test waste".to_string()),
            batch_used: Some("BATCH-FILM-2024-001".to_string()),
            quality_notes: Some("Test quality".to_string()),
            recorded_by: Some("test_technician".to_string()),
        };

        fixture
            .material_service
            .record_consumption(consumption_request)?;

        // Complete step with photos
        let photo_urls = vec![
            "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=".to_string(),
            "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=".to_string(),
        ];

        let complete_request = AdvanceStepRequest {
            intervention_id: intervention.id.clone(),
            step_id: step.id.clone(),
            collected_data: json!({"photos_attached": photo_urls.len()}),
            photos: Some(photo_urls),
            notes: Some("Step completed with material usage and photos".to_string()),
            quality_check_passed: true,
            issues: None,
        };

        let updated_step = fixture
            .intervention_service
            .advance_step(complete_request, "photo-test", Some("test_technician"))
            .await?;

        // Verify photos were attached to the step
        assert!(updated_step.photos.is_some());
        assert_eq!(updated_step.photos.as_ref().unwrap().len(), 2);

        // Verify material consumption is associated with the step
        let consumptions = fixture.get_consumption_history(&intervention.id)?;
        let film_consumption = consumptions
            .iter()
            .find(|c| c.material_id == film.id.unwrap())
            .unwrap();
        assert_eq!(film_consumption.step_id, Some(step.id.clone()));
        assert_eq!(film_consumption.step_number, Some(1));

        // Get the updated intervention to verify the step has both photos and material usage
        let updated_intervention = fixture
            .intervention_service
            .get_intervention_by_id(&intervention.id)?;
        let updated_step_in_intervention = updated_intervention
            .steps
            .iter()
            .find(|s| s.id == step.id)
            .unwrap();
        assert!(updated_step_in_intervention.photos.is_some());
        assert!(!updated_step_in_intervention
            .photos
            .as_ref()
            .unwrap()
            .is_empty());

        Ok(())
    }

    #[tokio::test]
    async fn test_batch_and_expiry_tracking_for_materials_used() -> AppResult<()> {
        let fixture = InterventionMaterialTrackingTestFixture::new();

        // Create materials with batch and expiry information
        let (film, adhesive, _) = fixture.create_materials_with_tracking()?;

        // Create task and intervention
        let task = fixture.create_tracking_test_task("Batch and expiry tracking test")?;
        let intervention = fixture.start_tracking_intervention(&task)?;

        // Start step
        let step = &intervention.steps[0];

        let start_request = AdvanceStepRequest {
            intervention_id: intervention.id.clone(),
            step_id: step.id.clone(),
            collected_data: json!({}),
            photos: None,
            notes: Some("Starting batch/expiry test".to_string()),
            quality_check_passed: true,
            issues: None,
        };

        fixture
            .intervention_service
            .advance_step(start_request, "batch-expiry-test", Some("test_technician"))
            .await?;

        // Record film consumption with batch tracking
        let film_consumption_request = RecordConsumptionRequest {
            intervention_id: intervention.id.clone(),
            material_id: film.id.clone().unwrap(),
            step_id: Some(step.id.clone()),
            step_number: Some(1),
            quantity_used: 3.0,
            waste_quantity: Some(0.5),
            waste_reason: Some("Batch tracking test".to_string()),
            batch_used: Some("BATCH-FILM-2024-001".to_string()),
            quality_notes: Some("Using specific batch as per requirements".to_string()),
            recorded_by: Some("test_technician".to_string()),
        };

        let film_consumption = fixture
            .material_service
            .record_consumption(film_consumption_request)?;

        // Record adhesive consumption with expiry tracking
        let adhesive_consumption_request = RecordConsumptionRequest {
            intervention_id: intervention.id.clone(),
            material_id: adhesive.id.clone().unwrap(),
            step_id: Some(step.id.clone()),
            step_number: Some(2),
            quantity_used: 0.15,
            waste_quantity: Some(0.01),
            waste_reason: Some("Expiry tracking test".to_string()),
            batch_used: Some("BATCH-ADH-2024-001".to_string()),
            quality_notes: Some("Checking expiry before use".to_string()),
            recorded_by: Some("test_technician".to_string()),
        };

        let adhesive_consumption = fixture
            .material_service
            .record_consumption(adhesive_consumption_request)?;

        // Verify batch tracking for film
        assert_eq!(
            film_consumption.batch_used,
            Some("BATCH-FILM-2024-001".to_string())
        );
        assert_eq!(film_consumption.quantity_used, 3.0);
        assert_eq!(film_consumption.waste_quantity, 0.5);

        // Verify batch tracking for adhesive
        assert_eq!(
            adhesive_consumption.batch_used,
            Some("BATCH-ADH-2024-001".to_string())
        );
        assert_eq!(adhesive_consumption.quantity_used, 0.15);
        assert_eq!(adhesive_consumption.waste_quantity, 0.01);

        // Get consumption history to verify batch/expiry details
        let consumptions = fixture.get_consumption_history(&intervention.id)?;

        // Verify film consumption details
        let film_history = consumptions
            .iter()
            .find(|c| c.material_id == film.id.unwrap())
            .unwrap();
        assert_eq!(
            film_history.batch_used,
            Some("BATCH-FILM-2024-001".to_string())
        );

        // Verify adhesive consumption details
        let adhesive_history = consumptions
            .iter()
            .find(|c| c.material_id == adhesive.id.unwrap())
            .unwrap();
        assert_eq!(
            adhesive_history.batch_used,
            Some("BATCH-ADH-2024-001".to_string())
        );

        // Verify that we can trace back to the material's batch and expiry information
        let film_material = fixture
            .material_service
            .get_material_by_id(&film.id.unwrap())?;
        assert_eq!(
            film_material.batch_number,
            Some("BATCH-FILM-2024-001".to_string())
        );
        assert!(film_material.expiry_date.is_some());

        let adhesive_material = fixture
            .material_service
            .get_material_by_id(&adhesive.id.unwrap())?;
        assert_eq!(
            adhesive_material.batch_number,
            Some("BATCH-ADH-2024-001".to_string())
        );
        assert!(adhesive_material.expiry_date.is_some());

        // Complete the step
        let complete_request = AdvanceStepRequest {
            intervention_id: intervention.id.clone(),
            step_id: step.id.clone(),
            collected_data: json!({
                "batch_verified": true,
                "expiry_checked": true
            }),
            photos: None,
            notes: Some("Batch and expiry verification completed".to_string()),
            quality_check_passed: true,
            issues: None,
        };

        fixture
            .intervention_service
            .advance_step(
                complete_request,
                "batch-expiry-test",
                Some("test_technician"),
            )
            .await?;

        // Verify the collected data includes batch/expiry verification
        let updated_intervention = fixture
            .intervention_service
            .get_intervention_by_id(&intervention.id)?;
        let updated_step = updated_intervention
            .steps
            .iter()
            .find(|s| s.id == step.id)
            .unwrap();

        // Check if the collected data contains batch/expiry information
        let collected_data = updated_step.collected_data.as_ref().unwrap();
        assert!(collected_data.get("batch_verified").is_some());
        assert!(collected_data.get("expiry_checked").is_some());

        Ok(())
    }
}
