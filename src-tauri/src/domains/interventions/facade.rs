use std::sync::Arc;

use crate::domains::interventions::application::{
    FinalizeInterventionRequest, InterventionWorkflowResponse, StartInterventionRequest,
};
use crate::domains::interventions::domain::models::intervention::{
    Intervention, InterventionProgress, InterventionWorkflowState,
};
use crate::domains::interventions::domain::models::step::InterventionStep;
use crate::domains::interventions::domain::services::workflow_state::build_workflow_state;
use crate::domains::interventions::infrastructure::intervention::InterventionService;
use crate::domains::interventions::infrastructure::intervention_scoring_service::InterventionScoringService;
use crate::domains::interventions::infrastructure::intervention_types::{
    AdvanceStepRequest, AdvanceStepResponse,
    FinalizeInterventionRequest as ServiceFinalizeInterventionRequest,
    FinalizeInterventionResponse, SaveStepProgressRequest,
    StartInterventionRequest as ServiceStartInterventionRequest, UpdateInterventionRequest,
};
use crate::shared::context::RequestContext;
use crate::shared::contracts::auth::UserRole;
use crate::shared::contracts::common::now as now_ms;
use crate::shared::contracts::events::InterventionFinalized;
use crate::shared::contracts::rules_engine::{BlockingRuleEngine, RuleCheckRequest};
use crate::shared::contracts::task_assignment::TaskAssignmentChecker;
use crate::shared::event_bus::publish_event;
use crate::shared::ipc::errors::AppError;
use chrono::Utc;

/// Facade for the Interventions bounded context.
///
/// Provides intervention lifecycle management — start, advance, finalize —
/// with input validation and error mapping.
pub struct InterventionsFacade {
    intervention_service: Arc<InterventionService>,
    /// Optional blocking rules engine. When present, `workflow_start` and
    /// `workflow_finalize` evaluate configurable rules before mutating state.
    rules_engine: Option<Arc<dyn BlockingRuleEngine>>,
}

impl std::fmt::Debug for InterventionsFacade {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("InterventionsFacade")
            .field("intervention_service", &self.intervention_service)
            .field("rules_engine_attached", &self.rules_engine.is_some())
            .finish()
    }
}

impl InterventionsFacade {
    /// TODO: document
    pub fn new(intervention_service: Arc<InterventionService>) -> Self {
        Self {
            intervention_service,
            rules_engine: None,
        }
    }

    /// Attach a blocking rules engine to the facade.
    ///
    /// Call this in production IPC handlers so that `workflow_start` and
    /// `workflow_finalize` enforce configurable business rules. Test code that
    /// does not care about rule evaluation can omit this call.
    pub fn with_rules_engine(mut self, rules_engine: Arc<dyn BlockingRuleEngine>) -> Self {
        self.rules_engine = Some(rules_engine);
        self
    }

    /// TODO: document
    pub fn is_ready(&self) -> bool {
        true
    }

    /// Access the underlying intervention service.
    pub fn intervention_service(&self) -> &Arc<InterventionService> {
        &self.intervention_service
    }

    /// Validate that an intervention ID is present.
    pub fn validate_intervention_id(&self, intervention_id: &str) -> Result<(), AppError> {
        if intervention_id.trim().is_empty() {
            return Err(AppError::Validation(
                "intervention_id is required".to_string(),
            ));
        }
        Ok(())
    }

    /// Validate that a task ID is present for intervention operations.
    pub fn validate_task_id(&self, task_id: &str) -> Result<(), AppError> {
        if task_id.trim().is_empty() {
            return Err(AppError::Validation(
                "task_id is required for intervention operations".to_string(),
            ));
        }
        Ok(())
    }

