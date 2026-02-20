#[derive(Debug, Default, Clone)]
pub struct ReportsFacade;
impl ReportsFacade {
    pub fn new() -> Self {
        Self
    }

    pub fn is_ready(&self) -> bool {
        true
    }
}
