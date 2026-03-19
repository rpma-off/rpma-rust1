pub mod client_handler;
pub mod domain;
pub mod infrastructure;

#[allow(unused_imports)]
pub(crate) use client_handler::ClientsFacade;

#[cfg(test)]
pub(crate) mod tests;