    /// Enforce that the current user may access the given intervention.
    ///
    /// Only the assigned technician, admins, and supervisors are allowed.
    pub fn check_intervention_access(
        &self,
        user_id: &str,
        role: &UserRole,
        intervention: &Intervention,
    ) -> Result<(), AppError> {
        if intervention.technician_id.as_deref() != Some(user_id)
            && !matches!(role, UserRole::Admin | UserRole::Supervisor)
        {
            return Err(AppError::Authorization(
                "Not authorized to view this intervention".to_string(),
            ));
        }
        Ok(())
    }

    /// Enforce that the current user may access interventions belonging to a task.
    ///
    /// The caller must pass the result of `task_checker.check_task_assignment` as
    /// `is_assigned_to_task`. Admins and supervisors are always allowed through.
    pub fn check_task_intervention_access(
        &self,
        role: &UserRole,
        is_assigned_to_task: bool,
    ) -> Result<(), AppError> {
        if !is_assigned_to_task && !matches!(role, UserRole::Admin | UserRole::Supervisor) {
            return Err(AppError::Authorization(
                "Not authorized to view interventions for this task".to_string(),
            ));
        }
        Ok(())
    }

    fn ensure_intervention_permission(&self, ctx: &RequestContext) -> Result<(), AppError> {
        if !matches!(
            ctx.auth.role,
            UserRole::Technician | UserRole::Supervisor | UserRole::Admin
        ) {
            return Err(AppError::Authorization(
                "Insufficient permissions for intervention workflow".to_string(),
            ));
        }
        Ok(())
    }

    fn ensure_technician_assignment(
        &self,
        auth: &crate::shared::context::AuthContext,
        assigned_technician_id: Option<&str>,
        action: &str,
    ) -> Result<(), AppError> {
        if auth.role == UserRole::Technician
            && assigned_technician_id != Some(auth.user_id.as_str())
        {
            return Err(AppError::Authorization(format!(
                "Technician can only {} for assigned tasks",
                action
            )));
        }
        Ok(())
    }

    async fn ensure_task_assignment(
        &self,
        ctx: &RequestContext,
        task_checker: &dyn TaskAssignmentChecker,
        task_id: &str,
        action: &str,
    ) -> Result<(), AppError> {
        if !matches!(ctx.auth.role, UserRole::Technician) {
            return Ok(());
        }

        let assignment = task_checker
            .get_task_assignment(task_id)
            .await
            .map_err(|_| AppError::Database("Failed to get task".to_string()))?
            .ok_or_else(|| AppError::NotFound(format!("Task {} not found", task_id)))?;

        self.ensure_technician_assignment(&ctx.auth, assignment.technician_id.as_deref(), action)
    }

    fn to_service_start_request(
        &self,
        request: &StartInterventionRequest,
        technician_id: &str,
    ) -> ServiceStartInterventionRequest {
        ServiceStartInterventionRequest {
            task_id: request.task_id.clone(),
            intervention_number: None,
            ppf_zones: vec![],
            custom_zones: None,
            film_type: "Standard".to_string(),
            film_brand: None,
            film_model: None,
            weather_condition: "Indoor".to_string(),
            lighting_condition: "Good".to_string(),
            work_location: "Workshop".to_string(),
            temperature: None,
            humidity: None,
            technician_id: technician_id.to_string(),
            assistant_ids: None,
            scheduled_start: Utc::now().timestamp_millis(),
            estimated_duration: request.estimated_duration_minutes.unwrap_or(60) as i32,
            gps_coordinates: None,
            address: None,
            notes: request.description.clone(),
            customer_requirements: None,
            special_instructions: None,
        }
    }

    fn to_service_finalize_request(
        &self,
        request: FinalizeInterventionRequest,
    ) -> ServiceFinalizeInterventionRequest {
        ServiceFinalizeInterventionRequest {
            intervention_id: request.intervention_id,
            collected_data: request.collected_data,
            photos: request.photos,
            customer_satisfaction: request.customer_satisfaction,
            quality_score: request.quality_score,
            final_observations: request.final_observations,
            customer_signature: request.customer_signature,
            customer_comments: request.customer_comments,
        }
    }

