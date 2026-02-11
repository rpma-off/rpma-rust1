//! Network Resilience Tests
//!
//! This module tests error handling and recovery mechanisms:
//! - Database connection failures
//! - Transaction rollback scenarios
//! - Synchronization conflict resolution
//! - Partial failure recovery

use crate::commands::AppResult;
use crate::models::client::{Client, CustomerType};
use crate::models::intervention::Intervention;
use crate::models::material::{Material, MaterialType, UnitOfMeasure};
use crate::models::task::{Task, TaskPriority, TaskStatus};
use crate::services::audit_service::AuditService;
use crate::services::client::ClientService;
use crate::services::intervention_types::{
    AdvanceStepRequest, FinalizeInterventionRequest, StartInterventionRequest,
};
use crate::services::intervention_workflow::InterventionWorkflowService;
use crate::services::material::{
    CreateMaterialRequest, MaterialService, RecordConsumptionRequest, UpdateStockRequest,
};
use crate::services::task_crud::TaskCrudService;
use crate::test_utils::TestDatabase;
use crate::{test_client, test_task};
use chrono::Utc;
use rand;
use serde_json::json;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tokio::time::sleep;
use uuid::Uuid; // For UUID generation // For random failure simulation

/// Network resilience test fixture with failure simulation
#[derive(Clone)]
pub struct NetworkResilienceTestFixture {
    pub db: TestDatabase,
    pub client_service: ClientService,
    pub task_service: TaskCrudService,
    pub intervention_service: InterventionWorkflowService,
    pub material_service: MaterialService,
    pub audit_service: AuditService,
    pub failure_simulator: Arc<Mutex<FailureSimulator>>,
}

/// Simulates various network and database failures
pub struct FailureSimulator {
    pub simulate_connection_failure: bool,
    pub simulate_slow_queries: bool,
    pub simulate_deadlocks: bool,
    pub simulate_constraint_violations: bool,
    pub query_delay_ms: u64,
    pub failure_rate: f64, // 0.0 to 1.0
}

impl FailureSimulator {
    pub fn new() -> Self {
        Self {
            simulate_connection_failure: false,
            simulate_slow_queries: false,
            simulate_deadlocks: false,
            simulate_constraint_violations: false,
            query_delay_ms: 0,
            failure_rate: 0.0,
        }
    }

    pub fn should_fail(&self) -> bool {
        if self.failure_rate == 0.0 {
            return false;
        }
        rand::random::<f64>() < self.failure_rate
    }

    pub async fn apply_delay(&self) {
        if self.simulate_slow_queries && self.query_delay_ms > 0 {
            sleep(Duration::from_millis(self.query_delay_ms)).await;
        }
    }
}

impl NetworkResilienceTestFixture {
    /// Create a new network resilience test fixture
    pub fn new() -> AppResult<Self> {
        let db = TestDatabase::new().expect("Failed to create test database");
        let client_service = ClientService::new_with_db(db.db());
        let task_service = TaskCrudService::new(db.db());
        let intervention_service = InterventionWorkflowService::new(db.db());
        let material_service = MaterialService::new(db.db());
        let audit_service = AuditService::new(db.db());

        audit_service.init()?;

        let failure_simulator = Arc::new(Mutex::new(FailureSimulator::new()));

        Ok(NetworkResilienceTestFixture {
            db,
            client_service,
            task_service,
            intervention_service,
            material_service,
            audit_service,
            failure_simulator,
        })
    }

    /// Create a test client with failure simulation
    pub async fn create_test_client_with_resilience(
        &self,
        name: &str,
        email: Option<&str>,
    ) -> AppResult<Client> {
        let simulator = self.failure_simulator.lock().unwrap();
        simulator.apply_delay().await;

        if simulator.should_fail() {
            return Err(crate::commands::AppError::DatabaseError(
                "Simulated connection failure".to_string(),
            ));
        }

        drop(simulator);

        let client_request = test_client!(
            name: name.to_string(),
            email: email.map(|e| e.to_string()),
            phone: Some("555-1234".to_string()),
            customer_type: CustomerType::Individual,
            address_street: Some("123 Resilience Test Street".to_string()),
            address_city: Some("Resilience City".to_string()),
            address_state: Some("Resilience State".to_string()),
            address_zip: Some("12345".to_string()),
            address_country: Some("Resilience Country".to_string()),
            notes: Some("Resilience test client".to_string()),
            tags: Some("resilience,test".to_string())
        );

        self.client_service
            .create_client_async(client_request, "resilience_test_user")
            .await
    }

