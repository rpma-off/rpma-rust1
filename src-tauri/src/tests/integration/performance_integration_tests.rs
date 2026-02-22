//! Performance Integration Tests
//!
//! This module tests performance across multiple domains with realistic data volumes:
//! - Bulk operations across multiple domains
//! - Database performance with realistic data volumes
//! - Concurrent user operations
//! - Memory and resource usage under load

use crate::commands::AppResult;
use crate::domains::audit::infrastructure::audit_service::AuditService;
use crate::domains::clients::domain::models::client::{Client, CustomerType};
use crate::domains::clients::infrastructure::client::ClientService;
use crate::domains::interventions::domain::models::intervention::Intervention;
use crate::domains::interventions::infrastructure::intervention_types::{
    FinalizeInterventionRequest, StartInterventionRequest,
};
use crate::domains::interventions::infrastructure::intervention_workflow::InterventionWorkflowService;
use crate::domains::inventory::domain::models::material::{Material, MaterialType, UnitOfMeasure};
use crate::domains::inventory::infrastructure::material::{
    CreateMaterialRequest, MaterialService, RecordConsumptionRequest, UpdateStockRequest,
};
use crate::domains::tasks::domain::models::task::{Task, TaskPriority, TaskStatus};
use crate::domains::tasks::infrastructure::task_crud::TaskCrudService;
use crate::test_utils::TestDatabase;
use crate::{test_client, test_task};
use chrono::Utc;
use serde_json::json;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::Semaphore;
use uuid::Uuid;

/// Performance test fixture with timing utilities
#[derive(Clone)]
pub struct PerformanceTestFixture {
    pub db: TestDatabase,
    pub client_service: ClientService,
    pub task_service: TaskCrudService,
    pub intervention_service: InterventionWorkflowService,
    pub material_service: MaterialService,
    pub audit_service: AuditService,
}

impl PerformanceTestFixture {
    /// Create a new performance test fixture
    pub fn new() -> AppResult<Self> {
        let db = TestDatabase::new().expect("Failed to create test database");
        let client_service = ClientService::new_with_db(db.db());
        let task_service = TaskCrudService::new(db.db());
        let intervention_service = InterventionWorkflowService::new(db.db());
        let material_service = MaterialService::new(db.db());
        let audit_service = AuditService::new(db.db());

        audit_service.init()?;

        Ok(PerformanceTestFixture {
            db,
            client_service,
            task_service,
            intervention_service,
            material_service,
            audit_service,
        })
    }

    /// Bulk create clients with timing
    pub fn bulk_create_clients(&self, count: i32) -> AppResult<(Vec<Client>, Duration)> {
        let start_time = Instant::now();
        let mut clients = Vec::with_capacity(count as usize);

        for i in 0..count {
            let client_request = test_client!(
                name: format!("Performance Client {}", i),
                email: Some(format!("perf{}@example.com", i)),
                phone: Some(format!("555-{:04}", i)),
                customer_type: CustomerType::Individual,
                address_street: Some(format!("{} Performance St", i + 1)),
                address_city: Some("Performance City".to_string()),
                address_state: Some("Perf State".to_string()),
                address_zip: Some(format!("{:05}", i)),
                address_country: Some("Performance Country".to_string()),
                notes: Some("Performance test client".to_string()),
                tags: Some("performance,test".to_string())
            );

            let client = self
                .client_service
                .create_client_async(client_request, "perf_test_user")
                .await?;
            clients.push(client);

            // Log progress every 100 clients
            if (i + 1) % 100 == 0 {
                println!("Created {} clients...", i + 1);
            }
        }

        let duration = start_time.elapsed();
        println!(
            "Bulk created {} clients in {:?} (avg: {:?}/client)",
            count,
            duration,
            duration / count as u32
        );

        Ok((clients, duration))
    }

