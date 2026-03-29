use super::*;
use crate::shared::contracts::common::*;
use crate::shared::services::cross_domain::{Client, Intervention, InterventionStatus, InterventionStep};
use serde_json::json;

use super::extractors::{extract_checklist, extract_defects, extract_ppf_zones, extract_string_array};

fn build_test_intervention() -> Intervention {
    let now = now();
    Intervention {
        id: "test-intervention-001".to_string(),
        task_id: "task-001".to_string(),
        task_number: Some("T-001".to_string()),
        status: InterventionStatus::Completed,
        vehicle_plate: "AB-123-CD".to_string(),
        vehicle_model: Some("Model S".to_string()),
        vehicle_make: Some("Tesla".to_string()),
        vehicle_year: Some(2024),
        vehicle_color: Some("Noir".to_string()),
        vehicle_vin: Some("VIN123456".to_string()),
        client_id: None,
        client_name: Some("Client Test".to_string()),
        client_email: Some("client@test.com".to_string()),
        client_phone: Some("+33612345678".to_string()),
        technician_id: Some("tech-001".to_string()),
        technician_name: Some("Jean Dupont".to_string()),
        intervention_type: crate::shared::services::cross_domain::InterventionType::Ppf,
        current_step: 4,
        completion_percentage: 100.0,
        estimated_duration: Some(120),
        actual_duration: Some(95),
        film_type: Some(FilmType::Premium),
        film_brand: Some("XPEL".to_string()),
        film_model: Some("Ultimate Plus".to_string()),
        ppf_zones_config: Some(vec!["Capot".to_string(), "Pare-chocs".to_string()]),
        ppf_zones_extended: None,
        weather_condition: Some(WeatherCondition::Sunny),
        lighting_condition: Some(LightingCondition::Natural),
        work_location: Some(WorkLocation::Indoor),
        temperature_celsius: Some(30.0),
        humidity_percentage: Some(43.0),
        start_location_lat: None,
        start_location_lon: None,
        start_location_accuracy: None,
        end_location_lat: None,
        end_location_lon: None,
        end_location_accuracy: None,
        customer_satisfaction: Some(9),
        quality_score: Some(88),
        final_observations: Some(vec!["Travail soigne".to_string()]),
        customer_signature: Some("base64sig".to_string()),
        customer_comments: Some("Tres satisfait".to_string()),
        metadata: None,
        notes: None,
        special_instructions: None,
        device_info: None,
        app_version: None,
        synced: false,
        last_synced_at: None,
        sync_error: None,
        created_at: now,
        updated_at: now,
        created_by: None,
        updated_by: None,
        started_at: TimestampString::new(Some(now)),
        completed_at: TimestampString::new(Some(now)),
        scheduled_at: TimestampString::new(None),
        paused_at: TimestampString::new(None),
    }
}

fn build_test_steps() -> Vec<InterventionStep> {
    use crate::shared::services::cross_domain::{StepStatus, StepType};

    let mut inspection = InterventionStep::new(
        "test-intervention-001".to_string(),
        1,
        "Inspection".to_string(),
        StepType::Inspection,
    );
    inspection.step_status = StepStatus::Completed;
    inspection.duration_seconds = Some(600);
    inspection.photo_count = 3;
    inspection.notes = Some("Surface propre, quelques micro-rayures".to_string());
    inspection.observations = Some(vec![
        "Micro-rayures sur le capot".to_string(),
        "Peinture en bon etat general".to_string(),
    ]);
    inspection.collected_data = Some(json!({
        "checklist": {"wash": true, "clay_bar": true, "ipa_wipe": true},
        "defects": ["rayure legere"],
        "environment": {"temperature": 30, "humidity": 43}
    }));
    inspection.validation_score = Some(90);

    let preparation = InterventionStep::new(
        "test-intervention-001".to_string(),
        2,
        "Preparation".to_string(),
        StepType::Preparation,
    );

    let mut installation = InterventionStep::new(
        "test-intervention-001".to_string(),
        3,
        "Installation".to_string(),
        StepType::Installation,
    );
    installation.step_status = StepStatus::Completed;
    installation.duration_seconds = Some(3600);
    installation.photo_count = 8;
    installation.notes = Some("Installation terminee avec succes".to_string());
    installation.collected_data = Some(json!({
        "zones": ["full_front", "full_vehicle"],
        "quality_scores": {"full_front": 10, "full_vehicle": 8.5}
    }));
    installation.validation_score = Some(92);

    let mut finalization = InterventionStep::new(
        "test-intervention-001".to_string(),
        4,
        "Finalisation".to_string(),
        StepType::Finalization,
    );
    finalization.step_status = StepStatus::Completed;
    finalization.duration_seconds = Some(300);
    finalization.validation_score = Some(88);

    vec![inspection, preparation, installation, finalization]
}

