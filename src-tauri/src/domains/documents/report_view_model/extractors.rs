//! JSON extraction helpers for the report view model.

use super::formatters::{
    checklist_label, defect_type_label, humanize_key, severity_label, workflow_status_label,
    zone_label,
};
use super::{ReportChecklistItem, ReportDefect, ReportKeyValue, ReportZone};

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
                label: checklist_label(k),
                checked: v.as_bool().unwrap_or(false),
            })
            .collect(),
        serde_json::Value::Array(arr) => arr
            .iter()
            .filter_map(|item| {
                item.as_str().map(|s| ReportChecklistItem {
                    label: checklist_label(s),
                    checked: true,
                })
            })
            .collect(),
        _ => Vec::new(),
    }
}

pub(super) fn extract_string_array(data: Option<&serde_json::Value>, key: &str) -> Vec<String> {
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

/// Extract defects from `collected_data["defects"]`.
///
/// Handles two formats:
/// - **Object array** (production): `[{"id":..., "zone":..., "type":..., "severity":..., "notes":...}]`
/// - **String array** (legacy / tests): `["rayure legere"]` → `defect_type` only
pub(super) fn extract_defects(data: Option<&serde_json::Value>) -> Vec<ReportDefect> {
    let Some(arr) = data
        .and_then(|d| d.get("defects"))
        .and_then(|v| v.as_array())
    else {
        return Vec::new();
    };

    arr.iter()
        .filter_map(|item| match item {
            serde_json::Value::Object(obj) => Some(ReportDefect {
                zone: zone_label(obj.get("zone").and_then(|v| v.as_str()).unwrap_or("")),
                defect_type: defect_type_label(
                    obj.get("type").and_then(|v| v.as_str()).unwrap_or(""),
                ),
                severity: severity_label(obj.get("severity").and_then(|v| v.as_str()).unwrap_or("")),
                notes: obj
                    .get("notes")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string(),
            }),
            serde_json::Value::String(s) => Some(ReportDefect {
                zone: String::new(),
                defect_type: defect_type_label(s),
                severity: String::new(),
                notes: String::new(),
            }),
            _ => None,
        })
        .collect()
}

/// Extract PPF zones from `collected_data["zones"]`.
///
/// Handles two formats:
/// - **Object array** (production): `[{"id":..., "name":..., "status":..., "quality_score":...}]`
/// - **String array** (legacy / tests): `["full_front"]` → `id` and `name` only
pub(super) fn extract_ppf_zones(data: Option<&serde_json::Value>) -> Vec<ReportZone> {
    // Try "zones" first, then "installation_zones" for legacy data
    let arr_opt = data
        .and_then(|d| d.get("zones"))
        .and_then(|v| v.as_array())
        .or_else(|| {
            data.and_then(|d| d.get("installation_zones"))
                .and_then(|v| v.as_array())
        });

    let Some(arr) = arr_opt else {
        return Vec::new();
    };

    arr.iter()
        .filter_map(|item| match item {
            serde_json::Value::Object(obj) => Some(ReportZone {
                id: obj
                    .get("id")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string(),
                name: {
                    let explicit_name = obj.get("name").and_then(|v| v.as_str()).unwrap_or("");
                    if explicit_name.trim().is_empty() {
                        zone_label(obj.get("id").and_then(|v| v.as_str()).unwrap_or(""))
                    } else {
                        zone_label(explicit_name)
                    }
                },
                quality_score: obj.get("quality_score").and_then(|v| v.as_f64()),
                status: workflow_status_label(
                    obj.get("status").and_then(|v| v.as_str()).unwrap_or(""),
                ),
            }),
            serde_json::Value::String(s) => Some(ReportZone {
                id: s.clone(),
                name: zone_label(s),
                quality_score: None,
                status: String::new(),
            }),
            _ => None,
        })
        .collect()
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
