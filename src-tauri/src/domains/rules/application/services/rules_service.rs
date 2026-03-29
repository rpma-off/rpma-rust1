use async_trait::async_trait;
use std::sync::Arc;

use crate::db::Database;
use crate::domains::rules::domain::models::rules::{
    CreateRuleDefinitionRequest, RuleAction, RuleDefinition, RuleEvaluationResult, RuleMode,
    RuleStatus, RuleTrigger, TestRuleRequest, UpdateRuleDefinitionRequest,
};
use crate::domains::rules::infrastructure::rules_repository::{
    RuleExecutionRecord, RulesRepository, SqliteRulesRepository,
};
use crate::shared::context::RequestContext;
use crate::shared::contracts::rules_engine::{
    BlockingRuleEngine, RuleCheckOutcome, RuleCheckRequest,
};
use crate::shared::error::{AppError, AppResult};
use chrono::Utc;
use tracing::warn;
use uuid::Uuid;

pub struct RulesService {
    repo: Arc<dyn RulesRepository>,
}

impl std::fmt::Debug for RulesService {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("RulesService")
            .field("repo", &"Arc<dyn RulesRepository>")
            .finish()
    }
}

impl RulesService {
    pub fn new(db: Arc<Database>) -> Self {
        Self {
            repo: Arc::new(SqliteRulesRepository::new(db)),
        }
    }

    pub async fn list(&self, _ctx: &RequestContext) -> AppResult<Vec<RuleDefinition>> {
        self.repo.list().await
    }

    pub async fn get(&self, id: &str, _ctx: &RequestContext) -> AppResult<RuleDefinition> {
        self.repo.get(id).await
    }

    pub async fn create(
        &self,
        _ctx: &RequestContext,
        request: CreateRuleDefinitionRequest,
    ) -> AppResult<RuleDefinition> {
        self.validate_request(&request.name, &request.template_key, &request.actions)?;
        let now = Utc::now().timestamp_millis();
        let rule = RuleDefinition {
            id: Uuid::new_v4().to_string(),
            name: request.name.trim().to_string(),
            description: request.description.map(|value| value.trim().to_string()),
            template_key: request.template_key.trim().to_string(),
            trigger: request.trigger,
            mode: request.mode,
            status: RuleStatus::Draft,
            conditions: request.conditions,
            actions: request.actions,
            created_at: now,
            updated_at: now,
            deleted_at: None,
        };
        self.repo.create(&rule).await?;
        Ok(rule)
    }

    pub async fn update(
        &self,
        _ctx: &RequestContext,
        id: &str,
        request: UpdateRuleDefinitionRequest,
    ) -> AppResult<RuleDefinition> {
        let mut existing = self.repo.get(id).await?;
        if let Some(name) = request.name {
            existing.name = name.trim().to_string();
        }
        if let Some(description) = request.description {
            existing.description = Some(description.trim().to_string());
        }
        if let Some(template_key) = request.template_key {
            existing.template_key = template_key.trim().to_string();
        }
        if let Some(trigger) = request.trigger {
            existing.trigger = trigger;
        }
        if let Some(mode) = request.mode {
            existing.mode = mode;
        }
        if let Some(conditions) = request.conditions {
            existing.conditions = conditions;
        }
        if let Some(actions) = request.actions {
            existing.actions = actions;
        }
        if let Some(status) = request.status {
            existing.status = status;
        }
        existing.updated_at = Utc::now().timestamp_millis();
        self.validate_request(&existing.name, &existing.template_key, &existing.actions)?;
        self.repo.update(&existing).await?;
        Ok(existing)
    }

    pub async fn activate(&self, _ctx: &RequestContext, id: &str) -> AppResult<RuleDefinition> {
        let mut rule = self.repo.get(id).await?;
        rule.status = RuleStatus::Active;
        rule.updated_at = Utc::now().timestamp_millis();
        self.repo.update(&rule).await?;
        Ok(rule)
    }

    pub async fn disable(&self, _ctx: &RequestContext, id: &str) -> AppResult<RuleDefinition> {
        let mut rule = self.repo.get(id).await?;
        rule.status = RuleStatus::Disabled;
        rule.updated_at = Utc::now().timestamp_millis();
        self.repo.update(&rule).await?;
        Ok(rule)
    }

    pub async fn delete(&self, _ctx: &RequestContext, id: &str) -> AppResult<RuleDefinition> {
        let mut rule = self.repo.get(id).await?;
        let now = Utc::now().timestamp_millis();
        rule.status = RuleStatus::Disabled;
        rule.updated_at = now;
        rule.deleted_at = Some(now);
        self.repo.update(&rule).await?;
        Ok(rule)
    }

