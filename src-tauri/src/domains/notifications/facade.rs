#[derive(Debug, Default, Clone)]
pub struct NotificationsFacade;
impl NotificationsFacade {
    pub fn new() -> Self {
        Self
    }

    pub fn is_ready(&self) -> bool {
        true
    }
}