    pub async fn get(
        &self,
        intervention_id: String,
        ctx: &RequestContext,
    ) -> Result<Intervention, AppError> {
        self.validate_intervention_id(&intervention_id)?;
        let intervention = self
            .intervention_service
            .get_intervention(&intervention_id)
            .map_err(|_| AppError::Database("Failed to get intervention".to_string()))?
            .ok_or_else(|| {
                AppError::NotFound(format!("Intervention {} not found", intervention_id))
            })?;

        self.check_intervention_access(ctx.user_id(), &ctx.auth.role, &intervention)?;
        Ok(intervention)
    }

    pub async fn get_active_by_task(
        &self,
        task_id: String,
        ctx: &RequestContext,
        task_checker: &dyn TaskAssignmentChecker,
    ) -> Result<Vec<Intervention>, AppError> {
        self.validate_task_id(&task_id)?;
        // Technicians are restricted to tasks they are actually assigned to.
        // Admin, Supervisor, and Viewer may read any task's interventions.
        if matches!(ctx.auth.role, UserRole::Technician) {
            let assignment = task_checker
                .get_task_assignment(&task_id)
                .await
                .map_err(|_| AppError::Database("Failed to get task assignment".to_string()))?;
            let is_assigned = assignment
                .as_ref()
                .and_then(|a| a.technician_id.as_deref())
                .map_or(false, |tech_id| tech_id == ctx.user_id());
            if !is_assigned {
                return Err(AppError::Authorization(
                    "Not authorized to view interventions for this task".to_string(),
                ));
            }
        }

        let payload = match self
            .intervention_service
            .get_active_intervention_by_task(&task_id)
        {
            Ok(Some(intervention)) => vec![intervention],
            Ok(None) => vec![],
            Err(_) => {
                return Err(AppError::Database(
                    "Failed to get active interventions".to_string(),
                ))
            }
        };
        Ok(payload)
    }

    pub async fn get_latest_by_task(
        &self,
        task_id: String,
        ctx: &RequestContext,
        task_checker: &dyn TaskAssignmentChecker,
    ) -> Result<Option<Intervention>, AppError> {
        self.validate_task_id(&task_id)?;
        // Technicians are restricted to tasks they are actually assigned to.
        // Admin, Supervisor, and Viewer may read any task's interventions.
        if matches!(ctx.auth.role, UserRole::Technician) {
            let assignment = task_checker
                .get_task_assignment(&task_id)
                .await
                .map_err(|_| AppError::Database("Failed to get task assignment".to_string()))?;
            let is_assigned = assignment
                .as_ref()
                .and_then(|a| a.technician_id.as_deref())
                .map_or(false, |tech_id| tech_id == ctx.user_id());
            if !is_assigned {
                return Err(AppError::Authorization(
                    "Not authorized to view interventions for this task".to_string(),
                ));
            }
        }
        let intervention = self
            .intervention_service
            .get_latest_intervention_by_task(&task_id)
            .map_err(|_| AppError::Database("Failed to get latest intervention".to_string()))?;
        Ok(intervention)
    }

    pub async fn get_step(
        &self,
        step_id: String,
        ctx: &RequestContext,
    ) -> Result<InterventionStep, AppError> {
        let step = self
            .intervention_service
            .get_step(&step_id)
            .map_err(|_| AppError::Database("Failed to get intervention step".to_string()))?
            .ok_or_else(|| AppError::NotFound(format!("Step {} not found", step_id)))?;

        let intervention = self
            .intervention_service
            .get_intervention(&step.intervention_id)
            .map_err(|_| AppError::Database("Failed to get intervention".to_string()))?
            .ok_or_else(|| {
                AppError::NotFound(format!("Intervention {} not found", step.intervention_id))
            })?;

        self.check_intervention_access(ctx.user_id(), &ctx.auth.role, &intervention)?;
        Ok(step)
    }

