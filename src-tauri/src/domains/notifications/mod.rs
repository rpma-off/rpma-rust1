mod facade;
pub(crate) use facade::NotificationsFacade;
pub(crate) mod application;
pub mod domain;
pub(crate) mod infrastructure;
pub(crate) mod ipc;
#[cfg(test)]
pub(crate) mod tests;

pub use application::{SendNotificationRequest, UpdateNotificationConfigRequest};
