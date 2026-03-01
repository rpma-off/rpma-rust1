mod facade;
#[cfg(test)]
pub(crate) use facade::QuotesFacade;
pub(crate) mod application;
#[cfg(feature = "export-types")]
pub mod domain;
#[cfg(not(feature = "export-types"))]
pub(crate) mod domain;
pub(crate) mod infrastructure;
pub(crate) mod ipc;
#[cfg(test)]
pub(crate) mod tests;
