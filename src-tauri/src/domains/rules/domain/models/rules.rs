use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "snake_case")]
pub enum RuleStatus {
    Draft,
    Active,
    Disabled,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "snake_case")]
pub enum RuleMode {
    Blocking,
    Reactive,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "snake_case")]
pub enum RuleTrigger {
    TaskCreated,
    TaskStatusChanged,
    InterventionStarted,
    InterventionFinalized,
}

impl RuleTrigger {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::TaskCreated => "task_created",
            Self::TaskStatusChanged => "task_status_changed",
            Self::InterventionStarted => "intervention_started",
            Self::InterventionFinalized => "intervention_finalized",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum RuleAction {
    Block {
        message: String,
    },
    QueueIntegration {
        event_name: String,
        integration_ids: Option<Vec<String>>,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct RuleDefinition {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub template_key: String,
    pub trigger: RuleTrigger,
    pub mode: RuleMode,
    pub status: RuleStatus,
    #[ts(type = "JsonValue")]
    pub conditions: serde_json::Value,
    pub actions: Vec<RuleAction>,
    pub created_at: i64,
    pub updated_at: i64,
    pub deleted_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct CreateRuleDefinitionRequest {
    pub name: String,
    pub description: Option<String>,
    pub template_key: String,
    pub trigger: RuleTrigger,
    pub mode: RuleMode,
    #[ts(type = "JsonValue")]
    pub conditions: serde_json::Value,
    pub actions: Vec<RuleAction>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, TS)]
pub struct UpdateRuleDefinitionRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub template_key: Option<String>,
    pub trigger: Option<RuleTrigger>,
    pub mode: Option<RuleMode>,
    #[ts(type = "JsonValue | null")]
    pub conditions: Option<serde_json::Value>,
    pub actions: Option<Vec<RuleAction>>,
    pub status: Option<RuleStatus>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct TestRuleRequest {
    pub trigger: RuleTrigger,
    pub entity_id: Option<String>,
    #[ts(type = "JsonValue")]
    pub payload: serde_json::Value,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, TS)]
pub struct RuleEvaluationResult {
    pub allowed: bool,
    pub matched_rule_ids: Vec<String>,
    pub message: Option<String>,
    pub queued_actions: Vec<RuleAction>,
}
