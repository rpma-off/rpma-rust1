use crate::db::InterventionResult;
use crate::db::{Database, InterventionError};
use crate::models::intervention::Intervention;
use crate::models::step::InterventionStep;
use rusqlite::{params, OptionalExtension, Transaction};
use std::sync::Arc;
use tracing::debug;

/// Serialized intervention fields ready for database storage.
struct InterventionDbFields {
    status: String,
    intervention_type: String,
    weather_condition: Option<String>,
    lighting_condition: Option<String>,
    work_location: Option<String>,
    film_type: Option<String>,
    ppf_zones_config_json: Option<String>,
    ppf_zones_extended_json: Option<String>,
    final_observations_json: Option<String>,
    metadata_json: Option<String>,
    device_info_json: Option<String>,
}

impl InterventionDbFields {
    fn from_intervention(intervention: &Intervention) -> Self {
        Self {
            status: intervention.status.to_string(),
            intervention_type: intervention.intervention_type.to_string(),
            weather_condition: intervention
                .weather_condition
                .as_ref()
                .map(|wc| wc.to_string()),
            lighting_condition: intervention
                .lighting_condition
                .as_ref()
                .map(|lc| lc.to_string()),
            work_location: intervention.work_location.as_ref().map(|wl| wl.to_string()),
            film_type: intervention.film_type.as_ref().map(|ft| ft.to_string()),
            ppf_zones_config_json: intervention
                .ppf_zones_config
                .as_ref()
                .map(|zones| serde_json::to_string(zones).unwrap_or_default()),
            ppf_zones_extended_json: intervention
                .ppf_zones_extended
                .as_ref()
                .map(|zones| serde_json::to_string(zones).unwrap_or_default()),
            final_observations_json: intervention
                .final_observations
                .as_ref()
                .map(|obs| serde_json::to_string(obs).unwrap_or_default()),
            metadata_json: intervention
                .metadata
                .as_ref()
                .map(|meta| serde_json::to_string(meta).unwrap_or_default()),
            device_info_json: intervention
                .device_info
                .as_ref()
                .map(|info| serde_json::to_string(info).unwrap_or_default()),
        }
    }
}

/// Serialized step fields ready for database storage.
struct StepDbFields {
    step_type: String,
    step_status: String,
    instructions_json: Option<String>,
    quality_checkpoints_json: Option<String>,
    step_data_json: Option<String>,
    collected_data_json: Option<String>,
    measurements_json: Option<String>,
    observations_json: Option<String>,
    photo_urls_json: Option<String>,
    validation_data_json: Option<String>,
    validation_errors_json: Option<String>,
}

impl StepDbFields {
    fn from_step(step: &InterventionStep) -> Self {
        Self {
            step_type: step.step_type.to_string(),
            step_status: step.step_status.to_string(),
            instructions_json: step
                .instructions
                .as_ref()
                .and_then(|i| serde_json::to_string(i).ok()),
            quality_checkpoints_json: step
                .quality_checkpoints
                .as_ref()
                .and_then(|qc| serde_json::to_string(qc).ok()),
            step_data_json: step
                .step_data
                .as_ref()
                .and_then(|sd| serde_json::to_string(sd).ok()),
            collected_data_json: step
                .collected_data
                .as_ref()
                .and_then(|cd| serde_json::to_string(cd).ok()),
            measurements_json: step
                .measurements
                .as_ref()
                .and_then(|m| serde_json::to_string(m).ok()),
            observations_json: step
                .observations
                .as_ref()
                .and_then(|obs| serde_json::to_string(obs).ok()),
            photo_urls_json: step
                .photo_urls
                .as_ref()
                .and_then(|urls| serde_json::to_string(urls).ok()),
            validation_data_json: step
                .validation_data
                .as_ref()
                .and_then(|vd| serde_json::to_string(vd).ok()),
            validation_errors_json: step
                .validation_errors
                .as_ref()
                .and_then(|ve| serde_json::to_string(ve).ok()),
        }
    }
}

