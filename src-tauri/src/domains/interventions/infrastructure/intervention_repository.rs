/// ADR-005: Repository Pattern
use crate::db::InterventionResult;
use crate::db::{Database, FromSqlRow, InterventionError};
use crate::domains::interventions::domain::models::intervention::Intervention;
use crate::domains::interventions::domain::models::step::InterventionStep;
use crate::domains::interventions::infrastructure::intervention_maintenance_repository;
use crate::domains::interventions::infrastructure::intervention_sql::{
    insert_intervention_params, update_intervention_params, InterventionDbFields,
    INSERT_INTERVENTION_SQL, UPDATE_INTERVENTION_SQL,
};
use crate::domains::interventions::infrastructure::intervention_step_repository;
use rusqlite::{OptionalExtension, Transaction};
use std::sync::Arc;

/// TODO: document
#[derive(Debug)]
pub struct InterventionRepository {
    db: Arc<Database>,
}

impl InterventionRepository {
    /// TODO: document
    pub fn new(db: Arc<Database>) -> Self {
        Self { db }
    }

    /// TODO: document
    pub fn create_intervention_with_tx(
        &self,
        tx: &Transaction,
        intervention: &Intervention,
    ) -> InterventionResult<()> {
        let fields = InterventionDbFields::from_intervention(intervention);
        let params = insert_intervention_params(intervention, &fields);
        tx.execute(INSERT_INTERVENTION_SQL, rusqlite::params_from_iter(params))?;
        Ok(())
    }

    /// TODO: document
    pub fn create_intervention(&self, intervention: &Intervention) -> InterventionResult<()> {
        let conn = self.db.get_connection()?;
        let fields = InterventionDbFields::from_intervention(intervention);
        let params = insert_intervention_params(intervention, &fields);

        let result = conn.execute(INSERT_INTERVENTION_SQL, rusqlite::params_from_iter(params));

        // Handle unique constraint violation
        match result {
            Ok(_) => Ok(()),
            Err(rusqlite::Error::SqliteFailure(err, msg)) => {
                // Check if this is a unique constraint violation (SQLITE_CONSTRAINT = 19)
                if err.code == rusqlite::ErrorCode::ConstraintViolation {
                    // Check if it's the task_id unique index
                    if let Some(message) = msg {
                        if message.contains("idx_interventions_active_per_task") {
                            tracing::warn!(
                                "Attempted to create duplicate active intervention for task_id: {}",
                                intervention.task_id
                            );
                            return Err(InterventionError::BusinessRule(format!(
                                "INTERVENTION_ALREADY_EXISTS: An active intervention already exists for task {}. Please resume the existing intervention instead of creating a new one.",
                                intervention.task_id
                            )));
                        }
                    }
                }
                Err(InterventionError::Database(err.to_string()))
            }
            Err(e) => Err(InterventionError::Database(e.to_string())),
        }
    }

    /// TODO: document
    pub fn get_intervention(&self, id: &str) -> InterventionResult<Option<Intervention>> {
        let conn = self.db.get_connection()?;

        let mut stmt =
            conn.prepare("SELECT * FROM interventions WHERE id = ? AND deleted_at IS NULL")?;

        let intervention = stmt
            .query_row([id], |row| Intervention::from_row(row))
            .optional()?;

        Ok(intervention)
    }

    /// TODO: document
    pub fn get_active_intervention_by_task(
        &self,
        task_id: &str,
    ) -> InterventionResult<Option<Intervention>> {
        let conn = self.db.get_connection()?;
        self._get_active_intervention_by_task_with_conn(&conn, task_id)
    }

    /// TODO: document
    pub fn get_latest_intervention_by_task(
        &self,
        task_id: &str,
    ) -> InterventionResult<Option<Intervention>> {
        let conn = self.db.get_connection()?;

        let mut stmt = conn.prepare(
            "SELECT * FROM interventions WHERE task_id = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1",
        )?;

        let intervention = stmt
            .query_row([task_id], |row| Intervention::from_row(row))
            .optional()?;

        Ok(intervention)
    }