    /// Create a test material with initial stock and failure simulation
    pub fn create_test_material_with_stock_resilience(
        &self,
        sku: &str,
        name: &str,
        stock: f64,
    ) -> AppResult<Material> {
        let simulator = self.failure_simulator.lock().unwrap();

        if simulator.should_fail() {
            return Err(crate::commands::AppError::DatabaseError(
                "Simulated material creation failure".to_string(),
            ));
        }

        drop(simulator);

        let request = CreateMaterialRequest {
            sku: sku.to_string(),
            name: name.to_string(),
            description: Some(format!("Resilience test material: {}", name)),
            material_type: MaterialType::PpfFilm,
            category: Some("Resilience Materials".to_string()),
            subcategory: None,
            category_id: None,
            brand: Some("ResilienceBrand".to_string()),
            model: None,
            specifications: None,
            unit_of_measure: UnitOfMeasure::Meter,
            minimum_stock: Some(10.0),
            maximum_stock: Some(1000.0),
            reorder_point: Some(20.0),
            unit_cost: Some(25.50),
            currency: Some("EUR".to_string()),
            supplier_id: None,
            supplier_name: None,
            supplier_sku: None,
            quality_grade: None,
            certification: None,
            expiry_date: None,
            batch_number: None,
            storage_location: Some("Resilience Warehouse".to_string()),
            warehouse_id: None,
        };

        let material = self
            .material_service
            .create_material(request, Some("resilience_test_user".to_string()))?;

        // Update stock if needed
        if stock > 0.0 {
            let update_request = UpdateStockRequest {
                material_id: material.id.clone().unwrap(),
                quantity_change: stock,
                reason: "Initial stock for resilience test".to_string(),
                recorded_by: Some("resilience_test_user".to_string()),
            };
            self.material_service.update_stock(update_request)?;
        }

        Ok(material)
    }

    /// Create a task for a client with failure simulation
    pub async fn create_task_for_client_resilience(
        &self,
        client: &Client,
        title: &str,
        ppf_zones: Vec<String>,
    ) -> AppResult<Task> {
        let simulator = self.failure_simulator.lock().unwrap();
        simulator.apply_delay().await;

        if simulator.should_fail() {
            return Err(crate::commands::AppError::DatabaseError(
                "Simulated task creation failure".to_string(),
            ));
        }

        drop(simulator);

        let task_request = test_task!(
            title: Some(title.to_string()),
            description: Some(format!("Resilience test task for {} - {}", client.name, title)),
            vehicle_plate: format!("{}-{}", client.name.chars().take(3).collect::<String>(), Uuid::new_v4().to_string().chars().take(6).collect::<String>()),
            vehicle_model: "Resilience Test Model".to_string(),
            vehicle_make: Some(client.name.clone()),
            vehicle_year: Some("2023".to_string()),
            ppf_zones: ppf_zones,
            status: Some(TaskStatus::Pending),
            priority: Some(TaskPriority::Medium),
            client_id: Some(client.id.clone()),
            customer_name: Some(client.name.clone()),
            customer_email: client.email.clone(),
            customer_phone: client.phone.clone(),
            customer_address: Some(format!("{}, {}, {}, {}",
                client.address_street.as_ref().unwrap_or(&String::new()),
                client.address_city.as_ref().unwrap_or(&String::new()),
                client.address_state.as_ref().unwrap_or(&String::new()),
                client.address_zip.as_ref().unwrap_or(&String::new())
            )),
            notes: Some(format!("Resilience test task for {}", client.name)),
            tags: Some("resilience,test".to_string())
        );

        self.task_service
            .create_task_async(task_request, "resilience_test_user")
            .await
    }

