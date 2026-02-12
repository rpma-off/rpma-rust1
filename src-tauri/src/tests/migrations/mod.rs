//! Migration testing module

pub mod test_framework;

// Include migration tests directly
mod test_008_workflow_constraints;
mod test_011_duplicate_interventions;
mod test_012_material_tables;

// Tests for recent migrations
mod test_019_enhanced_performance_indexes;
mod test_020_cache_metadata;
mod test_021_client_statistics;
mod test_022_task_history;
mod test_023_messaging_tables;
mod test_024_inventory_management;
mod test_025_analytics_dashboard;
mod test_026_user_settings;
mod test_027_task_constraints;
mod test_029_user_name_backfill;
mod test_030_user_sessions_updated_at;
mod test_031_inventory_non_negative_checks;
mod test_032_intervention_task_fk;
mod test_033_task_workflow_fks;
mod test_034_session_activity_index;
mod test_035_tasks_deleted_at_index;

// Re-export test macros
pub use test_framework::*;
