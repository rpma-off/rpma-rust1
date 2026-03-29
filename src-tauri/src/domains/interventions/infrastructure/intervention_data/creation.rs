use super::InterventionDataService;
use crate::db::{InterventionError, InterventionResult};
use crate::domains::interventions::domain::models::intervention::{
    Intervention, InterventionStatus, InterventionType,
};
use crate::domains::interventions::domain::services::intervention_state_machine;
use crate::domains::interventions::infrastructure::intervention_types::StartInterventionRequest;
use crate::shared::contracts::common::*;
use rusqlite::{params, Transaction};
use std::str::FromStr;

pub(super) fn create_intervention_with_tx(
    service: &InterventionDataService,
    tx: &Transaction,
    request: &StartInterventionRequest,
    user_id: &str,
) -> InterventionResult<Intervention> {
    let (
        task_number,
        vehicle_plate,
        client_id,
        customer_name,
        customer_email,
        customer_phone,
        vehicle_model,
        vehicle_make,
        vehicle_year_str,
        vehicle_vin,
    ): (
        String,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
    ) = tx
        .query_row(
            "SELECT task_number, vehicle_plate, client_id, customer_name, customer_email, customer_phone, vehicle_model, vehicle_make, vehicle_year, vin FROM tasks WHERE id = ?",
            params![request.task_id],
            |row| Ok((
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
                row.get(4)?,
                row.get(5)?,
                row.get(6)?,
                row.get(7)?,
                row.get(8)?,
                row.get(9)?,
            )),
        )
        .map_err(|e| {
            InterventionError::NotFound(format!("Task {} not found: {}", request.task_id, e))
        })?;
    let vehicle_plate = vehicle_plate.unwrap_or_else(|| "UNKNOWN".to_string());

    let intervention_id = crate::shared::utils::uuid::generate_uuid_string();
    let mut intervention = Intervention::new(request.task_id.clone(), task_number, vehicle_plate);
    intervention.id = intervention_id;

    intervention.client_id = client_id;
    intervention.client_name = customer_name;
    intervention.client_email = customer_email;
    intervention.client_phone = customer_phone;

    intervention.vehicle_model = vehicle_model;
    intervention.vehicle_make = vehicle_make;
    intervention.vehicle_year = vehicle_year_str
        .as_deref()
        .and_then(|year| year.parse::<i32>().ok());
    intervention.vehicle_vin = vehicle_vin;

    intervention.created_by = Some(user_id.to_string());
    intervention.updated_by = Some(user_id.to_string());
    intervention.updated_at = now();

    intervention_state_machine::validate_transition(
        &intervention.status,
        &InterventionStatus::InProgress,
    )
    .map_err(InterventionError::BusinessRule)?;
    intervention.status = InterventionStatus::InProgress;
    intervention.started_at = TimestampString::now();
    intervention.technician_id = Some(request.technician_id.clone());
    intervention.intervention_type = InterventionType::Ppf;
    intervention.ppf_zones_config = Some(request.ppf_zones.clone());
    intervention.film_type =
        Some(FilmType::from_str(&request.film_type).unwrap_or(FilmType::Matte));
    intervention.film_brand = request.film_brand.clone();
    intervention.film_model = request.film_model.clone();
    intervention.scheduled_at = TimestampString(Some(
        chrono::DateTime::parse_from_rfc3339(&request.scheduled_start)
            .map(|dt| dt.timestamp_millis())
            .unwrap_or(now()),
    ));
    intervention.estimated_duration = Some(request.estimated_duration);
    intervention.weather_condition = Some(
        WeatherCondition::from_str(&request.weather_condition)
            .unwrap_or(WeatherCondition::Sunny),
    );
    intervention.lighting_condition = Some(
        LightingCondition::from_str(&request.lighting_condition)
            .unwrap_or(LightingCondition::Natural),
    );
    intervention.work_location =
        Some(WorkLocation::from_str(&request.work_location).unwrap_or(WorkLocation::Indoor));
    intervention.temperature_celsius = request.temperature.map(|temperature| temperature as f64);
    intervention.humidity_percentage = request.humidity.map(|humidity| humidity as f64);
    if let Some(gps) = &request.gps_coordinates {
        intervention.start_location_lat = Some(gps.latitude);
        intervention.start_location_lon = Some(gps.longitude);
        intervention.start_location_accuracy = None;
    }
    intervention.notes = request.notes.clone();
    intervention.special_instructions = request
        .customer_requirements
        .clone()
        .map(|requirements| requirements.join("; "));

    intervention
        .validate()
        .map_err(|errors| InterventionError::BusinessRule(errors.join("; ")))?;

    service
        .repository
        .create_intervention_with_tx(tx, &intervention)?;

    Ok(intervention)
}
