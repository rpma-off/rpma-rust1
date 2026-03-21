//! Canonical audit type definitions.
//!
//! Single source of truth for `ActionResult` and `AuditEventType` enums
//! used by both the audit service and audit repository.

use serde::{Deserialize, Serialize};

/// Action result enumeration for audit events
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ActionResult {
    Success,
    Failure,
    Partial,
    Cancelled,
}

impl ActionResult {
    /// String representation used for database storage.
    pub fn to_str(&self) -> &'static str {
        match self {
            ActionResult::Success => "Success",
            ActionResult::Failure => "Failure",
            ActionResult::Partial => "Partial",
            ActionResult::Cancelled => "Cancelled",
        }
    }

    /// Parse from a database string, defaulting to `Failure` for unknown values.
    pub fn from_str_or_default(s: &str) -> Self {
        match s {
            "Success" => ActionResult::Success,
            "Failure" => ActionResult::Failure,
            "Partial" => ActionResult::Partial,
            "Cancelled" => ActionResult::Cancelled,
            _ => ActionResult::Failure,
        }
    }
}

/// Security event types for comprehensive audit logging
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum AuditEventType {
    // Authentication & Authorization Events
    AuthenticationSuccess,
    AuthenticationFailure,
    AuthorizationGranted,
    AuthorizationDenied,
    SessionCreated,
    SessionExpired,
    SessionInvalidated,
    PasswordChanged,
    PasswordResetRequested,
    PasswordResetCompleted,

    // Data Access Events
    DataRead,
    DataCreated,
    DataUpdated,
    DataDeleted,
    DataExported,
    DataImported,

    // Task Management Events
    TaskCreated,
    TaskUpdated,
    TaskDeleted,
    TaskAssigned,
    TaskCompleted,
    TaskCancelled,
    TaskStatusChanged,

    // Client Management Events
    ClientCreated,
    ClientUpdated,
    ClientDeleted,
    ClientContactChanged,

    // Intervention Workflow Events
    InterventionCreated,
    InterventionUpdated,
    InterventionStarted,
    InterventionCompleted,
    InterventionStepCompleted,
    InterventionWorkflowChanged,

    // System Events
    SystemStartup,
    SystemShutdown,
    BackupStarted,
    BackupCompleted,
    BackupFailed,
    MaintenanceStarted,
    MaintenanceCompleted,

    // Security Events
    SecurityViolation,
    SuspiciousActivity,
    RateLimitExceeded,
    BruteForceAttempt,
    SqlInjectionAttempt,
    XssAttempt,
    PathTraversalAttempt,

    // Error Events
    SystemError,
    DatabaseError,
    NetworkError,
    ValidationError,

    // Configuration Events
    ConfigurationChanged,
    SettingUpdated,
    RoleChanged,
    PermissionChanged,
}