    fn _get_active_intervention_by_task_with_conn(
        &self,
        conn: &rusqlite::Connection,
        task_id: &str,
    ) -> InterventionResult<Option<Intervention>> {
        let mut stmt = conn.prepare(
            "SELECT * FROM interventions WHERE task_id = ? AND deleted_at IS NULL AND status IN ('pending', 'in_progress', 'paused') ORDER BY created_at DESC LIMIT 1"
        )?;

        let intervention = stmt
            .query_row([task_id], |row| Intervention::from_row(row))
            .optional()?;

        Ok(intervention)
    }

    /// TODO: document
    pub fn get_step(&self, id: &str) -> InterventionResult<Option<InterventionStep>> {
        intervention_step_repository::get_step(&self.db, id)
    }

    /// TODO: document
    pub fn get_step_by_number(
        &self,
        intervention_id: &str,
        step_number: i32,
    ) -> InterventionResult<Option<InterventionStep>> {
        intervention_step_repository::get_step_by_number(&self.db, intervention_id, step_number)
    }

    /// TODO: document
    pub fn get_intervention_steps(
        &self,
        intervention_id: &str,
    ) -> InterventionResult<Vec<InterventionStep>> {
        intervention_step_repository::get_intervention_steps(&self.db, intervention_id)
    }

    /// TODO: document
    pub fn update_intervention(&self, intervention: &Intervention) -> InterventionResult<()> {
        let conn = self.db.get_connection()?;
        let fields = InterventionDbFields::from_intervention(intervention);
        let params = update_intervention_params(intervention, &fields);
        conn.execute(UPDATE_INTERVENTION_SQL, rusqlite::params_from_iter(params))?;
        Ok(())
    }

    /// TODO: document
    pub fn update_intervention_with_tx(
        &self,
        tx: &Transaction,
        intervention: &Intervention,
    ) -> InterventionResult<()> {
        let fields = InterventionDbFields::from_intervention(intervention);
        let params = update_intervention_params(intervention, &fields);
        tx.execute(UPDATE_INTERVENTION_SQL, rusqlite::params_from_iter(params))?;
        Ok(())
    }

    /// TODO: document
    pub fn save_step_with_tx(
        &self,
        tx: &Transaction,
        step: &InterventionStep,
    ) -> InterventionResult<()> {
        intervention_step_repository::save_step_with_tx(tx, step)
    }

    /// QW-3 perf: prepare the INSERT statement once, then execute for each step.
    /// Replaces N `tx.execute()` calls (each re-parses the SQL) with 1 prepare + N binds.
    pub fn save_steps_batch_with_tx(
        &self,
        tx: &Transaction,
        steps: &[InterventionStep],
    ) -> InterventionResult<()> {
        intervention_step_repository::save_steps_batch_with_tx(tx, steps)
    }

    /// TODO: document
    pub fn save_step(&self, step: &InterventionStep) -> InterventionResult<()> {
        intervention_step_repository::save_step(&self.db, step)
    }

    /// TODO: document
    pub fn delete_intervention(&self, id: &str) -> InterventionResult<()> {
        let mut conn = self.db.get_connection()?;
        let tx = conn.transaction().map_err(|e| {
            InterventionError::Database(format!("Failed to start transaction: {}", e))
        })?;

        // Delete steps first (foreign key constraint)
        tx.execute(
            "DELETE FROM intervention_steps WHERE intervention_id = ?",
            [id],
        )?;

        // Delete the intervention
        tx.execute("DELETE FROM interventions WHERE id = ?", [id])?;

        tx.commit().map_err(|e| {
            InterventionError::Database(format!("Failed to commit transaction: {}", e))
        })?;

        Ok(())
    }

