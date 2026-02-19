//! IPC optimization commands
//!
//! This module provides commands for optimized IPC communication
//! including compression and streaming for large data transfers.

use tracing;
use crate::commands::compression::{
    compress_json, decompress_json, CompressedData, CompressionConfig,
};
use crate::commands::streaming::{
    calculate_checksum, create_chunks, StreamChunk, StreamConfig, StreamManager, StreamMetadata,
};
use crate::commands::AppResult;
use base64::{engine::general_purpose, Engine as _};
use lazy_static::lazy_static;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;

lazy_static! {
    static ref STREAM_MANAGER: Arc<Mutex<StreamManager>> =
        Arc::new(Mutex::new(StreamManager::new(StreamConfig::default())));
}

/// Request to compress data
#[derive(Debug, Serialize, Deserialize)]
pub struct CompressDataRequest {
    pub data: serde_json::Value,
    pub min_size: Option<usize>,
}

/// Response with compressed data
#[derive(Debug, Serialize, Deserialize)]
pub struct CompressDataResponse {
    pub compressed: CompressedData,
    pub should_compress: bool,
}

/// Request to decompress data
#[derive(Debug, Serialize, Deserialize)]
pub struct DecompressDataRequest {
    pub compressed: CompressedData,
}

/// Request to start a stream
#[derive(Debug, Serialize, Deserialize)]
pub struct StartStreamRequest {
    pub data: Vec<u8>,
    pub content_type: String,
    pub chunk_size: Option<usize>,
}

/// Response with stream metadata
#[derive(Debug, Serialize, Deserialize)]
pub struct StartStreamResponse {
    pub stream_id: String,
    pub metadata: StreamMetadata,
    pub chunks: Vec<StreamChunk>,
}

/// Request to send a stream chunk
#[derive(Debug, Serialize, Deserialize)]
pub struct SendStreamChunkRequest {
    pub chunk: StreamChunk,
}

/// Response for stream chunk
#[derive(Debug, Serialize, Deserialize)]
pub struct SendStreamChunkResponse {
    pub completed: bool,
    pub received_chunks: usize,
    pub total_chunks: usize,
}

/// Request to get stream data
#[derive(Debug, Serialize, Deserialize)]
pub struct GetStreamDataRequest {
    pub stream_id: String,
}

/// Response with stream data
#[derive(Debug, Serialize, Deserialize)]
pub struct GetStreamDataResponse {
    pub data: Vec<u8>,
    pub content_type: String,
}

/// Compress data for IPC transfer
#[tracing::instrument(skip_all)]
#[tauri::command]
pub async fn compress_data_for_ipc(
    request: CompressDataRequest,
    correlation_id: Option<String>,
) -> AppResult<CompressDataResponse> {
    let _correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let config = CompressionConfig {
        min_size: request.min_size.unwrap_or(1024),
        ..Default::default()
    };

    let json_bytes = serde_json::to_vec(&request.data).map_err(|e| {
        crate::commands::AppError::Internal(format!("JSON serialization failed: {}", e))
    })?;

    match compress_json(&request.data, &config) {
        Ok(compressed) => Ok(CompressDataResponse {
            compressed,
            should_compress: true,
        }),
        Err(_) => {
            let original_size = json_bytes.len();
            Ok(CompressDataResponse {
                compressed: CompressedData {
                    data: general_purpose::STANDARD.encode(&json_bytes),
                    original_size,
                    compressed_size: original_size,
                    compression_ratio: 1.0,
                },
                should_compress: false,
            })
        }
    }
}

/// Decompress data from IPC transfer
#[tracing::instrument(skip_all)]
#[tauri::command]
pub async fn decompress_data_from_ipc(
    request: DecompressDataRequest,
    correlation_id: Option<String>,
) -> AppResult<serde_json::Value> {
    let _correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let data: serde_json::Value = decompress_json(&request.compressed)
        .map_err(|e| crate::commands::AppError::Internal(format!("Decompression failed: {}", e)))?;

    Ok(data)
}