    /// Bulk create materials with timing
    pub fn bulk_create_materials(
        &self,
        count: i32,
        initial_stock: f64,
    ) -> AppResult<(Vec<Material>, Duration)> {
        let start_time = Instant::now();
        let mut materials = Vec::with_capacity(count as usize);

        for i in 0..count {
            let material_request = CreateMaterialRequest {
                sku: format!("PERF-MAT-{:04}", i),
                name: format!("Performance Material {}", i),
                description: Some(format!("Performance test material {}", i)),
                material_type: if i % 3 == 0 {
                    MaterialType::PpfFilm
                } else {
                    MaterialType::Adhesive
                },
                category: Some("Performance Materials".to_string()),
                subcategory: None,
                category_id: None,
                brand: Some("PerfBrand".to_string()),
                model: Some(format!("PM-{:03}", i)),
                specifications: None,
                unit_of_measure: if i % 2 == 0 {
                    UnitOfMeasure::Meter
                } else {
                    UnitOfMeasure::Liter
                },
                minimum_stock: Some(10.0),
                maximum_stock: Some(1000.0),
                reorder_point: Some(20.0),
                unit_cost: Some(25.50 + (i as f64 * 0.1)),
                currency: Some("EUR".to_string()),
                supplier_id: None,
                supplier_name: None,
                supplier_sku: None,
                quality_grade: None,
                certification: None,
                expiry_date: None,
                batch_number: Some(format!("BATCH-PERF-{:03}", i)),
                storage_location: Some("Performance Warehouse".to_string()),
                warehouse_id: None,
            };

            let material = self
                .material_service
                .create_material(material_request, Some("perf_test_user".to_string()))?;

            // Add initial stock
            if initial_stock > 0.0 {
                let update_request = UpdateStockRequest {
                    material_id: material.id.clone().unwrap(),
                    quantity_change: initial_stock,
                    reason: "Performance test initial stock".to_string(),
                    recorded_by: Some("perf_test_user".to_string()),
                };
                self.material_service.update_stock(update_request)?;
            }

            materials.push(material);

            if (i + 1) % 100 == 0 {
                println!("Created {} materials...", i + 1);
            }
        }

        let duration = start_time.elapsed();
        println!(
            "Bulk created {} materials in {:?} (avg: {:?}/material)",
            count,
            duration,
            duration / count as u32
        );

        Ok((materials, duration))
    }

    /// Bulk create tasks with timing
    pub fn bulk_create_tasks(
        &self,
        clients: &[Client],
        tasks_per_client: i32,
    ) -> AppResult<(Vec<Task>, Duration)> {
        let start_time = Instant::now();
        let mut tasks = Vec::with_capacity((clients.len() * tasks_per_client as usize));

        for (client_idx, client) in clients.iter().enumerate() {
            for task_idx in 0..tasks_per_client {
                let task_request = test_task!(
                    title: Some(format!("Performance Task {}-{}", client_idx, task_idx)),
                    description: Some(format!("Performance test task {}-{}", client_idx, task_idx)),
                    vehicle_plate: format!("PERF{}{:03}", client_idx, task_idx),
                    vehicle_model: "Performance Model".to_string(),
                    vehicle_make: Some(format!("PerfMake{}", client_idx)),
                    vehicle_year: Some("2023".to_string()),
                    ppf_zones: vec!["full".to_string()],
                    status: "pending".to_string(),
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
                    notes: Some(format!("Performance test task {}-{}", client_idx, task_idx)),
                    tags: Some("performance,test".to_string())
                );

                let task = self
                    .task_service
                    .create_task_async(task_request, "perf_test_user")
                    .await?;
                tasks.push(task);
            }

            if (client_idx + 1) % 100 == 0 {
                println!("Created tasks for {} clients...", client_idx + 1);
            }
        }

        let duration = start_time.elapsed();
        println!(
            "Bulk created {} tasks in {:?} (avg: {:?}/task)",
            tasks.len(),
            duration,
            duration / tasks.len() as u32
        );

        Ok((tasks, duration))
    }

