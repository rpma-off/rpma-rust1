//! Navigation commands for desktop app routing and history management

use lazy_static::lazy_static;
use std::collections::VecDeque;
use std::sync::Mutex;
use tracing::{debug, info, instrument};

#[derive(Clone, Debug)]
struct NavigationHistory {
    history: VecDeque<String>,
    current_index: usize,
    max_history: usize,
}

impl NavigationHistory {
    fn new(max_history: usize) -> Self {
        Self {
            history: VecDeque::new(),
            current_index: 0,
            max_history,
        }
    }

    fn add(&mut self, path: String) {
        // Remove any forward history when adding new path
        self.history.truncate(self.current_index + 1);

        // Add new path
        self.history.push_back(path);

        // Maintain max history size
        if self.history.len() > self.max_history {
            self.history.pop_front();
        } else {
            self.current_index = self.history.len() - 1;
        }
    }

    fn go_back(&mut self) -> Option<&String> {
        if self.current_index > 0 {
            self.current_index -= 1;
            self.history.get(self.current_index)
        } else {
            None
        }
    }

    fn go_forward(&mut self) -> Option<&String> {
        if self.current_index < self.history.len() - 1 {
            self.current_index += 1;
            self.history.get(self.current_index)
        } else {
            None
        }
    }

    fn get_current(&self) -> Option<&String> {
        self.history.get(self.current_index)
    }
}

lazy_static! {
    static ref NAVIGATION_HISTORY: Mutex<NavigationHistory> =
        Mutex::new(NavigationHistory::new(50));
}

/// Update current navigation path
#[tauri::command]
pub async fn navigation_update(path: String, _options: serde_json::Value, correlation_id: Option<String>) -> Result<(), String> {
    let _correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    
    let mut history = NAVIGATION_HISTORY.lock().map_err(|e| e.to_string())?;
    history.add(path);
    Ok(())
}

/// Add path to navigation history
#[tauri::command]
pub async fn navigation_add_to_history(path: String, correlation_id: Option<String>) -> Result<(), String> {
    let _correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    
    let mut history = NAVIGATION_HISTORY.lock().map_err(|e| e.to_string())?;
    history.add(path);
    Ok(())
}

/// Go back in navigation history
#[tauri::command]
pub async fn navigation_go_back(correlation_id: Option<String>) -> Result<Option<String>, String> {
    let _correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    
    let mut history = NAVIGATION_HISTORY.lock().map_err(|e| e.to_string())?;
    Ok(history.go_back().cloned())
}

/// Go forward in navigation history
#[tauri::command]
pub async fn navigation_go_forward(correlation_id: Option<String>) -> Result<Option<String>, String> {
    let _correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    
    let mut history = NAVIGATION_HISTORY.lock().map_err(|e| e.to_string())?;
    Ok(history.go_forward().cloned())
}

/// Get current navigation path
#[tauri::command]
pub async fn navigation_get_current(correlation_id: Option<String>) -> Result<Option<String>, String> {
    let _correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    
    let history = NAVIGATION_HISTORY.lock().map_err(|e| e.to_string())?;
    Ok(history.get_current().cloned())
}

/// Refresh current view
#[tauri::command]
pub async fn navigation_refresh(correlation_id: Option<String>) -> Result<(), String> {
    let _correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    
    // This command triggers a refresh in the frontend
    // The actual refresh is handled by the frontend calling window.location.reload()
    Ok(())
}

/// Register keyboard shortcuts for menu integration
#[tauri::command]
#[instrument]
pub async fn shortcuts_register(shortcuts: serde_json::Value, correlation_id: Option<String>) -> Result<(), String> {
    let _correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    
    debug!("Registering keyboard shortcuts");

    // Parse shortcuts and store them for menu integration
    // This is a placeholder for future menu system integration
    // For now, we just validate the shortcuts structure
    let shortcuts_count = if let Some(shortcuts_array) = shortcuts.as_array() {
        for shortcut in shortcuts_array {
            if let (Some(key), Some(description)) = (
                shortcut.get("key").and_then(|k| k.as_str()),
                shortcut.get("description").and_then(|d| d.as_str()),
            ) {
                // In a full implementation, this would register with the system menu
                tracing::debug!(key = %key, description = %description, "Registered keyboard shortcut");
            }
        }
        shortcuts_array.len()
    } else {
        0
    };

    info!(
        "Successfully registered {} keyboard shortcuts",
        shortcuts_count
    );
    Ok(())
}
