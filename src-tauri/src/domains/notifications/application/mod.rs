//! Application layer for the Notifications bounded context.

pub mod contracts;
pub mod notification_in_app;

pub use contracts::{SendNotificationRequest, UpdateNotificationConfigRequest};
