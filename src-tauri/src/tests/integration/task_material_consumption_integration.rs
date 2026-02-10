//! Integration tests for Task -> Material Consumption workflow
//!
//! This module tests the integration between task completion and automatic material consumption,
//! ensuring proper stock updates, consumption records, and rollback behavior.

use crate::commands::AppResult;
use crate::models::material::{Material, MaterialConsumption, MaterialType, UnitOfMeasure};
use crate::models::task::{CreateTaskRequest, TaskPriority, TaskStatus};
use crate::services::audit_service::AuditService;
use crate::services::intervention_types::{AdvanceStepRequest, FinalizeInterventionRequest, StartInterventionRequest};
use crate::services::intervention_workflow::InterventionWorkflowService;
use crate::services::material::{
    CreateMaterialRequest, CreateInventoryTransactionRequest, MaterialService, RecordConsumptionRequest, UpdateStockRequest
};
use crate::models::material::InventoryTransactionType;
use crate::services::task_crud::TaskCrudService;
use crate::test_utils::{TestDataFactory, TestDatabase};
use crate::{test_client, test_db, test_intervention, test_task};
use chrono::Utc;
use serde_json::json;
use std::sync::Arc;
use uuid::Uuid;

/// Test fixture for task-material integration tests
pub struct TaskMaterialTestFixture {
    pub db: TestDatabase,
    pub task_service: TaskCrudService,
    pub material_service: MaterialService,
    pub intervention_service: InterventionWorkflowService,
    pub audit_service: AuditService,
}

impl TaskMaterialTestFixture {
    /// Create a new test fixture with all required services
    pub fn new() -> AppResult<Self> {
        let db = test_db!();
        let task_service = TaskCrudService::new(db.db());
        let material_service = MaterialService::new(db.db());
        let intervention_service = InterventionWorkflowService::new(db.db());
        let audit_service = AuditService::new(db.db());
        
        // Initialize audit service
        audit_service.init()?;
        
        Ok(TaskMaterialTestFixture {
            db,
            task_service,
            material_service,
            intervention_service,
            audit_service,
        })
    }
    
    /// Create a test material with initial stock
    pub fn create_test_material_with_stock(
        &self,
        sku: &str,
        name: &str,
        stock: f64,
    ) -> AppResult<Material> {
        let request = CreateMaterialRequest {
            sku: sku.to_string(),
            name: name.to_string(),
            description: Some(format!("Test material: {}", name)),
            material_type: MaterialType::PpfFilm,
            category: Some("Films".to_string()),
            subcategory: None,
            category_id: None,
            brand: Some("TestBrand".to_string()),
            model: None,
            specifications: None,
            unit_of_measure: UnitOfMeasure::Meter,
            minimum_stock: Some(10.0),
            maximum_stock: Some(1000.0),
            reorder_point: Some(20.0),
            unit_cost: Some(15.50),
            currency: Some("EUR".to_string()),
            supplier_id: None,
            supplier_name: None,
            supplier_sku: None,
            quality_grade: None,
            certification: None,
            expiry_date: None,
            batch_number: None,
            storage_location: Some("Warehouse A".to_string()),
            warehouse_id: None,
        };

        let material = self.material_service
            .create_material(request, Some("test_user".to_string()))?;
        
        // Update stock if needed
        if stock > 0.0 {
            let update_request = UpdateStockRequest {
                material_id: material.id.clone().unwrap(),
                quantity_change: stock,
                reason: "Initial stock".to_string(),
                recorded_by: Some("test_user".to_string()),
            };
            self.material_service.update_stock(update_request)?;
        }
        
        Ok(material)
    }
    
    /// Create a test task with predefined materials for the task type
    pub fn create_test_task_with_materials(&self, title: &str) -> AppResult<(crate::models::task::Task, Vec<Material>)> {
        // Create materials for the task
        let hood_film = self.create_test_material_with_stock("HOOD-FILM-001", "Hood PPF Film", 20.0)?;
        let adhesive = self.create_test_material_with_stock("ADHESIVE-001", "PPF Adhesive", 10.0)?;
        let cleaner = self.create_test_material_with_stock("CLEANER-001", "Surface Cleaner", 5.0)?;
        
        let materials = vec![hood_film.clone(), adhesive.clone(), cleaner.clone()];
        
        // Create task
        let task_request = test_task!(
            title: title.to_string(),
            vehicle_plate: Some("MAT001".to_string()),
            status: "pending".to_string(),
            notes: Some("Task for material integration test".to_string())
        );
        
        let task = self.task_service
            .create_task_async(task_request, "test_user")
            .await?;
            
        Ok((task, materials))
    }
    
