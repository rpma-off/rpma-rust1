mod facade;
pub(crate) use facade::InterventionsFacade;
pub(crate) mod application;
pub mod domain;
pub mod infrastructure;
pub(crate) mod ipc;
#[cfg(test)]
pub(crate) mod tests;