    /// Convert task to intervention with failure simulation
    pub async fn convert_task_to_intervention_resilience(
        &self,
        task: &Task,
        ppf_zones: Vec<String>,
        custom_zones: Option<Vec<String>>,
    ) -> AppResult<Intervention> {
        let simulator = self.failure_simulator.lock().unwrap();
        simulator.apply_delay().await;

        if simulator.should_fail() {
            return Err(crate::commands::AppError::DatabaseError(
                "Simulated intervention creation failure".to_string(),
            ));
        }

        drop(simulator);

        let intervention_request = StartInterventionRequest {
            task_id: task.id.clone(),
            intervention_number: None,
            ppf_zones,
            custom_zones,
            film_type: "premium".to_string(),
            film_brand: Some("ResilienceBrand".to_string()),
            film_model: Some("RES-100".to_string()),
            weather_condition: "clear".to_string(),
            lighting_condition: "good".to_string(),
            work_location: "shop".to_string(),
            temperature: Some(22.0),
            humidity: Some(45.0),
            technician_id: "resilience_technician".to_string(),
            assistant_ids: None,
            scheduled_start: Utc::now().to_rfc3339(),
            estimated_duration: 120,
            gps_coordinates: None,
            address: task.customer_address.clone(),
            notes: Some(format!(
                "Resilience test intervention for task: {}",
                task.title.as_ref().unwrap_or(&String::new())
            )),
            customer_requirements: Some(vec!["High quality finish".to_string()]),
            special_instructions: Some("Resilience test intervention".to_string()),
        };

        let response = self.intervention_service.start_intervention(
            intervention_request,
            "resilience_test_user",
            "resilience-test-correlation-id",
        )?;

        self.intervention_service
            .get_intervention_by_id(&response.intervention_id)
    }

    /// Test database connection failure and recovery
    pub async fn test_connection_failure_recovery(&self) -> AppResult<(i32, Duration)> {
        let start_time = Instant::now();
        let mut successful_operations = 0;
        let mut failed_operations = 0;

        // Simulate connection failures
        {
            let mut simulator = self.failure_simulator.lock().unwrap();
            simulator.simulate_connection_failure = true;
            simulator.failure_rate = 0.3; // 30% failure rate
        }

        println!("Testing with simulated connection failures...");

        // Try to create clients with failures
        for i in 0..10 {
            match self
                .create_test_client_with_resilience(
                    &format!("Resilience Client {}", i),
                    Some(format!("resilience{}@test.com", i)),
                )
                .await
            {
                Ok(_) => successful_operations += 1,
                Err(_) => failed_operations += 1,
            }
        }

        // Clear the failure simulation
        {
            let mut simulator = self.failure_simulator.lock().unwrap();
            simulator.simulate_connection_failure = false;
            simulator.failure_rate = 0.0;
        }

        // Test recovery - operations should succeed now
        println!("Testing recovery after connection restoration...");
        for i in 0..5 {
            match self
                .create_test_client_with_resilience(
                    &format!("Recovery Client {}", i),
                    Some(format!("recovery{}@test.com", i)),
                )
                .await
            {
                Ok(_) => successful_operations += 1,
                Err(_) => failed_operations += 1,
            }
        }

        let duration = start_time.elapsed();

        println!(
            "Connection failure recovery: {} successful, {} failed in {:?}",
            successful_operations, failed_operations, duration
        );

        // At least some operations should have succeeded, and recovery should work
        assert!(
            successful_operations > 0,
            "No operations succeeded during connection failure test"
        );
        assert!(
            successful_operations >= 5,
            "Recovery failed - insufficient successful operations"
        );

        Ok((successful_operations, duration))
    }

