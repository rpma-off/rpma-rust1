//! Domain model for the `trash` bounded context.
//!
//! This file is free of infrastructure (rusqlite, serde_json) imports.
//! Row-to-domain conversions live in `infrastructure/trash_repository`.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "frontend/src/types/EntityType.ts")]
pub enum EntityType {
    Task,
    Client,
    Quote,
    Material,
    Intervention,
    Photo,
    Rapport,
}

impl EntityType {
    pub fn table_name(&self) -> &'static str {
        match self {
            EntityType::Task => "tasks",
            EntityType::Client => "clients",
            EntityType::Quote => "quotes",
            EntityType::Material => "materials",
            EntityType::Intervention => "interventions",
            EntityType::Photo => "photos",
            EntityType::Rapport => "intervention_reports",
        }
    }

    pub fn display_name_column(&self) -> &'static str {
        match self {
            EntityType::Task => "task_number",
            EntityType::Client => "name",
            EntityType::Quote => "quote_number",
            EntityType::Material => "name",
            EntityType::Intervention => "id", // Interventions might not have a simple name, fallback to ID or task_id
            EntityType::Photo => "file_name",
            EntityType::Rapport => "report_number",
        }
    }
}

/// Represents an item in the trash.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "frontend/src/types/DeletedItem.ts")]
pub struct DeletedItem {
    pub id: String,
    pub entity_type: EntityType,
    pub display_name: String,
    pub deleted_at: i64,
    pub deleted_by: Option<String>,
    pub deleted_by_name: Option<String>,
}