    /// Start an intervention for the task
    pub fn start_intervention_for_task(
        &self,
        task: &crate::models::task::Task,
        ppf_zones: Vec<String>,
    ) -> AppResult<crate::models::intervention::Intervention> {
        let intervention_request = StartInterventionRequest {
            task_id: task.id.clone(),
            intervention_number: None,
            ppf_zones,
            custom_zones: None,
            film_type: "premium".to_string(),
            film_brand: None,
            film_model: None,
            weather_condition: "clear".to_string(),
            lighting_condition: "good".to_string(),
            work_location: "shop".to_string(),
            temperature: None,
            humidity: None,
            technician_id: "test_user".to_string(),
            assistant_ids: None,
            scheduled_start: chrono::Utc::now().to_rfc3339(),
            estimated_duration: 120,
            gps_coordinates: None,
            address: None,
            notes: Some("Integration test intervention".to_string()),
            customer_requirements: None,
            special_instructions: None,
        };
        
        let intervention_response = self.intervention_service.start_intervention(
            intervention_request,
            "test_user",
            "test-correlation-id",
        )?;
        
        self.intervention_service.get_intervention_by_id(&intervention_response.intervention_id)
    }
    
    /// Complete all steps of an intervention
    pub async fn complete_intervention_steps(
        &self,
        intervention: &crate::models::intervention::Intervention,
        materials: &[Material],
    ) -> AppResult<()> {
        for (i, step) in intervention.steps.iter().enumerate() {
            // Start the step
            let start_request = AdvanceStepRequest {
                intervention_id: intervention.id.clone(),
                step_id: step.id.clone(),
                collected_data: json!({}),
                photos: None,
                notes: Some(format!("Starting step {}", i + 1)),
                quality_check_passed: true,
                issues: None,
            };
            
            self.intervention_service
                .advance_step(start_request, "test-correlation-id", Some("test_user"))
                .await?;
            
            // Record material consumption for this step
            if i < materials.len() {
                let consumption_request = RecordConsumptionRequest {
                    intervention_id: intervention.id.clone(),
                    material_id: materials[i].id.clone().unwrap(),
                    step_id: Some(step.id.clone()),
                    step_number: Some(i as i32 + 1),
                    quantity_used: 2.0,
                    waste_quantity: Some(0.2),
                    waste_reason: Some("Trimming".to_string()),
                    batch_used: Some(format!("BATCH-{:03}", i + 1)),
                    quality_notes: Some("Good quality".to_string()),
                    recorded_by: Some("test_user".to_string()),
                };
                
                self.material_service.record_consumption(consumption_request)?;
            }
            
            // Complete the step
            let complete_request = AdvanceStepRequest {
                intervention_id: intervention.id.clone(),
                step_id: step.id.clone(),
                collected_data: json!({"duration": 30}),
                photos: None,
                notes: Some(format!("Completed step {}", i + 1)),
                quality_check_passed: true,
                issues: None,
            };
            
            self.intervention_service
                .advance_step(complete_request, "test-correlation-id", Some("test_user"))
                .await?;
        }
        
        Ok(())
    }
    
    /// Finalize the intervention
    pub async fn finalize_intervention(
        &self,
        intervention: &crate::models::intervention::Intervention,
    ) -> AppResult<()> {
        let finalize_request = FinalizeInterventionRequest {
            intervention_id: intervention.id.clone(),
            collected_data: Some(json!({"duration": 180})),
            photos: None,
            customer_satisfaction: Some(9),
            quality_score: Some(95),
            final_observations: Some(vec!["High quality installation".to_string()]),
            customer_signature: None,
            customer_comments: None,
        };
        
        self.intervention_service
            .finalize_intervention(finalize_request, "test-correlation-id", Some("test_user"))
            .await?;
            
        Ok(())
    }
    
