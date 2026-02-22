//! Integration tests for intervention repository
//!
//! Tests repository layer with actual database interactions including:
//! - CRUD operations with real SQLite database
//! - Foreign key constraints enforcement
//! - Transaction rollback scenarios
//! - Complex data relationships

use crate::domains::interventions::domain::models::intervention::{
    Intervention, InterventionStatus, InterventionType,
};
use crate::domains::interventions::domain::models::step::{InterventionStep, StepStatus, StepType};
use crate::domains::interventions::infrastructure::intervention_repository::InterventionRepository;
use crate::test_utils::TestDataFactory;
use crate::{test_client, test_db, test_intervention, test_task};
use chrono::Utc;

#[cfg(test)]
mod tests {
    use super::*;

    fn create_intervention_repository() -> InterventionRepository {
        let test_db = test_db!();
        InterventionRepository::new(test_db.db())
    }

    #[test]
    fn test_create_intervention_success() {
        let repo = create_intervention_repository();
        let intervention = test_intervention!(status: InterventionStatus::Pending);

        let result = repo.create(&intervention);

        assert!(result.is_ok(), "Intervention creation should succeed");
        let created = result.unwrap();
        assert!(!created.id.is_empty());
        assert_eq!(created.task_id, intervention.task_id);
        assert_eq!(created.status, InterventionStatus::Pending);
        assert!(created.created_at > 0);
        assert!(created.updated_at > 0);
    }

    #[test]
    fn test_create_intervention_with_steps() {
        let repo = create_intervention_repository();
        let mut intervention = test_intervention!(status: InterventionStatus::Pending);

        // Create the intervention first
        let created = repo
            .create(&intervention)
            .expect("Should create intervention");

        // Create steps for the intervention
        let step1 = TestDataFactory::create_test_step(&created.id, 1, None);
        let step2 = TestDataFactory::create_test_step(&created.id, 2, None);

        let created_step1 = repo.create_step(&step1).expect("Should create step 1");
        let created_step2 = repo.create_step(&step2).expect("Should create step 2");

        assert!(!created_step1.id.is_empty());
        assert!(!created_step2.id.is_empty());
        assert_eq!(created_step1.step_number, 1);
        assert_eq!(created_step2.step_number, 2);
        assert_eq!(created_step1.intervention_id, created.id);
        assert_eq!(created_step2.intervention_id, created.id);
    }

    #[test]
    fn test_create_intervention_duplicate_active() {
        let repo = create_intervention_repository();
        let task_id = uuid::Uuid::new_v4().to_string();

        // Create first intervention
        let intervention1 = test_intervention!(
            status: InterventionStatus::InProgress,
            task_id: task_id.clone()
        );
        repo.create(&intervention1)
            .expect("Should create first intervention");

        // Try to create second active intervention for same task
        let intervention2 = test_intervention!(
            status: InterventionStatus::Pending,
            task_id: task_id.clone()
        );

        let result = repo.create(&intervention2);
        assert!(
            result.is_err(),
            "Should prevent duplicate active interventions"
        );
        let error = result.unwrap_err();
        assert!(
            error.contains("constraint") || error.contains("duplicate"),
            "Error should mention constraint violation"
        );
    }

    #[test]
    fn test_create_intervention_completed_allows_duplicate() {
        let repo = create_intervention_repository();
        let task_id = uuid::Uuid::new_v4().to_string();

        // Create completed intervention
        let intervention1 = test_intervention!(
            status: InterventionStatus::Completed,
            task_id: task_id.clone()
        );
        repo.create(&intervention1)
            .expect("Should create completed intervention");

        // Should be able to create new intervention for completed one
        let intervention2 = test_intervention!(
            status: InterventionStatus::Pending,
            task_id: task_id.clone()
        );

        let result = repo.create(&intervention2);
        assert!(
            result.is_ok(),
            "Should allow new intervention after completion"
        );
    }

    #[test]
    fn test_get_intervention_by_id() {
        let repo = create_intervention_repository();
        let intervention = test_intervention!(status: InterventionStatus::Pending);
        let created = repo
            .create(&intervention)
            .expect("Should create intervention");

        // Retrieve by ID
        let retrieved = repo
            .get_by_id(&created.id)
            .expect("Should retrieve intervention");

        assert_eq!(retrieved.id, created.id);
        assert_eq!(retrieved.task_id, created.task_id);
        assert_eq!(retrieved.status, created.status);
    }