    /// TODO: document
    pub fn list_interventions(
        &self,
        status: Option<&str>,
        technician_id: Option<&str>,
        limit: Option<i32>,
        offset: Option<i32>,
    ) -> InterventionResult<(Vec<Intervention>, i64)> {
        let conn = self.db.get_connection()?;

        // First, get total count
        let mut count_sql =
            "SELECT COUNT(*) FROM interventions WHERE 1=1 AND deleted_at IS NULL".to_string();
        let mut count_params: Vec<rusqlite::types::Value> = Vec::new();

        if let Some(status) = status {
            count_sql.push_str(" AND status = ?");
            count_params.push(rusqlite::types::Value::Text(status.to_string()));
        }

        if let Some(technician_id) = technician_id {
            count_sql.push_str(" AND technician_id = ?");
            count_params.push(rusqlite::types::Value::Text(technician_id.to_string()));
        }

        let mut count_stmt = conn.prepare(&count_sql)?;
        let total: i64 =
            count_stmt.query_row(rusqlite::params_from_iter(count_params), |row| row.get(0))?;

        // Then, get the paginated results
        let mut sql = "SELECT * FROM interventions WHERE 1=1 AND deleted_at IS NULL".to_string();
        let mut params: Vec<rusqlite::types::Value> = Vec::new();

        if let Some(status) = status {
            sql.push_str(" AND status = ?");
            params.push(rusqlite::types::Value::Text(status.to_string()));
        }

        if let Some(technician_id) = technician_id {
            sql.push_str(" AND technician_id = ?");
            params.push(rusqlite::types::Value::Text(technician_id.to_string()));
        }

        sql.push_str(" ORDER BY created_at DESC");

        if let Some(limit_val) = limit {
            sql.push_str(" LIMIT ?");
            params.push(limit_val.into());
        }

        if let Some(offset_val) = offset {
            sql.push_str(" OFFSET ?");
            params.push(offset_val.into());
        }

        let mut stmt = conn.prepare(&sql)?;
        let interventions: Vec<Intervention> = stmt
            .query_map(rusqlite::params_from_iter(params), |row| {
                Intervention::from_row(row)
            })?
            .collect::<Result<_, _>>()?;

        Ok((interventions, total))
    }

    /// Reset task workflow state for a failed intervention start
    pub fn reset_task_workflow_state(&self, task_id: &str) -> Result<(), String> {
        intervention_maintenance_repository::reset_task_workflow_state(&self.db, task_id)
    }

    /// Delete orphaned intervention and steps for a specific task
    pub fn delete_orphaned_for_task(&self, task_id: &str) -> Result<(), String> {
        intervention_maintenance_repository::delete_orphaned_for_task(&self.db, task_id)
    }

    /// Count orphaned interventions (those without valid task references)
    pub fn count_orphaned(&self) -> InterventionResult<i64> {
        intervention_maintenance_repository::count_orphaned(&self.db)
    }

    /// Delete all orphaned interventions and their steps
    pub fn delete_orphaned(&self) -> InterventionResult<u32> {
        intervention_maintenance_repository::delete_orphaned(&self.db)
    }

    /// Archive old completed interventions
    pub fn archive_old(&self, days_old: i32) -> InterventionResult<u32> {
        intervention_maintenance_repository::archive_old(&self.db, days_old)
    }

    /// Count orphaned steps (steps without valid intervention references)
    pub fn count_orphaned_steps(&self) -> InterventionResult<i64> {
        intervention_maintenance_repository::count_orphaned_steps(&self.db)
    }

