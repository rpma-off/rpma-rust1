//! IPC compression utilities
//!
//! This module provides compression and streaming capabilities for IPC communication
//! to optimize data transfer for large payloads.

use base64::{engine::general_purpose, Engine as _};
use flate2::{read::GzDecoder, write::GzEncoder, Compression};
use serde::{Deserialize, Serialize};
use std::io::{Read, Write};

/// Compression configuration
#[derive(Debug, Clone)]
pub struct CompressionConfig {
    pub level: Compression,
    pub min_size: usize, // Minimum size to compress (bytes)
    pub max_size: usize, // Maximum size to compress (bytes)
}

impl Default for CompressionConfig {
    fn default() -> Self {
        Self {
            level: Compression::default(),
            min_size: 1024,             // 1KB
            max_size: 10 * 1024 * 1024, // 10MB
        }
    }
}

/// Compressed data wrapper
#[derive(Debug, Serialize, Deserialize)]
pub struct CompressedData {
    pub data: String, // Base64 encoded compressed data
    pub original_size: usize,
    pub compressed_size: usize,
    pub compression_ratio: f64,
}

/// Check if data should be compressed
pub fn should_compress(data: &[u8], config: &CompressionConfig) -> bool {
    let size = data.len();
    size >= config.min_size && size <= config.max_size
}

/// Compress data using gzip
pub fn compress_data(
    data: &[u8],
    config: &CompressionConfig,
) -> Result<CompressedData, Box<dyn std::error::Error>> {
    if !should_compress(data, config) {
        return Err("Data size not suitable for compression".into());
    }

    let mut encoder = GzEncoder::new(Vec::new(), config.level);
    encoder.write_all(data)?;
    let compressed = encoder.finish()?;

    let original_size = data.len();
    let compressed_size = compressed.len();
    let compression_ratio = original_size as f64 / compressed_size as f64;

    let data_b64 = general_purpose::STANDARD.encode(&compressed);

    Ok(CompressedData {
        data: data_b64,
        original_size,
        compressed_size,
        compression_ratio,
    })
}

/// Decompress data
pub fn decompress_data(compressed: &CompressedData) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    let compressed_bytes = general_purpose::STANDARD.decode(&compressed.data)?;
    let mut decoder = GzDecoder::new(&compressed_bytes[..]);
    let mut decompressed = Vec::new();
    decoder.read_to_end(&mut decompressed)?;
    Ok(decompressed)
}

/// Compress JSON data
pub fn compress_json<T: Serialize>(
    data: &T,
    config: &CompressionConfig,
) -> Result<CompressedData, Box<dyn std::error::Error>> {
    let json_bytes = serde_json::to_vec(data)?;
    compress_data(&json_bytes, config)
}

/// Decompress and deserialize JSON data
pub fn decompress_json<T: for<'de> Deserialize<'de>>(
    compressed: &CompressedData,
) -> Result<T, Box<dyn std::error::Error>> {
    let decompressed = decompress_data(compressed)?;
    let data: T = serde_json::from_slice(&decompressed)?;
    Ok(data)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_compression_roundtrip() {
        let config = CompressionConfig::default();
        let test_data = r#"{"large": "data", "with": "many", "fields": "and", "values": "that", "should": "compress", "well": "with", "gzip": "algorithm"}"#.repeat(100);

        let compressed = compress_data(test_data.as_bytes(), &config).unwrap();
        let decompressed = decompress_data(&compressed).unwrap();
        let result = String::from_utf8(decompressed).unwrap();

        assert_eq!(test_data, result);
        assert!(compressed.compression_ratio > 1.0);
    }

    #[test]
    fn test_json_compression() {
        let config = CompressionConfig::default();
        let test_data = serde_json::json!({
            "users": (0..100).map(|i| {
                serde_json::json!({
                    "id": i,
                    "name": format!("User {}", i),
                    "email": format!("user{}@example.com", i),
                    "data": "some additional data that should compress well".repeat(5)
                })
            }).collect::<Vec<_>>()
        });

        let compressed = compress_json(&test_data, &config).unwrap();
        let decompressed: serde_json::Value = decompress_json(&compressed).unwrap();

        assert_eq!(test_data, decompressed);
        assert!(compressed.compression_ratio > 2.0); // Should compress well
    }
}
