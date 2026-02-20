#[derive(Debug, Default, Clone)]
pub struct AnalyticsFacade;
impl AnalyticsFacade {
    pub fn new() -> Self {
        Self
    }

    pub fn is_ready(&self) -> bool {
        true
    }
}
