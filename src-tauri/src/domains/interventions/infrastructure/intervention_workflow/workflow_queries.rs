//! Workflow Queries — thin delegators to InterventionDataService for read operations

use crate::domains::interventions::domain::models::intervention::Intervention;

impl super::InterventionWorkflowService {
    /// Get an active intervention by task ID
    pub fn get_active_intervention_by_task(
        &self,
        task_id: &str,
    ) -> crate::db::InterventionResult<Option<Intervention>> {
        self.data.get_active_intervention_by_task(task_id)
    }

    /// Get an intervention by ID
    pub fn get_intervention_by_id(
        &self,
        intervention_id: &str,
    ) -> crate::db::InterventionResult<Option<Intervention>> {
        self.data.get_intervention(intervention_id)
    }

    /// Get interventions for a task
    pub fn get_interventions_by_task(
        &self,
        task_id: &str,
    ) -> crate::db::InterventionResult<Vec<Intervention>> {
        let (interventions, _) = self
            .data
            .list_interventions(None, None, Some(1000), Some(0))?;
        Ok(interventions
            .into_iter()
            .filter(|i| i.task_id == task_id)
            .collect())
    }

    /// List interventions with pagination
    pub fn list_interventions(
        &self,
        limit: i32,
        offset: i32,
    ) -> crate::db::InterventionResult<Vec<Intervention>> {
        let (interventions, _) =
            self.data
                .list_interventions(None, None, Some(limit), Some(offset))?;
        Ok(interventions)
    }
}
