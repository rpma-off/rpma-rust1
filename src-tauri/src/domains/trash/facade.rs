//! Cross-domain facade for the `trash` domain (ADR-002, ADR-003).
//!
//! Keep this surface minimal — only expose what other domains truly need.
//! Prefer `shared/contracts/` for type-only sharing.

// TODO(scaffold): Add public types or service methods that cross-domain callers need.

/// Facade for the `Trash` domain.
pub struct TrashFacade;