const INSERT_INTERVENTION_SQL: &str =
    "INSERT INTO interventions (
        id, task_id, status, vehicle_plate, vehicle_model, vehicle_make, vehicle_year,
        vehicle_color, vehicle_vin, client_id, client_name, client_email, client_phone,
        technician_id, technician_name, intervention_type, current_step, completion_percentage,
        ppf_zones_config, ppf_zones_extended, film_type, film_brand, film_model,
        scheduled_at, started_at, completed_at, paused_at, estimated_duration, actual_duration,
        weather_condition, lighting_condition, work_location, temperature_celsius, humidity_percentage,
        start_location_lat, start_location_lon, start_location_accuracy,
        end_location_lat, end_location_lon, end_location_accuracy,
        customer_satisfaction, quality_score, final_observations, customer_signature, customer_comments,
        metadata, notes, special_instructions, device_info, app_version,
        synced, last_synced_at, sync_error, created_at, updated_at, created_by, updated_by, task_number
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

const UPDATE_INTERVENTION_SQL: &str =
    "UPDATE interventions SET
        status = ?, vehicle_plate = ?, vehicle_model = ?, vehicle_make = ?, vehicle_year = ?,
        vehicle_color = ?, vehicle_vin = ?, client_id = ?, client_name = ?, client_email = ?, client_phone = ?,
        technician_id = ?, technician_name = ?, intervention_type = ?, current_step = ?, completion_percentage = ?,
        ppf_zones_config = ?, ppf_zones_extended = ?, film_type = ?, film_brand = ?, film_model = ?,
        scheduled_at = ?, started_at = ?, completed_at = ?, paused_at = ?, estimated_duration = ?, actual_duration = ?,
        weather_condition = ?, lighting_condition = ?, work_location = ?, temperature_celsius = ?, humidity_percentage = ?,
        start_location_lat = ?, start_location_lon = ?, start_location_accuracy = ?,
        end_location_lat = ?, end_location_lon = ?, end_location_accuracy = ?,
        customer_satisfaction = ?, quality_score = ?, final_observations = ?, customer_signature = ?, customer_comments = ?,
        metadata = ?, notes = ?, special_instructions = ?, device_info = ?, app_version = ?,
        synced = ?, last_synced_at = ?, sync_error = ?, updated_at = ?, updated_by = ?
    WHERE id = ?";

/// Build the params array for an INSERT intervention statement.
fn insert_intervention_params(
    intervention: &Intervention,
    fields: &InterventionDbFields,
) -> Vec<rusqlite::types::Value> {
    vec![
        intervention.id.clone().into(),
        intervention.task_id.clone().into(),
        fields.status.clone().into(),
        intervention.vehicle_plate.clone().into(),
        intervention.vehicle_model.clone().into(),
        intervention.vehicle_make.clone().into(),
        intervention.vehicle_year.clone().into(),
        intervention.vehicle_color.clone().into(),
        intervention.vehicle_vin.clone().into(),
        intervention.client_id.clone().into(),
        intervention.client_name.clone().into(),
        intervention.client_email.clone().into(),
        intervention.client_phone.clone().into(),
        intervention.technician_id.clone().into(),
        intervention.technician_name.clone().into(),
        fields.intervention_type.clone().into(),
        intervention.current_step.into(),
        intervention.completion_percentage.into(),
        fields.ppf_zones_config_json.clone().into(),
        fields.ppf_zones_extended_json.clone().into(),
        fields.film_type.clone().into(),
        intervention.film_brand.clone().into(),
        intervention.film_model.clone().into(),
        intervention.scheduled_at.inner().into(),
        intervention.started_at.inner().into(),
        intervention.completed_at.inner().into(),
        intervention.paused_at.inner().into(),
        intervention.estimated_duration.into(),
        intervention.actual_duration.into(),
        fields.weather_condition.clone().into(),
        fields.lighting_condition.clone().into(),
        fields.work_location.clone().into(),
        intervention.temperature_celsius.into(),
        intervention.humidity_percentage.into(),
        intervention.start_location_lat.into(),
        intervention.start_location_lon.into(),
        intervention.start_location_accuracy.into(),
        intervention.end_location_lat.into(),
        intervention.end_location_lon.into(),
        intervention.end_location_accuracy.into(),
        intervention.customer_satisfaction.into(),
        intervention.quality_score.into(),
        fields.final_observations_json.clone().into(),
        intervention.customer_signature.clone().into(),
        intervention.customer_comments.clone().into(),
        fields.metadata_json.clone().into(),
        intervention.notes.clone().into(),
        intervention.special_instructions.clone().into(),
        fields.device_info_json.clone().into(),
        intervention.app_version.clone().into(),
        intervention.synced.into(),
        intervention.last_synced_at.into(),
        intervention.sync_error.clone().into(),
        intervention.created_at.into(),
        intervention.updated_at.into(),
        intervention.created_by.clone().into(),
        intervention.updated_by.clone().into(),
        intervention.task_number.clone().into(),
    ]
}

