//! Utility functions for reports
//!
//! This module contains shared utility functions used across
//! different report operations.

use crate::models::reports::CompleteInterventionData;
use std::io::Read;
use std::path::Path;

/// Copy file with comprehensive validation and error handling
pub fn copy_file_with_validation(
    source_path: &str,
    dest_path: &str,
    attempt: usize,
) -> Result<u64, std::io::Error> {
    let source = Path::new(source_path);
    let dest = Path::new(dest_path);

    // Verify source file exists and is readable
    let source_metadata = std::fs::metadata(source)?;
    if !source_metadata.is_file() {
        return Err(std::io::Error::new(
            std::io::ErrorKind::InvalidInput,
            format!("Source is not a file: {}", source_path),
        ));
    }

    // Check if destination is accessible
    if let Some(parent) = dest.parent() {
        let parent_metadata = std::fs::metadata(parent)?;
        if !parent_metadata.is_dir() {
            return Err(std::io::Error::new(
                std::io::ErrorKind::NotFound,
                format!(
                    "Destination parent is not a directory: {}",
                    parent.display()
                ),
            ));
        }
    }

    // Use std::fs::copy as primary method
    match std::fs::copy(source, dest) {
        Ok(bytes) => {
            // Verify the copy was successful by checking file size
            match std::fs::metadata(dest) {
                Ok(dest_metadata) => {
                    if dest_metadata.len() == source_metadata.len() {
                        Ok(bytes)
                    } else {
                        // Size mismatch - remove the corrupted file
                        let _ = std::fs::remove_file(dest);
                        Err(std::io::Error::new(
                            std::io::ErrorKind::InvalidData,
                            format!("File copy verification failed: size mismatch (expected {}, got {})",
                                   source_metadata.len(), dest_metadata.len()),
                        ))
                    }
                }
                Err(e) => {
                    // Can't verify - remove the potentially corrupted file
                    let _ = std::fs::remove_file(dest);
                    Err(std::io::Error::new(
                        std::io::ErrorKind::Other,
                        format!("Cannot verify copied file: {}", e),
                    ))
                }
            }
        }
        Err(e) => {
            // If std::fs::copy fails, try manual copy as fallback
            if attempt >= 2 {
                manual_file_copy(source, dest)
            } else {
                Err(e)
            }
        }
    }
}

/// Manual file copy implementation as fallback
pub fn manual_file_copy(source: &Path, dest: &Path) -> Result<u64, std::io::Error> {
    use std::io::Write;

    let mut source_file = std::fs::File::open(source)?;
    let mut dest_file = std::fs::File::create(dest)?;

    let mut buffer = [0u8; 8192];
    let mut total_bytes = 0u64;

    loop {
        let bytes_read = source_file.read(&mut buffer)?;
        if bytes_read == 0 {
            break;
        }
        dest_file.write_all(&buffer[..bytes_read])?;
        total_bytes += bytes_read as u64;
    }

    dest_file.flush()?;
    Ok(total_bytes)
}

/// Estimate the data size for PDF generation to help with memory planning
pub fn estimate_pdf_data_size(intervention_data: &CompleteInterventionData) -> usize {
    let mut size = 0usize;

    // Base PDF structure overhead
    size += 10_000; // PDF headers, fonts, etc.

    // Intervention basic info
    size += intervention_data.intervention.id.len() * 2;
    size += intervention_data
        .intervention
        .technician_name
        .as_ref()
        .map(|s| s.len())
        .unwrap_or(0);
    size += intervention_data.intervention.vehicle_plate.len();
    size += intervention_data
        .intervention
        .vehicle_model
        .as_ref()
        .map(|s| s.len())
        .unwrap_or(0);
    size += intervention_data
        .intervention
        .film_type
        .as_ref()
        .map(|s| format!("{:?}", s).len())
        .unwrap_or(0);

    // Client information
    if let Some(client) = &intervention_data.client {
        size += client.name.len();
        size += client.email.as_ref().map(|s| s.len()).unwrap_or(0);
        size += client.phone.as_ref().map(|s| s.len()).unwrap_or(0);
    }

    // Workflow steps - each step adds significant content
    for step in &intervention_data.workflow_steps {
        size += step.step_name.len();
        size += step.observations.as_ref().map(|s| s.len()).unwrap_or(0);
        size += 500; // Estimated formatting and metadata per step
    }

    // Photos - this is the biggest factor
    for photo in &intervention_data.photos {
        // Base photo info
        size += photo
            .photo_category
            .as_ref()
            .map(|s| format!("{:?}", s).len())
            .unwrap_or(10);
        size += 200; // Metadata per photo

        // Estimate photo file size if we have GPS data (photos with GPS tend to be larger)
        if photo.gps_location_lat.is_some() {
            size += 500_000; // Estimate 500KB per photo with GPS
        } else {
            size += 200_000; // Estimate 200KB per photo without GPS
        }
    }

    size
}