    #[test]
    fn test_get_intervention_not_found() {
        let repo = create_intervention_repository();
        let nonexistent_id = uuid::Uuid::new_v4().to_string();

        let result = repo.get_by_id(&nonexistent_id);
        assert!(result.is_err(), "Should fail for nonexistent ID");
    }

    #[test]
    fn test_get_active_by_task() {
        let repo = create_intervention_repository();
        let task_id = uuid::Uuid::new_v4().to_string();

        // Create active intervention
        let intervention = test_intervention!(
            status: InterventionStatus::InProgress,
            task_id: task_id.clone()
        );
        let created = repo
            .create(&intervention)
            .expect("Should create intervention");

        // Retrieve active intervention for task
        let retrieved = repo
            .get_active_by_task(&task_id)
            .expect("Should find active intervention");

        assert_eq!(retrieved.id, created.id);
        assert_eq!(retrieved.task_id, task_id);
        assert_eq!(retrieved.status, InterventionStatus::InProgress);
    }

    #[test]
    fn test_get_active_by_task_no_active() {
        let repo = create_intervention_repository();
        let task_id = uuid::Uuid::new_v4().to_string();

        // Create only completed intervention
        let intervention = test_intervention!(
            status: InterventionStatus::Completed,
            task_id: task_id.clone()
        );
        repo.create(&intervention)
            .expect("Should create intervention");

        // Should not find active intervention
        let result = repo.get_active_by_task(&task_id);
        assert!(result.is_err(), "Should not find active intervention");
    }

    #[test]
    fn test_update_intervention_status() {
        let repo = create_intervention_repository();
        let intervention = test_intervention!(status: InterventionStatus::Pending);
        let created = repo
            .create(&intervention)
            .expect("Should create intervention");

        // Update status
        let updated = repo
            .update_status(&created.id, InterventionStatus::InProgress)
            .expect("Should update status");

        assert_eq!(updated.id, created.id);
        assert_eq!(updated.status, InterventionStatus::InProgress);
        assert!(updated.updated_at > created.updated_at);
    }

    #[test]
    fn test_update_intervention_with_steps() {
        let repo = create_intervention_repository();
        let mut intervention = test_intervention!(status: InterventionStatus::Pending);

        // Create intervention
        let created = repo
            .create(&intervention)
            .expect("Should create intervention");

        // Create step
        let step = TestDataFactory::create_test_step(&created.id, 1, None);
        let created_step = repo.create_step(&step).expect("Should create step");

        // Update step status
        let updated_step = repo
            .update_step_status(&created_step.id, StepStatus::InProgress)
            .expect("Should update step status");

        assert_eq!(updated_step.step_status, StepStatus::InProgress);
        assert!(updated_step.updated_at > created_step.updated_at);

        // Update intervention progress
        let updated = repo
            .update_progress(&created.id, 1, 50.0)
            .expect("Should update progress");

        assert_eq!(updated.current_step, 1);
        assert_eq!(updated.completion_percentage, 50.0);
    }

    #[test]
    fn test_intervention_crud_operations() {
        let repo = create_intervention_repository();

        // Create multiple interventions
        let interventions: Vec<_> = (0..5)
            .map(|i| {
                let intervention = test_intervention!(
                    status: InterventionStatus::Pending,
                    task_id: format!("task-{}", i),
                    vehicle_plate: format!("PLATE{}", i)
                );
                repo.create(&intervention)
                    .expect("Should create intervention")
            })
            .collect();

        // Test find with filters
        let found = repo
            .find_with_filters(None, None, None, 10, 0)
            .expect("Should find interventions");
        assert_eq!(found.len(), 5);

        // Test find with status filter
        let pending = repo
            .find_with_filters(Some(&vec!["pending".to_string()]), None, None, 10, 0)
            .expect("Should find pending interventions");
        assert_eq!(pending.len(), 5);

        // Test pagination
        let page1 = repo
            .find_with_filters(None, None, None, 2, 0)
            .expect("Should get first page");
        let page2 = repo
            .find_with_filters(None, None, None, 2, 2)
            .expect("Should get second page");

        assert_eq!(page1.len(), 2);
        assert_eq!(page2.len(), 2);
        assert_ne!(page1[0].id, page2[0].id);
    }