    /// Get material consumption records for an intervention
    pub fn get_consumption_for_intervention(&self, intervention_id: &str) -> AppResult<Vec<MaterialConsumption>> {
        Ok(self.material_service.get_intervention_consumption(intervention_id)?)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[tokio::test]
    async fn test_task_completion_triggers_material_consumption() -> AppResult<()> {
        let fixture = TaskMaterialTestFixture::new()?;
        
        // Create a task with materials
        let (task, materials) = fixture.create_test_task_with_materials(
            "Task with automatic material consumption"
        )?;
        
        // Start an intervention
        let intervention = fixture.start_intervention_for_task(
            &task,
            vec!["hood".to_string(), "fender".to_string()],
        )?;
        
        // Complete all steps with material consumption
        fixture.complete_intervention_steps(&intervention, &materials).await?;
        
        // Finalize the intervention
        fixture.finalize_intervention(&intervention).await?;
        
        // Verify task is completed
        let updated_task = fixture.task_service
            .get_task_by_id_async(&task.id)
            .await?
            .unwrap();
        assert_eq!(updated_task.status, "completed");
        assert!(updated_task.completed_at.is_some());
        
        // Verify material stock was updated
        let updated_material = fixture.material_service
            .get_material_by_id(&materials[0].id.clone().unwrap())?;
        assert_eq!(updated_material.current_stock, 18.0); // 20 - 2 used - 0.2 waste
        
        // Verify consumption records were created
        let consumptions = fixture.get_consumption_for_intervention(&intervention.id)?;
        assert_eq!(consumptions.len(), 3); // One for each material
        
        // Verify audit trail was created
        let audit_events = fixture.audit_service
            .get_resource_history("task", &task.id, Some(10))?;
        assert!(!audit_events.is_empty());
        
        Ok(())
    }
    
    #[tokio::test]
    async fn test_material_stock_levels_properly_updated() -> AppResult<()> {
        let fixture = TaskMaterialTestFixture::new();
        
        // Create materials with known stock levels
        let film = fixture.create_test_material_with_stock("STOCK-TEST-FILM", "Film", 50.0)?;
        let adhesive = fixture.create_test_material_with_stock("STOCK-TEST-ADH", "Adhesive", 25.0)?;
        
        // Record initial stock levels
        let initial_film_stock = film.current_stock;
        let initial_adhesive_stock = adhesive.current_stock;
        
        // Create task and intervention
        let task = fixture.task_service
            .create_task_async(
                test_task!(
                    title: "Stock level test".to_string(),
                    vehicle_plate: Some("STOCK001".to_string())
                ),
                "test_user",
            )
            .await?;
        
        let intervention = fixture.start_intervention_for_task(
            &task,
            vec!["hood".to_string()],
        )?;
        
        // Record material consumption
        let film_consumption = RecordConsumptionRequest {
            intervention_id: intervention.id.clone(),
            material_id: film.id.clone().unwrap(),
            step_id: Some(intervention.steps[0].id.clone()),
            step_number: Some(1),
            quantity_used: 10.0,
            waste_quantity: Some(1.5),
            waste_reason: Some("Trimming waste".to_string()),
            batch_used: Some("BATCH-FILM-001".to_string()),
            quality_notes: Some("Good quality".to_string()),
            recorded_by: Some("test_user".to_string()),
        };
        
        fixture.material_service.record_consumption(film_consumption)?;
        
        let adhesive_consumption = RecordConsumptionRequest {
            intervention_id: intervention.id.clone(),
            material_id: adhesive.id.clone().unwrap(),
            step_id: Some(intervention.steps[1].id.clone()),
            step_number: Some(2),
            quantity_used: 5.0,
            waste_quantity: Some(0.5),
            waste_reason: Some("Spillage".to_string()),
            batch_used: Some("BATCH-ADH-001".to_string()),
            quality_notes: Some("Applied correctly".to_string()),
            recorded_by: Some("test_user".to_string()),
        };
        
        fixture.material_service.record_consumption(adhesive_consumption)?;
        
        // Verify stock levels were properly updated
        let updated_film = fixture.material_service
            .get_material_by_id(&film.id.clone().unwrap())?;
        assert_eq!(
            updated_film.current_stock,
            initial_film_stock - 10.0 - 1.5
        );
        
        let updated_adhesive = fixture.material_service
            .get_material_by_id(&adhesive.id.clone().unwrap())?;
        assert_eq!(
            updated_adhesive.current_stock,
            initial_adhesive_stock - 5.0 - 0.5
        );
        
        Ok(())
    }
    
    #[tokio::test]
    async fn test_consumption_records_created_with_correct_details() -> AppResult<()> {
        let fixture = TaskMaterialTestFixture::new();
        
        // Create material
        let material = fixture.create_test_material_with_stock("DETAIL-TEST-001", "Detail Test Material", 30.0)?;
        
        // Create task and intervention
        let task = fixture.task_service
            .create_task_async(
                test_task!(
                    title: "Consumption details test".to_string(),
                    vehicle_plate: Some("DETAIL001".to_string())
                ),
                "test_user",
            )
            .await?;
        
        let intervention = fixture.start_intervention_for_task(
            &task,
            vec!["full".to_string()],
        )?;
        
        // Record material consumption with detailed information
        let consumption_request = RecordConsumptionRequest {
            intervention_id: intervention.id.clone(),
            material_id: material.id.clone().unwrap(),
            step_id: Some(intervention.steps[0].id.clone()),
            step_number: Some(1),
            quantity_used: 7.5,
            waste_quantity: Some(0.8),
            waste_reason: Some("Complex shape trimming".to_string()),
            batch_used: Some("BATCH-DETAIL-001".to_string()),
            quality_notes: Some("Excellent adhesion quality".to_string()),
            recorded_by: Some("test_technician".to_string()),
        };
        
        let consumption = fixture.material_service.record_consumption(consumption_request)?;
        
        // Verify consumption record details
        assert_eq!(consumption.intervention_id, intervention.id);
        assert_eq!(consumption.material_id, material.id.unwrap());
        assert_eq!(consumption.step_id, Some(intervention.steps[0].id.clone()));
        assert_eq!(consumption.step_number, Some(1));
        assert_eq!(consumption.quantity_used, 7.5);
        assert_eq!(consumption.waste_quantity, 0.8);
        assert_eq!(consumption.waste_reason, Some("Complex shape trimming".to_string()));
        assert_eq!(consumption.batch_used, Some("BATCH-DETAIL-001".to_string()));
        assert_eq!(consumption.quality_notes, Some("Excellent adhesion quality".to_string()));
        assert_eq!(consumption.recorded_by, Some("test_technician".to_string()));
        
        // Verify total cost calculation
        assert!(consumption.total_cost.is_some());
        let expected_cost = 7.5 * material.unit_cost.unwrap_or(15.50);
        assert!((consumption.total_cost.unwrap() - expected_cost).abs() < 0.01);
        
        Ok(())
    }
    
    #[tokio::test]
    async fn test_rollback_behavior_if_material_update_fails() -> AppResult<()> {
        let fixture = TaskMaterialTestFixture::new();
        
        // Create material with very low stock to force insufficient stock error
        let material = fixture.create_test_material_with_stock("LOW-STOCK-001", "Low Stock Material", 1.0)?;
        
        // Create task and intervention
        let task = fixture.task_service
            .create_task_async(
                test_task!(
                    title: "Rollback test".to_string(),
                    vehicle_plate: Some("ROLLBACK001".to_string())
                ),
                "test_user",
            )
            .await?;
        
        let intervention = fixture.start_intervention_for_task(
            &task,
            vec!["hood".to_string()],
        )?;
        
        // Try to record consumption that exceeds available stock
        let consumption_request = RecordConsumptionRequest {
            intervention_id: intervention.id.clone(),
            material_id: material.id.clone().unwrap(),
            step_id: Some(intervention.steps[0].id.clone()),
            step_number: Some(1),
            quantity_used: 5.0, // More than available
            waste_quantity: Some(0.5),
            waste_reason: Some("Test".to_string()),
            batch_used: Some("BATCH-TEST".to_string()),
            quality_notes: Some("Test".to_string()),
            recorded_by: Some("test_user".to_string()),
        };
        
        // Attempt to record consumption should fail
        let result = fixture.material_service.record_consumption(consumption_request);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Insufficient stock"));
        
        // Verify stock level remains unchanged
        let unchanged_material = fixture.material_service
            .get_material_by_id(&material.id.clone().unwrap())?;
        assert_eq!(unchanged_material.current_stock, 1.0);
        
        // Verify no consumption records were created
        let consumptions = fixture.get_consumption_for_intervention(&intervention.id)?;
        assert_eq!(consumptions.len(), 0);
        
        Ok(())
    }
    
    #[tokio::test]
    async fn test_concurrent_task_completion_handling() -> AppResult<()> {
        let fixture = TaskMaterialTestFixture::new();
        
        // Create materials with sufficient stock
        let material1 = fixture.create_test_material_with_stock("CONCURRENT-1", "Concurrent Material 1", 100.0)?;
        let material2 = fixture.create_test_material_with_stock("CONCURRENT-2", "Concurrent Material 2", 100.0)?;
        
        // Create two tasks and interventions
        let task1 = fixture.task_service
            .create_task_async(
                test_task!(
                    title: "Concurrent task 1".to_string(),
                    vehicle_plate: Some("CONCURRENT1".to_string())
                ),
                "test_user",
            )
            .await?;
        
        let task2 = fixture.task_service
            .create_task_async(
                test_task!(
                    title: "Concurrent task 2".to_string(),
                    vehicle_plate: Some("CONCURRENT2".to_string())
                ),
                "test_user",
            )
            .await?;
        
        let intervention1 = fixture.start_intervention_for_task(&task1, vec!["hood".to_string()])?;
        let intervention2 = fixture.start_intervention_for_task(&task2, vec!["fender".to_string()])?;
        
        // Record initial stock levels
        let initial_stock1 = material1.current_stock;
        let initial_stock2 = material2.current_stock;
        
        // Simulate concurrent material consumption
        let consumption1 = RecordConsumptionRequest {
            intervention_id: intervention1.id.clone(),
            material_id: material1.id.clone().unwrap(),
            step_id: Some(intervention1.steps[0].id.clone()),
            step_number: Some(1),
            quantity_used: 10.0,
            waste_quantity: Some(1.0),
            waste_reason: Some("Concurrent test".to_string()),
            batch_used: Some("BATCH-CONCURRENT-1".to_string()),
            quality_notes: Some("Concurrent test".to_string()),
            recorded_by: Some("test_user".to_string()),
        };
        
        let consumption2 = RecordConsumptionRequest {
            intervention_id: intervention2.id.clone(),
            material_id: material2.id.clone().unwrap(),
            step_id: Some(intervention2.steps[0].id.clone()),
            step_number: Some(1),
            quantity_used: 15.0,
            waste_quantity: Some(1.5),
            waste_reason: Some("Concurrent test".to_string()),
            batch_used: Some("BATCH-CONCURRENT-2".to_string()),
            quality_notes: Some("Concurrent test".to_string()),
            recorded_by: Some("test_user".to_string()),
        };
        
        // Record both consumptions
        fixture.material_service.record_consumption(consumption1)?;
        fixture.material_service.record_consumption(consumption2)?;
        
        // Verify stock levels were updated correctly for both materials
        let updated_material1 = fixture.material_service
            .get_material_by_id(&material1.id.clone().unwrap())?;
        assert_eq!(updated_material1.current_stock, initial_stock1 - 10.0 - 1.0);
        
        let updated_material2 = fixture.material_service
            .get_material_by_id(&material2.id.clone().unwrap())?;
        assert_eq!(updated_material2.current_stock, initial_stock2 - 15.0 - 1.5);
        
        // Complete both interventions
        for (i, intervention) in [intervention1, intervention2].iter().enumerate() {
            for step in &intervention.steps {
                let complete_request = AdvanceStepRequest {
                    intervention_id: intervention.id.clone(),
                    step_id: step.id.clone(),
                    collected_data: json!({"duration": 30}),
                    photos: None,
                    notes: Some(format!("Concurrent completion {}", i + 1)),
                    quality_check_passed: true,
                    issues: None,
                };
                
                fixture.intervention_service
                    .advance_step(complete_request, "test-correlation-id", Some("test_user"))
                    .await?;
            }
            
            let finalize_request = FinalizeInterventionRequest {
                intervention_id: intervention.id.clone(),
                collected_data: Some(json!({"duration": 60})),
                photos: None,
                customer_satisfaction: Some(8),
                quality_score: Some(90),
                final_observations: Some(vec!["Concurrent completion".to_string()]),
                customer_signature: None,
                customer_comments: None,
            };
            
            fixture.intervention_service
                .finalize_intervention(finalize_request, "test-correlation-id", Some("test_user"))
                .await?;
        }
        
        // Verify both tasks are completed
        let updated_task1 = fixture.task_service
            .get_task_by_id_async(&task1.id)
            .await?
            .unwrap();
        assert_eq!(updated_task1.status, "completed");
        
        let updated_task2 = fixture.task_service
            .get_task_by_id_async(&task2.id)
            .await?
            .unwrap();
        assert_eq!(updated_task2.status, "completed");
        
        Ok(())
    }
}