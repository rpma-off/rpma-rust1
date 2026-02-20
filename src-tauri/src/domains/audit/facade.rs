#[derive(Debug, Default, Clone)]
pub struct AuditFacade;
impl AuditFacade {
    pub fn new() -> Self {
        Self
    }

    pub fn is_ready(&self) -> bool {
        true
    }
}
