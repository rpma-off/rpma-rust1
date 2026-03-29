//! Validation tests for the `integrations` domain.

#[cfg(test)]
mod tests {
    use crate::db::Database;
    use crate::domains::integrations::application::services::integrations_service::IntegrationsService;
    use crate::domains::integrations::domain::models::integrations::CreateIntegrationRequest;
    use crate::shared::context::RequestContext;
    use std::collections::HashMap;
    use std::sync::Arc;

    fn ctx() -> RequestContext {
        RequestContext::unauthenticated("integrations-validation-correlation".to_string())
    }

    #[tokio::test]
    async fn test_create_integration_rejects_non_http_endpoint() {
        let db = Arc::new(
            Database::new_in_memory()
                .await
                .expect("integrations validation db"),
        );
        let service = IntegrationsService::new(db);

        let result = service
            .create(
                &ctx(),
                CreateIntegrationRequest {
                    name: "Bad endpoint".to_string(),
                    description: None,
                    endpoint_url: "ftp://example.com".to_string(),
                    headers: HashMap::new(),
                    subscribed_events: vec!["task_created".to_string()],
                    secret_token: None,
                },
            )
            .await;

        assert!(matches!(
            result,
            Err(crate::shared::error::AppError::Validation(message))
            if message.contains("must start with http:// or https://")
        ));
    }
}