#[test]
fn test_vm_includes_all_four_steps() {
    let intervention = build_test_intervention();
    let steps = build_test_steps();
    let vm = build_intervention_report_view_model(&intervention, &steps, &[], &[], None);

    assert_eq!(vm.steps.len(), 4);
    assert_eq!(vm.steps[0].title, "Inspection");
    assert_eq!(vm.steps[1].title, "Preparation");
    assert_eq!(vm.steps[2].title, "Installation");
    assert_eq!(vm.steps[3].title, "Finalisation");
}

#[test]
fn test_vm_pending_step_preserved() {
    let intervention = build_test_intervention();
    let steps = build_test_steps();
    let vm = build_intervention_report_view_model(&intervention, &steps, &[], &[], None);

    let prep = &vm.steps[1];
    assert_eq!(prep.status, "En attente");
    assert_eq!(prep.status_badge, "[..]");
}

#[test]
fn test_vm_inspection_details() {
    let intervention = build_test_intervention();
    let steps = build_test_steps();
    let vm = build_intervention_report_view_model(&intervention, &steps, &[], &[], None);

    let inspection = &vm.steps[0];
    assert!(inspection
        .defects
        .iter()
        .any(|d| d.defect_type == "rayure legere"));
    assert!(!inspection.environment.is_empty());
    let temp_kv = inspection.environment.iter().find(|kv| kv.key == "Temperature");
    assert!(temp_kv.is_some());
    assert_eq!(temp_kv.unwrap().value, "30");

    let hum_kv = inspection.environment.iter().find(|kv| kv.key == "Humidity");
    assert!(hum_kv.is_some());
    assert_eq!(hum_kv.unwrap().value, "43");

    assert!(inspection.observations.len() >= 2);
    assert_eq!(inspection.checklist.len(), 3);
    assert_eq!(inspection.quality_score, "90/100");
}

#[test]
fn test_vm_installation_details() {
    let intervention = build_test_intervention();
    let steps = build_test_steps();
    let vm = build_intervention_report_view_model(&intervention, &steps, &[], &[], None);

    let installation = &vm.steps[2];
    assert!(installation.zones.iter().any(|z| z.id == "full_front"));
    assert!(installation.zones.iter().any(|z| z.id == "full_vehicle"));
    assert_eq!(installation.quality_score, "92/100");
    assert!(installation.notes.contains("Installation"));
}

#[test]
fn test_vm_normalizes_null_fields() {
    let mut intervention = build_test_intervention();
    intervention.technician_name = None;
    intervention.customer_signature = None;
    intervention.customer_satisfaction = None;
    intervention.quality_score = None;
    intervention.final_observations = None;
    intervention.customer_comments = None;
    intervention.weather_condition = None;
    intervention.lighting_condition = None;
    intervention.work_location = None;
    intervention.temperature_celsius = None;
    intervention.humidity_percentage = None;
    intervention.film_type = None;
    intervention.film_brand = None;
    intervention.film_model = None;
    intervention.estimated_duration = None;
    intervention.actual_duration = None;

    let vm = build_intervention_report_view_model(&intervention, &[], &[], &[], None);

    assert_eq!(vm.summary.technician_name, "Non assigne");
    assert!(!vm.customer_validation.signature_present);
    assert_eq!(vm.customer_validation.satisfaction, formatters::NOT_EVALUATED);
    assert_eq!(vm.quality.global_quality_score, formatters::NOT_EVALUATED);
    assert_eq!(vm.work_conditions.weather, formatters::NOT_SPECIFIED);
    assert_eq!(vm.materials.film_type, formatters::NOT_SPECIFIED);
    assert_eq!(vm.summary.estimated_duration, formatters::NOT_SPECIFIED);
    assert_eq!(vm.summary.actual_duration, formatters::NOT_SPECIFIED);
}

#[test]
fn test_vm_client_from_intervention_denormalized() {
    let intervention = build_test_intervention();
    let vm = build_intervention_report_view_model(&intervention, &[], &[], &[], None);

    assert_eq!(vm.client.name, "Client Test");
    assert_eq!(vm.client.email, "client@test.com");
}

