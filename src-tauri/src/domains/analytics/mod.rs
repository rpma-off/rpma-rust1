mod facade;
#[cfg(test)]
pub(crate) use facade::AnalyticsFacade;
pub(crate) mod application;
pub(crate) mod domain;
pub(crate) mod infrastructure;
pub(crate) mod ipc;
#[cfg(test)]
pub(crate) mod tests;
