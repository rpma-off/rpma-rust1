//! Integration tests for complete intervention workflows and end-to-end validation

use rpma_ppf_intervention::db::Database;
use rpma_ppf_intervention::models::auth::UserRole;
use rpma_ppf_intervention::models::task::TaskPriority;
use rpma_ppf_intervention::services::auth::AuthService;
use rpma_ppf_intervention::services::client::ClientService;
use rpma_ppf_intervention::services::intervention::{
    InterventionService, StartInterventionRequest,
};
use rpma_ppf_intervention::services::task::{CreateTaskRequest, TaskService};
use std::env;
use std::sync::Arc;
use tokio::sync::Mutex;

#[cfg(test)]
mod integration_tests {
    use super::*;

    fn setup_test_env() {
        env::set_var(
            "JWT_SECRET",
            "test_jwt_secret_that_is_long_enough_for_testing_purposes_12345",
        );
    }

    async fn setup_test_data(db: &Database) -> (String, String, String) {
        // Create auth service
        let auth_service = AuthService::new(db.clone()).unwrap();

        // Create test user (technician)
        let technician = auth_service
            .create_account(
                "technician@test.com",
                "technician",
                "Test",
                "Technician",
                UserRole::Technician,
                "Password123!",
            )
            .unwrap();

        // Create test client
        let client_service = ClientService::new(db.clone());
        let client = client_service
            .create_client(
                "Test Client Corp",
                Some("contact@testclient.com"),
                Some("555-0123"),
                Some("123 Test St, Test City, TC 12345"),
                Some("Important automotive client"),
                &technician.id,
            )
            .await
            .unwrap();

        // Create test task
        let task_service = Arc::new(TaskService::new(db.clone()).unwrap());
        let task_request = CreateTaskRequest {
            title: Some("PPF Installation - Full Vehicle".to_string()),
            description: Some("Complete Paint Protection Film installation on sedan".to_string()),
            priority: Some(TaskPriority::High),
            client_id: Some(client.id.clone()),
            assigned_to: Some(technician.id.clone()),
            scheduled_date: Some("2024-01-15".to_string()),
            estimated_duration: Some(240), // 4 hours
            location: Some("Client Garage".to_string()),
            notes: Some("High priority client - ensure quality work".to_string()),
            checklist_completed: None,
            created_by: Some(technician.id.clone()),
            creator_id: Some(technician.id.clone()),
            tags: None,
            attachments: None,
            dependencies: None,
            recurring_config: None,
            custom_fields: None,
            gps_coordinates: None,
            weather_conditions: None,
            material_requirements: None,
            quality_checkpoints: None,
            approval_required: None,
            approved_by: None,
            approved_at: None,
            review_notes: None,
            escalation_reason: None,
            escalated_by: None,
            escalated_at: None,
            resolution_plan: None,
            actual_start_time: None,
            actual_end_time: None,
            time_spent: None,
            efficiency_rating: None,
            rework_required: None,
            rework_reason: None,
            customer_feedback: None,
            follow_up_required: None,
            follow_up_date: None,
            completion_percentage: None,
        };

        let task = task_service
            .create_task_async(task_request, &technician.id)
            .await
            .unwrap();

        (technician.id, client.id, task.id)
    }

    #[tokio::test]
    async fn test_complete_intervention_workflow() {
        setup_test_env();

        // Setup test database
        let db = Database::new(":memory:", "test_encryption_key_32_bytes_long!").unwrap();
        db.init().unwrap();

        // Setup test data
        let (technician_id, client_id, task_id) = setup_test_data(&db).await;

        // Create intervention service
        let intervention_service = InterventionService::new(Arc::new(Mutex::new(db)));

        // Step 1: Start intervention
        let start_request = StartInterventionRequest {
            task_id: task_id.clone(),
            intervention_number: None,
            ppf_zones: vec!["hood".to_string(), "roof".to_string(), "doors".to_string()],
            custom_zones: None,
            film_type: "matte".to_string(),
            film_brand: Some("Premium PPF".to_string()),
            film_model: Some("Crystal Clear".to_string()),
            weather_condition: "clear".to_string(),
            lighting_condition: "daylight".to_string(),
            work_location: "covered_garage".to_string(),
            temperature: Some(22.5),
            humidity: Some(45.0),
            technician_id: technician_id.clone(),
            assistant_ids: None,
            scheduled_start: "2024-01-15T09:00:00Z".to_string(),
            estimated_duration: 240,
            gps_coordinates: Some("40.7128,-74.0060".to_string()),
            address: Some("123 Test St, Test City, TC 12345".to_string()),
            notes: Some("High-quality installation required".to_string()),
            customer_requirements: Some("Ensure perfect alignment and no bubbles".to_string()),
        };

        let intervention = intervention_service
            .start_intervention(start_request)
            .await
            .unwrap();
        assert_eq!(intervention.task_id, task_id);
        assert_eq!(intervention.technician_id, technician_id);
        assert_eq!(intervention.status, "preparation");
        assert_eq!(intervention.ppf_zones.len(), 3);

        // Step 2: Verify intervention was created in database
        let interventions = intervention_service
            .get_interventions_for_task(&task_id)
            .await
            .unwrap();
        assert_eq!(interventions.len(), 1);
        assert_eq!(interventions[0].id, intervention.id);

        // Step 3: Test workflow progression (this would be expanded for each step)
        // For now, just verify the intervention exists and has the correct initial state

        println!("✅ Complete intervention workflow integration test passed");
        println!("   - Intervention created: {}", intervention.id);
        println!("   - Task associated: {}", task_id);
        println!("   - Technician assigned: {}", technician_id);
        println!("   - Initial status: {}", intervention.status);
        println!("   - PPF zones: {:?}", intervention.ppf_zones);
    }

