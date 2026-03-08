//! Local authentication service for secure session management
//!
//! This module is split into focused sub-modules, each extending `AuthService`
//! via `impl super::AuthService`:
//!
//! - `username`             — username generation from names
//! - `account`              — account creation and signup processing
//! - `authentication`       — login, session validation, logout
//! - `password`             — password hashing, verification, and change
//! - `user_ops`             — user CRUD (list, get, update, delete)
//! - `session_cleanup`      — expired-session housekeeping
//! - `user_account_manager` — `UserAccountManager` shared-contract impl

mod account;
mod authentication;
mod password;
mod session_cleanup;
mod user_account_manager;
mod user_ops;
mod username;

use crate::domains::auth::infrastructure::rate_limiter::RateLimiterService;
use crate::domains::auth::infrastructure::session_repository::SessionRepository;
use crate::shared::services::performance_monitor::PerformanceMonitorService;
use crate::shared::services::security_monitor::SecurityMonitorService;
use crate::shared::services::validation::ValidationService;
use std::sync::Arc;
use tracing::warn;

#[derive(Clone, Debug)]
pub struct AuthService {
    db: crate::db::Database,
    session_repository: SessionRepository,
    rate_limiter: Arc<RateLimiterService>,
    security_monitor: Arc<SecurityMonitorService>,
    performance_monitor: Arc<PerformanceMonitorService>,
    validator: ValidationService,
}

impl AuthService {
    /// Get a reference to the security monitor service
    pub fn security_monitor(&self) -> &Arc<SecurityMonitorService> {
        &self.security_monitor
    }

    pub fn new(db: crate::db::Database) -> Result<Self, String> {
        let db_arc = std::sync::Arc::new(db.clone());
        let session_repository = SessionRepository::new(db_arc);
        let rate_limiter = Arc::new(RateLimiterService::new(db.clone()));
        let security_monitor = Arc::new(SecurityMonitorService::new(db.clone()));
        let performance_monitor = Arc::new(PerformanceMonitorService::new(db.clone()));

        Ok(Self {
            db,
            session_repository,
            rate_limiter,
            security_monitor,
            performance_monitor,
            validator: ValidationService::new(),
        })
    }

    /// Initialize auth services
    pub fn init(&self) -> Result<(), String> {
        // Note: users and sessions tables are created by migrations

        // Initialize rate limiter
        self.rate_limiter.init()?;

        // Initialize security monitor
        self.security_monitor.init()?;

        // Initialize performance monitor
        self.performance_monitor.init()?;

        // Clean up expired sessions on startup
        if let Err(e) = self.cleanup_expired_sessions() {
            warn!("Failed to cleanup expired sessions on startup: {}", e);
        }

        Ok(())
    }

    /// Get access to the rate limiter service
    pub fn rate_limiter(&self) -> Arc<RateLimiterService> {
        self.rate_limiter.clone()
    }
}
