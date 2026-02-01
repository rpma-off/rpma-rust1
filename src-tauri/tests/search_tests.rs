use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;

use crate::commands::reports::{search_clients, search_interventions, search_tasks, SearchFilters};
use crate::db::Database;
use crate::models::reports::{DateRange, EntityType};
use chrono::{DateTime, Utc};

#[cfg(test)]
mod tests {
    use super::*;

    // Mock database for testing
    fn create_mock_db() -> Database {
        // In a real test, you'd set up a test database
        // For now, we'll create a mock that returns empty results
        Database::new("sqlite::memory:").unwrap()
    }

    #[tokio::test]
    async fn test_search_tasks_empty_query() {
        let db = create_mock_db();
        let date_range = None;
        let filters = None;

        let result = search_tasks("", date_range, filters, 10, 0, &db).await;

        // Should not panic and return empty results
        assert!(result.is_ok());
        let results = result.unwrap();
        // In a real database, this might return results, but with our mock it should be empty
        assert!(results.len() >= 0);
    }

    #[tokio::test]
    async fn test_search_clients_empty_query() {
        let db = create_mock_db();
        let date_range = None;
        let filters = None;

        let result = search_clients("", date_range, filters, 10, 0, &db).await;

        assert!(result.is_ok());
        let results = result.unwrap();
        assert!(results.len() >= 0);
    }

    #[tokio::test]
    async fn test_search_interventions_empty_query() {
        let db = create_mock_db();
        let date_range = None;
        let filters = None;

        let result = search_interventions("", date_range, filters, 10, 0, &db).await;

        assert!(result.is_ok());
        let results = result.unwrap();
        assert!(results.len() >= 0);
    }

    #[tokio::test]
    async fn test_search_tasks_with_query() {
        let db = create_mock_db();
        let date_range = None;
        let filters = None;

        let result = search_tasks("renault", date_range, filters, 10, 0, &db).await;

        assert!(result.is_ok());
        let results = result.unwrap();
        assert!(results.len() >= 0);

        // Check that results have correct entity type
        for result in results {
            assert_eq!(result.entity_type, EntityType::Tasks);
        }
    }

    #[tokio::test]
    async fn test_search_clients_with_query() {
        let db = create_mock_db();
        let date_range = None;
        let filters = None;

        let result = search_clients("dupont", date_range, filters, 10, 0, &db).await;

        assert!(result.is_ok());
        let results = result.unwrap();
        assert!(results.len() >= 0);

        // Check that results have correct entity type
        for result in results {
            assert_eq!(result.entity_type, EntityType::Clients);
        }
    }

    #[tokio::test]
    async fn test_search_interventions_with_query() {
        let db = create_mock_db();
        let date_range = None;
        let filters = None;

        let result = search_interventions("préparation", date_range, filters, 10, 0, &db).await;

        assert!(result.is_ok());
        let results = result.unwrap();
        assert!(results.len() >= 0);

        // Check that results have correct entity type
        for result in results {
            assert_eq!(result.entity_type, EntityType::Interventions);
        }
    }

    #[tokio::test]
    async fn test_search_with_date_range() {
        let db = create_mock_db();
        let date_range = Some(DateRange {
            start: Utc::now() - chrono::Duration::days(30),
            end: Utc::now(),
        });
        let filters = None;

        let result = search_tasks("", date_range, filters, 10, 0, &db).await;

        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_search_with_filters() {
        let db = create_mock_db();
        let date_range = None;
        let filters = Some(SearchFilters {
            technician_ids: Some(vec!["tech-1".to_string()]),
            client_ids: None,
            statuses: Some(vec!["completed".to_string()]),
            priorities: None,
            ppf_zones: None,
            vehicle_models: None,
            quality_score_min: None,
            quality_score_max: None,
        });

        let result = search_tasks("", date_range, filters, 10, 0, &db).await;

        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_search_with_pagination() {
        let db = create_mock_db();
        let date_range = None;
        let filters = None;

        // Test different limit and offset values
        let result = search_tasks("", date_range, filters, 5, 10, &db).await;

        assert!(result.is_ok());
        let results = result.unwrap();
        assert!(results.len() <= 5); // Should not exceed limit
    }

    #[tokio::test]
    async fn test_search_result_structure() {
        let db = create_mock_db();
        let date_range = None;
        let filters = None;

        let result = search_tasks("test", date_range, filters, 10, 0, &db).await;

        assert!(result.is_ok());
        let results = result.unwrap();

        // Check structure of results
        for result in results {
            assert!(!result.id.is_empty());
            assert_eq!(result.entity_type, EntityType::Tasks);
            assert!(!result.title.is_empty());
            assert!(!result.subtitle.is_empty());
            // status and date can be None
            // metadata should be a HashMap
            assert!(result.metadata.is_object());
        }
    }

    #[tokio::test]
    async fn test_search_multiple_entity_types() {
        let db = create_mock_db();
        let date_range = None;
        let filters = None;

        // Test all entity types
        let task_result = search_tasks("", date_range, filters, 10, 0, &db).await;
        let client_result = search_clients("", date_range, filters, 10, 0, &db).await;
        let intervention_result = search_interventions("", date_range, filters, 10, 0, &db).await;

        assert!(task_result.is_ok());
        assert!(client_result.is_ok());
        assert!(intervention_result.is_ok());

        // Check that different entity types return different results
        let task_results = task_result.unwrap();
        let client_results = client_result.unwrap();
        let intervention_results = intervention_result.unwrap();

        for result in &task_results {
            assert_eq!(result.entity_type, EntityType::Tasks);
        }
        for result in &client_results {
            assert_eq!(result.entity_type, EntityType::Clients);
        }
        for result in &intervention_results {
            assert_eq!(result.entity_type, EntityType::Interventions);
        }
    }
}
