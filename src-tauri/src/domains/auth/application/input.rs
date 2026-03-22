// `SignupRequest` has been moved to `domain/models/auth.rs` so that
// infrastructure can reference it without an upward dependency (ADR-001).
// Re-exported here so all existing `application::SignupRequest` import paths
// continue to compile unchanged.
pub use crate::domains::auth::domain::models::auth::SignupRequest;
