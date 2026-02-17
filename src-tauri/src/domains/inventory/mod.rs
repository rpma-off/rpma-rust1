pub(crate) mod domain;
pub mod application;
pub(crate) mod infrastructure;
pub(crate) mod ipc;

#[cfg(test)]
mod tests;

pub use application::InventoryService;