/// Start a streaming data transfer
#[tracing::instrument(skip_all)]
#[tauri::command]
pub async fn start_stream_transfer(
    request: StartStreamRequest,
    correlation_id: Option<String>,
) -> AppResult<StartStreamResponse> {
    let _correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let mut manager = STREAM_MANAGER.lock().await;

    let chunk_size = request
        .chunk_size
        .unwrap_or(manager.get_config().chunk_size);
    let checksum = calculate_checksum(&request.data);

    let metadata = StreamMetadata {
        stream_id: format!("stream_{}", uuid::Uuid::new_v4()),
        total_size: request.data.len(),
        total_chunks: request.data.len().div_ceil(chunk_size),
        chunk_size,
        content_type: request.content_type,
        checksum,
    };

    let stream_id = manager.create_stream(metadata.clone()).await.map_err(|e| {
        crate::commands::AppError::Internal(format!("Failed to create stream: {}", e))
    })?;

    let chunks = create_chunks(&request.data, &stream_id, chunk_size);

    Ok(StartStreamResponse {
        stream_id,
        metadata,
        chunks,
    })
}

/// Send a chunk of streaming data
#[tracing::instrument(skip_all)]
#[tauri::command]
pub async fn send_stream_chunk(
    request: SendStreamChunkRequest,
    correlation_id: Option<String>,
) -> AppResult<SendStreamChunkResponse> {
    let _correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let manager = STREAM_MANAGER.lock().await;

    let completed = manager
        .add_chunk(request.chunk.clone())
        .await
        .map_err(|e| crate::commands::AppError::Internal(format!("Failed to add chunk: {}", e)))?;

    let total_chunks = {
        // Get metadata for total chunks
        // This is a simplified implementation - in production you'd store this in the session
        request.chunk.chunk_index + if request.chunk.is_last { 1 } else { 2 }
    };

    Ok(SendStreamChunkResponse {
        completed,
        received_chunks: request.chunk.chunk_index + 1,
        total_chunks,
    })
}

/// Get completed stream data
#[tracing::instrument(skip_all)]
#[tauri::command]
pub async fn get_stream_data(
    request: GetStreamDataRequest,
    correlation_id: Option<String>,
) -> AppResult<GetStreamDataResponse> {
    let _correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let mut manager = STREAM_MANAGER.lock().await;

    let is_complete = manager
        .is_stream_complete(&request.stream_id)
        .await
        .map_err(|e| crate::commands::AppError::Internal(format!("Stream check failed: {}", e)))?;

    if !is_complete {
        return Err(crate::commands::AppError::Internal(
            "Stream not completed".to_string(),
        ));
    }

    let data = manager
        .get_stream_data(&request.stream_id)
        .await
        .map_err(|e| {
            crate::commands::AppError::Internal(format!("Failed to get stream data: {}", e))
        })?;

    // Get content type from stream metadata (simplified - you'd store this)
    let content_type = "application/octet-stream".to_string();

    // Cleanup the stream
    manager.cleanup_stream(&request.stream_id).await;

    Ok(GetStreamDataResponse { data, content_type })
}

/// Get IPC optimization statistics
#[tracing::instrument(skip_all)]
#[tauri::command]
pub async fn get_ipc_stats(correlation_id: Option<String>) -> AppResult<serde_json::Value> {
    let _correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    // Return mock stats for now - in production you'd track real metrics
    let stats = serde_json::json!({
        "compression": {
            "enabled": true,
            "total_compressed": 0,
            "total_saved_bytes": 0,
            "average_ratio": 1.0
        },
        "streaming": {
            "active_streams": 0,
            "total_streams": 0,
            "average_chunk_size": 65536,
            "total_bytes_streamed": 0
        },
        "performance": {
            "average_response_time": 50,
            "requests_per_second": 20,
            "error_rate": 0.01
        }
    });

    Ok(stats)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_compression_command() {
        let request = CompressDataRequest {
            data: serde_json::json!({"test": "data", "large": "content".repeat(100)}),
            min_size: Some(100),
        };

        let result = compress_data_for_ipc(request, None).await;
        assert!(result.is_ok());

        let response = result.unwrap();
        assert!(response.should_compress);

        // Test decompression
        let decompress_request = DecompressDataRequest {
            compressed: response.compressed,
        };

        let decompress_result = decompress_data_from_ipc(decompress_request, None).await;
        assert!(decompress_result.is_ok());
    }
}
