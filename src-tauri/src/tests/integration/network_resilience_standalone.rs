//! Network Resilience Tests - Standalone Functions
//!
//! This module contains standalone test functions for network resilience testing

use crate::commands::AppResult;
use crate::domains::clients::infrastructure::client::ClientService;
use crate::domains::tasks::infrastructure::task_crud::TaskCrudService;
use crate::domains::clients::domain::models::client::{Client, CustomerType};
use crate::domains::interventions::domain::models::intervention::Intervention;
use crate::domains::inventory::domain::models::material::{Material, MaterialType, UnitOfMeasure};
use crate::domains::tasks::domain::models::task::{Task, TaskPriority, TaskStatus};
use crate::domains::audit::infrastructure::audit_service::{AuditEvent, AuditService};
use crate::domains::interventions::infrastructure::intervention_types::{
    AdvanceStepRequest, FinalizeInterventionRequest, StartInterventionRequest,
};
use crate::domains::interventions::infrastructure::intervention_workflow::InterventionWorkflowService;
use crate::domains::inventory::infrastructure::material::{
    CreateMaterialRequest, MaterialService, RecordConsumptionRequest, UpdateStockRequest,
};
use crate::test_utils::TestDatabase;
use crate::{test_client, test_task};
use chrono::Utc;
use serde_json::json;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tokio::time::sleep;
use uuid::Uuid;

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
        use rand::Rng;
        let mut rng = rand::thread_rng();
        rng.gen::<f64>() < self.failure_rate
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
}

/// Test database connection failure and recovery
pub async fn test_connection_failure_and_recovery() -> AppResult<()> {
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

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_connection_failure_and_recovery() -> AppResult<()> {
        super::test_connection_failure_and_recovery().await
    }
}
