use serde::Serialize;

/// Top-level report view model consumed by the PDF template.
#[derive(Debug, Clone, Serialize)]
pub struct ReportViewModel {
    pub meta: ReportMeta,
    pub summary: ReportSummary,
    pub client: ReportClient,
    pub vehicle: ReportVehicle,
    pub work_conditions: ReportWorkConditions,
    pub materials: ReportMaterials,
    pub steps: Vec<ReportStep>,
    pub quality: ReportQuality,
    pub customer_validation: ReportCustomerValidation,
    pub photos: ReportPhotos,
    pub display: ReportDisplay,
}

#[derive(Debug, Clone, Serialize)]
pub struct ReportMeta {
    pub report_title: String,
    pub generated_at: String,
    pub intervention_id: String,
    pub task_number: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ReportSummary {
    pub status: String,
    pub status_badge: String,
    pub technician_name: String,
    pub estimated_duration: String,
    pub actual_duration: String,
    pub completion_percentage: f64,
    pub intervention_type: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ReportClient {
    pub name: String,
    pub email: String,
    pub phone: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ReportVehicle {
    pub plate: String,
    pub make: String,
    pub model: String,
    pub year: String,
    pub color: String,
    pub vin: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ReportWorkConditions {
    pub weather: String,
    pub lighting: String,
    pub location: String,
    pub temperature: String,
    pub humidity: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ReportMaterials {
    pub film_type: String,
    pub film_brand: String,
    pub film_model: String,
    pub consumptions: Vec<ReportMaterialConsumption>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ReportMaterialConsumption {
    pub material_id: String,
    pub quantity_used: f64,
    pub unit_cost: String,
    pub total_cost: String,
    pub waste_quantity: f64,
    pub quality_notes: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ReportStep {
    pub id: String,
    pub title: String,
    pub number: i32,
    pub status: String,
    pub status_badge: String,
    pub started_at: String,
    pub completed_at: String,
    pub duration: String,
    pub photo_count: i32,
    pub notes: String,
    pub checklist: Vec<ReportChecklistItem>,
    pub defects: Vec<ReportDefect>,
    pub observations: Vec<String>,
    pub measurements: Vec<ReportKeyValue>,
    pub environment: Vec<ReportKeyValue>,
    pub zones: Vec<ReportZone>,
    pub quality_score: String,
    pub validation_data: Vec<ReportKeyValue>,
    pub approval_data: ReportApproval,
}

#[derive(Debug, Clone, Serialize)]
pub struct ReportDefect {
    pub zone: String,
    pub defect_type: String,
    pub severity: String,
    pub notes: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ReportZone {
    pub id: String,
    pub name: String,
    pub quality_score: Option<f64>,
    pub status: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ReportChecklistItem {
    pub label: String,
    pub checked: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct ReportKeyValue {
    pub key: String,
    pub value: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ReportApproval {
    pub approved_by: String,
    pub approved_at: String,
    pub rejection_reason: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ReportQuality {
    pub global_quality_score: String,
    pub checkpoints: Vec<ReportQualityCheckpoint>,
    pub final_observations: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ReportQualityCheckpoint {
    pub step_name: String,
    pub step_status: String,
    pub score: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ReportCustomerValidation {
    pub satisfaction: String,
    pub signature_present: bool,
    pub comments: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ReportPhotos {
    pub total_count: usize,
    pub grouped_by_step: Vec<ReportPhotoGroup>,
    pub grouped_by_category: Vec<ReportPhotoGroup>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ReportPhotoGroup {
    pub label: String,
    pub count: usize,
}

#[derive(Debug, Clone, Serialize)]
pub struct ReportDisplay {
    pub placeholder_not_specified: String,
    pub placeholder_no_observation: String,
    pub placeholder_not_evaluated: String,
    pub placeholder_no_data: String,
}
