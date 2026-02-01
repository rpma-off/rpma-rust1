//! Correlation ID extraction and management
//!
//! This module handles correlation ID extraction from IPC requests
//! and provides utilities for correlation ID management.

use serde_json::Value;
use std::collections::HashMap;

/// Extract correlation ID from IPC request arguments
pub fn extract_correlation_id(args: &Value) -> String {
    if let Some(obj) = args.as_object() {
        if let Some(Value::String(corr_id)) = obj.get("correlation_id") {
            // Validate the correlation ID format
            if is_valid_correlation_id(corr_id) {
                return corr_id.clone();
            }
        }
    }

    // Generate a new correlation ID if not provided or invalid
    generate_correlation_id()
}

/// Extract user ID from IPC request arguments
pub fn extract_user_id(args: &Value) -> Option<String> {
    if let Some(obj) = args.as_object() {
        if let Some(Value::String(user_id)) = obj.get("user_id") {
            return Some(user_id.clone());
        }
    }
    None
}

/// Generate a new correlation ID
pub fn generate_correlation_id() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();

    let random_part = (rand::random::<u32>() % 10000).to_string();
    format!("ipc-{}-{}", timestamp, random_part)
}

/// Validate correlation ID format
pub fn is_valid_correlation_id(id: &str) -> bool {
    // Frontend format: req-{timestamp}-{counter}-{random}
    // Backend format: ipc-{timestamp}-{random}
    id.starts_with("req-") || id.starts_with("ipc-")
}

/// Correlation context for tracking request chains
#[derive(Clone)]
pub struct CorrelationContext {
    pub correlation_id: String,
    pub user_id: Option<String>,
    pub parent_correlation_id: Option<String>,
    pub metadata: HashMap<String, Value>,
}

impl CorrelationContext {
    pub fn new(correlation_id: String, user_id: Option<String>) -> Self {
        Self {
            correlation_id,
            user_id,
            parent_correlation_id: None,
            metadata: HashMap::new(),
        }
    }

    pub fn from_ipc_args(args: &Value) -> Self {
        let correlation_id = extract_correlation_id(args);
        let user_id = extract_user_id(args);

        Self {
            correlation_id,
            user_id,
            parent_correlation_id: None,
            metadata: HashMap::new(),
        }
    }

    pub fn with_parent(mut self, parent_id: String) -> Self {
        self.parent_correlation_id = Some(parent_id);
        self
    }

    pub fn with_metadata(mut self, key: String, value: Value) -> Self {
        self.metadata.insert(key, value);
        self
    }

    pub fn get_correlation_id(&self) -> &str {
        &self.correlation_id
    }

    pub fn get_user_id(&self) -> Option<&str> {
        self.user_id.as_deref()
    }

    pub fn get_parent_correlation_id(&self) -> Option<&str> {
        self.parent_correlation_id.as_deref()
    }
}

impl Default for CorrelationContext {
    fn default() -> Self {
        Self {
            correlation_id: generate_correlation_id(),
            user_id: None,
            parent_correlation_id: None,
            metadata: HashMap::new(),
        }
    }
}

thread_local! {
    /// Thread-local storage for correlation context
    static CORRELATION_CONTEXT: std::cell::RefCell<Option<CorrelationContext>> = const { std::cell::RefCell::new(None) };
}

/// Set the current correlation context
pub fn set_correlation_context(context: CorrelationContext) {
    CORRELATION_CONTEXT.with(|ctx| {
        *ctx.borrow_mut() = Some(context);
    });
}

/// Get the current correlation context
pub fn get_correlation_context() -> Option<CorrelationContext> {
    CORRELATION_CONTEXT.with(|ctx| ctx.borrow().clone())
}

/// Clear the current correlation context
pub fn clear_correlation_context() {
    CORRELATION_CONTEXT.with(|ctx| {
        *ctx.borrow_mut() = None;
    });
}

/// Execute a function with a specific correlation context
pub fn with_correlation_context<F, R>(context: CorrelationContext, f: F) -> R
where
    F: FnOnce() -> R,
{
    let previous = get_correlation_context();
    set_correlation_context(context);
    let result = f();
    if let Some(prev) = previous {
        set_correlation_context(prev);
    } else {
        clear_correlation_context();
    }
    result
}