    pub async fn test(
        &self,
        ctx: &RequestContext,
        request: TestRuleRequest,
    ) -> AppResult<RuleEvaluationResult> {
        let outcome = self
            .evaluate(&RuleCheckRequest {
                trigger: request.trigger.as_str().to_string(),
                entity_id: request.entity_id,
                payload: request.payload,
                user_id: ctx.auth.user_id.clone(),
                correlation_id: ctx.correlation_id.clone(),
            })
            .await?;
        Ok(RuleEvaluationResult {
            allowed: outcome.allowed,
            matched_rule_ids: outcome.matched_rule_ids,
            message: outcome.message,
            queued_actions: Vec::new(),
        })
    }

    fn validate_request(
        &self,
        name: &str,
        template_key: &str,
        actions: &[RuleAction],
    ) -> AppResult<()> {
        if name.trim().is_empty() {
            return Err(AppError::Validation("Rule name is required".to_string()));
        }
        if template_key.trim().is_empty() {
            return Err(AppError::Validation(
                "Rule template_key is required".to_string(),
            ));
        }
        if actions.is_empty() {
            return Err(AppError::Validation(
                "At least one rule action is required".to_string(),
            ));
        }
        Ok(())
    }

    fn matches_conditions(&self, rule: &RuleDefinition, request: &RuleCheckRequest) -> bool {
        let conditions = match rule.conditions.as_object() {
            Some(value) => value,
            None => return true,
        };

        if let Some(task_ids) = conditions
            .get("task_id_in")
            .and_then(|value| value.as_array())
        {
            let entity_id = match request.entity_id.as_deref() {
                Some(value) => value,
                None => return false,
            };
            if !task_ids
                .iter()
                .any(|value| value.as_str() == Some(entity_id))
            {
                return false;
            }
        }

        if let Some(statuses) = conditions
            .get("status_in")
            .and_then(|value| value.as_array())
        {
            let current_status = request
                .payload
                .get("new_status")
                .and_then(|value| value.as_str())
                .or_else(|| {
                    request
                        .payload
                        .get("status")
                        .and_then(|value| value.as_str())
                });
            match current_status {
                Some(status) if statuses.iter().any(|value| value.as_str() == Some(status)) => {}
                _ => return false,
            }
        }

        if let Some(priorities) = conditions
            .get("priority_in")
            .and_then(|value| value.as_array())
        {
            let current_priority = request
                .payload
                .get("priority")
                .and_then(|value| value.as_str());
            match current_priority {
                Some(priority)
                    if priorities
                        .iter()
                        .any(|value| value.as_str() == Some(priority)) => {}
                _ => return false,
            }
        }

        true
    }

    fn blocking_message(&self, rule: &RuleDefinition) -> Option<String> {
        rule.actions.iter().find_map(|action| match action {
            RuleAction::Block { message } => Some(message.clone()),
            _ => None,
        })
    }
}

#[async_trait]
impl BlockingRuleEngine for RulesService {
    async fn evaluate(&self, request: &RuleCheckRequest) -> Result<RuleCheckOutcome, AppError> {
        let trigger = RuleTrigger::TaskCreated.as_str();
        let active_rules = self.repo.list_active_by_trigger(&request.trigger).await?;

        let mut outcome = RuleCheckOutcome {
            allowed: true,
            matched_rule_ids: Vec::new(),
            message: None,
        };

        if request.trigger.is_empty() {
            warn!("Blocking rule evaluation received empty trigger");
            return Ok(outcome);
        }

        for rule in active_rules
            .into_iter()
            .filter(|rule| rule.mode == RuleMode::Blocking && rule.status == RuleStatus::Active)
        {
            if !self.matches_conditions(&rule, request) {
                continue;
            }
            outcome.matched_rule_ids.push(rule.id.clone());
            let message = self.blocking_message(&rule);
            let allowed = message.is_none();
            self.repo
                .log_execution(&RuleExecutionRecord {
                    id: Uuid::new_v4().to_string(),
                    rule_id: rule.id.clone(),
                    trigger: request.trigger.clone(),
                    entity_id: request.entity_id.clone(),
                    correlation_id: request.correlation_id.clone(),
                    allowed,
                    message: message.clone(),
                    created_at: Utc::now().timestamp_millis(),
                })
                .await?;
            if let Some(message) = message {
                outcome.allowed = false;
                outcome.message = Some(message);
                break;
            }
        }

        let _ = trigger;
        Ok(outcome)
    }
}
