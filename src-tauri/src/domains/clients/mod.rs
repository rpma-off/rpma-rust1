pub mod application;
pub mod client_handler;
pub mod domain;
pub mod infrastructure;
pub mod ipc;

mod facade;
pub use facade::ClientsFacade;

#[cfg(test)]
pub(crate) mod tests;
