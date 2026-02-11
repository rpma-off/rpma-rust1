//! Services module - Business logic layer
//!
//! This module contains all business logic services that handle
//! complex operations and validation for the application.

pub mod alerting;
pub mod analytics;
pub mod audit_service;
pub mod auth;
pub mod cache;
pub mod calendar;
pub mod calendar_event_service;
pub mod client;
pub mod client_statistics;
pub mod client_validation;
pub mod dashboard;
pub mod document_storage;
pub mod domain_event;
pub mod event_bus;
pub mod event_system;
pub mod geo;
pub mod intervention;
pub mod intervention_calculation;
pub mod intervention_data;
pub mod intervention_types;
pub mod intervention_validation;
pub mod intervention_workflow;
pub mod material;
pub mod notification;
pub mod operational_intelligence;
pub mod pdf_generation;
pub mod pdf_report;
pub mod performance_monitor;
pub mod photo;
pub mod prediction;
pub mod rate_limiter;
pub mod report_jobs;
pub mod reports;
pub mod security_monitor;
pub mod session;
pub mod settings;
pub mod task;
pub mod task_client_integration;
pub mod task_constants;
pub mod task_creation;
pub mod task_crud;
pub mod task_deletion;
pub mod task_import;
pub mod task_queries;
pub mod task_statistics;
pub mod task_update;
pub mod task_validation;
pub mod token;
pub mod two_factor;
pub mod user;
pub mod validation;
pub mod websocket_event_handler;
pub mod worker_pool;
pub mod workflow_cleanup;
pub mod workflow_progression;
pub mod workflow_strategy;
pub mod workflow_validation;

// Re-export main services
pub use analytics::AnalyticsService;

pub use client::ClientService;
pub use client_statistics::ClientStatisticsService;
pub use dashboard::DashboardService;

pub use intervention::InterventionService;
pub use material::MaterialService;
pub use photo::PhotoService;
pub use settings::SettingsService;
pub use task::TaskService;
pub use user::UserService;