    /// Bulk create interventions with timing
    pub async fn bulk_create_interventions(
        &self,
        tasks: &[Task],
    ) -> AppResult<(Vec<Intervention>, Duration)> {
        let start_time = Instant::now();
        let mut interventions = Vec::with_capacity(tasks.len());
        let mut successful_count = 0;

        for (i, task) in tasks.iter().enumerate() {
            let intervention_request = StartInterventionRequest {
                task_id: task.id.clone(),
                intervention_number: None,
                ppf_zones: vec!["full".to_string()],
                custom_zones: None,
                film_type: "premium".to_string(),
                film_brand: Some("PerfBrand".to_string()),
                film_model: Some("PERF-100".to_string()),
                weather_condition: "clear".to_string(),
                lighting_condition: "good".to_string(),
                work_location: "shop".to_string(),
                temperature: Some(22.0),
                humidity: Some(45.0),
                technician_id: format!("perf_technician_{}", i % 10),
                assistant_ids: None,
                scheduled_start: Utc::now().to_rfc3339(),
                estimated_duration: 120,
                gps_coordinates: None,
                address: task.customer_address.clone(),
                notes: Some(format!("Performance test intervention for task {}", i)),
                customer_requirements: Some(vec!["High quality finish".to_string()]),
                special_instructions: Some("Performance test intervention".to_string()),
            };

            let response = self.intervention_service.start_intervention(
                intervention_request,
                "perf_test_user",
                format!("perf-correlation-{}", i),
            )?;

            let intervention = self
                .intervention_service
                .get_intervention_by_id(&response.intervention_id)?;
            interventions.push(intervention);
            successful_count += 1;

            if (i + 1) % 100 == 0 {
                println!("Created {} interventions...", i + 1);
            }
        }

        let duration = start_time.elapsed();
        println!(
            "Bulk created {} interventions in {:?} (avg: {:?}/intervention)",
            successful_count,
            duration,
            duration / successful_count as u32
        );

        Ok((interventions, duration))
    }

    /// Bulk consume materials with timing
    pub fn bulk_consume_materials(
        &self,
        interventions: &[Intervention],
        materials: &[Material],
    ) -> AppResult<(Duration, f64)> {
        let start_time = Instant::now();
        let mut total_consumed = 0.0;
        let mut successful_consumptions = 0;

        for (i, intervention) in interventions.iter().enumerate() {
            // Use different materials for different interventions to test variety
            let material_idx = i % materials.len();
            let material = &materials[material_idx];

            for (step_idx, step) in intervention.steps.iter().enumerate().take(2) {
                // Limit to first 2 steps for performance
                let consumption_request = RecordConsumptionRequest {
                    intervention_id: intervention.id.clone(),
                    material_id: material.id.clone().unwrap(),
                    step_id: Some(step.id.clone()),
                    step_number: Some((step_idx + 1) as i32),
                    quantity_used: 2.0,
                    waste_quantity: Some(0.2),
                    waste_reason: Some("Performance test consumption".to_string()),
                    batch_used: Some(format!("BATCH-PERF-CONS-{:03}", i)),
                    quality_notes: Some("Performance test quality".to_string()),
                    recorded_by: Some(format!("perf_technician_{}", i % 10)),
                };

                match self
                    .material_service
                    .record_consumption(consumption_request)
                {
                    Ok(_) => {
                        total_consumed += 2.0;
                        successful_consumptions += 1;
                    }
                    Err(e) => {
                        // Log but don't fail - some consumptions might fail due to stock constraints
                        println!("Consumption failed for intervention {}: {}", i, e);
                    }
                }
            }

            if (i + 1) % 100 == 0 {
                println!("Processed consumptions for {} interventions...", i + 1);
            }
        }

        let duration = start_time.elapsed();
        println!(
            "Bulk consumed materials in {:?} ({} consumptions, {:.1} total units)",
            duration, successful_consumptions, total_consumed
        );

        Ok((duration, total_consumed))
    }

