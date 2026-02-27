mod facade;
#[cfg(test)]
pub(crate) use facade::DocumentsFacade;
pub(crate) mod application;
pub mod domain;
pub(crate) mod infrastructure;
pub(crate) mod ipc;
#[cfg(test)]
pub(crate) mod tests;
