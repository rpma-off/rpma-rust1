//! File system operations for report exports
//!
//! This module handles safe file operations with crash protection,
//! including path validation, disk space checks, and atomic file operations.

use crate::commands::AppResult;
use crate::memory_management_helpers;
use crate::models::reports::CompleteInterventionData;
use crate::domains::documents::infrastructure::document_storage::DocumentStorageService;
use crate::domains::reports::infrastructure::pdf_generation::PdfGenerationService;
use std::path::Path;
use tracing::{error, info, warn};

/// Validate file path for saving reports
#[allow(dead_code)]
pub fn validate_save_path(file_path: &str) -> AppResult<()> {
    // Validate file path
    if file_path.is_empty() {
        return Err(crate::commands::errors::AppError::Validation(
            "File path cannot be empty".to_string(),
        ));
    }

    // Basic path validation - ensure it's not a system path that could cause issues
    if file_path.contains("\\\\Windows\\\\")
        || file_path.contains("\\\\System32\\\\")
        || file_path.contains("\\\\Program Files\\\\")
        || file_path.starts_with("C:\\\\") && file_path.len() < 10
    {
        return Err(crate::commands::errors::AppError::Validation(
            "Cannot save to system directories. Please choose a user directory like Desktop, Documents, or Downloads.".to_string(),
        ));
    }

    // Check for invalid characters in path
    if file_path.contains('<')
        || file_path.contains('>')
        || file_path.contains('|')
        || file_path.contains('"')
        || (file_path.contains('*') && !file_path.contains("**"))
        || file_path.contains('?')
    {
        return Err(crate::commands::errors::AppError::Validation(
            "File path contains invalid characters".to_string(),
        ));
    }

    // Validate directory exists and is writable
    use std::path::Path;
    let path = Path::new(&file_path);
    if let Some(parent) = path.parent() {
        if !parent.exists() {
            return Err(crate::commands::errors::AppError::Validation(format!(
                "Directory does not exist: {}",
                parent.display()
            )));
        }

        // Try to create a test file to verify write permissions
        let test_file_path = parent.join(".pdf_save_test.tmp");
        match std::fs::File::create(&test_file_path) {
            Ok(_) => {
                let _ = std::fs::remove_file(&test_file_path);
            }
            Err(e) => {
                return Err(crate::commands::errors::AppError::Validation(format!(
                    "Cannot write to directory {}: {}",
                    parent.display(),
                    e
                )));
            }
        }
    }

    // Check if destination file already exists
    if path.exists() {
        match std::fs::OpenOptions::new().write(true).open(path) {
            Ok(_) => {
                info!("Destination file exists and is writable, will overwrite");
            }
            Err(e) => {
                return Err(crate::commands::errors::AppError::Validation(format!(
                    "Cannot overwrite existing file {}: {}",
                    path.display(),
                    e
                )));
            }
        }
    }

    Ok(())
}