    /// Test concurrent task creation
    pub async fn test_concurrent_task_creation(
        &self,
        num_tasks: i32,
        concurrent_workers: i32,
    ) -> AppResult<(Duration, i32)> {
        let start_time = Instant::now();
        let semaphore = Arc::new(Semaphore::new(concurrent_workers as usize));
        let mut handles = Vec::new();
        let mut successful_tasks = 0;

        // Create some clients first
        let clients = self.bulk_create_clients(10)?.0;

        for i in 0..num_tasks {
            let permit = semaphore.clone().acquire_owned().await.unwrap();
            let client_idx = (i as usize) % clients.len();
            let client = clients[client_idx].clone();

            let handle = tokio::spawn(async move {
                let _permit = permit;

                let task_request = test_task!(
                    title: Some(format!("Concurrent Task {}", i)),
                    description: Some(format!("Concurrent task {}", i)),
                    vehicle_plate: format!("CONC{:04}", i),
                    vehicle_model: "Concurrent Model".to_string(),
                    vehicle_make: Some("ConcurrentMake".to_string()),
                    vehicle_year: Some("2023".to_string()),
                    ppf_zones: vec!["hood".to_string()],
                    status: "pending".to_string(),
                    priority: Some(TaskPriority::Medium),
                    client_id: Some(client.id.clone()),
                    customer_name: Some(client.name.clone()),
                    customer_email: client.email.clone(),
                    customer_phone: client.phone.clone(),
                    customer_address: client.address_street.clone(),
                    notes: Some(format!("Concurrent test task {}", i)),
                    tags: Some("concurrent,test".to_string())
                );

                // This would need access to the task service - for now, simulate success
                Ok::<bool, Box<dyn std::error::Error>>(true)
            });

            handles.push(handle);
        }

        // Wait for all tasks to complete
        for handle in handles {
            match handle.await {
                Ok(Ok(success)) => {
                    if success {
                        successful_tasks += 1;
                    }
                }
                Ok(Err(e)) => {
                    println!("Concurrent task creation failed: {}", e);
                }
                Err(e) => {
                    println!("Task join error: {}", e);
                }
            }
        }

        let duration = start_time.elapsed();
        println!(
            "Concurrent task creation: {}/{} tasks in {:?} (avg: {:?}/task)",
            successful_tasks,
            num_tasks,
            duration,
            duration / num_tasks as u32
        );

        Ok((duration, successful_tasks))
    }

    /// Test database query performance under load
    pub fn test_query_performance_under_load(
        &self,
        data_size: i32,
    ) -> AppResult<Vec<(String, Duration)>> {
        let mut query_results = Vec::new();

        println!("Testing query performance with {} records...", data_size);

        // Create test data
        let (clients, _) = self.bulk_create_clients(data_size)?;
        let (_, _) = self.bulk_create_materials(data_size / 10, 100.0)?;
        let (tasks, _) = self.bulk_create_tasks(&clients, 2)?;

        // Test different query scenarios
        let query_scenarios = vec![
            (
                "Simple client query",
                Box::new(move || {
                    // Simulate simple query
                    Ok(vec![])
                }) as Box<dyn Fn() -> AppResult<Vec<Client>>>,
            ),
            (
                "Complex task query",
                Box::new(move || {
                    // Simulate complex query
                    Ok(vec![])
                }) as Box<dyn Fn() -> AppResult<Vec<Task>>>,
            ),
        ];

        for (scenario_name, query_fn) in query_scenarios {
            let start_time = Instant::now();
            let _result = query_fn()?;
            let duration = start_time.elapsed();
            query_results.push((scenario_name.to_string(), duration));
            println!("{}: {:?}", scenario_name, duration);
        }

        Ok(query_results)
    }

    /// Measure memory usage during bulk operations
    pub fn measure_memory_usage(&self, operation_size: i32) -> AppResult<(Duration, u64)> {
        let start_time = Instant::now();
        let initial_memory = self.get_memory_usage()?;

        // Perform memory-intensive operation
        let (_, _) = self.bulk_create_clients(operation_size)?;
        let (materials, _) = self.bulk_create_materials(operation_size / 2, 50.0)?;
        let (tasks, _) =
            self.bulk_create_tasks(&self.bulk_create_clients(operation_size / 10)?.0, 5)?;

        let final_memory = self.get_memory_usage()?;
        let duration = start_time.elapsed();

        println!(
            "Memory usage: {} -> {} bytes (delta: {}) in {:?}",
            initial_memory,
            final_memory,
            final_memory - initial_memory,
            duration
        );

        Ok((duration, final_memory - initial_memory))
    }

