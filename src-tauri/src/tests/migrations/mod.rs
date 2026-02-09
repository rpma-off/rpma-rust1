//! Migration testing module

pub mod test_framework;

// Include migration tests directly
mod test_008_workflow_constraints;
mod test_011_duplicate_interventions;
mod test_012_material_tables;
mod test_019_enhanced_performance_indexes;
mod test_020_cache_metadata;
mod test_027_task_constraints;

// Re-export test macros
pub use test_framework::*;