    #[test]
    fn test_intervention_foreign_key_constraints() {
        let repo = create_intervention_repository();
        let nonexistent_task_id = uuid::Uuid::new_v4().to_string();

        let intervention = test_intervention!(task_id: nonexistent_task_id);

        // Should fail due to foreign key constraint
        let result = repo.create(&intervention);
        assert!(result.is_err(), "Should fail with foreign key constraint");
    }

    #[test]
    fn test_intervention_step_constraints() {
        let repo = create_intervention_repository();
        let intervention = test_intervention!(status: InterventionStatus::Pending);
        let created = repo
            .create(&intervention)
            .expect("Should create intervention");

        // Create step with invalid intervention ID
        let invalid_step = TestDataFactory::create_test_step("nonexistent_id", 1, None);
        let result = repo.create_step(&invalid_step);

        assert!(result.is_err(), "Should fail with foreign key constraint");
    }

    #[test]
    fn test_intervention_transaction_rollback() {
        let repo = create_intervention_repository();

        // Test transaction rollback scenario
        let intervention = test_intervention!(status: InterventionStatus::Pending);
        let created = repo
            .create(&intervention)
            .expect("Should create intervention");

        // Simulate a scenario where we need to update multiple related entities
        // and one fails, causing rollback
        let result = repo.update_with_transaction(&created.id, |conn| {
            // Update intervention
            conn.execute(
                "UPDATE interventions SET status = ?1 WHERE id = ?2",
                ["in_progress", &created.id],
            )
            .map_err(|e| e.to_string())?;

            // Try to update step that doesn't exist (should fail)
            conn.execute(
                "UPDATE intervention_steps SET step_status = ?1 WHERE id = ?2",
                ["completed", "nonexistent_step_id"],
            )
            .map_err(|e| e.to_string())?;

            Ok(())
        });

        assert!(
            result.is_err(),
            "Transaction should fail due to missing step"
        );

        // Verify intervention status was not updated (rollback worked)
        let retrieved = repo
            .get_by_id(&created.id)
            .expect("Should retrieve intervention");
        assert_eq!(
            retrieved.status,
            InterventionStatus::Pending,
            "Status should be unchanged"
        );
    }

    #[test]
    fn test_intervention_delete_cascade() {
        let repo = create_intervention_repository();
        let intervention = test_intervention!(status: InterventionStatus::Completed);
        let created = repo
            .create(&intervention)
            .expect("Should create intervention");

        // Create steps
        let step1 = TestDataFactory::create_test_step(&created.id, 1, None);
        let step2 = TestDataFactory::create_test_step(&created.id, 2, None);

        repo.create_step(&step1).expect("Should create step 1");
        repo.create_step(&step2).expect("Should create step 2");

        // Delete intervention (should cascade delete steps)
        let result = repo.delete(&created.id);
        assert!(result.is_ok(), "Should delete intervention");

        // Verify steps are also deleted
        let result1 = repo.get_step_by_id(&step1.id);
        let result2 = repo.get_step_by_id(&step2.id);

        assert!(result1.is_err(), "Step 1 should be deleted");
        assert!(result2.is_err(), "Step 2 should be deleted");
    }

    #[test]
    fn test_intervention_statistics() {
        let repo = create_intervention_repository();

        // Create interventions with different statuses
        let statuses = vec![
            InterventionStatus::Pending,
            InterventionStatus::InProgress,
            InterventionStatus::Completed,
            InterventionStatus::Cancelled,
        ];

        for (i, status) in statuses.iter().enumerate() {
            let intervention = test_intervention!(
                status: *status,
                task_id: format!("task-{}", i)
            );
            repo.create(&intervention)
                .expect("Should create intervention");
        }

        // Get statistics
        let stats = repo.get_statistics().expect("Should get statistics");

        assert_eq!(stats.total, 4);
        assert_eq!(stats.pending, 1);
        assert_eq!(stats.in_progress, 1);
        assert_eq!(stats.completed, 1);
        assert_eq!(stats.cancelled, 1);
    }

