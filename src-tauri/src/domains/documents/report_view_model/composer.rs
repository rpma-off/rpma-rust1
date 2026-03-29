use chrono::Utc;

use crate::shared::services::cross_domain::{
    Client, Intervention, InterventionStep, MaterialConsumption, Photo, StepStatus,
};

use super::{
    builders,
    formatters::{
        film_type_label, intervention_status_badge, intervention_status_label,
        intervention_type_label, lighting_label, location_label, weather_label,
        NOT_EVALUATED, NOT_SPECIFIED, NO_DATA, NO_OBSERVATION,
    },
    ReportClient, ReportCustomerValidation, ReportDisplay, ReportMaterials, ReportMaterialConsumption,
    ReportMeta, ReportSummary, ReportVehicle, ReportViewModel, ReportWorkConditions,
};

/// Build a complete `ReportViewModel` from raw intervention data.
///
/// This is the single entry point that fuses top-level `steps` (the
/// canonical list) with the intervention data and normalises every field so
/// that the PDF template can render without any further logic.
pub fn build_intervention_report_view_model(
    intervention: &Intervention,
    steps: &[InterventionStep],
    photos: &[Photo],
    materials: &[MaterialConsumption],
    client: Option<&Client>,
) -> ReportViewModel {
    let now = Utc::now();

    let meta = ReportMeta {
        report_title: "Rapport d'intervention PPF".to_string(),
        generated_at: now.format("%d/%m/%Y %H:%M").to_string(),
        intervention_id: intervention.id.clone(),
        task_number: intervention
            .task_number
            .clone()
            .unwrap_or_else(|| NOT_SPECIFIED.to_string()),
    };

    let recalculated_completion = {
        let total = steps.len();
        let completed = steps
            .iter()
            .filter(|s| matches!(s.step_status, StepStatus::Completed))
            .count();
        if total > 0 {
            (completed as f64 / total as f64) * 100.0
        } else {
            0.0
        }
    };

    let summary = ReportSummary {
        status: intervention_status_label(&intervention.status),
        status_badge: intervention_status_badge(&intervention.status),
        technician_name: intervention
            .technician_name
            .clone()
            .unwrap_or_else(|| "Non assigne".to_string()),
        estimated_duration: intervention
            .estimated_duration
            .map(|d| format!("{} min", d))
            .unwrap_or_else(|| NOT_SPECIFIED.to_string()),
        actual_duration: intervention
            .actual_duration
            .map(|d| format!("{} min", d))
            .unwrap_or_else(|| NOT_SPECIFIED.to_string()),
        completion_percentage: recalculated_completion,
        intervention_type: intervention_type_label(&intervention.intervention_type),
    };

    let report_client = match client {
        Some(c) => ReportClient {
            name: c.name.clone(),
            email: c.email.clone().unwrap_or_else(|| NOT_SPECIFIED.to_string()),
            phone: c.phone.clone().unwrap_or_else(|| NOT_SPECIFIED.to_string()),
        },
        None => ReportClient {
            name: intervention
                .client_name
                .clone()
                .unwrap_or_else(|| NOT_SPECIFIED.to_string()),
            email: intervention
                .client_email
                .clone()
                .unwrap_or_else(|| NOT_SPECIFIED.to_string()),
            phone: intervention
                .client_phone
                .clone()
                .unwrap_or_else(|| NOT_SPECIFIED.to_string()),
        },
    };

    let vehicle = ReportVehicle {
        plate: intervention.vehicle_plate.clone(),
        make: intervention
            .vehicle_make
            .clone()
            .unwrap_or_else(|| NOT_SPECIFIED.to_string()),
        model: intervention
            .vehicle_model
            .clone()
            .unwrap_or_else(|| NOT_SPECIFIED.to_string()),
        year: intervention
            .vehicle_year
            .map(|y| y.to_string())
            .unwrap_or_else(|| NOT_SPECIFIED.to_string()),
        color: intervention
            .vehicle_color
            .clone()
            .unwrap_or_else(|| NOT_SPECIFIED.to_string()),
        vin: intervention
            .vehicle_vin
            .clone()
            .unwrap_or_else(|| NOT_SPECIFIED.to_string()),
    };

    let work_conditions = ReportWorkConditions {
        weather: intervention
            .weather_condition
            .as_ref()
            .map(weather_label)
            .unwrap_or_else(|| NOT_SPECIFIED.to_string()),
        lighting: intervention
            .lighting_condition
            .as_ref()
            .map(lighting_label)
            .unwrap_or_else(|| NOT_SPECIFIED.to_string()),
        location: intervention
            .work_location
            .as_ref()
            .map(location_label)
            .unwrap_or_else(|| NOT_SPECIFIED.to_string()),
        temperature: intervention
            .temperature_celsius
            .map(|t| format!("{:.1} C", t))
            .unwrap_or_else(|| NOT_SPECIFIED.to_string()),
        humidity: intervention
            .humidity_percentage
            .map(|h| format!("{:.1}%", h))
            .unwrap_or_else(|| NOT_SPECIFIED.to_string()),
    };

    let report_materials = ReportMaterials {
        film_type: intervention
            .film_type
            .as_ref()
            .map(film_type_label)
            .unwrap_or_else(|| NOT_SPECIFIED.to_string()),
        film_brand: intervention
            .film_brand
            .clone()
            .unwrap_or_else(|| NOT_SPECIFIED.to_string()),
        film_model: intervention
            .film_model
            .clone()
            .unwrap_or_else(|| NOT_SPECIFIED.to_string()),
        consumptions: materials
            .iter()
            .map(|m| ReportMaterialConsumption {
                material_id: m.material_id.clone(),
                quantity_used: m.quantity_used,
                unit_cost: m
                    .unit_cost
                    .map(|c| format!("{:.2}", c))
                    .unwrap_or_else(|| "-".to_string()),
                total_cost: m
                    .total_cost
                    .map(|c| format!("{:.2}", c))
                    .unwrap_or_else(|| "-".to_string()),
                waste_quantity: m.waste_quantity,
                quality_notes: m.quality_notes.clone().unwrap_or_else(|| "-".to_string()),
            })
            .collect(),
    };

    let report_steps: Vec<_> = steps
        .iter()
        .map(|step| builders::build_report_step(step, photos))
        .collect();

    let quality = builders::build_quality_section(intervention, &report_steps);

    let customer_validation = ReportCustomerValidation {
        satisfaction: intervention
            .customer_satisfaction
            .map(|s| format!("{}/10", s))
            .unwrap_or_else(|| NOT_EVALUATED.to_string()),
        signature_present: intervention.customer_signature.is_some(),
        comments: intervention
            .customer_comments
            .clone()
            .unwrap_or_else(|| NO_OBSERVATION.to_string()),
    };

    let report_photos = builders::build_photos_section(photos, steps);

    let display = ReportDisplay {
        placeholder_not_specified: NOT_SPECIFIED.to_string(),
        placeholder_no_observation: NO_OBSERVATION.to_string(),
        placeholder_not_evaluated: NOT_EVALUATED.to_string(),
        placeholder_no_data: NO_DATA.to_string(),
    };

    ReportViewModel {
        meta,
        summary,
        client: report_client,
        vehicle,
        work_conditions,
        materials: report_materials,
        steps: report_steps,
        quality,
        customer_validation,
        photos: report_photos,
        display,
    }
}
