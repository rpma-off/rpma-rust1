#[derive(Debug, Clone)]
pub struct InterventionFinalized {
    pub intervention_id: String,
    pub task_id: String,
    pub technician_id: String,
    pub completed_at_ms: i64,
}

#[derive(Debug, Clone)]
pub struct MaterialConsumed {
    pub material_id: String,
    pub quantity: f64,
    pub intervention_id: String,
    pub at_ms: i64,
}

#[derive(Debug, Clone)]
pub enum DomainEvent {
    InterventionFinalized(InterventionFinalized),
    MaterialConsumed(MaterialConsumed),
}

impl DomainEvent {
    pub fn event_type(&self) -> &'static str {
        match self {
            DomainEvent::InterventionFinalized(_) => "InterventionFinalized",
            DomainEvent::MaterialConsumed(_) => "MaterialConsumed",
        }
    }
}