    #[test]
    fn test_intervention_search_by_vehicle() {
        let repo = create_intervention_repository();

        // Create interventions with specific vehicle info
        let intervention1 = test_intervention!(
            vehicle_plate: Some("ABC123".to_string()),
            vehicle_make: Some("Toyota".to_string()),
            vehicle_model: Some("Camry".to_string())
        );
        let intervention2 = test_intervention!(
            vehicle_plate: Some("XYZ789".to_string()),
            vehicle_make: Some("Honda".to_string()),
            vehicle_model: Some("Civic".to_string())
        );

        let created1 = repo
            .create(&intervention1)
            .expect("Should create intervention 1");
        let created2 = repo
            .create(&intervention2)
            .expect("Should create intervention 2");

        // Search by plate
        let found = repo
            .search_by_vehicle(&Some("ABC123".to_string()), None, None, 10)
            .expect("Should find by plate");
        assert_eq!(found.len(), 1);
        assert_eq!(found[0].id, created1.id);

        // Search by make
        let found = repo
            .search_by_vehicle(&None, &Some("Toyota".to_string()), None, 10)
            .expect("Should find by make");
        assert_eq!(found.len(), 1);
        assert_eq!(found[0].id, created1.id);

        // Search by model
        let found = repo
            .search_by_vehicle(&None, None, &Some("Civic".to_string()), 10)
            .expect("Should find by model");
        assert_eq!(found.len(), 1);
        assert_eq!(found[0].id, created2.id);
    }

    #[test]
    fn test_intervention_integrity_checks() {
        let repo = create_intervention_repository();
        let intervention = test_intervention!(status: InterventionStatus::Pending);
        let created = repo
            .create(&intervention)
            .expect("Should create intervention");

        // Test data integrity
        let conn = repo.get_connection().expect("Should get connection");

        // Check foreign key integrity
        let mut stmt = conn
            .prepare(
                "
            SELECT COUNT(*) FROM interventions i 
            LEFT JOIN tasks t ON i.task_id = t.id 
            WHERE i.id = ?1 AND t.id IS NULL
        ",
            )
            .expect("Should prepare query");

        let orphaned_count: i64 = stmt
            .query_row([&created.id], |row| row.get(0))
            .expect("Should execute query");

        assert_eq!(orphaned_count, 0, "Should have no orphaned interventions");

        // Check data consistency
        let mut stmt = conn
            .prepare(
                "
            SELECT COUNT(*) FROM intervention_steps s 
            LEFT JOIN interventions i ON s.intervention_id = i.id 
            WHERE s.intervention_id = ?1 AND i.id IS NULL
        ",
            )
            .expect("Should prepare steps query");

        let orphaned_steps: i64 = stmt
            .query_row([&created.id], |row| row.get(0))
            .expect("Should execute steps query");

        assert_eq!(orphaned_steps, 0, "Should have no orphaned steps");
    }

    // === Tests for list_interventions method ===

    #[test]
    fn test_list_interventions_all() {
        let repo = create_intervention_repository();

        // Create multiple interventions with different statuses
        let interventions: Vec<_> = (0..5)
            .map(|i| {
                let status = match i % 3 {
                    0 => InterventionStatus::Pending,
                    1 => InterventionStatus::InProgress,
                    _ => InterventionStatus::Completed,
                };
                test_intervention!(
                    status: status,
                    task_id: format!("task-{}", i),
                    vehicle_plate: format!("PLATE{}", i)
                )
            })
            .collect();

        // Insert all interventions
        let created_ids: Vec<_> = interventions
            .iter()
            .map(|intervention| {
                repo.create(intervention)
                    .expect("Should create intervention")
                    .id
            })
            .collect();

        // List all interventions
        let (listed, total) = repo
            .list_interventions(None, None, None, None)
            .expect("Should list interventions");

        assert_eq!(total, 5, "Should count all interventions");
        assert_eq!(listed.len(), 5, "Should return all interventions");

        // Verify order (should be DESC by created_at)
        for i in 0..listed.len() - 1 {
            assert!(
                listed[i].created_at >= listed[i + 1].created_at,
                "Should be ordered by created_at DESC"
            );
        }

        // Verify all created interventions are returned
        let listed_ids: Vec<_> = listed.iter().map(|i| i.id.clone()).collect();
        for id in created_ids {
            assert!(
                listed_ids.contains(&id),
                "Should contain created intervention"
            );
        }
    }