impl AuditEventType {
    /// String representation used for database storage.
    pub fn to_str(&self) -> &'static str {
        match self {
            AuditEventType::AuthenticationSuccess => "AuthenticationSuccess",
            AuditEventType::AuthenticationFailure => "AuthenticationFailure",
            AuditEventType::AuthorizationGranted => "AuthorizationGranted",
            AuditEventType::AuthorizationDenied => "AuthorizationDenied",
            AuditEventType::SessionCreated => "SessionCreated",
            AuditEventType::SessionExpired => "SessionExpired",
            AuditEventType::SessionInvalidated => "SessionInvalidated",
            AuditEventType::PasswordChanged => "PasswordChanged",
            AuditEventType::PasswordResetRequested => "PasswordResetRequested",
            AuditEventType::PasswordResetCompleted => "PasswordResetCompleted",
            AuditEventType::DataRead => "DataRead",
            AuditEventType::DataCreated => "DataCreated",
            AuditEventType::DataUpdated => "DataUpdated",
            AuditEventType::DataDeleted => "DataDeleted",
            AuditEventType::DataExported => "DataExported",
            AuditEventType::DataImported => "DataImported",
            AuditEventType::TaskCreated => "TaskCreated",
            AuditEventType::TaskUpdated => "TaskUpdated",
            AuditEventType::TaskDeleted => "TaskDeleted",
            AuditEventType::TaskAssigned => "TaskAssigned",
            AuditEventType::TaskCompleted => "TaskCompleted",
            AuditEventType::TaskCancelled => "TaskCancelled",
            AuditEventType::TaskStatusChanged => "TaskStatusChanged",
            AuditEventType::ClientCreated => "ClientCreated",
            AuditEventType::ClientUpdated => "ClientUpdated",
            AuditEventType::ClientDeleted => "ClientDeleted",
            AuditEventType::ClientContactChanged => "ClientContactChanged",
            AuditEventType::InterventionCreated => "InterventionCreated",
            AuditEventType::InterventionUpdated => "InterventionUpdated",
            AuditEventType::InterventionStarted => "InterventionStarted",
            AuditEventType::InterventionCompleted => "InterventionCompleted",
            AuditEventType::InterventionStepCompleted => "InterventionStepCompleted",
            AuditEventType::InterventionWorkflowChanged => "InterventionWorkflowChanged",
            AuditEventType::SystemStartup => "SystemStartup",
            AuditEventType::SystemShutdown => "SystemShutdown",
            AuditEventType::BackupStarted => "BackupStarted",
            AuditEventType::BackupCompleted => "BackupCompleted",
            AuditEventType::BackupFailed => "BackupFailed",
            AuditEventType::MaintenanceStarted => "MaintenanceStarted",
            AuditEventType::MaintenanceCompleted => "MaintenanceCompleted",
            AuditEventType::SecurityViolation => "SecurityViolation",
            AuditEventType::SuspiciousActivity => "SuspiciousActivity",
            AuditEventType::RateLimitExceeded => "RateLimitExceeded",
            AuditEventType::BruteForceAttempt => "BruteForceAttempt",
            AuditEventType::SqlInjectionAttempt => "SqlInjectionAttempt",
            AuditEventType::XssAttempt => "XssAttempt",
            AuditEventType::PathTraversalAttempt => "PathTraversalAttempt",
            AuditEventType::SystemError => "SystemError",
            AuditEventType::DatabaseError => "DatabaseError",
            AuditEventType::NetworkError => "NetworkError",
            AuditEventType::ValidationError => "ValidationError",
            AuditEventType::ConfigurationChanged => "ConfigurationChanged",
            AuditEventType::SettingUpdated => "SettingUpdated",
            AuditEventType::RoleChanged => "RoleChanged",
            AuditEventType::PermissionChanged => "PermissionChanged",
        }
    }

    /// Parse from a database string, defaulting to `SystemError` for unknown values.
    pub fn from_str_or_default(s: &str) -> Self {
        match s {
            "AuthenticationSuccess" => AuditEventType::AuthenticationSuccess,
            "AuthenticationFailure" => AuditEventType::AuthenticationFailure,
            "AuthorizationGranted" => AuditEventType::AuthorizationGranted,
            "AuthorizationDenied" => AuditEventType::AuthorizationDenied,
            "SessionCreated" => AuditEventType::SessionCreated,
            "SessionExpired" => AuditEventType::SessionExpired,
            "SessionInvalidated" => AuditEventType::SessionInvalidated,
            "PasswordChanged" => AuditEventType::PasswordChanged,
            "PasswordResetRequested" => AuditEventType::PasswordResetRequested,
            "PasswordResetCompleted" => AuditEventType::PasswordResetCompleted,
            "DataRead" => AuditEventType::DataRead,
            "DataCreated" => AuditEventType::DataCreated,
            "DataUpdated" => AuditEventType::DataUpdated,
            "DataDeleted" => AuditEventType::DataDeleted,
            "DataExported" => AuditEventType::DataExported,
            "DataImported" => AuditEventType::DataImported,
            "TaskCreated" => AuditEventType::TaskCreated,
            "TaskUpdated" => AuditEventType::TaskUpdated,
            "TaskDeleted" => AuditEventType::TaskDeleted,
            "TaskAssigned" => AuditEventType::TaskAssigned,
            "TaskCompleted" => AuditEventType::TaskCompleted,
            "TaskCancelled" => AuditEventType::TaskCancelled,
            "TaskStatusChanged" => AuditEventType::TaskStatusChanged,
            "ClientCreated" => AuditEventType::ClientCreated,
            "ClientUpdated" => AuditEventType::ClientUpdated,
            "ClientDeleted" => AuditEventType::ClientDeleted,
            "ClientContactChanged" => AuditEventType::ClientContactChanged,
            "InterventionCreated" => AuditEventType::InterventionCreated,
            "InterventionUpdated" => AuditEventType::InterventionUpdated,
            "InterventionStarted" => AuditEventType::InterventionStarted,
            "InterventionCompleted" => AuditEventType::InterventionCompleted,
            "InterventionStepCompleted" => AuditEventType::InterventionStepCompleted,
            "InterventionWorkflowChanged" => AuditEventType::InterventionWorkflowChanged,
            "SystemStartup" => AuditEventType::SystemStartup,
            "SystemShutdown" => AuditEventType::SystemShutdown,
            "BackupStarted" => AuditEventType::BackupStarted,
            "BackupCompleted" => AuditEventType::BackupCompleted,
            "BackupFailed" => AuditEventType::BackupFailed,
            "MaintenanceStarted" => AuditEventType::MaintenanceStarted,
            "MaintenanceCompleted" => AuditEventType::MaintenanceCompleted,
            "SecurityViolation" => AuditEventType::SecurityViolation,
            "SuspiciousActivity" => AuditEventType::SuspiciousActivity,
            "RateLimitExceeded" => AuditEventType::RateLimitExceeded,
            "BruteForceAttempt" => AuditEventType::BruteForceAttempt,
            "SqlInjectionAttempt" => AuditEventType::SqlInjectionAttempt,
            "XssAttempt" => AuditEventType::XssAttempt,
            "PathTraversalAttempt" => AuditEventType::PathTraversalAttempt,
            "SystemError" => AuditEventType::SystemError,
            "DatabaseError" => AuditEventType::DatabaseError,
            "NetworkError" => AuditEventType::NetworkError,
            "ValidationError" => AuditEventType::ValidationError,
            "ConfigurationChanged" => AuditEventType::ConfigurationChanged,
            "SettingUpdated" => AuditEventType::SettingUpdated,
            "RoleChanged" => AuditEventType::RoleChanged,
            "PermissionChanged" => AuditEventType::PermissionChanged,
            _ => AuditEventType::SystemError,
        }
    }
}
