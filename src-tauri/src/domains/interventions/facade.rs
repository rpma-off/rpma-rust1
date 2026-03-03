use std::sync::Arc;

use crate::domains::interventions::application::{
    FinalizeInterventionRequest, InterventionWorkflowResponse, StartInterventionRequest,
};
use crate::domains::interventions::domain::models::intervention::Intervention;
use crate::domains::interventions::infrastructure::intervention::InterventionService;
use crate::domains::interventions::infrastructure::intervention_types::{
    AdvanceStepRequest, FinalizeInterventionRequest as ServiceFinalizeInterventionRequest,
    SaveStepProgressRequest, StartInterventionRequest as ServiceStartInterventionRequest,
};
use crate::shared::contracts::task_assignment::TaskAssignmentChecker;
use crate::shared::contracts::auth::UserRole;
use crate::shared::ipc::errors::AppError;
use crate::shared::ipc::CommandContext;
use chrono::Utc;

#[derive(Debug)]
pub enum InterventionsCommand {
    Get {
        intervention_id: String,
    },
    GetActiveByTask {
        task_id: String,
    },
    GetLatestByTask {
        task_id: String,
    },
    GetStep {
        intervention_id: String,
        step_id: String,
    },
    GetProgress {
        intervention_id: String,
    },
    GetProgressWithSteps {
        intervention_id: String,
    },
    AdvanceStep {
        intervention_id: String,
        step_id: String,
        collected_data: serde_json::Value,
        photos: Option<Vec<String>>,
        notes: Option<String>,
        quality_check_passed: bool,
        issues: Option<Vec<String>>,
    },
    SaveStepProgress {
        step_id: String,
        intervention_id: Option<String>,
        collected_data: serde_json::Value,
        notes: Option<String>,
        photos: Option<Vec<String>>,
    },
    Start {
        request: StartInterventionRequest,
    },
    Update {
        id: String,
        data: serde_json::Value,
    },
    Delete {
        id: String,
    },
    Finalize {
        request: FinalizeInterventionRequest,
    },
    WorkflowStart {
        request: StartInterventionRequest,
    },
    WorkflowGet {
        id: String,
    },
    WorkflowGetActiveByTask {
        task_id: String,
    },
    WorkflowUpdate {
        id: String,
        data: serde_json::Value,
    },
    WorkflowDelete {
        id: String,
    },
    WorkflowFinalize {
        request: FinalizeInterventionRequest,
    },
}

pub enum InterventionsResponse {
    Intervention(Intervention),
    InterventionList(Vec<Intervention>),
    OptionalIntervention(Option<Intervention>),
    Step(crate::domains::interventions::domain::models::step::InterventionStep),
    Progress(crate::domains::interventions::domain::models::intervention::InterventionProgress),
    ProgressWithSteps {
        progress: crate::domains::interventions::domain::models::intervention::InterventionProgress,
        steps: Vec<crate::domains::interventions::domain::models::step::InterventionStep>,
    },
    AdvancedStep(
        crate::domains::interventions::infrastructure::intervention_types::AdvanceStepResponse,
    ),
    SavedStep(crate::domains::interventions::domain::models::step::InterventionStep),
    Finalized(
        crate::domains::interventions::infrastructure::intervention_types::FinalizeInterventionResponse,
    ),
    Workflow(InterventionWorkflowResponse),
    Deleted,
}

/// Facade for the Interventions bounded context.
///
/// Provides intervention lifecycle management — start, advance, finalize —
/// with input validation and error mapping.
#[derive(Debug)]
pub struct InterventionsFacade {
    intervention_service: Arc<InterventionService>,
}

impl InterventionsFacade {
    pub fn new(intervention_service: Arc<InterventionService>) -> Self {
        Self {
            intervention_service,
        }
    }

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