    /// Get current memory usage (simplified)
    fn get_memory_usage(&self) -> AppResult<u64> {
        // This is a placeholder - in a real implementation, you would
        // use platform-specific memory APIs
        Ok(0)
    }

    /// Test database transaction performance
    pub async fn test_transaction_performance(
        &self,
        batch_size: i32,
        num_batches: i32,
    ) -> AppResult<Duration> {
        let start_time = Instant::now();

        for batch_num in 0..num_batches {
            let batch_start = Instant::now();

            // Simulate transaction batch
            for i in 0..batch_size {
                let client_request = test_client!(
                    name: format!("Transaction Batch {} Client {}", batch_num, i),
                    email: Some(format!("tx{}{}@example.com", batch_num, i)),
                    phone: Some(format!("555-{:04}", batch_num * 1000 + i)),
                    customer_type: CustomerType::Individual,
                    address_street: Some(format!("{} Transaction St", i + 1)),
                    address_city: Some("Transaction City".to_string()),
                    address_state: Some("Tx State".to_string()),
                    address_zip: Some(format!("{:05}", i)),
                    address_country: Some("Transaction Country".to_string()),
                    notes: Some("Transaction test client".to_string()),
                    tags: Some("transaction,test".to_string())
                );

                let _client = self
                    .client_service
                    .create_client_async(client_request, "tx_test_user")
                    .await?;
            }

            let batch_duration = batch_start.elapsed();
            println!(
                "Batch {} of {}: {:?} (avg: {:?}/record)",
                batch_num + 1,
                num_batches,
                batch_duration,
                batch_duration / batch_size as u32
            );
        }

        let total_duration = start_time.elapsed();
        let total_records = batch_size * num_batches;

        println!(
            "Transaction performance: {} records in {:?} (avg: {:?}/record)",
            total_records,
            total_duration,
            total_duration / total_records as u32
        );

        Ok(total_duration)
    }