    pub async fn get_progress(
        &self,
        intervention_id: String,
        ctx: &RequestContext,
    ) -> Result<InterventionProgress, AppError> {
        self.ensure_intervention_permission(ctx)?;
        self.validate_intervention_id(&intervention_id)?;
        let intervention = self
            .intervention_service
            .get_intervention(&intervention_id)
            .map_err(|_| AppError::Database("Failed to get intervention".to_string()))?
            .ok_or_else(|| {
                AppError::NotFound(format!("Intervention {} not found", intervention_id))
            })?;
        self.check_intervention_access(ctx.user_id(), &ctx.auth.role, &intervention)?;
        let progress = self
            .intervention_service
            .get_progress(&intervention_id)
            .map_err(|_| AppError::Database("Failed to get intervention progress".to_string()))?;
        Ok(progress)
    }

    pub async fn get_progress_with_steps(
        &self,
        intervention_id: String,
        ctx: &RequestContext,
    ) -> Result<(InterventionProgress, InterventionWorkflowState, Vec<InterventionStep>), AppError> {
        self.ensure_intervention_permission(ctx)?;
        self.validate_intervention_id(&intervention_id)?;
        let intervention = self
            .intervention_service
            .get_intervention(&intervention_id)
            .map_err(|_| AppError::Database("Failed to get intervention".to_string()))?
            .ok_or_else(|| {
                AppError::NotFound(format!("Intervention {} not found", intervention_id))
            })?;
        self.check_intervention_access(ctx.user_id(), &ctx.auth.role, &intervention)?;
        let steps = self
            .intervention_service
            .get_intervention_steps(&intervention_id)
            .map_err(|_| AppError::Database("Failed to get intervention steps".to_string()))?;
        let workflow_state = build_workflow_state(&intervention, &steps);
        let progress = InterventionScoringService::build_progress_from_state(
            &intervention_id,
            intervention.status,
            &workflow_state,
        );
        Ok((progress, workflow_state, steps))
    }

    pub async fn advance_step(
        &self,
        intervention_id: String,
        step_id: String,
        collected_data: serde_json::Value,
        photos: Option<Vec<String>>,
        notes: Option<String>,
        quality_check_passed: bool,
        issues: Option<Vec<String>>,
        ctx: &RequestContext,
    ) -> Result<AdvanceStepResponse, AppError> {
        self.ensure_intervention_permission(ctx)?;
        self.validate_intervention_id(&intervention_id)?;
        let intervention = self
            .intervention_service
            .get_intervention(&intervention_id)
            .map_err(|_| AppError::Database("Failed to get intervention".to_string()))?
            .ok_or_else(|| {
                AppError::NotFound(format!("Intervention {} not found", intervention_id))
            })?;
        self.check_intervention_access(ctx.user_id(), &ctx.auth.role, &intervention)?;
        let response = self
            .intervention_service
            .advance_step(
                AdvanceStepRequest {
                    intervention_id,
                    step_id,
                    collected_data,
                    photos,
                    notes,
                    quality_check_passed,
                    issues,
                },
                &ctx.correlation_id,
                Some(ctx.user_id()),
            )
            .await
            .map_err(AppError::from)?;
        Ok(response)
    }

    pub async fn save_step_progress(
        &self,
        step_id: String,
        intervention_id: Option<String>,
        collected_data: serde_json::Value,
        notes: Option<String>,
        photos: Option<Vec<String>>,
        ctx: &RequestContext,
    ) -> Result<InterventionStep, AppError> {
        self.ensure_intervention_permission(ctx)?;
        let step = self
            .intervention_service
            .get_step(&step_id)
            .map_err(|_| AppError::Database("Failed to get intervention step".to_string()))?
            .ok_or_else(|| AppError::NotFound(format!("Step {} not found", step_id)))?;

        let resolved_intervention_id =
            intervention_id.unwrap_or_else(|| step.intervention_id.clone());

        if step.intervention_id != resolved_intervention_id {
            return Err(AppError::Validation(format!(
                "Step {} does not belong to intervention {}",
                step_id, resolved_intervention_id
            )));
        }

        let intervention = self
            .intervention_service
            .get_intervention(&resolved_intervention_id)
            .map_err(|_| AppError::Database("Failed to get intervention".to_string()))?
            .ok_or_else(|| {
                AppError::NotFound(format!(
                    "Intervention {} not found",
                    resolved_intervention_id
                ))
            })?;
        self.check_intervention_access(ctx.user_id(), &ctx.auth.role, &intervention)?;

        let step = self
            .intervention_service
            .save_step_progress(
                SaveStepProgressRequest {
                    step_id,
                    collected_data,
                    notes,
                    photos,
                },
                &ctx.correlation_id,
                Some(ctx.user_id()),
            )
            .await
            .map_err(AppError::from)?;
        Ok(step)
    }