    fn ensure_intervention_permission(&self, ctx: &CommandContext) -> Result<(), AppError> {
        if !matches!(
            ctx.session.role,
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
        session: &crate::shared::contracts::auth::UserSession,
        assigned_technician_id: Option<&str>,
        action: &str,
    ) -> Result<(), AppError> {
        if session.role == UserRole::Technician
            && assigned_technician_id != Some(session.user_id.as_str())
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
        ctx: &CommandContext,
        task_checker: &dyn TaskAssignmentChecker,
        task_id: &str,
        action: &str,
    ) -> Result<(), AppError> {
        if !matches!(ctx.session.role, UserRole::Technician) {
            return Ok(());
        }

        let assignment = task_checker
            .get_task_assignment(task_id)
            .await
            .map_err(|_| AppError::Database("Failed to get task".to_string()))?
            .ok_or_else(|| AppError::NotFound(format!("Task {} not found", task_id)))?;

        self.ensure_technician_assignment(&ctx.session, assignment.technician_id.as_deref(), action)
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
            scheduled_start: Utc::now().to_rfc3339(),
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

    pub async fn execute(
        &self,
        command: InterventionsCommand,
        ctx: &CommandContext,
        task_checker: &dyn TaskAssignmentChecker,
    ) -> Result<InterventionsResponse, AppError> {
        match command {
            InterventionsCommand::Get { intervention_id } => {
                self.validate_intervention_id(&intervention_id)?;
                let intervention = self
                    .intervention_service
                    .get_intervention(&intervention_id)
                    .map_err(|_| AppError::Database("Failed to get intervention".to_string()))?
                    .ok_or_else(|| {
                        AppError::NotFound(format!("Intervention {} not found", intervention_id))
                    })?;

                self.check_intervention_access(
                    &ctx.session.user_id,
                    &ctx.session.role,
                    &intervention,
                )?;
                Ok(InterventionsResponse::Intervention(intervention))
            }
            InterventionsCommand::GetActiveByTask { task_id } => {
                self.validate_task_id(&task_id)?;
                let task_access = task_checker
                    .check_task_assignment(&task_id, &ctx.session.user_id)
                    .unwrap_or(false);
                self.check_task_intervention_access(&ctx.session.role, task_access)?;

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
                Ok(InterventionsResponse::InterventionList(payload))
            }
            InterventionsCommand::GetLatestByTask { task_id } => {
                self.validate_task_id(&task_id)?;
                let task_access = task_checker
                    .check_task_assignment(&task_id, &ctx.session.user_id)
                    .unwrap_or(false);
                self.check_task_intervention_access(&ctx.session.role, task_access)?;
                let intervention = self
                    .intervention_service
                    .get_latest_intervention_by_task(&task_id)
                    .map_err(|_| {
                        AppError::Database("Failed to get latest intervention".to_string())
                    })?;
                Ok(InterventionsResponse::OptionalIntervention(intervention))
            }
            InterventionsCommand::GetStep {
                intervention_id,
                step_id,
            } => {
                self.validate_intervention_id(&intervention_id)?;
                let intervention = self
                    .intervention_service
                    .get_intervention(&intervention_id)
                    .map_err(|_| AppError::Database("Failed to get intervention".to_string()))?
                    .ok_or_else(|| {
                        AppError::NotFound(format!("Intervention {} not found", intervention_id))
                    })?;
                self.check_intervention_access(
                    &ctx.session.user_id,
                    &ctx.session.role,
                    &intervention,
                )?;
                let step = self
                    .intervention_service
                    .get_step(&step_id)
                    .map_err(|_| AppError::Database("Failed to get intervention step".to_string()))?
                    .ok_or_else(|| AppError::NotFound(format!("Step {} not found", step_id)))?;
                Ok(InterventionsResponse::Step(step))
            }
            InterventionsCommand::GetProgress { intervention_id } => {
                self.ensure_intervention_permission(ctx)?;
                self.validate_intervention_id(&intervention_id)?;
                let intervention = self
                    .intervention_service
                    .get_intervention(&intervention_id)
                    .map_err(|_| AppError::Database("Failed to get intervention".to_string()))?
                    .ok_or_else(|| {
                        AppError::NotFound(format!("Intervention {} not found", intervention_id))
                    })?;
                self.check_intervention_access(
                    &ctx.session.user_id,
                    &ctx.session.role,
                    &intervention,
                )?;
                let progress = self
                    .intervention_service
                    .get_progress(&intervention_id)
                    .map_err(|_| {
                        AppError::Database("Failed to get intervention progress".to_string())
                    })?;
                Ok(InterventionsResponse::Progress(progress))
            }
            InterventionsCommand::GetProgressWithSteps { intervention_id } => {
                self.ensure_intervention_permission(ctx)?;
                self.validate_intervention_id(&intervention_id)?;
                let intervention = self
                    .intervention_service
                    .get_intervention(&intervention_id)
                    .map_err(|_| AppError::Database("Failed to get intervention".to_string()))?
                    .ok_or_else(|| {
                        AppError::NotFound(format!("Intervention {} not found", intervention_id))
                    })?;
                self.check_intervention_access(
                    &ctx.session.user_id,
                    &ctx.session.role,
                    &intervention,
                )?;
                let progress = self
                    .intervention_service
                    .get_progress(&intervention_id)
                    .map_err(|_| {
                        AppError::Database("Failed to get intervention progress".to_string())
                    })?;
                let steps = self
                    .intervention_service
                    .get_intervention_steps(&intervention_id)
                    .map_err(|_| {
                        AppError::Database("Failed to get intervention steps".to_string())
                    })?;
                Ok(InterventionsResponse::ProgressWithSteps { progress, steps })
            }
            InterventionsCommand::AdvanceStep {
                intervention_id,
                step_id,
                collected_data,
                photos,
                notes,
                quality_check_passed,
                issues,
            } => {
                self.ensure_intervention_permission(ctx)?;
                self.validate_intervention_id(&intervention_id)?;
                let intervention = self
                    .intervention_service
                    .get_intervention(&intervention_id)
                    .map_err(|_| AppError::Database("Failed to get intervention".to_string()))?
                    .ok_or_else(|| {
                        AppError::NotFound(format!("Intervention {} not found", intervention_id))
                    })?;
                self.check_intervention_access(
                    &ctx.session.user_id,
                    &ctx.session.role,
                    &intervention,
                )?;
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
                        Some(&ctx.session.user_id),
                    )
                    .await
                    .map_err(AppError::from)?;
                Ok(InterventionsResponse::AdvancedStep(response))
            }
            InterventionsCommand::SaveStepProgress {
                step_id,
                intervention_id,
                collected_data,
                notes,
                photos,
            } => {
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
                self.check_intervention_access(
                    &ctx.session.user_id,
                    &ctx.session.role,
                    &intervention,
                )?;

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
                        Some(&ctx.session.user_id),
                    )
                    .await
                    .map_err(AppError::from)?;
                Ok(InterventionsResponse::SavedStep(step))
            }
            InterventionsCommand::Start { request } => {
                self.ensure_intervention_permission(ctx)?;
                self.ensure_task_assignment(
                    ctx,
                    task_checker,
                    &request.task_id,
                    "start interventions",
                )
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
                        self.to_service_start_request(&request, &ctx.session.user_id),
                        &ctx.session.user_id,
                        &ctx.correlation_id,
                    )
                    .map_err(|_| AppError::Database("Failed to start intervention".to_string()))?;
                Ok(InterventionsResponse::Intervention(response.intervention))
            }
            InterventionsCommand::Update { id, data } => {
                self.ensure_intervention_permission(ctx)?;
                let intervention = self
                    .intervention_service
                    .get_intervention(&id)
                    .map_err(|_| AppError::Database("Failed to get intervention".to_string()))?
                    .ok_or_else(|| AppError::NotFound(format!("Intervention {} not found", id)))?;
                self.ensure_technician_assignment(
                    &ctx.session,
                    intervention.technician_id.as_deref(),
                    "update interventions",
                )?;
                let updated = self
                    .intervention_service
                    .update_intervention(&id, data)
                    .map_err(|_| AppError::Database("Failed to update intervention".to_string()))?;
                Ok(InterventionsResponse::Intervention(updated))
            }
            InterventionsCommand::Delete { id } => {
                self.ensure_intervention_permission(ctx)?;
                let intervention = self
                    .intervention_service
                    .get_intervention(&id)
                    .map_err(|_| AppError::Database("Failed to get intervention".to_string()))?
                    .ok_or_else(|| AppError::NotFound(format!("Intervention {} not found", id)))?;
                if intervention.technician_id.as_deref() != Some(ctx.session.user_id.as_str())
                    && !matches!(ctx.session.role, UserRole::Admin | UserRole::Supervisor)
                {
                    return Err(AppError::Authorization(
                        "Not authorized to delete this intervention".to_string(),
                    ));
                }
                self.intervention_service
                    .delete_intervention(&id)
                    .map_err(|_| AppError::Database("Failed to delete intervention".to_string()))?;
                Ok(InterventionsResponse::Deleted)
            }
            InterventionsCommand::Finalize { request } => {
                self.ensure_intervention_permission(ctx)?;
                let response = self
                    .intervention_service
                    .finalize_intervention(
                        self.to_service_finalize_request(request),
                        &ctx.correlation_id,
                        Some(&ctx.session.user_id),
                    )
                    .map_err(|_| {
                        AppError::Database("Failed to finalize intervention".to_string())
                    })?;
                Ok(InterventionsResponse::Finalized(response))
            }
            InterventionsCommand::WorkflowStart { request } => {
                self.ensure_intervention_permission(ctx)?;
                self.ensure_task_assignment(
                    ctx,
                    task_checker,
                    &request.task_id,
                    "start interventions",
                )
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
                        self.to_service_start_request(&request, &ctx.session.user_id),
                        &ctx.session.user_id,
                        &ctx.correlation_id,
                    )
                    .map_err(|_| AppError::Database("Failed to start intervention".to_string()))?;
                Ok(InterventionsResponse::Workflow(
                    InterventionWorkflowResponse::Started {
                        intervention: response.intervention,
                        steps: response.steps,
                    },
                ))
            }
            InterventionsCommand::WorkflowGet { id } => {
                let intervention = self
                    .intervention_service
                    .get_intervention(&id)
                    .map_err(|_| AppError::Database("Failed to get intervention".to_string()))?
                    .ok_or_else(|| AppError::NotFound(format!("Intervention {} not found", id)))?;
                Ok(InterventionsResponse::Workflow(
                    InterventionWorkflowResponse::Retrieved { intervention },
                ))
            }
            InterventionsCommand::WorkflowGetActiveByTask { task_id } => {
                let intervention = self
                    .intervention_service
                    .get_active_intervention_by_task(&task_id)
                    .map_err(|_| {
                        AppError::Database("Failed to get active intervention".to_string())
                    })?;
                Ok(InterventionsResponse::Workflow(
                    InterventionWorkflowResponse::ActiveByTask {
                        interventions: intervention.map_or(vec![], |i| vec![i]),
                    },
                ))
            }
            InterventionsCommand::WorkflowUpdate { id, data } => {
                self.ensure_intervention_permission(ctx)?;
                self.intervention_service
                    .update_intervention(&id, data)
                    .map_err(|_| AppError::Database("Failed to update intervention".to_string()))?;
                Ok(InterventionsResponse::Workflow(
                    InterventionWorkflowResponse::Updated {
                        id,
                        message: "Intervention updated successfully".to_string(),
                    },
                ))
            }
            InterventionsCommand::WorkflowDelete { id } => {
                self.ensure_intervention_permission(ctx)?;
                self.intervention_service
                    .delete_intervention(&id)
                    .map_err(|_| AppError::Database("Failed to delete intervention".to_string()))?;
                Ok(InterventionsResponse::Workflow(
                    InterventionWorkflowResponse::Deleted {
                        id,
                        message: "Intervention deleted".to_string(),
                    },
                ))
            }
            InterventionsCommand::WorkflowFinalize { request } => {
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
                    &ctx.session,
                    intervention.technician_id.as_deref(),
                    "finalize interventions",
                )?;
                let response = self
                    .intervention_service
                    .finalize_intervention(
                        self.to_service_finalize_request(request),
                        &ctx.correlation_id,
                        Some(&ctx.session.user_id),
                    )
                    .map_err(|_| {
                        AppError::Database("Failed to finalize intervention".to_string())
                    })?;
                Ok(InterventionsResponse::Workflow(
                    InterventionWorkflowResponse::Finalized {
                        intervention: response.intervention,
                    },
                ))
            }
        }
    }
}