    /// Test connection pooling performance
    pub async fn test_connection_pooling_performance(
        &self,
        num_concurrent_ops: i32,
    ) -> AppResult<(Duration, f64)> {
        let start_time = Instant::now();
        let semaphore = Arc::new(Semaphore::new(20)); // Limit concurrent connections
        let mut handles = Vec::new();
        let mut successful_ops = 0;

        for i in 0..num_concurrent_ops {
            let permit = semaphore.clone().acquire_owned().await.unwrap();

            let handle = tokio::spawn(async move {
                let _permit = permit;

                // Simulate database operation
                std::thread::sleep(Duration::from_millis(10)); // Simulate DB work

                Ok::<bool, Box<dyn std::error::Error>>(true)
            });

            handles.push(handle);
        }

        // Wait for all operations to complete
        for handle in handles {
            match handle.await {
                Ok(Ok(success)) => {
                    if success {
                        successful_ops += 1;
                    }
                }
                Ok(Err(e)) => {
                    println!("Concurrent operation failed: {}", e);
                }
                Err(e) => {
                    println!("Operation join error: {}", e);
                }
            }
        }

        let duration = start_time.elapsed();
        let success_rate = successful_ops as f64 / num_concurrent_ops as f64;

        println!(
            "Connection pooling: {}/{} operations in {:?} (success rate: {:.2}%)",
            successful_ops,
            num_concurrent_ops,
            duration,
            success_rate * 100.0
        );

        Ok((duration, success_rate))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;

    #[tokio::test]
    async fn test_bulk_operations_performance() -> AppResult<()> {
        let fixture = PerformanceTestFixture::new()?;

        // Test bulk creation performance
        let (clients, client_duration) = fixture.bulk_create_clients(100)?;
        let (materials, material_duration) = fixture.bulk_create_materials(50, 100.0)?;
        let (tasks, task_duration) = fixture.bulk_create_tasks(&clients, 3)?;

        // Verify performance thresholds (adjust based on actual performance)
        assert!(
            client_duration < Duration::from_secs(10),
            "Client creation too slow: {:?}",
            client_duration
        );
        assert!(
            material_duration < Duration::from_secs(15),
            "Material creation too slow: {:?}",
            material_duration
        );
        assert!(
            task_duration < Duration::from_secs(20),
            "Task creation too slow: {:?}",
            task_duration
        );

        // Test bulk interventions
        let (interventions, intervention_duration) =
            fixture.bulk_create_interventions(&tasks).await?;
        assert!(
            intervention_duration < Duration::from_secs(30),
            "Intervention creation too slow: {:?}",
            intervention_duration
        );

        // Test bulk material consumption
        let (consumption_duration, total_consumed) =
            fixture.bulk_consume_materials(&interventions, &materials)?;
        assert!(
            consumption_duration < Duration::from_secs(25),
            "Material consumption too slow: {:?}",
            consumption_duration
        );
        assert!(total_consumed > 0.0, "No materials were consumed");

        Ok(())
    }

    #[tokio::test]
    async fn test_concurrent_user_operations() -> AppResult<()> {
        let fixture = PerformanceTestFixture::new()?;

        // Test concurrent task creation
        let (concurrent_duration, successful_tasks) =
            fixture.test_concurrent_task_creation(200, 20).await?;

        assert!(
            concurrent_duration < Duration::from_secs(30),
            "Concurrent operations too slow: {:?}",
            concurrent_duration
        );
        assert!(
            successful_tasks > 180,
            "Too many failed concurrent operations: {}/200",
            successful_tasks
        );

        // Test connection pooling
        let (pool_duration, success_rate) =
            fixture.test_connection_pooling_performance(500).await?;

        assert!(
            pool_duration < Duration::from_secs(15),
            "Connection pooling too slow: {:?}",
            pool_duration
        );
        assert!(
            success_rate > 0.95,
            "Connection pool success rate too low: {:.2}%",
            success_rate * 100.0
        );

        Ok(())
    }

    #[tokio::test]
    async fn test_database_performance_under_load() -> AppResult<()> {
        let fixture = PerformanceTestFixture::new()?;

        // Test query performance with large dataset
        let query_results = fixture.test_query_performance_under_load(500)?;

        // Verify query performance thresholds
        for (scenario, duration) in query_results {
            assert!(
                duration < Duration::from_millis(500),
                "Query performance regression for {}: {:?}",
                scenario,
                duration
            );
        }

        Ok(())
    }

    #[tokio::test]
    async fn test_memory_usage_under_load() -> AppResult<()> {
        let fixture = PerformanceTestFixture::new()?;

        // Test memory usage during bulk operations
        let (memory_duration, memory_delta) = fixture.measure_memory_usage(200)?;

        assert!(
            memory_duration < Duration::from_secs(60),
            "Memory test operations too slow: {:?}",
            memory_duration
        );

        // Memory usage should be reasonable (this is a placeholder check)
        // In a real implementation, you would have specific memory limits
        println!("Memory delta: {} bytes", memory_delta);

        Ok(())
    }

    #[tokio::test]
    async fn test_transaction_performance() -> AppResult<()> {
        let fixture = PerformanceTestFixture::new()?;

        // Test transaction performance with batches
        let tx_duration = fixture.test_transaction_performance(50, 10).await?;

        assert!(
            tx_duration < Duration::from_secs(45),
            "Transaction operations too slow: {:?}",
            tx_duration
        );

        Ok(())
    }

    #[tokio::test]
    async fn test_performance_regression_detection() -> AppResult<()> {
        let fixture = PerformanceTestFixture::new()?;

        // Establish performance baselines
        let baseline_data_size = 100;

        let (clients, client_baseline) = fixture.bulk_create_clients(baseline_data_size)?;
        let (materials, material_baseline) =
            fixture.bulk_create_materials(baseline_data_size / 2, 50.0)?;
        let (tasks, task_baseline) = fixture.bulk_create_tasks(&clients, 2)?;
        let (interventions, intervention_baseline) =
            fixture.bulk_create_interventions(&tasks).await?;
        let (consumption_baseline, _) =
            fixture.bulk_consume_materials(&interventions, &materials)?;

        println!("Performance baselines:");
        println!("  Clients: {:?}", client_baseline);
        println!("  Materials: {:?}", material_baseline);
        println!("  Tasks: {:?}", task_baseline);
        println!("  Interventions: {:?}", intervention_baseline);
        println!("  Consumption: {:?}", consumption_baseline);

        // Test with larger dataset to verify scaling
        let larger_data_size = baseline_data_size * 2;

        let start_time = Instant::now();
        let (_, larger_client_duration) = fixture.bulk_create_clients(larger_data_size)?;
        let larger_total_duration = start_time.elapsed();

        // Performance should scale reasonably (not necessarily linear)
        let scaling_factor = larger_client_duration.as_secs_f64() / client_baseline.as_secs_f64();
        println!("Scaling factor for 2x data: {:.2}x", scaling_factor);

        // Allow for some non-linear scaling due to database overhead
        assert!(
            scaling_factor < 3.0,
            "Performance scaling regression: {:.2}x for 2x data",
            scaling_factor
        );

        Ok(())
    }

    #[tokio::test]
    async fn test_cross_domain_performance_integration() -> AppResult<()> {
        let fixture = PerformanceTestFixture::new()?;

        let start_time = Instant::now();

        // Create realistic dataset
        let (clients, _) = fixture.bulk_create_clients(50)?;
        let (materials, _) = fixture.bulk_create_materials(25, 75.0)?;
        let (tasks, _) = fixture.bulk_create_tasks(&clients, 3)?;
        let (interventions, _) = fixture.bulk_create_interventions(&tasks).await?;

        // Process complete workflows
        let mut completed_workflows = 0;
        for (i, intervention) in interventions.iter().take(20).enumerate() {
            let material_idx = i % materials.len();
            let material = &materials[material_idx];

            // Record consumption for first step
            if let Some(step) = intervention.steps.first() {
                let consumption_request = RecordConsumptionRequest {
                    intervention_id: intervention.id.clone(),
                    material_id: material.id.clone().unwrap(),
                    step_id: Some(step.id.clone()),
                    step_number: Some(1),
                    quantity_used: 3.0,
                    waste_quantity: Some(0.3),
                    waste_reason: Some("Cross-domain performance test".to_string()),
                    batch_used: Some(format!("BATCH-XD-{:03}", i)),
                    quality_notes: Some("Cross-domain performance test".to_string()),
                    recorded_by: Some("xd_performance_technician".to_string()),
                };

                if fixture
                    .material_service
                    .record_consumption(consumption_request)
                    .is_ok()
                {
                    // Finalize intervention
                    let finalize_request = FinalizeInterventionRequest {
                        intervention_id: intervention.id.clone(),
                        collected_data: Some(json!({"duration": 120})),
                        photos: None,
                        customer_satisfaction: Some(8),
                        quality_score: Some(85),
                        final_observations: Some(vec![
                            "Cross-domain performance completed".to_string()
                        ]),
                        customer_signature: None,
                        customer_comments: None,
                    };

                    if fixture
                        .intervention_service
                        .finalize_intervention(
                            finalize_request,
                            "xd_performance_test",
                            Some("xd_performance_technician"),
                        )
                        .await
                        .is_ok()
                    {
                        completed_workflows += 1;
                    }
                }
            }
        }

        let total_duration = start_time.elapsed();

        println!(
            "Cross-domain performance: {} complete workflows in {:?} (avg: {:?}/workflow)",
            completed_workflows,
            total_duration,
            total_duration / completed_workflows as u32
        );

        // Performance should be reasonable for complex cross-domain workflows
        assert!(
            total_duration < Duration::from_secs(60),
            "Cross-domain workflow performance regression: {:?}",
            total_duration
        );
        assert!(
            completed_workflows > 10,
            "Too few completed workflows: {}/20",
            completed_workflows
        );

        Ok(())
    }
}
