//! Memory management helper functions
//!
//! These functions provide convenient access to memory monitoring
//! and cleanup operations for use throughout the application.

use crate::memory_management::{MemoryConfig, MemoryError, MemoryManager, MemoryStats};
use std::sync::OnceLock;

static MEMORY_MANAGER: OnceLock<MemoryManager> = OnceLock::new();

/// Initialize the global memory manager
pub fn initialize_memory_manager() -> Result<(), MemoryError> {
    let manager = MemoryManager::new(MemoryConfig::default());
    MEMORY_MANAGER
        .set(manager)
        .map_err(|_| MemoryError::SystemInfo("Memory manager already initialized".to_string()))?;
    Ok(())
}

/// Get current memory statistics
pub fn get_memory_stats() -> Result<MemoryStats, MemoryError> {
    if let Some(manager) = MEMORY_MANAGER.get() {
        manager.get_memory_stats()
    } else {
        // Return default stats if manager not initialized
        Ok(MemoryStats {
            cache_entries: 0,
            cache_hit_ratio: 0.0,
            total_memory_used: 0,
            memory_usage_percent: 0.0,
            active_allocations: 0,
            cache_evictions: 0,
            cache_misses: 0,
            cache_hits: 0,
            last_cleanup: std::time::SystemTime::now(),
        })
    }
}

/// Trigger memory cleanup
pub fn trigger_cleanup() {
    if let Some(manager) = MEMORY_MANAGER.get() {
        // Trigger cleanup through the manager's cache
        let _ = manager.cache().cleanup_expired();
    }
}

/// Check if memory manager is initialized
pub fn is_initialized() -> bool {
    MEMORY_MANAGER.get().is_some()
}

/// Get memory usage percentage (0-100)
pub fn get_memory_usage_percent() -> f64 {
    if let Ok(stats) = get_memory_stats() {
        stats.memory_usage_percent
    } else {
        0.0
    }
}

/// Check if memory is under pressure (>80% usage)
pub fn is_memory_pressure() -> bool {
    get_memory_usage_percent() > 80.0
}

/// Check if memory is critically low (>90% usage)
pub fn is_memory_critical() -> bool {
    get_memory_usage_percent() > 90.0
}