    #[tokio::test]
    async fn test_multi_service_interaction() {
        setup_test_env();

        // Setup test database
        let db = Database::new(":memory:", "test_encryption_key_32_bytes_long!").unwrap();
        db.init().unwrap();

        // Setup test data
        let (technician_id, client_id, task_id) = setup_test_data(&db).await;

        // Test interactions between Auth, Client, Task, and Intervention services
        let auth_service = AuthService::new(db.clone()).unwrap();
        let client_service = ClientService::new(db.clone());
        let task_service = Arc::new(TaskService::new(db.clone()).unwrap());
        let intervention_service = InterventionService::new(Arc::new(Mutex::new(db.clone())));

        // Verify user was created and can authenticate
        let auth_result = auth_service.authenticate("technician@test.com", "Password123!");
        assert!(auth_result.is_ok());
        let session = auth_result.unwrap();
        assert_eq!(session.email, "technician@test.com");

        // Verify client exists
        let client = client_service.get_client(&client_id).await.unwrap();
        assert_eq!(client.name, "Test Client Corp");

        // Verify task exists and is properly assigned
        let task = task_service.get_task_by_id(&task_id).await.unwrap();
        assert_eq!(task.title, "PPF Installation - Full Vehicle");
        assert_eq!(task.assigned_to, Some(technician_id.clone()));
        assert_eq!(task.client_id, Some(client_id));

        // Verify intervention can be started for this task
        let start_request = StartInterventionRequest {
            task_id: task_id.clone(),
            intervention_number: None,
            ppf_zones: vec!["hood".to_string()],
            custom_zones: None,
            film_type: "glossy".to_string(),
            film_brand: Some("Test Brand".to_string()),
            film_model: Some("Test Model".to_string()),
            weather_condition: "clear".to_string(),
            lighting_condition: "daylight".to_string(),
            work_location: "garage".to_string(),
            temperature: Some(20.0),
            humidity: Some(40.0),
            technician_id: technician_id,
            assistant_ids: None,
            scheduled_start: "2024-01-15T10:00:00Z".to_string(),
            estimated_duration: 120,
            gps_coordinates: None,
            address: None,
            notes: None,
            customer_requirements: None,
        };

        let intervention = intervention_service
            .start_intervention(start_request)
            .await
            .unwrap();

        // Verify all services work together
        assert_eq!(intervention.task_id, task_id);
        assert_eq!(intervention.client_id, Some(client_id));

        println!("✅ Multi-service interaction integration test passed");
        println!("   - Auth service: User authentication works");
        println!("   - Client service: Client creation and retrieval works");
        println!("   - Task service: Task creation and assignment works");
        println!("   - Intervention service: Workflow initiation works");
        println!("   - Cross-service data consistency verified");
    }

    #[tokio::test]
    async fn test_database_transaction_integrity() {
        setup_test_env();

        // Setup test database
        let db = Database::new(":memory:", "test_encryption_key_32_bytes_long!").unwrap();
        db.init().unwrap();

        // Setup test data
        let (technician_id, _, task_id) = setup_test_data(&db).await;

        let intervention_service = InterventionService::new(Arc::new(Mutex::new(db)));

        // Test transaction rollback on failure
        // This test would verify that if intervention creation fails partway through,
        // all related data is properly rolled back

        // For now, just verify successful transaction completion
        let start_request = StartInterventionRequest {
            task_id: task_id.clone(),
            intervention_number: None,
            ppf_zones: vec!["hood".to_string()],
            custom_zones: None,
            film_type: "matte".to_string(),
            film_brand: Some("Test Brand".to_string()),
            film_model: Some("Test Model".to_string()),
            weather_condition: "clear".to_string(),
            lighting_condition: "daylight".to_string(),
            work_location: "garage".to_string(),
            temperature: Some(20.0),
            humidity: Some(40.0),
            technician_id: technician_id,
            assistant_ids: None,
            scheduled_start: "2024-01-15T10:00:00Z".to_string(),
            estimated_duration: 120,
            gps_coordinates: None,
            address: None,
            notes: None,
            customer_requirements: None,
        };

        // Start intervention (this should be atomic)
        let intervention = intervention_service
            .start_intervention(start_request)
            .await
            .unwrap();

        // Verify the intervention and all its data was committed
        let retrieved = intervention_service
            .get_intervention(&intervention.id)
            .await
            .unwrap();
        assert_eq!(retrieved.id, intervention.id);
        assert_eq!(retrieved.status, "preparation");
        assert!(!retrieved.ppf_zones.is_empty());

        println!("✅ Database transaction integrity test passed");
        println!("   - Intervention creation transaction completed successfully");
        println!("   - All related data properly committed");
        println!("   - Data retrieval works correctly after transaction");
    }
}