    pub async fn start(
        &self,
        request: StartInterventionRequest,
        ctx: &RequestContext,
        task_checker: &dyn TaskAssignmentChecker,
    ) -> Result<Intervention, AppError> {
        self.ensure_intervention_permission(ctx)?;
        self.ensure_task_assignment(ctx, task_checker, &request.task_id, "start interventions")
            .await?;
        match self
            .intervention_service
            .get_active_intervention_by_task(&request.task_id)
        {
            Ok(Some(_)) => {
                return Err(AppError::Validation(format!(
                    "An active intervention already exists for task {}",
                    request.task_id
                )))
            }
            Ok(None) => {}
            Err(_) => {
                return Err(AppError::Database(
                    "Failed to validate existing interventions".to_string(),
                ))
            }
        }
        let response = self
            .intervention_service
            .start_intervention(
                self.to_service_start_request(&request, ctx.user_id()),
                ctx.user_id(),
                &ctx.correlation_id,
            )
            .map_err(|_| AppError::Database("Failed to start intervention".to_string()))?;
        Ok(response.intervention)
    }

    pub async fn update(
        &self,
        id: String,
        data: UpdateInterventionRequest,
        ctx: &RequestContext,
    ) -> Result<Intervention, AppError> {
        self.ensure_intervention_permission(ctx)?;
        let intervention = self
            .intervention_service
            .get_intervention(&id)
            .map_err(|_| AppError::Database("Failed to get intervention".to_string()))?
            .ok_or_else(|| AppError::NotFound(format!("Intervention {} not found", id)))?;
        self.ensure_technician_assignment(
            &ctx.auth,
            intervention.technician_id.as_deref(),
            "update interventions",
        )?;
        let updated = self
            .intervention_service
            .update_intervention(&id, data)
            .map_err(|_| AppError::Database("Failed to update intervention".to_string()))?;
        Ok(updated)
    }

    pub async fn delete(&self, id: String, ctx: &RequestContext) -> Result<(), AppError> {
        self.ensure_intervention_permission(ctx)?;
        let intervention = self
            .intervention_service
            .get_intervention(&id)
            .map_err(|_| AppError::Database("Failed to get intervention".to_string()))?
            .ok_or_else(|| AppError::NotFound(format!("Intervention {} not found", id)))?;
        if intervention.technician_id.as_deref() != Some(ctx.user_id())
            && !matches!(ctx.auth.role, UserRole::Admin | UserRole::Supervisor)
        {
            return Err(AppError::Authorization(
                "Not authorized to delete this intervention".to_string(),
            ));
        }
        self.intervention_service
            .delete_intervention(&id)
            .map_err(|_| AppError::Database("Failed to delete intervention".to_string()))?;
        Ok(())
    }

