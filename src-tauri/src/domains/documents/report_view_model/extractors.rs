//! JSON extraction helpers for the report view model.

use super::formatters::humanize_key;
use super::{ReportChecklistItem, ReportKeyValue};

pub(super) fn extract_checklist(data: Option<&serde_json::Value>) -> Vec<ReportChecklistItem> {
    let Some(data) = data else {
        return Vec::new();
    };
    let Some(obj) = data.get("checklist") else {
        return Vec::new();
    };
    match obj {
        serde_json::Value::Object(map) => map
            .iter()
            .map(|(k, v)| ReportChecklistItem {
                label: humanize_key(k),
                checked: v.as_bool().unwrap_or(false),
            })
            .collect(),
        serde_json::Value::Array(arr) => arr
            .iter()
            .filter_map(|item| {
                item.as_str().map(|s| ReportChecklistItem {
                    label: s.to_string(),
                    checked: true,
                })
            })
            .collect(),
        _ => Vec::new(),
    }
}

pub(super) fn extract_string_array(
    data: Option<&serde_json::Value>,
    key: &str,
) -> Vec<String> {
    let Some(data) = data else {
        return Vec::new();
    };
    let Some(arr) = data.get(key) else {
        return Vec::new();
    };
    match arr {
        serde_json::Value::Array(items) => items
            .iter()
            .filter_map(|v| match v {
                serde_json::Value::String(s) => Some(s.clone()),
                other if !other.is_null() => Some(other.to_string()),
                _ => None,
            })
            .collect(),
        serde_json::Value::String(s) => vec![s.clone()],
        _ => Vec::new(),
    }
}

pub(super) fn extract_key_values(
    data: Option<&serde_json::Value>,
    key: &str,
) -> Vec<ReportKeyValue> {
    let Some(data) = data else {
        return Vec::new();
    };
    let Some(value) = data.get(key) else {
        return Vec::new();
    };
    json_to_key_values(value)
}

pub(super) fn extract_zones(data: Option<&serde_json::Value>) -> Vec<String> {
    // Try "zones" first, then "installation_zones"
    let mut result = extract_string_array(data, "zones");
    if result.is_empty() {
        result = extract_string_array(data, "installation_zones");
    }
    result
}

pub(super) fn json_to_key_values(value: &serde_json::Value) -> Vec<ReportKeyValue> {
    match value {
        serde_json::Value::Object(obj) => obj
            .iter()
            .filter(|(_, v)| !v.is_null())
            .map(|(k, v)| ReportKeyValue {
                key: humanize_key(k),
                value: json_value_display(v),
            })
            .collect(),
        serde_json::Value::Null => Vec::new(),
        _ => Vec::new(),
    }
}

pub(super) fn json_value_display(value: &serde_json::Value) -> String {
    match value {
        serde_json::Value::String(s) => s.clone(),
        serde_json::Value::Bool(b) => {
            if *b {
                "Oui".to_string()
            } else {
                "Non".to_string()
            }
        }
        serde_json::Value::Number(n) => n.to_string(),
        serde_json::Value::Null => "-".to_string(),
        serde_json::Value::Array(arr) => arr
            .iter()
            .map(|v| json_value_display(v))
            .collect::<Vec<_>>()
            .join(", "),
        serde_json::Value::Object(_) => {
            // Flatten nested objects
            let kvs = json_to_key_values(value);
            kvs.iter()
                .map(|kv| format!("{}: {}", kv.key, kv.value))
                .collect::<Vec<_>>()
                .join(", ")
        }
    }
}