/// Save PDF report to user-specified path with crash protection
#[allow(dead_code)]
pub async fn save_pdf_to_path(
    intervention_data: &CompleteInterventionData,
    file_path: &str,
    db: &crate::db::Database,
    app_data_dir: &Path,
) -> AppResult<String> {
    // CRASH PROTECTION: Estimate memory requirements and check system resources
    let estimated_size =
        crate::domains::reports::ipc::reports::utils::estimate_pdf_data_size(intervention_data);
    let estimated_mb = estimated_size / (1024 * 1024);

    info!(
        "Estimated PDF size: {} MB ({} bytes) for intervention with {} photos and {} steps",
        estimated_mb,
        estimated_size,
        intervention_data.photos.len(),
        intervention_data.workflow_steps.len()
    );

    // Check memory usage before proceeding
    if let Ok(memory_stats) = memory_management_helpers::get_memory_stats() {
        // Estimate available memory based on usage percentage
        let estimated_total_mb = (memory_stats.total_memory_used as f64
            / memory_stats.memory_usage_percent.max(0.01)
            / 100.0) as u64;
        let available_mb =
            (estimated_total_mb.saturating_sub(memory_stats.total_memory_used)) / (1024 * 1024);
        let safety_margin_mb = 100; // 100MB safety margin

        if (available_mb as usize) < estimated_mb + safety_margin_mb {
            warn!("Insufficient memory for PDF generation: {} MB available, {} MB estimated + {} MB safety margin",
                  available_mb, estimated_mb, safety_margin_mb);
            return Err(crate::commands::errors::AppError::Internal(format!(
                "Insufficient memory for PDF generation ({} MB needed, {} MB available)",
                estimated_mb + safety_margin_mb,
                available_mb
            )));
        }

        // Warn for large interventions that might cause performance issues
        if estimated_mb > 50 {
            warn!(
                "Large intervention detected ({} MB) - save operation may be slow",
                estimated_mb
            );
        }

        // Automatic cleanup if memory pressure detected
        if memory_stats.memory_usage_percent > 85.0 {
            warn!(
                "Memory pressure detected ({}%) - triggering automatic cleanup",
                memory_stats.memory_usage_percent
            );
            memory_management_helpers::trigger_cleanup();
        }
    }

    // CRASH PROTECTION: Check for potentially problematic data sizes
    if intervention_data.photos.len() > 100 {
        warn!(
            "Intervention {} has {} photos - this may cause memory issues",
            intervention_data.intervention.id,
            intervention_data.photos.len()
        );
        return Err(crate::commands::errors::AppError::Validation(format!(
            "Intervention has too many photos ({}). Maximum supported: 100",
            intervention_data.photos.len()
        )));
    }

    if intervention_data.workflow_steps.len() > 200 {
        warn!(
            "Intervention {} has {} workflow steps - this may cause memory issues",
            intervention_data.intervention.id,
            intervention_data.workflow_steps.len()
        );
        return Err(crate::commands::errors::AppError::Validation(format!(
            "Intervention has too many workflow steps ({}). Maximum supported: 200",
            intervention_data.workflow_steps.len()
        )));
    }

    // CRASH PROTECTION: Generate PDF report with timeout protection
    info!(
        "Generating PDF report for save operation (estimated size: {} MB)",
        estimated_mb
    );

    // Use tokio timeout to prevent hanging on PDF generation
    let pdf_timeout_duration = if estimated_mb > 20 {
        std::time::Duration::from_secs(300) // 5 minutes for large PDFs
    } else {
        std::time::Duration::from_secs(120) // 2 minutes for normal PDFs
    };

    let pdf_result = match tokio::time::timeout(
        pdf_timeout_duration,
        generate_pdf_with_timeout(intervention_data, db, app_data_dir),
    )
    .await
    {
        Ok(Ok(result)) => result,
        Ok(Err(e)) => {
            error!("Failed to generate PDF for save operation: {:?}", e);
            return Err(e);
        }
        Err(_) => {
            error!("PDF generation timed out after {:?}", pdf_timeout_duration);
            return Err(crate::commands::errors::AppError::Internal(format!(
                "PDF generation timed out after {:?}",
                pdf_timeout_duration
            )));
        }
    };

    // CRASH PROTECTION: Copy generated PDF to user-specified location with enhanced safety
    if let Some(generated_path) = pdf_result.file_path {
        info!(
            "Copying generated PDF from {} to {} ({} bytes)",
            generated_path,
            file_path,
            pdf_result.file_size.unwrap_or(0)
        );

        let source_path = Path::new(&generated_path);
        let dest_path = Path::new(&file_path);

        // Verify source file exists and get its size
        let source_metadata = match source_path.metadata() {
            Ok(metadata) => metadata,
            Err(e) => {
                error!("Cannot access source PDF file {}: {}", generated_path, e);
                return Err(crate::commands::errors::AppError::Internal(format!(
                    "Cannot access generated PDF file: {}",
                    e
                )));
            }
        };

        let expected_size = source_metadata.len();
        if expected_size == 0 {
            error!("Generated PDF file is empty: {}", generated_path);
            let _ = std::fs::remove_file(&generated_path); // Cleanup empty file
            return Err(crate::commands::errors::AppError::Internal(
                "Generated PDF file is empty".to_string(),
            ));
        }

        // CRASH PROTECTION: Check available disk space before copying
        if let Some(parent) = dest_path.parent() {
            match fs2::available_space(parent) {
                Ok(available) => {
                    let safety_margin = 50 * 1024 * 1024; // 50MB safety margin
                    if available < (expected_size + safety_margin) {
                        error!("Insufficient disk space: {} bytes available, {} bytes needed + {} bytes safety margin",
                               available, expected_size, safety_margin);
                        let _ = std::fs::remove_file(&generated_path); // Cleanup
                        return Err(crate::commands::errors::AppError::Io(format!(
                            "Insufficient disk space ({} MB available, {} MB needed)",
                            available / (1024 * 1024),
                            (expected_size + safety_margin) / (1024 * 1024)
                        )));
                    }
                }
                Err(e) => {
                    warn!("Could not check available disk space: {}", e);
                    // Continue anyway - this is not a fatal error
                }
            }
        }

        // CRASH PROTECTION: Use atomic file operations where possible
        match std::fs::copy(&generated_path, file_path) {
            Ok(bytes_copied) => {
                info!(
                    "File copy operation succeeded: {} bytes copied",
                    bytes_copied
                );
                if bytes_copied != expected_size {
                    error!(
                        "File copy size mismatch: expected {}, copied {}",
                        expected_size, bytes_copied
                    );
                    // Attempt to remove the incomplete destination file
                    let _ = std::fs::remove_file(file_path);
                    let _ = std::fs::remove_file(&generated_path);
                    return Err(crate::commands::errors::AppError::Io(format!(
                        "File copy incomplete: expected {} bytes, copied {} bytes",
                        expected_size, bytes_copied
                    )));
                }

                info!(
                    "PDF report copied successfully to: {} ({} bytes)",
                    file_path, bytes_copied
                );

                // CRASH PROTECTION: Verify destination file integrity
                match dest_path.metadata() {
                    Ok(dest_metadata) => {
                        if dest_metadata.len() == expected_size {
                            // Clean up temporary file only after successful verification
                            if let Err(cleanup_err) = std::fs::remove_file(&generated_path) {
                                error!(
                                    "Failed to cleanup temporary file {}: {}",
                                    generated_path, cleanup_err
                                );
                                // Don't fail the operation for cleanup errors
                            }
                        } else {
                            error!(
                                "Destination file size mismatch after copy: expected {}, got {}",
                                expected_size,
                                dest_metadata.len()
                            );
                            let _ = std::fs::remove_file(file_path);
                            let _ = std::fs::remove_file(&generated_path);
                            return Err(crate::commands::errors::AppError::Io(
                                "Destination file verification failed".to_string(),
                            ));
                        }
                    }
                    Err(e) => {
                        error!("Failed to verify destination file {}: {}", file_path, e);
                        let _ = std::fs::remove_file(&generated_path);
                        return Err(crate::commands::errors::AppError::Io(format!(
                            "Destination file verification failed: {}",
                            e
                        )));
                    }
                }
            }
            Err(e) => {
                error!("Failed to copy PDF to destination {}: {}", file_path, e);
                let _ = std::fs::remove_file(&generated_path); // Cleanup

                // Provide more specific error messages for common issues
                let error_msg = if e.kind() == std::io::ErrorKind::PermissionDenied {
                    format!("Permission denied: Cannot write to '{}'. Please choose a different location or run the application with appropriate permissions.", file_path)
                } else if e.kind() == std::io::ErrorKind::NotFound {
                    format!(
                        "Path not found: The directory for '{}' does not exist.",
                        file_path
                    )
                } else if e.kind() == std::io::ErrorKind::AlreadyExists && dest_path.exists() {
                    format!("File already exists and cannot be overwritten: '{}'. Please choose a different filename.", file_path)
                } else {
                    format!("Failed to save PDF to {}: {}", file_path, e)
                };

                return Err(crate::commands::errors::AppError::Io(error_msg));
            }
        }

        // Return the file path after successful copy and verification
        Ok(file_path.to_string())
    } else {
        error!("No PDF file path returned from PDF generation");
        Err(crate::commands::errors::AppError::Internal(
            "No PDF file was generated".to_string(),
        ))
    }
}

