//! Application layer for the Notifications bounded context.

pub mod contracts;
pub mod config_builder;
pub mod notification_in_app;

pub use config_builder::build_notification_config;
pub use contracts::{SendNotificationRequest, UpdateNotificationConfigRequest};