/// Build the params array for an UPDATE intervention statement.
fn update_intervention_params(
    intervention: &Intervention,
    fields: &InterventionDbFields,
) -> Vec<rusqlite::types::Value> {
    vec![
        fields.status.clone().into(),
        intervention.vehicle_plate.clone().into(),
        intervention.vehicle_model.clone().into(),
        intervention.vehicle_make.clone().into(),
        intervention.vehicle_year.clone().into(),
        intervention.vehicle_color.clone().into(),
        intervention.vehicle_vin.clone().into(),
        intervention.client_id.clone().into(),
        intervention.client_name.clone().into(),
        intervention.client_email.clone().into(),
        intervention.client_phone.clone().into(),
        intervention.technician_id.clone().into(),
        intervention.technician_name.clone().into(),
        fields.intervention_type.clone().into(),
        intervention.current_step.into(),
        intervention.completion_percentage.into(),
        fields.ppf_zones_config_json.clone().into(),
        fields.ppf_zones_extended_json.clone().into(),
        fields.film_type.clone().into(),
        intervention.film_brand.clone().into(),
        intervention.film_model.clone().into(),
        intervention.scheduled_at.inner().into(),
        intervention.started_at.inner().into(),
        intervention.completed_at.inner().into(),
        intervention.paused_at.inner().into(),
        intervention.estimated_duration.into(),
        intervention.actual_duration.into(),
        fields.weather_condition.clone().into(),
        fields.lighting_condition.clone().into(),
        fields.work_location.clone().into(),
        intervention.temperature_celsius.into(),
        intervention.humidity_percentage.into(),
        intervention.start_location_lat.into(),
        intervention.start_location_lon.into(),
        intervention.start_location_accuracy.into(),
        intervention.end_location_lat.into(),
        intervention.end_location_lon.into(),
        intervention.end_location_accuracy.into(),
        intervention.customer_satisfaction.into(),
        intervention.quality_score.into(),
        fields.final_observations_json.clone().into(),
        intervention.customer_signature.clone().into(),
        intervention.customer_comments.clone().into(),
        fields.metadata_json.clone().into(),
        intervention.notes.clone().into(),
        intervention.special_instructions.clone().into(),
        fields.device_info_json.clone().into(),
        intervention.app_version.clone().into(),
        intervention.synced.into(),
        intervention.last_synced_at.into(),
        intervention.sync_error.clone().into(),
        intervention.updated_at.into(),
        intervention.updated_by.clone().into(),
        intervention.id.clone().into(),
    ]
}

#[derive(Debug)]
pub struct InterventionRepository {
    db: Arc<Database>,
}

impl InterventionRepository {
    pub fn new(db: Arc<Database>) -> Self {
        Self { db }
    }

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

    pub fn get_intervention(&self, id: &str) -> InterventionResult<Option<Intervention>> {
        let conn = self.db.get_connection()?;

        let mut stmt = conn.prepare("SELECT * FROM interventions WHERE id = ?")?;

        let intervention = stmt
            .query_row([id], |row| Intervention::from_row(row))
            .optional()?;

        Ok(intervention)
    }

    pub fn get_active_intervention_by_task(
        &self,
        task_id: &str,
    ) -> InterventionResult<Option<Intervention>> {
        let conn = self.db.get_connection()?;
        self._get_active_intervention_by_task_with_conn(&conn, task_id)
    }

    pub fn get_latest_intervention_by_task(
        &self,
        task_id: &str,
    ) -> InterventionResult<Option<Intervention>> {
        let conn = self.db.get_connection()?;

        let mut stmt = conn.prepare(
            "SELECT * FROM interventions WHERE task_id = ? ORDER BY created_at DESC LIMIT 1",
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
            "SELECT * FROM interventions WHERE task_id = ? AND status IN ('pending', 'in_progress', 'paused') ORDER BY created_at DESC LIMIT 1"
        )?;

        let intervention = stmt
            .query_row([task_id], |row| Intervention::from_row(row))
            .optional()?;

        Ok(intervention)
    }