    pub async fn finalize(
        &self,
        request: FinalizeInterventionRequest,
        ctx: &RequestContext,
    ) -> Result<FinalizeInterventionResponse, AppError> {
        self.ensure_intervention_permission(ctx)?;
        let response = self
            .intervention_service
            .finalize_intervention(
                self.to_service_finalize_request(request),
                &ctx.correlation_id,
                Some(ctx.user_id()),
            )
            .map_err(|e| AppError::Database(format!("Failed to finalize intervention: {e}")))?;
        // Emit here (application layer) — infrastructure must not publish events.
        let completed_at_ms = response
            .intervention
            .completed_at
            .inner()
            .unwrap_or_else(now_ms);
        let technician_id = response
            .intervention
            .technician_id
            .clone()
            .unwrap_or_else(|| ctx.user_id().to_string());
        publish_event(
            InterventionFinalized {
                intervention_id: response.intervention.id.clone(),
                task_id: response.intervention.task_id.clone(),
                technician_id,
                completed_at_ms,
            }
            .into(),
        );
        Ok(response)
    }

    pub async fn workflow_start(
        &self,
        request: StartInterventionRequest,
        ctx: &RequestContext,
        task_checker: &dyn TaskAssignmentChecker,
    ) -> Result<InterventionWorkflowResponse, AppError> {
        self.ensure_intervention_permission(ctx)?;
        self.ensure_task_assignment(ctx, task_checker, &request.task_id, "start interventions")
            .await?;

        // Evaluate configurable business rules before mutating state.
        if let Some(engine) = &self.rules_engine {
            let rule_check = engine
                .evaluate(&RuleCheckRequest {
                    trigger: "intervention_started".to_string(),
                    entity_id: Some(request.task_id.clone()),
                    payload: serde_json::json!({
                        "task_id": request.task_id.clone(),
                        "estimated_duration_minutes": request.estimated_duration_minutes,
                        "priority": request.priority,
                    }),
                    user_id: ctx.auth.user_id.clone(),
                    correlation_id: ctx.correlation_id.clone(),
                })
                .await?;
            if !rule_check.allowed {
                return Err(AppError::Validation(rule_check.message.unwrap_or_else(
                    || "Intervention start blocked by active rule".to_string(),
                )));
            }
        }

        match self
            .intervention_service
            .get_active_intervention_by_task(&request.task_id)
        {
            Ok(Some(_)) => {
                return Err(AppError::Validation(format!(
                    "An active intervention already exists for task {}",
                    request.task_id
                )))
            }
            Ok(None) => {}
            Err(_) => {
                return Err(AppError::Database(
                    "Failed to validate existing interventions".to_string(),
                ))
            }
        }
        let response = self
            .intervention_service
            .start_intervention(
                self.to_service_start_request(&request, ctx.user_id()),
                ctx.user_id(),
                &ctx.correlation_id,
            )
            .map_err(|_| AppError::Database("Failed to start intervention".to_string()))?;
        Ok(InterventionWorkflowResponse::Started {
            intervention: response.intervention,
            steps: response.steps,
        })
    }

    pub async fn workflow_get(
        &self,
        id: String,
        _ctx: &RequestContext,
    ) -> Result<InterventionWorkflowResponse, AppError> {
        let intervention = self
            .intervention_service
            .get_intervention(&id)
            .map_err(|_| AppError::Database("Failed to get intervention".to_string()))?
            .ok_or_else(|| AppError::NotFound(format!("Intervention {} not found", id)))?;
        Ok(InterventionWorkflowResponse::Retrieved { intervention })
    }

    pub async fn workflow_get_active_by_task(
        &self,
        task_id: String,
        _ctx: &RequestContext,
    ) -> Result<InterventionWorkflowResponse, AppError> {
        let intervention = self
            .intervention_service
            .get_active_intervention_by_task(&task_id)
            .map_err(|_| AppError::Database("Failed to get active intervention".to_string()))?;
        Ok(InterventionWorkflowResponse::ActiveByTask {
            interventions: intervention.map_or(vec![], |i| vec![i]),
        })
    }

    pub async fn workflow_update(
        &self,
        id: String,
        data: UpdateInterventionRequest,
        ctx: &RequestContext,
    ) -> Result<InterventionWorkflowResponse, AppError> {
        self.ensure_intervention_permission(ctx)?;
        self.intervention_service
            .update_intervention(&id, data)
            .map_err(|_| AppError::Database("Failed to update intervention".to_string()))?;
        Ok(InterventionWorkflowResponse::Updated {
            id,
            message: "Intervention updated successfully".to_string(),
        })
    }

