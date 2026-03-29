//! Validation tests for the `rules` domain.

#[cfg(test)]
mod tests {
    use crate::db::Database;
    use crate::domains::rules::application::services::rules_service::RulesService;
    use crate::domains::rules::domain::models::rules::{
        CreateRuleDefinitionRequest, RuleAction, RuleMode, RuleTrigger,
    };
    use crate::shared::context::RequestContext;
    use serde_json::json;
    use std::sync::Arc;

    fn ctx() -> RequestContext {
        RequestContext::unauthenticated("rules-validation-correlation".to_string())
    }

    #[tokio::test]
    async fn test_create_rule_requires_name() {
        let db = Arc::new(
            Database::new_in_memory()
                .await
                .expect("rules validation db"),
        );
        let service = RulesService::new(db);

        let result = service
            .create(
                &ctx(),
                CreateRuleDefinitionRequest {
                    name: "   ".to_string(),
                    description: None,
                    template_key: "task-policy".to_string(),
                    trigger: RuleTrigger::TaskCreated,
                    mode: RuleMode::Blocking,
                    conditions: json!({}),
                    actions: vec![RuleAction::Block {
                        message: "blocked".to_string(),
                    }],
                },
            )
            .await;

        assert!(matches!(
            result,
            Err(crate::shared::error::AppError::Validation(message))
            if message.contains("Rule name is required")
        ));
    }
}
