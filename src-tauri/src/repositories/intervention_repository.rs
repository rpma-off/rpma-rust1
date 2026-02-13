use crate::db::InterventionResult;
use crate::db::{Database, InterventionError};
use crate::models::intervention::Intervention;
use crate::models::step::InterventionStep;
use rusqlite::{params, OptionalExtension, Transaction};
use std::sync::Arc;

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
        // Convert enums to strings for storage
        let status_str = intervention.status.to_string();
        let intervention_type_str = intervention.intervention_type.to_string();
        let weather_condition_str = intervention
            .weather_condition
            .as_ref()
            .map(|wc| wc.to_string());
        let lighting_condition_str = intervention
            .lighting_condition
            .as_ref()
            .map(|lc| lc.to_string());
        let work_location_str = intervention.work_location.as_ref().map(|wl| wl.to_string());
        let film_type_str = intervention.film_type.as_ref().map(|ft| ft.to_string());

        // Convert Vec<String> to JSON string
        let ppf_zones_config_json = intervention
            .ppf_zones_config
            .as_ref()
            .map(|zones| serde_json::to_string(zones).unwrap_or_default());
        let ppf_zones_extended_json = intervention
            .ppf_zones_extended
            .as_ref()
            .map(|zones| serde_json::to_string(zones).unwrap_or_default());
        let final_observations_json = intervention
            .final_observations
            .as_ref()
            .map(|obs| serde_json::to_string(obs).unwrap_or_default());
        let metadata_json = intervention
            .metadata
            .as_ref()
            .map(|meta| serde_json::to_string(meta).unwrap_or_default());
        let device_info_json = intervention
            .device_info
            .as_ref()
            .map(|info| serde_json::to_string(info).unwrap_or_default());

        tx.execute(
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
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            params![
                intervention.id, intervention.task_id, status_str, intervention.vehicle_plate,
                intervention.vehicle_model, intervention.vehicle_make, intervention.vehicle_year,
                intervention.vehicle_color, intervention.vehicle_vin, intervention.client_id,
                intervention.client_name, intervention.client_email, intervention.client_phone,
                intervention.technician_id, intervention.technician_name, intervention_type_str,
                intervention.current_step, intervention.completion_percentage,
                ppf_zones_config_json, ppf_zones_extended_json, film_type_str,
                intervention.film_brand, intervention.film_model, intervention.scheduled_at.inner(),
                intervention.started_at.inner(), intervention.completed_at.inner(), intervention.paused_at.inner(),
                intervention.estimated_duration, intervention.actual_duration,
                weather_condition_str, lighting_condition_str, work_location_str, intervention.temperature_celsius, intervention.humidity_percentage,
                intervention.start_location_lat, intervention.start_location_lon, intervention.start_location_accuracy,
                intervention.end_location_lat, intervention.end_location_lon, intervention.end_location_accuracy,
                intervention.customer_satisfaction, intervention.quality_score,
                final_observations_json, intervention.customer_signature, intervention.customer_comments,
                metadata_json, intervention.notes, intervention.special_instructions, device_info_json, intervention.app_version,
                intervention.synced, intervention.last_synced_at, intervention.sync_error,
                intervention.created_at, intervention.updated_at, intervention.created_by, intervention.updated_by, intervention.task_number
            ],
        )?;

        Ok(())
    }

    pub fn create_intervention(&self, intervention: &Intervention) -> InterventionResult<()> {
        let conn = self.db.get_connection()?;

        // Convert enums to strings for storage
        let status_str = intervention.status.to_string();
        let intervention_type_str = intervention.intervention_type.to_string();
        let weather_condition_str = intervention
            .weather_condition
            .as_ref()
            .map(|wc| wc.to_string());
        let lighting_condition_str = intervention
            .lighting_condition
            .as_ref()
            .map(|lc| lc.to_string());
        let work_location_str = intervention.work_location.as_ref().map(|wl| wl.to_string());
        let film_type_str = intervention.film_type.as_ref().map(|ft| ft.to_string());

        // Convert Vec<String> to JSON string
        let ppf_zones_config_json = intervention
            .ppf_zones_config
            .as_ref()
            .map(|zones| serde_json::to_string(zones).unwrap_or_default());
        let ppf_zones_extended_json = intervention
            .ppf_zones_extended
            .as_ref()
            .map(|zones| serde_json::to_string(zones).unwrap_or_default());
        let final_observations_json = intervention
            .final_observations
            .as_ref()
            .map(|obs| serde_json::to_string(obs).unwrap_or_default());
        let metadata_json = intervention
            .metadata
            .as_ref()
            .map(|meta| serde_json::to_string(meta).unwrap_or_default());
        let device_info_json = intervention
            .device_info
            .as_ref()
            .map(|info| serde_json::to_string(info).unwrap_or_default());

        let result = conn.execute(
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
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            params![
                intervention.id, intervention.task_id, status_str, intervention.vehicle_plate,
                intervention.vehicle_model, intervention.vehicle_make, intervention.vehicle_year,
                intervention.vehicle_color, intervention.vehicle_vin, intervention.client_id,
                intervention.client_name, intervention.client_email, intervention.client_phone,
                intervention.technician_id, intervention.technician_name, intervention_type_str,
                intervention.current_step, intervention.completion_percentage,
                ppf_zones_config_json, ppf_zones_extended_json, film_type_str,
                intervention.film_brand, intervention.film_model, intervention.scheduled_at.inner(),
                intervention.started_at.inner(), intervention.completed_at.inner(), intervention.paused_at.inner(),
                intervention.estimated_duration, intervention.actual_duration,
                weather_condition_str, lighting_condition_str, work_location_str, intervention.temperature_celsius, intervention.humidity_percentage,
                intervention.start_location_lat, intervention.start_location_lon, intervention.start_location_accuracy,
                intervention.end_location_lat, intervention.end_location_lon, intervention.end_location_accuracy,
                intervention.customer_satisfaction, intervention.quality_score,
                final_observations_json, intervention.customer_signature, intervention.customer_comments,
                metadata_json, intervention.notes, intervention.special_instructions,
                device_info_json, intervention.app_version, intervention.synced,
                intervention.last_synced_at, intervention.sync_error, intervention.created_at,
                intervention.updated_at, intervention.created_by, intervention.updated_by, intervention.task_number
            ],
        );

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

        // Convert enums to strings for storage
        let status_str = intervention.status.to_string();
        let intervention_type_str = intervention.intervention_type.to_string();
        let weather_condition_str = intervention
            .weather_condition
            .as_ref()
            .map(|wc| wc.to_string());
        let lighting_condition_str = intervention
            .lighting_condition
            .as_ref()
            .map(|lc| lc.to_string());
        let work_location_str = intervention.work_location.as_ref().map(|wl| wl.to_string());
        let film_type_str = intervention.film_type.as_ref().map(|ft| ft.to_string());

        // Convert Vec<String> to JSON string
        let ppf_zones_config_json = intervention
            .ppf_zones_config
            .as_ref()
            .map(|zones| serde_json::to_string(zones).unwrap_or_default());
        let ppf_zones_extended_json = intervention
            .ppf_zones_extended
            .as_ref()
            .map(|zones| serde_json::to_string(zones).unwrap_or_default());
        let final_observations_json = intervention
            .final_observations
            .as_ref()
            .map(|obs| serde_json::to_string(obs).unwrap_or_default());
        let metadata_json = intervention
            .metadata
            .as_ref()
            .map(|meta| serde_json::to_string(meta).unwrap_or_default());
        let device_info_json = intervention
            .device_info
            .as_ref()
            .map(|info| serde_json::to_string(info).unwrap_or_default());

        conn.execute(
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
            WHERE id = ?",
            params![
                status_str, intervention.vehicle_plate, intervention.vehicle_model, intervention.vehicle_make, intervention.vehicle_year,
                intervention.vehicle_color, intervention.vehicle_vin, intervention.client_id,
                intervention.client_name, intervention.client_email, intervention.client_phone,
                intervention.technician_id, intervention.technician_name, intervention_type_str,
                intervention.current_step, intervention.completion_percentage,
                ppf_zones_config_json, ppf_zones_extended_json, film_type_str,
                intervention.film_brand, intervention.film_model, intervention.scheduled_at.inner(),
                intervention.started_at.inner(), intervention.completed_at.inner(), intervention.paused_at.inner(),
                intervention.estimated_duration, intervention.actual_duration,
                weather_condition_str, lighting_condition_str, work_location_str,
                intervention.temperature_celsius, intervention.humidity_percentage,
                intervention.start_location_lat, intervention.start_location_lon, intervention.start_location_accuracy,
                intervention.end_location_lat, intervention.end_location_lon, intervention.end_location_accuracy,
                intervention.customer_satisfaction, intervention.quality_score,
                final_observations_json, intervention.customer_signature, intervention.customer_comments,
                metadata_json, intervention.notes, intervention.special_instructions,
                device_info_json, intervention.app_version, intervention.synced,
                intervention.last_synced_at, intervention.sync_error, intervention.updated_at, intervention.updated_by,
                intervention.id
            ],
        )?;

        Ok(())
    }

    pub fn update_intervention_with_tx(
        &self,
        tx: &Transaction,
        intervention: &Intervention,
    ) -> InterventionResult<()> {
        // Convert enums to strings for storage
        let status_str = intervention.status.to_string();
        let intervention_type_str = intervention.intervention_type.to_string();
        let weather_condition_str = intervention
            .weather_condition
            .as_ref()
            .map(|wc| wc.to_string());
        let lighting_condition_str = intervention
            .lighting_condition
            .as_ref()
            .map(|lc| lc.to_string());
        let work_location_str = intervention.work_location.as_ref().map(|wl| wl.to_string());
        let film_type_str = intervention.film_type.as_ref().map(|ft| ft.to_string());

        // Convert Vec<String> to JSON string
        let ppf_zones_config_json = intervention
            .ppf_zones_config
            .as_ref()
            .map(|zones| serde_json::to_string(zones).unwrap_or_default());
        let ppf_zones_extended_json = intervention
            .ppf_zones_extended
            .as_ref()
            .map(|zones| serde_json::to_string(zones).unwrap_or_default());
        let final_observations_json = intervention
            .final_observations
            .as_ref()
            .map(|obs| serde_json::to_string(obs).unwrap_or_default());
        let metadata_json = intervention
            .metadata
            .as_ref()
            .map(|meta| serde_json::to_string(meta).unwrap_or_default());
        let device_info_json = intervention
            .device_info
            .as_ref()
            .map(|info| serde_json::to_string(info).unwrap_or_default());

        tx.execute(
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
            WHERE id = ?",
            params![
                status_str, intervention.vehicle_plate, intervention.vehicle_model, intervention.vehicle_make, intervention.vehicle_year,
                intervention.vehicle_color, intervention.vehicle_vin, intervention.client_id,
                intervention.client_name, intervention.client_email, intervention.client_phone,
                intervention.technician_id, intervention.technician_name, intervention_type_str,
                intervention.current_step, intervention.completion_percentage,
                ppf_zones_config_json, ppf_zones_extended_json, film_type_str,
                intervention.film_brand, intervention.film_model, intervention.scheduled_at.inner(),
                intervention.started_at.inner(), intervention.completed_at.inner(), intervention.paused_at.inner(),
                intervention.estimated_duration, intervention.actual_duration,
                weather_condition_str, lighting_condition_str, work_location_str,
                intervention.temperature_celsius, intervention.humidity_percentage,
                intervention.start_location_lat, intervention.start_location_lon, intervention.start_location_accuracy,
                intervention.end_location_lat, intervention.end_location_lon, intervention.end_location_accuracy,
                intervention.customer_satisfaction, intervention.quality_score,
                final_observations_json, intervention.customer_signature, intervention.customer_comments,
                metadata_json, intervention.notes, intervention.special_instructions,
                device_info_json, intervention.app_version, intervention.synced,
                intervention.last_synced_at, intervention.sync_error, intervention.updated_at, intervention.updated_by,
                intervention.id
            ],
        )?;

        Ok(())
    }

    pub fn save_step_with_tx(
        &self,
        tx: &Transaction,
        step: &InterventionStep,
    ) -> InterventionResult<()> {
        // Convert enums to strings
        let step_type_str = step.step_type.to_string();
        let step_status_str = step.step_status.to_string();

        // Convert JSON fields with error handling
        let instructions_json = step
            .instructions
            .as_ref()
            .and_then(|i| serde_json::to_string(i).ok());
        let quality_checkpoints_json = step
            .quality_checkpoints
            .as_ref()
            .and_then(|qc| serde_json::to_string(qc).ok());
        let step_data_json = step
            .step_data
            .as_ref()
            .and_then(|sd| serde_json::to_string(sd).ok());
        let collected_data_json = step
            .collected_data
            .as_ref()
            .and_then(|cd| serde_json::to_string(cd).ok());
        let measurements_json = step
            .measurements
            .as_ref()
            .and_then(|m| serde_json::to_string(m).ok());
        let observations_json = step
            .observations
            .as_ref()
            .and_then(|obs| serde_json::to_string(obs).ok());
        let photo_urls_json = step
            .photo_urls
            .as_ref()
            .and_then(|urls| serde_json::to_string(urls).ok());
        let validation_data_json = step
            .validation_data
            .as_ref()
            .and_then(|vd| serde_json::to_string(vd).ok());
        let validation_errors_json = step
            .validation_errors
            .as_ref()
            .and_then(|ve| serde_json::to_string(ve).ok());

        tx.execute(
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
                step.id, step.intervention_id, step.step_number, step.step_name, step_type_str, step_status_str,
                step.description, instructions_json, quality_checkpoints_json, step.is_mandatory, step.requires_photos,
                step.min_photos_required, step.max_photos_allowed, step.started_at.inner(), step.completed_at.inner(), step.paused_at.inner(),
                step.duration_seconds, step.estimated_duration_seconds, step_data_json, collected_data_json, measurements_json,
                observations_json, step.photo_count, step.required_photos_completed, photo_urls_json, validation_data_json,
                validation_errors_json, step.validation_score, step.requires_supervisor_approval, step.approved_by,
                step.approved_at.inner(), step.rejection_reason, step.location_lat, step.location_lon, step.location_accuracy,
                step.created_at, step.updated_at
            ],
        )?;

        Ok(())
    }

    pub fn save_step(&self, step: &InterventionStep) -> InterventionResult<()> {
        let conn = self.db.get_connection()?;

        // Convert enums to strings
        let step_type_str = step.step_type.to_string();
        let step_status_str = step.step_status.to_string();

        // Convert JSON fields with error handling
        let instructions_json = step
            .instructions
            .as_ref()
            .and_then(|i| serde_json::to_string(i).ok());
        let quality_checkpoints_json = step
            .quality_checkpoints
            .as_ref()
            .and_then(|qc| serde_json::to_string(qc).ok());
        let step_data_json = step
            .step_data
            .as_ref()
            .and_then(|sd| serde_json::to_string(sd).ok());
        let collected_data_json = step
            .collected_data
            .as_ref()
            .and_then(|cd| serde_json::to_string(cd).ok());
        let measurements_json = step
            .measurements
            .as_ref()
            .and_then(|m| serde_json::to_string(m).ok());
        let observations_json = step
            .observations
            .as_ref()
            .and_then(|obs| serde_json::to_string(obs).ok());
        let photo_urls_json = step
            .photo_urls
            .as_ref()
            .and_then(|urls| serde_json::to_string(urls).ok());
        let validation_data_json = step
            .validation_data
            .as_ref()
            .and_then(|vd| serde_json::to_string(vd).ok());
        let validation_errors_json = step
            .validation_errors
            .as_ref()
            .and_then(|ve| serde_json::to_string(ve).ok());

        conn.execute(
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
                step.id, step.intervention_id, step.step_number, step.step_name, step_type_str, step_status_str,
                step.description, instructions_json, quality_checkpoints_json, step.is_mandatory, step.requires_photos,
                step.min_photos_required, step.max_photos_allowed, step.started_at.inner(), step.completed_at.inner(), step.paused_at.inner(),
                step.duration_seconds, step.estimated_duration_seconds, step_data_json, collected_data_json, measurements_json,
                observations_json, step.photo_count, step.required_photos_completed, photo_urls_json, validation_data_json,
                validation_errors_json, step.validation_score, step.requires_supervisor_approval, step.approved_by,
                step.approved_at.inner(), step.rejection_reason, step.location_lat, step.location_lon, step.location_accuracy,
                step.device_timestamp.inner(), step.server_timestamp.inner(), step.title, step.notes, step.synced, step.last_synced_at.inner(),
                step.created_at, step.updated_at
            ],
        )?;

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
}
