mod facade;
pub(crate) mod application;
pub(crate) mod domain;
pub(crate) mod infrastructure;
pub(crate) mod ipc;
#[cfg(test)]
pub(crate) mod tests;

pub use ipc::notification::{SendNotificationRequest, UpdateNotificationConfigRequest};