    /// Test transaction rollback scenarios
    pub async fn test_transaction_rollback_scenarios(&self) -> AppResult<(i32, i32)> {
        let mut successful_rollback_tests = 0;
        let mut total_rollback_tests = 0;

        // Test 1: Material consumption exceeding stock should rollback
        total_rollback_tests += 1;
        let material = self.create_test_material_with_stock_resilience(
            "ROLLBACK-MAT-001",
            "Rollback Material",
            5.0,
        )?;
        let client = self
            .create_test_client_with_resilience("Rollback Client", Some("rollback@test.com"))
            .await?;
        let task = self
            .create_task_for_client_resilience(&client, "Rollback Task", vec!["hood".to_string()])
            .await?;
        let intervention = self
            .convert_task_to_intervention_resilience(&task, vec!["hood".to_string()], None)
            .await?;

        // Try to consume more than available stock
        let over_consumption_request = RecordConsumptionRequest {
            intervention_id: intervention.id.clone(),
            material_id: material.id.clone().unwrap(),
            step_id: Some(intervention.steps[0].id.clone()),
            step_number: Some(1),
            quantity_used: 10.0, // More than available
            waste_quantity: Some(1.0),
            waste_reason: Some("Rollback test".to_string()),
            batch_used: Some("BATCH-ROLLBACK".to_string()),
            quality_notes: Some("Rollback test".to_string()),
            recorded_by: Some("rollback_technician".to_string()),
        };

        match self
            .material_service
            .record_consumption(over_consumption_request)
        {
            Err(_) => {
                // Expected to fail
                successful_rollback_tests += 1;

                // Verify stock is unchanged
                let unchanged_material = self
                    .material_service
                    .get_material_by_id(&material.id.clone().unwrap())?;
                assert_eq!(
                    unchanged_material.current_stock, 5.0,
                    "Stock should not change on rollback"
                );
            }
            Ok(_) => {
                println!("Warning: Expected over-consumption to fail, but it succeeded");
            }
        }

        // Test 2: Constraint violation should rollback
        total_rollback_tests += 1;

        // Try to create a material with duplicate SKU
        let duplicate_sku_request = CreateMaterialRequest {
            sku: "ROLLBACK-MAT-001".to_string(), // Same SKU as above
            name: "Duplicate Material".to_string(),
            description: Some("This should fail".to_string()),
            material_type: MaterialType::Adhesive,
            category: Some("Test".to_string()),
            subcategory: None,
            category_id: None,
            brand: None,
            model: None,
            specifications: None,
            unit_of_measure: UnitOfMeasure::Liter,
            minimum_stock: None,
            maximum_stock: None,
            reorder_point: None,
            unit_cost: None,
            currency: None,
            supplier_id: None,
            supplier_name: None,
            supplier_sku: None,
            quality_grade: None,
            certification: None,
            expiry_date: None,
            batch_number: None,
            storage_location: None,
            warehouse_id: None,
        };

        match self
            .material_service
            .create_material(duplicate_sku_request, Some("test_user".to_string()))
        {
            Err(_) => {
                // Expected to fail
                successful_rollback_tests += 1;
            }
            Ok(_) => {
                println!("Warning: Expected duplicate SKU creation to fail, but it succeeded");
            }
        }

        println!(
            "Transaction rollback tests: {}/{} successful",
            successful_rollback_tests, total_rollback_tests
        );

        Ok((successful_rollback_tests, total_rollback_tests))
    }