    pub async fn workflow_delete(
        &self,
        id: String,
        ctx: &RequestContext,
    ) -> Result<InterventionWorkflowResponse, AppError> {
        self.ensure_intervention_permission(ctx)?;
        self.intervention_service
            .delete_intervention(&id)
            .map_err(|_| AppError::Database("Failed to delete intervention".to_string()))?;
        Ok(InterventionWorkflowResponse::Deleted {
            id,
            message: "Intervention deleted".to_string(),
        })
    }

    pub async fn workflow_finalize(
        &self,
        request: FinalizeInterventionRequest,
        ctx: &RequestContext,
    ) -> Result<InterventionWorkflowResponse, AppError> {
        self.ensure_intervention_permission(ctx)?;
        let intervention = self
            .intervention_service
            .get_intervention(&request.intervention_id)
            .map_err(|_| AppError::Database("Failed to get intervention".to_string()))?
            .ok_or_else(|| {
                AppError::NotFound(format!(
                    "Intervention {} not found",
                    request.intervention_id
                ))
            })?;
        self.ensure_technician_assignment(
            &ctx.auth,
            intervention.technician_id.as_deref(),
            "finalize interventions",
        )?;

        // Evaluate configurable business rules before mutating state.
        if let Some(engine) = &self.rules_engine {
            let rule_check = engine
                .evaluate(&RuleCheckRequest {
                    trigger: "intervention_finalized".to_string(),
                    entity_id: Some(request.intervention_id.clone()),
                    payload: serde_json::json!({
                        "intervention_id": request.intervention_id.clone(),
                        "quality_score": request.quality_score,
                        "customer_satisfaction": request.customer_satisfaction,
                    }),
                    user_id: ctx.auth.user_id.clone(),
                    correlation_id: ctx.correlation_id.clone(),
                })
                .await?;
            if !rule_check.allowed {
                return Err(AppError::Validation(rule_check.message.unwrap_or_else(
                    || "Intervention finalization blocked by active rule".to_string(),
                )));
            }
        }

        let response = self
            .intervention_service
            .finalize_intervention(
                self.to_service_finalize_request(request),
                &ctx.correlation_id,
                Some(ctx.user_id()),
            )
            .map_err(|e| AppError::Database(format!("Failed to finalize intervention: {e}")))?;
        Ok(InterventionWorkflowResponse::Finalized {
            intervention: response.intervention,
        })
    }

    /// Allow any authenticated user to read the atelier intervention list.
    ///
    /// Access rules are enforced downstream by scoping:
    /// - Technician → only their own interventions (caller must apply filter)
    /// - Viewer     → all interventions, read-only (no mutation endpoints share this guard)
    /// - Admin/Supervisor → all interventions
    pub fn ensure_atelier_read_access(&self, _ctx: &RequestContext) -> Result<(), AppError> {
        Ok(())
    }

    /// Enforce that the caller is an Admin or Supervisor for management operations.
    pub fn ensure_management_access(&self, ctx: &RequestContext) -> Result<(), AppError> {
        if !matches!(ctx.auth.role, UserRole::Admin | UserRole::Supervisor) {
            return Err(AppError::Authorization(
                "Not authorized to perform management operations".to_string(),
            ));
        }
        Ok(())
    }

    /// Enforce that the caller may view statistics for the given technician.
    ///
    /// A Technician may only view their own stats; Admin and Supervisor may view any.
    pub fn check_stats_access(
        &self,
        ctx: &RequestContext,
        target_technician_id: &str,
    ) -> Result<(), AppError> {
        if target_technician_id != ctx.auth.user_id
            && !matches!(ctx.auth.role, UserRole::Admin | UserRole::Supervisor)
        {
            return Err(AppError::Authorization(
                "Not authorized to view these statistics".to_string(),
            ));
        }
        Ok(())
    }
}
