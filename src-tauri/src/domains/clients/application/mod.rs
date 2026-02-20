// Application layer for the Clients bounded context.
//
// Re-exports the public contracts used by IPC handlers and other bounded contexts.

pub use crate::domains::clients::ipc::client::ClientCrudRequest;