    /// Test synchronization conflict resolution
    pub async fn test_synchronization_conflict_resolution(&self) -> AppResult<(i32, i32)> {
        let mut resolved_conflicts = 0;
        let mut total_conflicts = 0;

        // Create test material
        let material = self.create_test_material_with_stock_resilience(
            "SYNC-MAT-001",
            "Sync Material",
            100.0,
        )?;

        // Test 1: Concurrent stock updates
        total_conflicts += 1;

        // Simulate concurrent stock updates
        let initial_stock = material.current_stock;

        // First update
        let update1 = UpdateStockRequest {
            material_id: material.id.clone().unwrap(),
            quantity_change: -10.0,
            reason: "First concurrent update".to_string(),
            recorded_by: Some("user1".to_string()),
        };

        // Second update (might conflict)
        let update2 = UpdateStockRequest {
            material_id: material.id.clone().unwrap(),
            quantity_change: -5.0,
            reason: "Second concurrent update".to_string(),
            recorded_by: Some("user2".to_string()),
        };

        // Apply updates
        let result1 = self.material_service.update_stock(update1);
        let result2 = self.material_service.update_stock(update2);

        if result1.is_ok() && result2.is_ok() {
            // Both succeeded - conflict was resolved
            resolved_conflicts += 1;

            // Verify final stock
            let final_material = self
                .material_service
                .get_material_by_id(&material.id.clone().unwrap())?;
            let expected_stock = initial_stock - 10.0 - 5.0;
            assert!(
                (final_material.current_stock - expected_stock).abs() < 0.01,
                "Stock conflict not resolved correctly"
            );
        }

        // Test 2: Concurrent task status updates
        total_conflicts += 1;

        let client = self
            .create_test_client_with_resilience("Sync Client", Some("sync@test.com"))
            .await?;
        let task = self
            .create_task_for_client_resilience(&client, "Sync Task", vec!["hood".to_string()])
            .await?;

        // Try to convert to intervention multiple times (should handle gracefully)
        let intervention_result1 = self
            .convert_task_to_intervention_resilience(&task, vec!["hood".to_string()], None)
            .await;
        let intervention_result2 = self
            .convert_task_to_intervention_resilience(&task, vec!["hood".to_string()], None)
            .await;

        // One should succeed, one should fail (or both succeed but with proper handling)
        if intervention_result1.is_ok() {
            resolved_conflicts += 1;
        } else if intervention_result2.is_ok() {
            resolved_conflicts += 1;
        }

        println!(
            "Synchronization conflict resolution: {}/{} resolved",
            resolved_conflicts, total_conflicts
        );

        Ok((resolved_conflicts, total_conflicts))
    }

    /// Test partial failure recovery
    pub async fn test_partial_failure_recovery(&self) -> AppResult<(i32, Duration)> {
        let start_time = Instant::now();
        let mut recovered_operations = 0;
        let mut total_operations = 0;

        // Create multiple clients and tasks
        let mut clients = Vec::new();
        let mut tasks = Vec::new();

        for i in 0..5 {
            total_operations += 1;
            match self
                .create_test_client_with_resilience(
                    &format!("Partial Client {}", i),
                    Some(format!("partial{}@test.com", i)),
                )
                .await
            {
                Ok(client) => clients.push(client),
                Err(_) => {} // Partial failure expected
            }
        }

        for (i, client) in clients.iter().enumerate() {
            total_operations += 1;
            match self
                .create_task_for_client_resilience(
                    client,
                    &format!("Partial Task {}", i),
                    vec!["hood".to_string()],
                )
                .await
            {
                Ok(task) => tasks.push(task),
                Err(_) => {} // Partial failure expected
            }
        }

        // Simulate intermittent failures and attempt recovery
        {
            let mut simulator = self.failure_simulator.lock().unwrap();
            simulator.failure_rate = 0.2; // 20% failure rate
        }

        // Try to create interventions with intermittent failures
        let mut interventions = Vec::new();
        for task in &tasks {
            total_operations += 1;
            match self
                .convert_task_to_intervention_resilience(task, vec!["hood".to_string()], None)
                .await
            {
                Ok(intervention) => {
                    interventions.push(intervention);
                    recovered_operations += 1;
                }
                Err(_) => {
                    // Retry logic would go here in a real implementation
                    // For this test, we just count the failure
                }
            }
        }

        // Clear failures and complete remaining operations
        {
            let mut simulator = self.failure_simulator.lock().unwrap();
            simulator.failure_rate = 0.0;
        }

        // Complete interventions that were successfully created
        for intervention in &interventions {
            let finalize_request = FinalizeInterventionRequest {
                intervention_id: intervention.id.clone(),
                collected_data: Some(json!({"duration": 120})),
                photos: None,
                customer_satisfaction: Some(8),
                quality_score: Some(85),
                final_observations: Some(vec![
                    "Partial failure recovery test completed".to_string()
                ]),
                customer_signature: None,
                customer_comments: None,
            };

            if self
                .intervention_service
                .finalize_intervention(
                    finalize_request,
                    "partial_recovery_test",
                    Some("recovery_technician"),
                )
                .await
                .is_ok()
            {
                recovered_operations += 1;
            }
        }

        let duration = start_time.elapsed();

        println!(
            "Partial failure recovery: {}/{} operations recovered in {:?}",
            recovered_operations, total_operations, duration
        );

        // At least some operations should have succeeded despite partial failures
        assert!(
            recovered_operations > total_operations / 3,
            "Insufficient operations recovered: {}/{}",
            recovered_operations,
            total_operations
        );

        Ok((recovered_operations, duration))
    }