    #[test]
    fn test_list_interventions_with_status_filter() {
        let repo = create_intervention_repository();

        // Create interventions with different statuses
        let status_counts = [
            (InterventionStatus::Pending, 3),
            (InterventionStatus::InProgress, 2),
            (InterventionStatus::Completed, 4),
            (InterventionStatus::Cancelled, 1),
        ];

        let mut expected_by_status = std::collections::HashMap::new();
        for (status, count) in status_counts {
            expected_by_status.insert(status.to_string(), count);
            for i in 0..count {
                let intervention = test_intervention!(
                    status: status,
                    task_id: format!("task-{}-{}", status.to_string(), i),
                    vehicle_plate: format!("PLATE{}-{}", status.to_string(), i)
                );
                repo.create(&intervention)
                    .expect("Should create intervention");
            }
        }

        // Test each status filter
        for (status, expected_count) in status_counts {
            let (listed, total) = repo
                .list_interventions(Some(&status.to_string()), None, None, None)
                .expect("Should list with status filter");

            assert_eq!(total, expected_count as i64, "Should count correct number");
            assert_eq!(listed.len(), expected_count, "Should return correct number");

            // All returned interventions should have the correct status
            for intervention in &listed {
                assert_eq!(intervention.status, status, "Should have correct status");
            }
        }
    }

    #[test]
    fn test_list_interventions_with_technician_filter() {
        let repo = create_intervention_repository();

        // Create interventions for different technicians
        let technicians = ["tech1", "tech2", "tech3"];
        let interventions_per_tech = [3, 2, 4];

        for (tech_idx, technician_id) in technicians.iter().enumerate() {
            for i in 0..interventions_per_tech[tech_idx] {
                let intervention = test_intervention!(
                    status: InterventionStatus::Pending,
                    technician_id: Some(technician_id.to_string()),
                    task_id: format!("task-{}-{}", technician_id, i)
                );
                repo.create(&intervention)
                    .expect("Should create intervention");
            }
        }

        // Test filtering by each technician
        for (tech_idx, technician_id) in technicians.iter().enumerate() {
            let (listed, total) = repo
                .list_interventions(None, Some(technician_id), None, None)
                .expect("Should list with technician filter");

            let expected_count = interventions_per_tech[tech_idx] as i64;
            assert_eq!(
                total, expected_count,
                "Should count correct number for technician"
            );
            assert_eq!(
                listed.len(),
                expected_count,
                "Should return correct number for technician"
            );

            // All returned interventions should belong to the technician
            for intervention in &listed {
                assert_eq!(
                    intervention.technician_id.as_ref(),
                    Some(technician_id),
                    "Should belong to correct technician"
                );
            }
        }
    }

    #[test]
    fn test_list_interventions_with_combined_filters() {
        let repo = create_intervention_repository();

        // Create interventions with different combinations
        let technicians = ["tech1", "tech2"];
        let statuses = [InterventionStatus::Pending, InterventionStatus::InProgress];

        for technician_id in technicians {
            for status in statuses {
                let intervention = test_intervention!(
                    status: status,
                    technician_id: Some(technician_id.to_string()),
                    task_id: format!("task-{}-{}", technician_id, status.to_string())
                );
                repo.create(&intervention)
                    .expect("Should create intervention");
            }
        }

        // Test combined filter for specific technician and status
        let (listed, total) = repo
            .list_interventions(
                Some(&InterventionStatus::Pending.to_string()),
                Some("tech1"),
                None,
                None,
            )
            .expect("Should list with combined filters");

        assert_eq!(total, 1, "Should count only one matching");
        assert_eq!(listed.len(), 1, "Should return only one");

        let intervention = &listed[0];
        assert_eq!(
            intervention.status,
            InterventionStatus::Pending,
            "Should have correct status"
        );
        assert_eq!(
            intervention.technician_id.as_ref(),
            Some(&"tech1".to_string()),
            "Should have correct technician"
        );
    }