/// Format report data for PDF export
pub fn format_report_data_for_pdf(report_data: &serde_json::Value) -> Vec<String> {
    let mut lines = Vec::new();

    // Convert JSON to formatted text
    match report_data {
        serde_json::Value::Object(map) => {
            for (key, value) in map {
                lines.push(format!("{}: {}", key, value));
            }
        }
        serde_json::Value::Array(arr) => {
            for (i, item) in arr.iter().enumerate() {
                lines.push(format!("Item {}: {}", i + 1, item));
            }
        }
        _ => {
            lines.push(format!("{}", report_data));
        }
    }

    lines
}

/// Escape a value for CSV output (RFC 4180 compliant)
fn csv_escape(value: &str) -> String {
    if value.contains(',') || value.contains('"') || value.contains('\n') || value.contains('\r') {
        format!("\"{}\"", value.replace('"', "\"\""))
    } else {
        value.to_string()
    }
}

/// Convert a JSON value to a CSV-safe string
fn json_value_to_csv_string(value: &serde_json::Value) -> String {
    match value {
        serde_json::Value::Null => String::new(),
        serde_json::Value::Bool(b) => b.to_string(),
        serde_json::Value::Number(n) => n.to_string(),
        serde_json::Value::String(s) => csv_escape(s),
        serde_json::Value::Array(arr) => {
            let items: Vec<String> = arr.iter().map(|v| json_value_to_csv_string(v)).collect();
            csv_escape(&items.join("; "))
        }
        serde_json::Value::Object(map) => {
            let items: Vec<String> = map
                .iter()
                .map(|(k, v)| format!("{}={}", k, json_value_to_csv_string(v)))
                .collect();
            csv_escape(&items.join("; "))
        }
    }
}

/// Collect all unique keys from an array of JSON objects in stable insertion order
fn collect_ordered_keys(arr: &[serde_json::Value]) -> Vec<String> {
    let mut keys = Vec::new();
    let mut seen = std::collections::HashSet::new();

    for item in arr {
        if let serde_json::Value::Object(map) = item {
            for key in map.keys() {
                if seen.insert(key.clone()) {
                    keys.push(key.clone());
                }
            }
        }
    }

    keys.sort();
    keys
}

