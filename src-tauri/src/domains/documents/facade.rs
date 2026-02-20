#[derive(Debug, Default, Clone)]
pub struct DocumentsFacade;
impl DocumentsFacade {
    pub fn new() -> Self {
        Self
    }

    pub fn is_ready(&self) -> bool {
        true
    }
}
