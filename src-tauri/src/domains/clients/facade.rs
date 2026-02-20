#[derive(Debug, Default, Clone)]
pub struct ClientsFacade;
impl ClientsFacade {
    pub fn new() -> Self {
        Self
    }

    pub fn is_ready(&self) -> bool {
        true
    }
}