    #[test]
    fn test_list_interventions_with_pagination() {
        let repo = create_intervention_repository();

        // Create 10 interventions
        let intervention_ids: Vec<_> = (0..10)
            .map(|i| {
                let intervention = test_intervention!(
                    status: InterventionStatus::Pending,
                    task_id: format!("task-{}", i),
                    vehicle_plate: format!("PLATE{}", i)
                );
                repo.create(&intervention)
                    .expect("Should create intervention")
                    .id
            })
            .collect();

        // Test first page (limit 3, offset 0)
        let (page1, total) = repo
            .list_interventions(None, None, Some(3), Some(0))
            .expect("Should get first page");

        assert_eq!(total, 10, "Should count all interventions");
        assert_eq!(page1.len(), 3, "Should return page size");

        // Test second page (limit 3, offset 3)
        let (page2, _) = repo
            .list_interventions(None, None, Some(3), Some(3))
            .expect("Should get second page");

        assert_eq!(page2.len(), 3, "Should return page size");

        // Verify no overlap between pages
        let page1_ids: Vec<_> = page1.iter().map(|i| i.id.clone()).collect();
        let page2_ids: Vec<_> = page2.iter().map(|i| i.id.clone()).collect();

        for id in &page1_ids {
            assert!(!page2_ids.contains(id), "Pages should not overlap");
        }

        // Test last page (limit 3, offset 9)
        let (last_page, _) = repo
            .list_interventions(None, None, Some(3), Some(9))
            .expect("Should get last page");

        assert_eq!(last_page.len(), 1, "Last page should have remaining item");

        // Verify all items are accounted for
        let all_ids = [
            page1_ids,
            page2_ids,
            last_page.into_iter().map(|i| i.id).collect(),
        ]
        .concat();
        assert_eq!(all_ids.len(), 10, "Should have all items");

        for id in intervention_ids {
            assert!(
                all_ids.contains(&id),
                "Should contain all created interventions"
            );
        }
    }

    #[test]
    fn test_list_interventions_empty_result() {
        let repo = create_intervention_repository();

        // Should return empty when no interventions exist
        let (listed, total) = repo
            .list_interventions(None, None, None, None)
            .expect("Should handle empty list");

        assert_eq!(total, 0, "Should count zero");
        assert!(listed.is_empty(), "Should return empty list");
    }

    #[test]
    fn test_list_interventions_filter_no_matches() {
        let repo = create_intervention_repository();

        // Create interventions with different statuses
        let intervention = test_intervention!(
            status: InterventionStatus::Completed,
            task_id: "task-1".to_string()
        );
        repo.create(&intervention)
            .expect("Should create intervention");

        // Filter for non-existent status
        let (listed, total) = repo
            .list_interventions(Some("nonexistent_status"), None, None, None)
            .expect("Should handle no matches");

        assert_eq!(total, 0, "Should count zero matches");
        assert!(listed.is_empty(), "Should return empty list");

        // Filter for non-existent technician
        let (listed, total) = repo
            .list_interventions(None, Some("nonexistent_tech"), None, None)
            .expect("Should handle no matches");

        assert_eq!(total, 0, "Should count zero matches");
        assert!(listed.is_empty(), "Should return empty list");
    }

    #[test]
    fn test_list_interventions_performance_with_large_dataset() {
        let repo = create_intervention_repository();

        // Create many interventions
        for i in 0..100 {
            let status = match i % 4 {
                0 => InterventionStatus::Pending,
                1 => InterventionStatus::InProgress,
                2 => InterventionStatus::Completed,
                _ => InterventionStatus::Cancelled,
            };

            let intervention = test_intervention!(
                status: status,
                task_id: format!("task-{}", i),
                vehicle_plate: format!("PLATE{}", i)
            );
            repo.create(&intervention)
                .expect("Should create intervention");
        }

        // Test performance with pagination
        let start = std::time::Instant::now();
        let (first_page, total) = repo
            .list_interventions(None, None, Some(20), Some(0))
            .expect("Should handle large dataset");
        let elapsed = start.elapsed();

        assert_eq!(total, 100, "Should count all interventions");
        assert_eq!(first_page.len(), 20, "Should return page size");

        // Verify reasonable performance (should be less than 1 second)
        assert!(
            elapsed.as_millis() < 1000,
            "Query should be fast: {}ms",
            elapsed.as_millis()
        );
    }
}
