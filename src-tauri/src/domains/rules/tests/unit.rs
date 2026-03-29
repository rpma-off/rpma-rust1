//! Unit tests for the `rules` domain.

#[cfg(test)]
mod tests {
    use crate::db::Database;
    use crate::domains::rules::application::services::rules_service::RulesService;
    use crate::domains::rules::domain::models::rules::{
        CreateRuleDefinitionRequest, RuleAction, RuleMode, RuleStatus, RuleTrigger,
        TestRuleRequest, UpdateRuleDefinitionRequest,
    };
    use crate::shared::context::RequestContext;
    use serde_json::json;
    use std::sync::Arc;

    fn ctx() -> RequestContext {
        RequestContext::unauthenticated("rules-test-correlation".to_string())
    }

    async fn service() -> RulesService {
        let db = Arc::new(Database::new_in_memory().await.expect("rules test db"));
        RulesService::new(db)
    }

    #[tokio::test]
    async fn test_rules_service_blocks_matching_status_rule() {
        let service = service().await;
        let request = CreateRuleDefinitionRequest {
            name: "Block finalization".to_string(),
            description: None,
            template_key: "task-status-policy".to_string(),
            trigger: RuleTrigger::TaskStatusChanged,
            mode: RuleMode::Blocking,
            conditions: json!({ "status_in": ["completed"] }),
            actions: vec![RuleAction::Block {
                message: "Completion blocked by policy".to_string(),
            }],
        };

        let created = service.create(&ctx(), request).await.expect("create rule");
        let active = service
            .update(
                &ctx(),
                &created.id,
                UpdateRuleDefinitionRequest {
                    status: Some(RuleStatus::Active),
                    ..Default::default()
                },
            )
            .await
            .expect("activate rule");

        let result = service
            .test(
                &ctx(),
                TestRuleRequest {
                    trigger: RuleTrigger::TaskStatusChanged,
                    entity_id: Some("task-1".to_string()),
                    payload: json!({ "new_status": "completed" }),
                },
            )
            .await
            .expect("evaluate rule");

        assert_eq!(active.status, RuleStatus::Active);
        assert!(!result.allowed);
        assert_eq!(
            result.message.as_deref(),
            Some("Completion blocked by policy")
        );
        assert_eq!(result.matched_rule_ids, vec![created.id]);
    }

    #[tokio::test]
    async fn test_rules_service_ignores_non_matching_priority_condition() {
        let service = service().await;
        let request = CreateRuleDefinitionRequest {
            name: "Block urgent task".to_string(),
            description: None,
            template_key: "task-priority-policy".to_string(),
            trigger: RuleTrigger::TaskCreated,
            mode: RuleMode::Blocking,
            conditions: json!({ "priority_in": ["urgent"] }),
            actions: vec![RuleAction::Block {
                message: "Urgent tasks need approval".to_string(),
            }],
        };

        let created = service.create(&ctx(), request).await.expect("create rule");
        service
            .activate(&ctx(), &created.id)
            .await
            .expect("activate rule");

        let result = service
            .test(
                &ctx(),
                TestRuleRequest {
                    trigger: RuleTrigger::TaskCreated,
                    entity_id: Some("task-2".to_string()),
                    payload: json!({ "priority": "normal" }),
                },
            )
            .await
            .expect("evaluate rule");

        assert!(result.allowed);
        assert!(result.matched_rule_ids.is_empty());
        assert!(result.message.is_none());
    }
}