    pub fn get_step(&self, id: &str) -> InterventionResult<Option<InterventionStep>> {
        let conn = self.db.get_connection()?;

        let mut stmt = conn.prepare(
"SELECT id, intervention_id, step_number, step_name, step_type, step_status,
                    description, instructions, quality_checkpoints, is_mandatory, requires_photos,
                    min_photos_required, max_photos_allowed, started_at, completed_at, paused_at,
                    duration_seconds, estimated_duration_seconds, step_data, collected_data, measurements,
                    observations, photo_count, required_photos_completed, photo_urls, validation_data,
                    validation_errors, validation_score, requires_supervisor_approval, approved_by,
                    approved_at, rejection_reason, location_lat, location_lon, location_accuracy,
                    device_timestamp, server_timestamp, title, notes, synced, last_synced_at,
                    created_at, updated_at
             FROM intervention_steps WHERE id = ?",
        )?;

        let mut rows = stmt.query_map(params![id], InterventionStep::from_row)?;

        match rows.next() {
            Some(row) => Ok(Some(row?)),
            None => Ok(None),
        }
    }

    pub fn get_step_by_number(
        &self,
        intervention_id: &str,
        step_number: i32,
    ) -> InterventionResult<Option<InterventionStep>> {
        let conn = self.db.get_connection()?;

        let mut stmt = conn.prepare(
"SELECT id, intervention_id, step_number, step_name, step_type, step_status,
                    description, instructions, quality_checkpoints, is_mandatory, requires_photos,
                    min_photos_required, max_photos_allowed, started_at, completed_at, paused_at,
                    duration_seconds, estimated_duration_seconds, step_data, collected_data, measurements,
                    observations, photo_count, required_photos_completed, photo_urls, validation_data,
                    validation_errors, validation_score, requires_supervisor_approval, approved_by,
                    approved_at, rejection_reason, location_lat, location_lon, location_accuracy,
                    device_timestamp, server_timestamp, title, notes, synced, last_synced_at,
                    created_at, updated_at
             FROM intervention_steps WHERE intervention_id = ? AND step_number = ?",
        )?;

        let mut rows = stmt.query_map(
            params![intervention_id, step_number],
            InterventionStep::from_row,
        )?;

        match rows.next() {
            Some(row) => Ok(Some(row?)),
            None => Ok(None),
        }
    }

    pub fn get_intervention_steps(
        &self,
        intervention_id: &str,
    ) -> InterventionResult<Vec<InterventionStep>> {
        let conn = self.db.get_connection()?;

        let mut stmt = conn.prepare(
            "SELECT * FROM intervention_steps WHERE intervention_id = ? ORDER BY step_number",
        )?;

        let steps = stmt
            .query_map([intervention_id], |row| InterventionStep::from_row(row))?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(steps)
    }

    pub fn update_intervention(&self, intervention: &Intervention) -> InterventionResult<()> {
        let conn = self.db.get_connection()?;
        let fields = InterventionDbFields::from_intervention(intervention);
        let params = update_intervention_params(intervention, &fields);
        conn.execute(UPDATE_INTERVENTION_SQL, rusqlite::params_from_iter(params))?;
        Ok(())
    }

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

    pub fn save_step_with_tx(
        &self,
        tx: &Transaction,
        step: &InterventionStep,
    ) -> InterventionResult<()> {
        let f = StepDbFields::from_step(step);
        let rows_affected = tx.execute(
            "INSERT OR REPLACE INTO intervention_steps (
                id, intervention_id, step_number, step_name, step_type, step_status,
                description, instructions, quality_checkpoints, is_mandatory, requires_photos,
                min_photos_required, max_photos_allowed, started_at, completed_at, paused_at,
                duration_seconds, estimated_duration_seconds, step_data, collected_data, measurements,
                observations, photo_count, required_photos_completed, photo_urls, validation_data,
                validation_errors, validation_score, requires_supervisor_approval, approved_by,
                approved_at, rejection_reason, location_lat, location_lon, location_accuracy,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            params![
                step.id, step.intervention_id, step.step_number, step.step_name, f.step_type, f.step_status,
                step.description, f.instructions_json, f.quality_checkpoints_json, step.is_mandatory, step.requires_photos,
                step.min_photos_required, step.max_photos_allowed, step.started_at.inner(), step.completed_at.inner(), step.paused_at.inner(),
                step.duration_seconds, step.estimated_duration_seconds, f.step_data_json, f.collected_data_json, f.measurements_json,
                f.observations_json, step.photo_count, step.required_photos_completed, f.photo_urls_json, f.validation_data_json,
                f.validation_errors_json, step.validation_score, step.requires_supervisor_approval, step.approved_by,
                step.approved_at.inner(), step.rejection_reason, step.location_lat, step.location_lon, step.location_accuracy,
                step.created_at, step.updated_at
            ],
        )?;

        debug!(
            step_id = %step.id,
            intervention_id = %step.intervention_id,
            step_number = step.step_number,
            rows_affected = rows_affected,
            "Saved intervention step (transaction)"
        );

        Ok(())
    }