/// Generate PDF with timeout wrapper
#[allow(dead_code)]
async fn generate_pdf_with_timeout(
    intervention_data: &CompleteInterventionData,
    _db: &crate::db::Database,
    base_dir: &Path,
) -> AppResult<crate::models::reports::InterventionReportResult> {
    // Create unique filename
    let file_name = DocumentStorageService::generate_filename(
        &format!(
            "intervention_report_{}_{}",
            intervention_data.intervention.id,
            chrono::Utc::now().timestamp()
        ),
        "pdf",
    );

    let output_path = DocumentStorageService::get_document_path(base_dir, &file_name);
    info!("Generating intervention PDF report at: {:?}", output_path);

    // Generate PDF using existing service
    PdfGenerationService::generate_intervention_report_pdf(
        intervention_data,
        &output_path,
        base_dir,
    )
    .await?;

    // Get file size
    let file_size = std::fs::metadata(&output_path)
        .map(|m| m.len())
        .unwrap_or(0);

    // Create file URL for Tauri
    let download_url = format!("file://{}", output_path.display());

    Ok(crate::models::reports::InterventionReportResult {
        success: true,
        download_url: Some(download_url),
        file_path: Some(output_path.to_string_lossy().to_string()),
        file_name: Some(file_name),
        format: "pdf".to_string(),
        file_size: Some(file_size),
        generated_at: chrono::Utc::now(),
    })
}
