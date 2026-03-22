//! Domain-layer contracts for the interventions bounded context.
//!
//! Traits defined here are implemented by infrastructure and consumed by application,
//! following the dependency rule: IPC → Application → Domain ← Infrastructure.

/// Narrow contract for quote-driven intervention creation.
///
/// Implemented by `InterventionWorkflowService` (infrastructure) and consumed by
/// application-layer event handlers.  Defined in domain/ so infrastructure can
/// implement it without creating an infrastructure → application dependency.
pub trait InterventionCreator: Send + Sync {
    /// Create an intervention from an accepted/converted quote.
    ///
    /// Returns `Ok(())` when the intervention was created or already existed.
    /// Returns `Err(String)` on unexpected failures.
    fn create_from_quote(&self, task_id: &str, quote_id: &str) -> Result<(), String>;
}
