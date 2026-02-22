use crate::models::material::MaterialType;

pub use crate::domains::inventory::infrastructure::material::{RecordConsumptionRequest, UpdateStockRequest};

pub fn parse_material_type(material_type: Option<&str>) -> Option<MaterialType> {
    material_type.and_then(|value| match value {
        "ppf_film" => Some(MaterialType::PpfFilm),
        "adhesive" => Some(MaterialType::Adhesive),
        "cleaning_solution" => Some(MaterialType::CleaningSolution),
        "tool" => Some(MaterialType::Tool),
        "consumable" => Some(MaterialType::Consumable),
        _ => None,
    })
}
