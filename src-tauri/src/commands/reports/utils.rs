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

/// Format report data for CSV export
pub fn format_report_data_for_csv(report_data: &serde_json::Value) -> String {
    match report_data {
        serde_json::Value::Array(arr) => {
            let mut csv_lines = Vec::new();
            csv_lines.push("Field,Value".to_string()); // Header

            for item in arr {
                if let serde_json::Value::Object(map) = item {
                    for (key, value) in map {
                        csv_lines.push(format!("{},{}", key, value));
                    }
                }
            }

            csv_lines.join("\n")
        }
        _ => "No data available for CSV export".to_string(),
    }
}
