//! Domain module index for RPMA v2
//!
//! This module serves as the conceptual domain map for the application.
//! Each sub-module re-exports the relevant services, repositories, and models
//! for a specific bounded context, providing a clear dependency graph.
//!
//! ## Domains
//!
//! - **auth**: Authentication, sessions, tokens, 2FA
//! - **users**: User management, profiles, roles
//! - **tasks**: Task CRUD, status transitions, assignments
//! - **interventions**: Intervention workflow, steps, progress
//! - **clients**: Client management, contact info
//! - **inventory**: Material and inventory tracking
//! - **quotes**: Quotes and pricing
//! - **calendar**: Calendar events, scheduling
//! - **reports**: Report generation, analytics, exports
//! - **settings**: User and system settings
//! - **audit**: Audit logging, security monitoring
//! - **sync**: Offline sync, background operations
//! - **documents**: Document management
//!
//! ## Architecture
//!
//! Each domain follows the 4-layer pattern:
//! ```text
//! Commands (IPC handlers) → Services (business logic) → Repositories (data access) → Models (types)
//! ```
//!
//! Domain modules do not introduce new code; they provide organizational
//! re-exports that make the dependency graph explicit and discoverable.

pub mod audit;
pub mod auth;
pub mod calendar;
pub mod clients;
pub mod documents;
pub mod interventions;
pub mod inventory;
pub mod quotes;
pub mod reports;
pub mod settings;
pub mod sync;
pub mod tasks;
pub mod users;

pub mod analytics;
pub mod notifications;