    /// Test slow query handling and timeouts
    pub async fn test_slow_query_handling(&self) -> AppResult<(Duration, i32)> {
        let start_time = Instant::now();
        let mut successful_slow_operations = 0;

        // Enable slow query simulation
        {
            let mut simulator = self.failure_simulator.lock().unwrap();
            simulator.simulate_slow_queries = true;
            simulator.query_delay_ms = 100; // 100ms delay
        }

        println!("Testing slow query handling...");

        // Perform operations with simulated delays
        for i in 0..3 {
            if self
                .create_test_client_with_resilience(
                    &format!("Slow Client {}", i),
                    Some(format!("slow{}@test.com", i)),
                )
                .await
                .is_ok()
            {
                successful_slow_operations += 1;
            }

            if self
                .create_test_material_with_stock_resilience(
                    &format!("SLOW-MAT-{:03}", i),
                    &format!("Slow Material {}", i),
                    20.0,
                )
                .is_ok()
            {
                successful_slow_operations += 1;
            }
        }

        // Clear slow query simulation
        {
            let mut simulator = self.failure_simulator.lock().unwrap();
            simulator.simulate_slow_queries = false;
            simulator.query_delay_ms = 0;
        }

        let duration = start_time.elapsed();

        println!(
            "Slow query handling: {} successful operations in {:?}",
            successful_slow_operations, duration
        );

        // Operations should succeed even with delays (within reason)
        assert!(
            successful_slow_operations > 0,
            "No operations succeeded with slow queries"
        );
        assert!(
            duration < Duration::from_secs(10),
            "Slow query handling too slow: {:?}",
            duration
        );

        Ok((duration, successful_slow_operations))
    }

    /// Test comprehensive error recovery across all domains
    pub async fn test_comprehensive_error_recovery(&self) -> AppResult<ErrorRecoveryMetrics> {
        let start_time = Instant::now();
        let mut metrics = ErrorRecoveryMetrics::new();

        // Test connection failures
        let (conn_success, conn_duration) = self.test_connection_failure_recovery().await?;
        metrics.connection_recovery_time = conn_duration;
        metrics.connection_success_rate = conn_success as f64 / 15.0; // 15 total operations

        // Test transaction rollbacks
        let (rollback_success, rollback_total) = self.test_transaction_rollback_scenarios().await?;
        metrics.rollback_success_rate = rollback_success as f64 / rollback_total as f64;

        // Test synchronization conflicts
        let (sync_success, sync_total) = self.test_synchronization_conflict_resolution().await?;
        metrics.sync_conflict_resolution_rate = sync_success as f64 / sync_total as f64;

        // Test partial failure recovery
        let (partial_success, partial_duration) = self.test_partial_failure_recovery().await?;
        metrics.partial_recovery_time = partial_duration;
        metrics.partial_recovery_rate = partial_success as f64 / 20.0; // Approximate total

        // Test slow query handling
        let (slow_duration, slow_success) = self.test_slow_query_handling().await?;
        metrics.slow_query_handling_time = slow_duration;
        metrics.slow_query_success_rate = slow_success as f64 / 6.0; // 6 total operations

        metrics.total_duration = start_time.elapsed();

        println!("Comprehensive Error Recovery Metrics:");
        println!(
            "  Connection Recovery: {:.1}% in {:?}",
            metrics.connection_success_rate * 100.0,
            metrics.connection_recovery_time
        );
        println!(
            "  Rollback Success: {:.1}%",
            metrics.rollback_success_rate * 100.0
        );
        println!(
            "  Sync Conflict Resolution: {:.1}%",
            metrics.sync_conflict_resolution_rate * 100.0
        );
        println!(
            "  Partial Recovery: {:.1}% in {:?}",
            metrics.partial_recovery_rate * 100.0,
            metrics.partial_recovery_time
        );
        println!(
            "  Slow Query Handling: {:.1}% in {:?}",
            metrics.slow_query_success_rate * 100.0,
            metrics.slow_query_handling_time
        );
        println!("  Total Duration: {:?}", metrics.total_duration);

        Ok(metrics)
    }
}