    /// Count archived interventions
    pub fn count_archived(&self) -> InterventionResult<i64> {
        intervention_maintenance_repository::count_archived(&self.db)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domains::interventions::domain::models::step::{StepStatus, StepType};
    use crate::shared::contracts::common::TimestampString;
    use crate::test_utils::TestDatabase;

    fn seed_intervention(db: &crate::db::Database, intervention_id: &str) {
        let now = chrono::Utc::now().timestamp_millis();
        let task_id = format!("task-for-{}", intervention_id);
        db.execute(
            "INSERT OR IGNORE INTO tasks (id, task_number, title, vehicle_plate, vehicle_model, ppf_zones, scheduled_date, status, priority, created_at, updated_at, synced)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)",
            rusqlite::params![task_id, "T-seed", "Seed task", "AA-000-AA", "Model X", r#"["front"]"#, "2025-01-01", "draft", "medium", now, now],
        ).expect("seed task");
        db.execute(
            "INSERT OR IGNORE INTO interventions (id, task_id, status, vehicle_plate, created_at, updated_at, synced)
             VALUES (?, ?, 'pending', 'TEST-00', ?, ?, 0)",
            rusqlite::params![intervention_id, task_id, now, now],
        ).expect("seed intervention");
    }

    fn build_step(intervention_id: &str, step_number: i32) -> InterventionStep {
        let mut step = InterventionStep::new(
            intervention_id.to_string(),
            step_number,
            format!("Step {}", step_number),
            StepType::Inspection,
        );
        step.step_status = StepStatus::Completed;
        step.step_data = Some(serde_json::json!({"legacy": true}));
        step.collected_data = Some(serde_json::json!({"notes": "from_collected"}));
        step.measurements = Some(serde_json::json!({"temp_c": 22.5}));
        step.photo_urls = Some(vec!["/tmp/photo-a.jpg".to_string()]);
        step.notes = Some("persisted-note".to_string());
        step.title = Some("persisted-title".to_string());
        step.synced = true;
        step.device_timestamp = TimestampString::new(Some(1_700_000_000_000));
        step.server_timestamp = TimestampString::new(Some(1_700_000_000_100));
        step.last_synced_at = TimestampString::new(Some(1_700_000_000_200));
        step
    }

    fn seed_completed_intervention(
        db: &crate::db::Database,
        intervention_id: &str,
        completed_at: i64,
    ) {
        let task_id = format!("task-for-{}", intervention_id);
        db.execute(
            "INSERT OR IGNORE INTO tasks (id, task_number, title, vehicle_plate, vehicle_model, ppf_zones, scheduled_date, status, priority, created_at, updated_at, synced)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)",
            rusqlite::params![task_id, "T-archive", "Archive task", "BB-000-BB", "Model Y", r#"["front"]"#, "2025-01-01", "completed", "medium", completed_at, completed_at],
        )
        .expect("seed archive task");
        db.execute(
            "INSERT OR IGNORE INTO interventions (id, task_id, status, vehicle_plate, completed_at, created_at, updated_at, synced)
             VALUES (?, ?, ?, 'ARCH-00', ?, ?, ?, 0)",
            rusqlite::params![
                intervention_id,
                task_id,
                crate::domains::interventions::domain::models::intervention::InterventionStatus::Completed.to_string(),
                completed_at,
                completed_at,
                completed_at
            ],
        )
        .expect("seed completed intervention");
    }

    #[test]
    fn save_step_with_tx_persists_extended_fields() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let db = test_db.db();
        seed_intervention(&db, "intervention-1");
        let repository = InterventionRepository::new(db.clone());
        let step = build_step("intervention-1", 1);

        let mut conn = db
            .get_connection()
            .expect("Failed to get connection for transaction");
        let tx = conn.transaction().expect("Failed to open transaction");
        repository
            .save_step_with_tx(&tx, &step)
            .expect("Failed to save step with transaction");
        tx.commit().expect("Failed to commit transaction");

        let persisted = repository
            .get_step(&step.id)
            .expect("Failed to read saved step")
            .expect("Expected saved step");

        assert_eq!(persisted.step_data, step.step_data);
        assert_eq!(persisted.collected_data, step.collected_data);
        assert_eq!(persisted.measurements, step.measurements);
        assert_eq!(persisted.photo_urls, step.photo_urls);
        assert_eq!(persisted.notes, step.notes);
        assert_eq!(persisted.title, step.title);
        assert_eq!(persisted.synced, step.synced);
        assert_eq!(
            persisted.device_timestamp.inner(),
            step.device_timestamp.inner()
        );
        assert_eq!(
            persisted.server_timestamp.inner(),
            step.server_timestamp.inner()
        );
        assert_eq!(
            persisted.last_synced_at.inner(),
            step.last_synced_at.inner()
        );
    }

    #[test]
    fn get_intervention_steps_returns_step_data_fields() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let db = test_db.db();
        seed_intervention(&db, "intervention-2");
        let repository = InterventionRepository::new(db);

        let step_1 = build_step("intervention-2", 1);
        let mut step_2 = build_step("intervention-2", 2);
        step_2.step_type = StepType::Preparation;
        step_2.collected_data = Some(serde_json::json!({"checklist": {"wash": true}}));
        step_2.step_data = Some(serde_json::json!({"legacy_checklist": {"wash": true}}));
        step_2.photo_urls = Some(vec!["/tmp/photo-b.jpg".to_string()]);
        step_2.notes = Some("prep-note".to_string());

        repository
            .save_step(&step_1)
            .expect("Failed to seed step 1");
        repository
            .save_step(&step_2)
            .expect("Failed to seed step 2");

        let steps = repository
            .get_intervention_steps("intervention-2")
            .expect("Failed to fetch intervention steps");

        assert_eq!(steps.len(), 2);
        assert_eq!(steps[0].step_data, step_1.step_data);
        assert_eq!(steps[0].collected_data, step_1.collected_data);
        assert_eq!(steps[0].photo_urls, step_1.photo_urls);
        assert_eq!(steps[0].notes, step_1.notes);
        assert_eq!(steps[0].measurements, step_1.measurements);

        assert_eq!(steps[1].step_data, step_2.step_data);
        assert_eq!(steps[1].collected_data, step_2.collected_data);
        assert_eq!(steps[1].photo_urls, step_2.photo_urls);
        assert_eq!(steps[1].notes, step_2.notes);
        assert_eq!(steps[1].measurements, step_2.measurements);
    }

    #[test]
    fn save_steps_batch_with_tx_matches_single_step_persistence() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let db = test_db.db();
        seed_intervention(&db, "intervention-3");
        let repository = InterventionRepository::new(db.clone());

        let step_1 = build_step("intervention-3", 1);
        let mut step_2 = build_step("intervention-3", 2);
        step_2.step_type = StepType::Preparation;
        step_2.notes = Some("batch-note".to_string());

        let mut conn = db
            .get_connection()
            .expect("Failed to get connection for batch transaction");
        let tx = conn
            .transaction()
            .expect("Failed to open batch transaction");
        repository
            .save_steps_batch_with_tx(&tx, &[step_1.clone(), step_2.clone()])
            .expect("Failed to save step batch");
        tx.commit().expect("Failed to commit batch transaction");

        let steps = repository
            .get_intervention_steps("intervention-3")
            .expect("Failed to fetch batch-saved steps");

        assert_eq!(steps.len(), 2);
        assert_eq!(steps[0].step_data, step_1.step_data);
        assert_eq!(steps[0].collected_data, step_1.collected_data);
        assert_eq!(steps[0].measurements, step_1.measurements);
        assert_eq!(steps[0].photo_urls, step_1.photo_urls);
        assert_eq!(steps[1].step_data, step_2.step_data);
        assert_eq!(steps[1].collected_data, step_2.collected_data);
        assert_eq!(steps[1].measurements, step_2.measurements);
        assert_eq!(steps[1].photo_urls, step_2.photo_urls);
        assert_eq!(steps[1].notes, step_2.notes);
    }

