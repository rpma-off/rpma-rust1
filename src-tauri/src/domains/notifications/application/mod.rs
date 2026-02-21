// Application layer for the Notifications bounded context.
//
// Re-exports the public IPC contracts for notification operations.

pub use crate::domains::notifications::ipc::notification::{
    SendNotificationRequest, UpdateNotificationConfigRequest,
};