/// Metrics for error recovery performance
#[derive(Debug)]
pub struct ErrorRecoveryMetrics {
    pub connection_recovery_time: Duration,
    pub connection_success_rate: f64,
    pub rollback_success_rate: f64,
    pub sync_conflict_resolution_rate: f64,
    pub partial_recovery_time: Duration,
    pub partial_recovery_rate: f64,
    pub slow_query_handling_time: Duration,
    pub slow_query_success_rate: f64,
    pub total_duration: Duration,
}

impl ErrorRecoveryMetrics {
    pub fn new() -> Self {
        Self {
            connection_recovery_time: Duration::ZERO,
            connection_success_rate: 0.0,
            rollback_success_rate: 0.0,
            sync_conflict_resolution_rate: 0.0,
            partial_recovery_time: Duration::ZERO,
            partial_recovery_rate: 0.0,
            slow_query_handling_time: Duration::ZERO,
            slow_query_success_rate: 0.0,
            total_duration: Duration::ZERO,
        }
    }

    pub fn overall_success_rate(&self) -> f64 {
        (self.connection_success_rate
            + self.rollback_success_rate
            + self.sync_conflict_resolution_rate
            + self.partial_recovery_rate
            + self.slow_query_success_rate)
            / 5.0
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;

    #[tokio::test]
    async fn test_connection_failure_and_recovery() -> AppResult<()> {
        let fixture = NetworkResilienceTestFixture::new()?;

        let (successful_ops, duration) = fixture.test_connection_failure_recovery().await?;

        assert!(
            successful_ops >= 5,
            "Insufficient successful operations: {}",
            successful_ops
        );
        assert!(
            duration < Duration::from_secs(30),
            "Connection recovery too slow: {:?}",
            duration
        );

        Ok(())
    }

    #[tokio::test]
    async fn test_transaction_rollback_scenarios() -> AppResult<()> {
        let fixture = NetworkResilienceTestFixture::new()?;

        let (successful_rollbacks, total_rollbacks) =
            fixture.test_transaction_rollback_scenarios().await?;

        assert!(
            successful_rollbacks >= 1,
            "No successful rollback tests: {}/{}",
            successful_rollbacks,
            total_rollbacks
        );
        assert_eq!(
            successful_rollbacks, total_rollbacks,
            "Some rollback tests failed"
        );

        Ok(())
    }

    #[tokio::test]
    async fn test_synchronization_conflict_resolution() -> AppResult<()> {
        let fixture = NetworkResilienceTestFixture::new()?;

        let (resolved_conflicts, total_conflicts) =
            fixture.test_synchronization_conflict_resolution().await?;

        assert!(
            resolved_conflicts >= 1,
            "No conflicts resolved: {}/{}",
            resolved_conflicts,
            total_conflicts
        );
        assert!(
            resolved_conflicts > total_conflicts / 2,
            "Too few conflicts resolved"
        );

        Ok(())
    }

    #[tokio::test]
    async fn test_partial_failure_recovery() -> AppResult<()> {
        let fixture = NetworkResilienceTestFixture::new()?;

        let (recovered_ops, duration) = fixture.test_partial_failure_recovery().await?;

        assert!(
            recovered_ops > 0,
            "No operations recovered: {}",
            recovered_ops
        );
        assert!(
            duration < Duration::from_secs(60),
            "Partial recovery too slow: {:?}",
            duration
        );

        Ok(())
    }

    #[tokio::test]
    async fn test_slow_query_handling() -> AppResult<()> {
        let fixture = NetworkResilienceTestFixture::new()?;

        let (duration, successful_ops) = fixture.test_slow_query_handling().await?;

        assert!(
            successful_ops > 0,
            "No operations succeeded with slow queries: {}",
            successful_ops
        );
        assert!(
            duration < Duration::from_secs(15),
            "Slow query handling too slow: {:?}",
            duration
        );

        Ok(())
    }

    #[tokio::test]
    async fn test_comprehensive_error_recovery() -> AppResult<()> {
        let fixture = NetworkResilienceTestFixture::new()?;

        let metrics = fixture.test_comprehensive_error_recovery().await?;

        // Verify overall error recovery performance
        let overall_success = metrics.overall_success_rate();
        assert!(
            overall_success > 0.7,
            "Overall error recovery success rate too low: {:.1}%",
            overall_success * 100.0
        );

        // Verify individual metrics
        assert!(
            metrics.connection_success_rate > 0.5,
            "Connection recovery too low: {:.1}%",
            metrics.connection_success_rate * 100.0
        );
        assert!(
            metrics.rollback_success_rate > 0.5,
            "Rollback success too low: {:.1}%",
            metrics.rollback_success_rate * 100.0
        );
        assert!(
            metrics.sync_conflict_resolution_rate > 0.5,
            "Sync resolution too low: {:.1}%",
            metrics.sync_conflict_resolution_rate * 100.0
        );
        assert!(
            metrics.partial_recovery_rate > 0.3,
            "Partial recovery too low: {:.1}%",
            metrics.partial_recovery_rate * 100.0
        );
        assert!(
            metrics.slow_query_success_rate > 0.5,
            "Slow query success too low: {:.1}%",
            metrics.slow_query_success_rate * 100.0
        );

        // Verify performance is reasonable
        assert!(
            metrics.total_duration < Duration::from_secs(120),
            "Comprehensive error recovery too slow: {:?}",
            metrics.total_duration
        );

        Ok(())
    }

    #[tokio::test]
    async fn test_resilience_under_stress() -> AppResult<()> {
        let fixture = NetworkResilienceTestFixture::new()?;

        // Enable high failure rate
        {
            let mut simulator = fixture.failure_simulator.lock().unwrap();
            simulator.failure_rate = 0.4; // 40% failure rate
            simulator.simulate_slow_queries = true;
            simulator.query_delay_ms = 50;
        }

        let start_time = Instant::now();
        let mut successful_ops = 0;
        let mut total_ops = 0;

        // Stress test with high failure rate
        for i in 0..20 {
            total_ops += 1;
            if fixture
                .create_test_client_with_resilience(
                    &format!("Stress Client {}", i),
                    Some(format!("stress{}@test.com", i)),
                )
                .await
                .is_ok()
            {
                successful_ops += 1;
            }

            total_ops += 1;
            if fixture
                .create_test_material_with_stock_resilience(
                    &format!("STRESS-MAT-{:03}", i),
                    &format!("Stress Material {}", i),
                    15.0,
                )
                .is_ok()
            {
                successful_ops += 1;
            }
        }

        // Clear failure simulation
        {
            let mut simulator = fixture.failure_simulator.lock().unwrap();
            simulator.failure_rate = 0.0;
            simulator.simulate_slow_queries = false;
            simulator.query_delay_ms = 0;
        }

        let duration = start_time.elapsed();

        let success_rate = successful_ops as f64 / total_ops as f64;
        println!(
            "Stress test resilience: {}/{} operations successful ({:.1}%) in {:?}",
            successful_ops,
            total_ops,
            success_rate * 100.0,
            duration
        );

        // Even with 40% failure rate, system should handle gracefully
        assert!(
            success_rate > 0.4,
            "System not resilient under stress: {:.1}%",
            success_rate * 100.0
        );
        assert!(
            duration < Duration::from_secs(90),
            "Stress test too slow: {:?}",
            duration
        );

        Ok(())
    }
}
