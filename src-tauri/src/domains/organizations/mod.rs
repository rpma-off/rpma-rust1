mod facade;
pub(crate) use facade::OrganizationsFacade;

#[cfg(feature = "export-types")]
pub mod domain;
#[cfg(not(feature = "export-types"))]
pub(crate) mod domain;

pub(crate) mod application;
pub(crate) mod infrastructure;
pub mod ipc;

#[cfg(test)]
pub(crate) mod tests;