#[test]
fn test_vm_client_from_client_object() {
    let intervention = build_test_intervention();
    let client = Client {
        id: "c-001".to_string(),
        name: "Entreprise ABC".to_string(),
        email: Some("abc@corp.com".to_string()),
        phone: Some("+33700000000".to_string()),
        customer_type: crate::shared::services::cross_domain::CustomerType::Business,
        address_street: None,
        address_city: None,
        address_state: None,
        address_zip: None,
        address_country: None,
        tax_id: None,
        company_name: None,
        contact_person: None,
        notes: None,
        tags: None,
        total_tasks: 0,
        active_tasks: 0,
        completed_tasks: 0,
        last_task_date: None,
        created_at: 0,
        updated_at: 0,
        created_by: None,
        deleted_at: None,
        deleted_by: None,
        synced: false,
        last_synced_at: None,
    };
    let vm = build_intervention_report_view_model(&intervention, &[], &[], &[], Some(&client));

    assert_eq!(vm.client.name, "Entreprise ABC");
    assert_eq!(vm.client.email, "abc@corp.com");
    assert_eq!(vm.client.phone, "+33700000000");
}

#[test]
fn test_vm_meta_fields() {
    let intervention = build_test_intervention();
    let vm = build_intervention_report_view_model(&intervention, &[], &[], &[], None);

    assert_eq!(vm.meta.intervention_id, "test-intervention-001");
    assert_eq!(vm.meta.task_number, "T-001");
    assert_eq!(vm.meta.report_title, "Rapport d'intervention PPF");
    assert!(!vm.meta.generated_at.is_empty());
}

#[test]
fn test_vm_completion_percentage_recalculated_from_steps() {
    let mut intervention = build_test_intervention();
    intervention.completion_percentage = 66.666;

    use crate::shared::services::cross_domain::{StepStatus, StepType};
    let mut s1 = InterventionStep::new("i".into(), 1, "S1".into(), StepType::Inspection);
    s1.step_status = StepStatus::Completed;
    let mut s2 = InterventionStep::new("i".into(), 2, "S2".into(), StepType::Preparation);
    s2.step_status = StepStatus::Completed;
    let mut s3 = InterventionStep::new("i".into(), 3, "S3".into(), StepType::Installation);
    s3.step_status = StepStatus::Completed;

    let vm = build_intervention_report_view_model(&intervention, &[s1, s2, s3], &[], &[], None);
    assert!((vm.summary.completion_percentage - 100.0).abs() < 0.01);
}

#[test]
fn test_vm_summary_fields() {
    let intervention = build_test_intervention();
    let steps = build_test_steps();
    let vm = build_intervention_report_view_model(&intervention, &steps, &[], &[], None);

    assert_eq!(vm.summary.status, "Terminee");
    assert_eq!(vm.summary.status_badge, "[OK]");
    assert_eq!(vm.summary.technician_name, "Jean Dupont");
    assert_eq!(vm.summary.estimated_duration, "120 min");
    assert_eq!(vm.summary.actual_duration, "95 min");
    assert!((vm.summary.completion_percentage - 75.0).abs() < 0.01);
    assert_eq!(vm.summary.intervention_type, "PPF (Protection Film)");
}

#[test]
fn test_vm_quality_section() {
    let intervention = build_test_intervention();
    let steps = build_test_steps();
    let vm = build_intervention_report_view_model(&intervention, &steps, &[], &[], None);

    assert_eq!(vm.quality.global_quality_score, "88/100");
    assert_eq!(vm.quality.checkpoints.len(), 3);
    assert_eq!(vm.quality.final_observations.len(), 1);
    assert_eq!(vm.quality.final_observations[0], "Travail soigne");
}

#[test]
fn test_vm_customer_validation() {
    let intervention = build_test_intervention();
    let vm = build_intervention_report_view_model(&intervention, &[], &[], &[], None);

    assert_eq!(vm.customer_validation.satisfaction, "9/10");
    assert!(vm.customer_validation.signature_present);
    assert_eq!(vm.customer_validation.comments, "Tres satisfait");
}

#[test]
fn test_vm_vehicle_fields() {
    let intervention = build_test_intervention();
    let vm = build_intervention_report_view_model(&intervention, &[], &[], &[], None);

    assert_eq!(vm.vehicle.plate, "AB-123-CD");
    assert_eq!(vm.vehicle.make, "Tesla");
    assert_eq!(vm.vehicle.model, "Model S");
    assert_eq!(vm.vehicle.year, "2024");
    assert_eq!(vm.vehicle.color, "Noir");
    assert_eq!(vm.vehicle.vin, "VIN123456");
}

