use crate::commands::AppError;
use crate::domains::tasks::domain::models::task::{Task, TaskStatus, UpdateTaskRequest};
use crate::domains::tasks::domain::services::task_state_machine;
use crate::shared::contracts::auth::{UserRole, UserSession};

const TECHNICIAN_ALLOWED_FIELDS: &[&str] = &[
    "status",
    "notes",
    "checklist_completed",
    "lot_film",
    "actual_duration",
];

pub fn validate_status_change(current: &TaskStatus, new: &TaskStatus) -> Result<(), AppError> {
    task_state_machine::validate_status_transition(current, new)
        .map_err(AppError::TaskInvalidTransition)
}

pub fn check_task_permissions(
    session: &UserSession,
    task: &Task,
    operation: &str,
) -> Result<(), AppError> {
    match session.role {
        UserRole::Admin => Ok(()),
        UserRole::Supervisor => Ok(()),
        UserRole::Technician => {
            if task.technician_id.as_ref() == Some(&session.user_id) {
                Ok(())
            } else {
                Err(AppError::Authorization(
                    "Technician can only operate on their assigned tasks".to_string(),
                ))
            }
        }
        UserRole::Viewer => match operation {
            "view" => Ok(()),
            _ => Err(AppError::Authorization(
                "Viewer can only view tasks".to_string(),
            )),
        },
    }
}

pub fn ensure_assignment_management_role(session: &UserSession) -> Result<(), AppError> {
    if matches!(session.role, UserRole::Admin | UserRole::Supervisor) {
        Ok(())
    } else {
        Err(AppError::Authorization(
            "User not authorized to manage task assignments".to_string(),
        ))
    }
}

pub fn enforce_technician_field_restrictions(req: &UpdateTaskRequest) -> Result<(), AppError> {
    let mut forbidden: Vec<&str> = Vec::new();

    if req.title.is_some() {
        forbidden.push("title");
    }
    if req.description.is_some() {
        forbidden.push("description");
    }
    if req.priority.is_some() {
        forbidden.push("priority");
    }
    if req.vehicle_plate.is_some() {
        forbidden.push("vehicle_plate");
    }
    if req.vehicle_model.is_some() {
        forbidden.push("vehicle_model");
    }
    if req.vehicle_year.is_some() {
        forbidden.push("vehicle_year");
    }
    if req.vehicle_make.is_some() {
        forbidden.push("vehicle_make");
    }
    if req.vin.is_some() {
        forbidden.push("vin");
    }
    if req.ppf_zones.is_some() {
        forbidden.push("ppf_zones");
    }
    if req.custom_ppf_zones.is_some() {
        forbidden.push("custom_ppf_zones");
    }
    if req.client_id.is_some() {
        forbidden.push("client_id");
    }
    if req.customer_name.is_some() {
        forbidden.push("customer_name");
    }
    if req.customer_email.is_some() {
        forbidden.push("customer_email");
    }
    if req.customer_phone.is_some() {
        forbidden.push("customer_phone");
    }
    if req.customer_address.is_some() {
        forbidden.push("customer_address");
    }
    if req.scheduled_date.is_some() {
        forbidden.push("scheduled_date");
    }
    if req.estimated_duration.is_some() {
        forbidden.push("estimated_duration");
    }
    if req.technician_id.is_some() {
        forbidden.push("technician_id");
    }
    if req.template_id.is_some() {
        forbidden.push("template_id");
    }
    if req.workflow_id.is_some() {
        forbidden.push("workflow_id");
    }

    if forbidden.is_empty() {
        Ok(())
    } else {
        Err(AppError::Authorization(format!(
            "Technician cannot modify fields: {}. Allowed: {}",
            forbidden.join(", "),
            TECHNICIAN_ALLOWED_FIELDS.join(", ")
        )))
    }
}

pub fn relationship_status_from_task_status(status: &TaskStatus) -> String {
    match status {
        TaskStatus::Completed => "completed".to_string(),
        TaskStatus::Cancelled => "cancelled".to_string(),
        TaskStatus::InProgress => "in_progress".to_string(),
        TaskStatus::Pending => "pending".to_string(),
        TaskStatus::OnHold => "on_hold".to_string(),
        TaskStatus::Draft => "draft".to_string(),
        TaskStatus::Scheduled => "scheduled".to_string(),
        TaskStatus::Invalid => "invalid".to_string(),
        TaskStatus::Archived => "archived".to_string(),
        TaskStatus::Failed => "failed".to_string(),
        TaskStatus::Overdue => "overdue".to_string(),
        TaskStatus::Assigned => "assigned".to_string(),
        TaskStatus::Paused => "paused".to_string(),
    }
}
