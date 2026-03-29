//! Unit tests for the `integrations` domain.

#[cfg(test)]
mod tests {
    use crate::db::Database;
    use crate::domains::integrations::application::services::integrations_service::IntegrationsService;
    use crate::domains::integrations::domain::models::integrations::{
        CreateIntegrationRequest, IntegrationStatus, UpdateIntegrationRequest,
    };
    use crate::shared::context::RequestContext;
    use crate::shared::contracts::integration_sink::{
        IntegrationDispatchRequest, IntegrationEventSink,
    };
    use serde_json::json;
    use std::collections::HashMap;
    use std::sync::Arc;

    fn ctx() -> RequestContext {
        RequestContext::unauthenticated("integrations-test-correlation".to_string())
    }

    async fn service_and_db() -> (Arc<Database>, IntegrationsService) {
        let db = Arc::new(
            Database::new_in_memory()
                .await
                .expect("integrations test db"),
        );
        let service = IntegrationsService::new(db.clone());
        (db, service)
    }

    #[tokio::test]
    async fn test_enqueue_targets_only_active_subscribed_integrations() {
        let (db, service) = service_and_db().await;

        let active = service
            .create(
                &ctx(),
                CreateIntegrationRequest {
                    name: "Webhook A".to_string(),
                    description: None,
                    endpoint_url: "https://example.com/webhook-a".to_string(),
                    headers: HashMap::new(),
                    subscribed_events: vec!["task_created".to_string()],
                    secret_token: Some("super-secret".to_string()),
                },
            )
            .await
            .expect("create active candidate");

        service
            .update(
                &ctx(),
                &active.id,
                UpdateIntegrationRequest {
                    status: Some(IntegrationStatus::Active),
                    ..Default::default()
                },
            )
            .await
            .expect("activate integration");

        service
            .create(
                &ctx(),
                CreateIntegrationRequest {
                    name: "Webhook B".to_string(),
                    description: None,
                    endpoint_url: "https://example.com/webhook-b".to_string(),
                    headers: HashMap::new(),
                    subscribed_events: vec!["intervention_started".to_string()],
                    secret_token: None,
                },
            )
            .await
            .expect("create inactive integration");

        let queued = service
            .enqueue(IntegrationDispatchRequest {
                event_name: "task_created".to_string(),
                payload: json!({ "task_id": "task-1" }),
                correlation_id: "corr-1".to_string(),
                requested_integration_ids: None,
            })
            .await
            .expect("enqueue delivery");

        let conn = db.get_connection().expect("outbox connection");
        let outbox_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM integration_outbox", [], |row| {
                row.get(0)
            })
            .expect("count outbox");
        let has_secret: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM integration_configs WHERE encrypted_secret IS NOT NULL",
                [],
                |row| row.get(0),
            )
            .expect("count encrypted secrets");

        assert_eq!(queued, 1);
        assert_eq!(outbox_count, 1);
        assert_eq!(has_secret, 1);
    }

    #[tokio::test]
    async fn test_retry_dead_letters_moves_records_back_to_pending() {
        let (db, service) = service_and_db().await;
        let integration = service
            .create(
                &ctx(),
                CreateIntegrationRequest {
                    name: "Retry webhook".to_string(),
                    description: None,
                    endpoint_url: "https://example.com/retry".to_string(),
                    headers: HashMap::new(),
                    subscribed_events: vec!["task_created".to_string()],
                    secret_token: None,
                },
            )
            .await
            .expect("create integration");

        let integration = service
            .update(
                &ctx(),
                &integration.id,
                UpdateIntegrationRequest {
                    status: Some(IntegrationStatus::Active),
                    ..Default::default()
                },
            )
            .await
            .expect("activate integration");

        service
            .enqueue(IntegrationDispatchRequest {
                event_name: "task_created".to_string(),
                payload: json!({ "task_id": "task-9" }),
                correlation_id: "corr-retry".to_string(),
                requested_integration_ids: Some(vec![integration.id.clone()]),
            })
            .await
            .expect("enqueue delivery");

        let conn = db.get_connection().expect("retry connection");
        conn.execute(
            "UPDATE integration_outbox SET status = 'dead_letter', next_retry_at = NULL",
            [],
        )
        .expect("mark dead letter");

        let retried = service
            .retry_dead_letters(&ctx(), &integration.id)
            .await
            .expect("retry dead letters");

        let status: String = conn
            .query_row("SELECT status FROM integration_outbox LIMIT 1", [], |row| {
                row.get(0)
            })
            .expect("read retried status");

        assert_eq!(retried, 1);
        assert_eq!(status, "pending");
    }
}