#[test]
fn test_vm_work_conditions() {
    let intervention = build_test_intervention();
    let vm = build_intervention_report_view_model(&intervention, &[], &[], &[], None);

    assert_eq!(vm.work_conditions.weather, "Ensoleille");
    assert_eq!(vm.work_conditions.lighting, "Naturel");
    assert_eq!(vm.work_conditions.location, "Interieur");
    assert_eq!(vm.work_conditions.temperature, "30.0 C");
    assert_eq!(vm.work_conditions.humidity, "43.0%");
}

#[test]
fn test_humanize_key_function() {
    assert_eq!(humanize_key("checklist"), "Checklist");
    assert_eq!(humanize_key("quality_scores"), "Quality Scores");
    assert_eq!(humanize_key("installation_zones"), "Installation Zones");
    assert_eq!(humanize_key(""), "");
}

#[test]
fn test_score_to_stars_function() {
    assert_eq!(score_to_stars(100), "*****");
    assert_eq!(score_to_stars(80), "****");
    assert_eq!(score_to_stars(0), "");
}

#[test]
fn test_format_duration_seconds_function() {
    assert_eq!(formatters::format_duration_seconds(30), "30 sec");
    assert_eq!(formatters::format_duration_seconds(600), "10 min");
    assert_eq!(formatters::format_duration_seconds(3600), "1h");
    assert_eq!(formatters::format_duration_seconds(3900), "1h 05min");
}

#[test]
fn test_extract_checklist_from_json() {
    let data = json!({
        "checklist": {"wash": true, "clay_bar": true, "ipa_wipe": false}
    });
    let result = extract_checklist(Some(&data));
    assert_eq!(result.len(), 3);
    let wash = result.iter().find(|c| c.label == "Wash");
    assert!(wash.is_some());
    assert!(wash.unwrap().checked);
}

#[test]
fn test_extract_string_array_from_json() {
    let data = json!({"defects": ["rayure legere", "impact"]});
    let result = extract_string_array(Some(&data), "defects");
    assert_eq!(result.len(), 2);
    assert!(result.contains(&"rayure legere".to_string()));
}

#[test]
fn test_extract_ppf_zones_string_array() {
    let data = json!({"zones": ["full_front", "full_vehicle"]});
    let result = extract_ppf_zones(Some(&data));
    assert_eq!(result.len(), 2);
    assert!(result.iter().any(|z| z.id == "full_front"));
}

#[test]
fn test_extract_ppf_zones_object_array() {
    let data = json!({"zones": [
        {"id": "capot", "name": "Capot", "status": "completed", "quality_score": 9.5},
        {"id": "bumper", "name": "Pare-chocs", "status": "completed", "quality_score": 8.0}
    ]});
    let result = extract_ppf_zones(Some(&data));
    assert_eq!(result.len(), 2);
    let capot = result.iter().find(|z| z.id == "capot").unwrap();
    assert_eq!(capot.name, "Capot");
    assert_eq!(capot.status, "completed");
    assert!((capot.quality_score.unwrap() - 9.5).abs() < 0.01);
}

#[test]
fn test_extract_ppf_zones_fallback_installation_zones() {
    let data = json!({"installation_zones": ["hood", "bumper"]});
    let result = extract_ppf_zones(Some(&data));
    assert_eq!(result.len(), 2);
    assert!(result.iter().any(|z| z.id == "hood"));
}

#[test]
fn test_extract_defects_string_array() {
    let data = json!({"defects": ["rayure legere", "impact"]});
    let result = extract_defects(Some(&data));
    assert_eq!(result.len(), 2);
    assert!(result.iter().any(|d| d.defect_type == "rayure legere"));
}

#[test]
fn test_extract_defects_object_array() {
    let data = json!({"defects": [
        {"id": "d1", "zone": "trunk", "type": "scratch", "severity": "high", "notes": "deep"}
    ]});
    let result = extract_defects(Some(&data));
    assert_eq!(result.len(), 1);
    assert_eq!(result[0].zone, "trunk");
    assert_eq!(result[0].defect_type, "scratch");
    assert_eq!(result[0].severity, "high");
    assert_eq!(result[0].notes, "deep");
}