    #[test]
    fn maintenance_queries_preserve_orphan_cleanup_and_archiving() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let db = test_db.db();
        let repository = InterventionRepository::new(db.clone());
        let now = chrono::Utc::now().timestamp_millis();
        let old_completed_at = now - (3 * 24 * 60 * 60 * 1000);

        seed_intervention(&db, "orphan-intervention");
        let orphan_step = build_step("orphan-intervention", 1);
        repository
            .save_step(&orphan_step)
            .expect("Failed to save orphan step");
        db.execute(
            "UPDATE tasks SET deleted_at = ? WHERE id = ?",
            rusqlite::params![
                chrono::Utc::now().timestamp_millis(),
                "task-for-orphan-intervention"
            ],
        )
        .expect("soft-delete orphan task");

        seed_completed_intervention(&db, "archive-intervention", old_completed_at);

        assert_eq!(repository.count_orphaned().expect("count orphaned"), 1);
        assert_eq!(repository.delete_orphaned().expect("delete orphaned"), 1);
        assert_eq!(
            repository.count_orphaned().expect("count orphaned after"),
            0
        );
        assert_eq!(
            repository
                .count_orphaned_steps()
                .expect("count orphaned steps after"),
            0
        );

        assert_eq!(repository.archive_old(1).expect("archive old"), 1);
        assert_eq!(repository.count_archived().expect("count archived"), 1);
    }
}