    pub fn save_step(&self, step: &InterventionStep) -> InterventionResult<()> {
        let conn = self.db.get_connection()?;
        let f = StepDbFields::from_step(step);

        let rows_affected = conn.execute(
            "INSERT OR REPLACE INTO intervention_steps (
                id, intervention_id, step_number, step_name, step_type, step_status,
                description, instructions, quality_checkpoints, is_mandatory, requires_photos,
                min_photos_required, max_photos_allowed, started_at, completed_at, paused_at,
                duration_seconds, estimated_duration_seconds, step_data, collected_data, measurements,
                observations, photo_count, required_photos_completed, photo_urls, validation_data,
                validation_errors, validation_score, requires_supervisor_approval, approved_by,
                approved_at, rejection_reason, location_lat, location_lon, location_accuracy,
                device_timestamp, server_timestamp, title, notes, synced, last_synced_at,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            params![
                step.id, step.intervention_id, step.step_number, step.step_name, f.step_type, f.step_status,
                step.description, f.instructions_json, f.quality_checkpoints_json, step.is_mandatory, step.requires_photos,
                step.min_photos_required, step.max_photos_allowed, step.started_at.inner(), step.completed_at.inner(), step.paused_at.inner(),
                step.duration_seconds, step.estimated_duration_seconds, f.step_data_json, f.collected_data_json, f.measurements_json,
                f.observations_json, step.photo_count, step.required_photos_completed, f.photo_urls_json, f.validation_data_json,
                f.validation_errors_json, step.validation_score, step.requires_supervisor_approval, step.approved_by,
                step.approved_at.inner(), step.rejection_reason, step.location_lat, step.location_lon, step.location_accuracy,
                step.device_timestamp.inner(), step.server_timestamp.inner(), step.title, step.notes, step.synced, step.last_synced_at.inner(),
                step.created_at, step.updated_at
            ],
        )?;

        debug!(
            step_id = %step.id,
            intervention_id = %step.intervention_id,
            step_number = step.step_number,
            rows_affected = rows_affected,
            "Saved intervention step"
        );

        Ok(())
    }

    pub fn delete_intervention(&self, id: &str) -> InterventionResult<()> {
        let conn = self.db.get_connection()?;

        // Delete steps first (foreign key constraint)
        conn.execute(
            "DELETE FROM intervention_steps WHERE intervention_id = ?",
            [id],
        )?;

        // Delete the intervention
        conn.execute("DELETE FROM interventions WHERE id = ?", [id])?;

        Ok(())
    }

