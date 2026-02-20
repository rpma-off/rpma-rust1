#[derive(Debug, Default, Clone)]
pub struct SettingsFacade;
impl SettingsFacade {
    pub fn new() -> Self {
        Self
    }

    pub fn is_ready(&self) -> bool {
        true
    }
}
