#[derive(Debug, Default, Clone)]
pub struct CalendarFacade;
impl CalendarFacade {
    pub fn new() -> Self {
        Self
    }

    pub fn is_ready(&self) -> bool {
        true
    }
}