/// Format report data for CSV export
///
/// Produces deterministic CSV output:
/// - For arrays of objects: extracts headers from all objects, sorts alphabetically,
///   and outputs one row per object with proper CSV escaping (RFC 4180).
/// - For single objects: outputs key-value pairs as two-column CSV.
/// - For other values: outputs a single-cell CSV.
pub fn format_report_data_for_csv(report_data: &serde_json::Value) -> String {
    match report_data {
        serde_json::Value::Array(arr) if !arr.is_empty() => {
            let headers = collect_ordered_keys(arr);
            if headers.is_empty() {
                return "No data available for CSV export".to_string();
            }

            let mut csv_lines = Vec::new();
            csv_lines.push(headers.iter().map(|h| csv_escape(h)).collect::<Vec<_>>().join(","));

            for item in arr {
                if let serde_json::Value::Object(map) = item {
                    let row: Vec<String> = headers
                        .iter()
                        .map(|h| {
                            map.get(h)
                                .map(json_value_to_csv_string)
                                .unwrap_or_default()
                        })
                        .collect();
                    csv_lines.push(row.join(","));
                }
            }

            csv_lines.join("\n")
        }
        serde_json::Value::Object(map) => {
            let mut csv_lines = Vec::new();
            csv_lines.push("Field,Value".to_string());

            let mut entries: Vec<_> = map.iter().collect();
            entries.sort_by_key(|(k, _)| k.clone());

            for (key, value) in entries {
                csv_lines.push(format!("{},{}", csv_escape(key), json_value_to_csv_string(value)));
            }

            csv_lines.join("\n")
        }
        _ => "No data available for CSV export".to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    // -- CSV escape tests --

    #[test]
    fn test_csv_escape_no_special_chars() {
        assert_eq!(csv_escape("hello"), "hello");
    }

    #[test]
    fn test_csv_escape_with_comma() {
        assert_eq!(csv_escape("hello,world"), "\"hello,world\"");
    }

    #[test]
    fn test_csv_escape_with_quotes() {
        assert_eq!(csv_escape("say \"hello\""), "\"say \"\"hello\"\"\"");
    }

    #[test]
    fn test_csv_escape_with_newline() {
        assert_eq!(csv_escape("line1\nline2"), "\"line1\nline2\"");
    }

    // -- CSV format determinism tests (snapshot-like) --

    #[test]
    fn test_csv_array_of_objects_deterministic() {
        let data = json!([
            {"status": "completed", "count": 5, "name": "Alice"},
            {"status": "pending", "count": 3, "name": "Bob"}
        ]);

        let csv1 = format_report_data_for_csv(&data);
        let csv2 = format_report_data_for_csv(&data);
        assert_eq!(csv1, csv2, "CSV output must be deterministic across calls");

        // Headers must be sorted alphabetically
        let lines: Vec<&str> = csv1.lines().collect();
        assert_eq!(lines[0], "count,name,status");
        assert_eq!(lines[1], "5,Alice,completed");
        assert_eq!(lines[2], "3,Bob,pending");
    }

    #[test]
    fn test_csv_single_object() {
        let data = json!({"total_tasks": 10, "completed": 7, "rate": 70.0});

        let csv = format_report_data_for_csv(&data);
        let lines: Vec<&str> = csv.lines().collect();
        assert_eq!(lines[0], "Field,Value");
        // Fields sorted alphabetically
        assert_eq!(lines[1], "completed,7");
        assert_eq!(lines[2], "rate,70.0");
        assert_eq!(lines[3], "total_tasks,10");
    }

    #[test]
    fn test_csv_empty_array() {
        let data = json!([]);
        assert_eq!(
            format_report_data_for_csv(&data),
            "No data available for CSV export"
        );
    }

    #[test]
    fn test_csv_null_value() {
        let data = json!(null);
        assert_eq!(
            format_report_data_for_csv(&data),
            "No data available for CSV export"
        );
    }

    #[test]
    fn test_csv_special_chars_in_values() {
        let data = json!([
            {"name": "O'Brien, Jr.", "note": "said \"hello\""}
        ]);

        let csv = format_report_data_for_csv(&data);
        let lines: Vec<&str> = csv.lines().collect();
        assert_eq!(lines[0], "name,note");
        // Comma in value should be quoted, quotes should be escaped
        assert!(lines[1].contains("\"O'Brien, Jr.\""));
        assert!(lines[1].contains("\"said \"\"hello\"\"\""));
    }

    #[test]
    fn test_csv_missing_fields_across_rows() {
        let data = json!([
            {"a": 1, "b": 2},
            {"a": 3, "c": 4}
        ]);

        let csv = format_report_data_for_csv(&data);
        let lines: Vec<&str> = csv.lines().collect();
        assert_eq!(lines[0], "a,b,c");
        assert_eq!(lines[1], "1,2,");  // missing c
        assert_eq!(lines[2], "3,,4");  // missing b
    }

    #[test]
    fn test_csv_snapshot_task_completion_fixture() {
        // Stable fixture simulating task completion daily breakdown
        let fixture = json!([
            {
                "cancelled": 0,
                "completed": 3,
                "date": "2024-01-15T00:00:00Z",
                "in_progress": 1,
                "pending": 2,
                "total": 6
            },
            {
                "cancelled": 1,
                "completed": 5,
                "date": "2024-01-16T00:00:00Z",
                "in_progress": 0,
                "pending": 1,
                "total": 7
            }
        ]);

        let csv = format_report_data_for_csv(&fixture);
        let expected = "\
cancelled,completed,date,in_progress,pending,total\n\
0,3,2024-01-15T00:00:00Z,1,2,6\n\
1,5,2024-01-16T00:00:00Z,0,1,7";
        assert_eq!(csv, expected);
    }

    #[test]
    fn test_csv_snapshot_status_distribution_fixture() {
        let fixture = json!([
            {"count": 15, "percentage": 50.0, "status": "completed"},
            {"count": 10, "percentage": 33.3, "status": "pending"},
            {"count": 5, "percentage": 16.7, "status": "cancelled"}
        ]);

        let csv = format_report_data_for_csv(&fixture);
        let expected = "\
count,percentage,status\n\
15,50.0,completed\n\
10,33.3,pending\n\
5,16.7,cancelled";
        assert_eq!(csv, expected);
    }

    #[test]
    fn test_csv_snapshot_technician_breakdown_fixture() {
        let fixture = json!([
            {
                "average_time_per_task": 2.5,
                "quality_score": 95.0,
                "tasks_completed": 20,
                "technician_id": "tech-001",
                "technician_name": "Jean Dupont"
            },
            {
                "average_time_per_task": 3.1,
                "quality_score": null,
                "tasks_completed": 15,
                "technician_id": "tech-002",
                "technician_name": "Marie Martin"
            }
        ]);

        let csv = format_report_data_for_csv(&fixture);
        let expected = "\
average_time_per_task,quality_score,tasks_completed,technician_id,technician_name\n\
2.5,95.0,20,tech-001,Jean Dupont\n\
3.1,,15,tech-002,Marie Martin";
        assert_eq!(csv, expected);
    }

    // -- format_report_data_for_pdf tests --

    #[test]
    fn test_pdf_format_object() {
        let data = json!({"title": "Test Report", "count": 42});
        let lines = format_report_data_for_pdf(&data);
        assert!(!lines.is_empty());
    }

    #[test]
    fn test_pdf_format_array() {
        let data = json!([{"a": 1}, {"b": 2}]);
        let lines = format_report_data_for_pdf(&data);
        assert_eq!(lines.len(), 2);
    }
}