    pub fn list_interventions(
        &self,
        status: Option<&str>,
        technician_id: Option<&str>,
        limit: Option<i32>,
        offset: Option<i32>,
    ) -> InterventionResult<(Vec<Intervention>, i64)> {
        let conn = self.db.get_connection()?;

        // First, get total count
        let mut count_sql = "SELECT COUNT(*) FROM interventions WHERE 1=1".to_string();
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
        let mut sql = "SELECT * FROM interventions WHERE 1=1".to_string();
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
        let conn = self.db.get_connection()?;
        conn.execute(
            "UPDATE tasks SET workflow_id = NULL, current_workflow_step_id = NULL, status = 'draft', started_at = NULL WHERE id = ? AND workflow_id IS NOT NULL",
            rusqlite::params![task_id]
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    /// Delete orphaned intervention and steps for a specific task
    pub fn delete_orphaned_for_task(&self, task_id: &str) -> Result<(), String> {
        let conn = self.db.get_connection()?;
        conn.execute(
            "DELETE FROM intervention_steps WHERE intervention_id IN (SELECT id FROM interventions WHERE task_id = ?)",
            rusqlite::params![task_id]
        ).map_err(|e| e.to_string())?;
        conn.execute(
            "DELETE FROM interventions WHERE task_id = ?",
            rusqlite::params![task_id],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    /// Count orphaned interventions (those without valid task references)
    pub fn count_orphaned(&self) -> InterventionResult<i64> {
        let conn = self
            .db
            .get_connection()
            .map_err(|e| InterventionError::Database(format!("Failed to get connection: {}", e)))?;

        conn.query_row(
            "SELECT COUNT(*) FROM interventions i 
             LEFT JOIN tasks t ON i.task_id = t.id 
             WHERE t.id IS NULL OR t.deleted_at IS NOT NULL",
            [],
            |row| row.get(0),
        )
        .map_err(|e| {
            InterventionError::Database(format!("Failed to count orphaned interventions: {}", e))
        })
    }

    /// Delete all orphaned interventions and their steps
    pub fn delete_orphaned(&self) -> InterventionResult<u32> {
        let conn = self
            .db
            .get_connection()
            .map_err(|e| InterventionError::Database(format!("Failed to get connection: {}", e)))?;

        let orphaned_count = self.count_orphaned()?;
        if orphaned_count > 0 {
            conn.execute(
                "DELETE FROM intervention_steps WHERE intervention_id IN (
                    SELECT i.id FROM interventions i 
                    LEFT JOIN tasks t ON i.task_id = t.id 
                    WHERE t.id IS NULL OR t.deleted_at IS NOT NULL
                )",
                [],
            )
            .map_err(|e| {
                InterventionError::Database(format!("Failed to delete orphaned steps: {}", e))
            })?;

            conn.execute(
                "DELETE FROM interventions WHERE id IN (
                    SELECT i.id FROM interventions i 
                    LEFT JOIN tasks t ON i.task_id = t.id 
                    WHERE t.id IS NULL OR t.deleted_at IS NOT NULL
                )",
                [],
            )
            .map_err(|e| {
                InterventionError::Database(format!(
                    "Failed to delete orphaned interventions: {}",
                    e
                ))
            })?;
        }

        Ok(orphaned_count as u32)
    }

    /// Archive old completed interventions
    pub fn archive_old(&self, days_old: i32) -> InterventionResult<u32> {
        let conn = self
            .db
            .get_connection()
            .map_err(|e| InterventionError::Database(format!("Failed to get connection: {}", e)))?;

        let cutoff_timestamp =
            chrono::Utc::now().timestamp_millis() - (days_old as i64 * 24 * 60 * 60 * 1000);

        let archived_count = conn
            .execute(
                "UPDATE interventions 
             SET status = 'archived', updated_at = ?
             WHERE status = 'completed' 
             AND completed_at < ?
             AND status != 'archived'",
                rusqlite::params![chrono::Utc::now().timestamp_millis(), cutoff_timestamp],
            )
            .map_err(|e| {
                InterventionError::Database(format!("Failed to archive old interventions: {}", e))
            })?;

        Ok(archived_count as u32)
    }

    /// Count orphaned steps (steps without valid intervention references)
    pub fn count_orphaned_steps(&self) -> InterventionResult<i64> {
        let conn = self
            .db
            .get_connection()
            .map_err(|e| InterventionError::Database(format!("Failed to get connection: {}", e)))?;

        conn.query_row(
            "SELECT COUNT(*) FROM intervention_steps s 
             LEFT JOIN interventions i ON s.intervention_id = i.id 
             WHERE i.id IS NULL",
            [],
            |row| row.get(0),
        )
        .map_err(|e| InterventionError::Database(format!("Failed to count orphaned steps: {}", e)))
    }

    /// Count archived interventions
    pub fn count_archived(&self) -> InterventionResult<i64> {
        let conn = self
            .db
            .get_connection()
            .map_err(|e| InterventionError::Database(format!("Failed to get connection: {}", e)))?;

        conn.query_row(
            "SELECT COUNT(*) FROM interventions WHERE status = 'archived'",
            [],
            |row| row.get(0),
        )
        .map_err(|e| {
            InterventionError::Database(format!("Failed to count archived interventions: {}", e))
        })
    }
}
