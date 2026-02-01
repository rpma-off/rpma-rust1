//! IPC serialization module for high-performance data transfer
//!
//! This module provides MessagePack-based serialization for IPC communications,
//! offering better performance than JSON for large payloads and frequent operations.

use base64::{engine::general_purpose, Engine as _};
use rmp_serde::Serializer;
use serde::{Deserialize, Serialize};

/// Serialization format for IPC communications
#[derive(Debug, Clone, Copy, PartialEq, serde::Serialize, serde::Deserialize)]
pub enum SerializationFormat {
    /// Standard JSON format (backward compatible)
    Json,
    /// MessagePack format (high performance)
    MessagePack,
}

/// Result wrapper for serialization operations
pub type SerializationResult<T> = Result<T, SerializationError>;

/// Errors that can occur during serialization/deserialization
#[derive(Debug, thiserror::Error)]
pub enum SerializationError {
    #[error("JSON serialization error: {0}")]
    Json(#[from] serde_json::Error),
    #[error("MessagePack serialization error: {0}")]
    MessagePackEncode(#[from] rmp_serde::encode::Error),
    #[error("MessagePack deserialization error: {0}")]
    MessagePackDecode(#[from] rmp_serde::decode::Error),
    #[error("Base64 encoding error: {0}")]
    Base64(#[from] base64::DecodeError),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Invalid format specified")]
    InvalidFormat,
}

/// High-performance IPC serializer
pub struct IpcSerializer {
    format: SerializationFormat,
    use_compression: bool,
}

impl IpcSerializer {
    /// Create a new serializer with the specified format
    pub fn new(format: SerializationFormat) -> Self {
        Self {
            format,
            use_compression: true,
        }
    }

    /// Create a JSON serializer (backward compatible)
    pub fn json() -> Self {
        Self::new(SerializationFormat::Json)
    }

    /// Create a MessagePack serializer (high performance)
    pub fn messagepack() -> Self {
        Self::new(SerializationFormat::MessagePack)
    }

    /// Enable or disable compression
    pub fn with_compression(mut self, enabled: bool) -> Self {
        self.use_compression = enabled;
        self
    }

    /// Serialize data to a string suitable for IPC transfer
    pub fn serialize_to_string<T: Serialize>(&self, data: &T) -> SerializationResult<String> {
        match self.format {
            SerializationFormat::Json => {
                let json_str = serde_json::to_string(data)?;
                if self.use_compression && json_str.len() > 1024 {
                    // Compress large JSON payloads
                    self.compress_and_encode(&json_str)
                } else {
                    Ok(json_str)
                }
            }
            SerializationFormat::MessagePack => {
                let mut buf = Vec::new();
                data.serialize(&mut Serializer::new(&mut buf))?;
                self.compress_and_encode_bytes(&buf)
            }
        }
    }

    /// Deserialize data from an IPC string
    pub fn deserialize_from_string<T: for<'de> Deserialize<'de>>(
        &self,
        data: &str,
    ) -> SerializationResult<T> {
        match self.format {
            SerializationFormat::Json => {
                if self.is_compressed(data) {
                    let decompressed = self.decompress_and_decode(data)?;
                    Ok(serde_json::from_str(&decompressed)?)
                } else {
                    Ok(serde_json::from_str(data)?)
                }
            }
            SerializationFormat::MessagePack => {
                let bytes = self.decompress_and_decode_bytes(data)?;
                Ok(rmp_serde::from_slice(&bytes)?)
            }
        }
    }

    /// Serialize data to bytes
    pub fn serialize_to_bytes<T: Serialize>(&self, data: &T) -> SerializationResult<Vec<u8>> {
        match self.format {
            SerializationFormat::Json => {
                let json_bytes = serde_json::to_vec(data)?;
                if self.use_compression && json_bytes.len() > 1024 {
                    self.compress_bytes(&json_bytes)
                } else {
                    Ok(json_bytes)
                }
            }
            SerializationFormat::MessagePack => {
                let mut buf = Vec::new();
                data.serialize(&mut Serializer::new(&mut buf))?;
                if self.use_compression {
                    self.compress_bytes(&buf)
                } else {
                    Ok(buf)
                }
            }
        }
    }

    /// Deserialize data from bytes
    pub fn deserialize_from_bytes<T: for<'de> Deserialize<'de>>(
        &self,
        data: &[u8],
    ) -> SerializationResult<T> {
        match self.format {
            SerializationFormat::Json => {
                if self.is_compressed_bytes(data) {
                    let decompressed = self.decompress_bytes(data)?;
                    Ok(serde_json::from_slice(&decompressed)?)
                } else {
                    Ok(serde_json::from_slice(data)?)
                }
            }
            SerializationFormat::MessagePack => {
                if self.is_compressed_bytes(data) {
                    let decompressed = self.decompress_bytes(data)?;
                    Ok(rmp_serde::from_slice(&decompressed)?)
                } else {
                    Ok(rmp_serde::from_slice(data)?)
                }
            }
        }
    }

    /// Check if data appears to be compressed (by looking for compression header)
    fn is_compressed(&self, data: &str) -> bool {
        data.starts_with("compressed:")
    }

    /// Check if bytes appear to be compressed
    fn is_compressed_bytes(&self, data: &[u8]) -> bool {
        data.len() >= 11 && &data[0..11] == b"compressed:"
    }

    /// Compress and base64 encode data
    fn compress_and_encode(&self, data: &str) -> SerializationResult<String> {
        use flate2::write::GzEncoder;
        use flate2::Compression;
        use std::io::Write;

        let mut encoder = GzEncoder::new(Vec::new(), Compression::default());
        encoder.write_all(data.as_bytes())?;
        let compressed = encoder.finish()?;

        let encoded = general_purpose::STANDARD.encode(&compressed);
        Ok(format!("compressed:{}", encoded))
    }

    /// Compress and base64 encode bytes
    fn compress_and_encode_bytes(&self, data: &[u8]) -> SerializationResult<String> {
        use flate2::write::GzEncoder;
        use flate2::Compression;
        use std::io::Write;

        let mut encoder = GzEncoder::new(Vec::new(), Compression::default());
        encoder.write_all(data)?;
        let compressed = encoder.finish()?;

        let encoded = general_purpose::STANDARD.encode(&compressed);
        Ok(format!("compressed:{}", encoded))
    }

    /// Compress bytes only (no base64 encoding)
    fn compress_bytes(&self, data: &[u8]) -> SerializationResult<Vec<u8>> {
        use flate2::write::GzEncoder;
        use flate2::Compression;
        use std::io::Write;

        let mut encoder = GzEncoder::new(Vec::new(), Compression::default());
        encoder.write_all(data)?;
        let compressed = encoder.finish()?;

        let mut result = b"compressed:".to_vec();
        result.extend_from_slice(&compressed);
        Ok(result)
    }

    /// Decompress and decode data
    fn decompress_and_decode(&self, data: &str) -> SerializationResult<String> {
        if !self.is_compressed(data) {
            return Ok(data.to_string());
        }

        let encoded = &data[11..]; // Skip "compressed:" prefix
        let compressed = general_purpose::STANDARD.decode(encoded)?;

        use flate2::read::GzDecoder;
        use std::io::Read;

        let mut decoder = GzDecoder::new(&compressed[..]);
        let mut decompressed = String::new();
        decoder.read_to_string(&mut decompressed)?;
        Ok(decompressed)
    }

    /// Decompress and decode bytes
    fn decompress_and_decode_bytes(&self, data: &str) -> SerializationResult<Vec<u8>> {
        if !self.is_compressed(data) {
            return Ok(data.as_bytes().to_vec());
        }

        let encoded = &data[11..]; // Skip "compressed:" prefix
        let compressed = general_purpose::STANDARD.decode(encoded)?;

        use flate2::read::GzDecoder;
        use std::io::Read;

        let mut decoder = GzDecoder::new(&compressed[..]);
        let mut decompressed = Vec::new();
        decoder.read_to_end(&mut decompressed)?;
        Ok(decompressed)
    }

    /// Decompress bytes only
    fn decompress_bytes(&self, data: &[u8]) -> SerializationResult<Vec<u8>> {
        if !self.is_compressed_bytes(data) {
            return Ok(data.to_vec());
        }

        let compressed = &data[11..]; // Skip "compressed:" prefix

        use flate2::read::GzDecoder;
        use std::io::Read;

        let mut decoder = GzDecoder::new(compressed);
        let mut decompressed = Vec::new();
        decoder.read_to_end(&mut decompressed)?;
        Ok(decompressed)
    }

    /// Get the current serialization format
    pub fn format(&self) -> SerializationFormat {
        self.format
    }

    /// Check if compression is enabled
    pub fn compression_enabled(&self) -> bool {
        self.use_compression
    }
}

impl Default for IpcSerializer {
    fn default() -> Self {
        Self::json()
    }
}

/// Automatic format detection for deserialization
pub fn deserialize_auto<T: for<'de> Deserialize<'de>>(data: &str) -> SerializationResult<T> {
    if data.starts_with("{") || data.starts_with("[") {
        // Looks like JSON
        let serializer = IpcSerializer::json();
        serializer.deserialize_from_string(data)
    } else if data.starts_with("compressed:") {
        // Could be compressed JSON or MessagePack, try JSON first
        let serializer = IpcSerializer::json();
        match serializer.deserialize_from_string(data) {
            Ok(result) => Ok(result),
            Err(_) => {
                // Try MessagePack
                let serializer = IpcSerializer::messagepack();
                serializer.deserialize_from_string(data)
            }
        }
    } else {
        // Assume MessagePack
        let serializer = IpcSerializer::messagepack();
        serializer.deserialize_from_string(data)
    }
}

/// Performance comparison utilities
pub mod performance {
    use super::*;
    use std::time::Instant;

    /// Performance test result
    #[derive(Debug, Clone)]
    pub struct PerfTestResult {
        pub format: String,
        pub data_size: usize,
        pub serialize_time: u128,
        pub deserialize_time: u128,
        pub compressed_size: usize,
        pub compression_ratio: f64,
    }

    /// Run performance comparison between JSON and MessagePack
    pub fn compare_performance<T: Serialize + for<'de> Deserialize<'de>>(
        data: &T,
        iterations: usize,
    ) -> SerializationResult<Vec<PerfTestResult>> {
        let mut results = Vec::new();

        // Test JSON
        let json_serializer = IpcSerializer::json();
        let json_data = json_serializer.serialize_to_string(data)?;
        let json_size = json_data.len();

        let mut json_serialize_time = 0u128;
        let mut json_deserialize_time = 0u128;

        for _ in 0..iterations {
            let start = Instant::now();
            let _ = json_serializer.serialize_to_string(data)?;
            json_serialize_time += start.elapsed().as_nanos();
        }

        for _ in 0..iterations {
            let start = Instant::now();
            let _: T = json_serializer.deserialize_from_string(&json_data)?;
            json_deserialize_time += start.elapsed().as_nanos();
        }

        results.push(PerfTestResult {
            format: "JSON".to_string(),
            data_size: json_size,
            serialize_time: json_serialize_time / iterations as u128,
            deserialize_time: json_deserialize_time / iterations as u128,
            compressed_size: json_size,
            compression_ratio: 1.0,
        });

        // Test MessagePack
        let msgpack_serializer = IpcSerializer::messagepack();
        let msgpack_data = msgpack_serializer.serialize_to_string(data)?;
        let msgpack_size = msgpack_data.len();

        let mut msgpack_serialize_time = 0u128;
        let mut msgpack_deserialize_time = 0u128;

        for _ in 0..iterations {
            let start = Instant::now();
            let _ = msgpack_serializer.serialize_to_string(data)?;
            msgpack_serialize_time += start.elapsed().as_nanos();
        }

        for _ in 0..iterations {
            let start = Instant::now();
            let _: T = msgpack_serializer.deserialize_from_string(&msgpack_data)?;
            msgpack_deserialize_time += start.elapsed().as_nanos();
        }

        results.push(PerfTestResult {
            format: "MessagePack".to_string(),
            data_size: msgpack_size,
            serialize_time: msgpack_serialize_time / iterations as u128,
            deserialize_time: msgpack_deserialize_time / iterations as u128,
            compressed_size: msgpack_size,
            compression_ratio: json_size as f64 / msgpack_size as f64,
        });

        Ok(results)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::{Deserialize, Serialize};

    #[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
    struct TestData {
        id: u32,
        name: String,
        values: Vec<i32>,
        metadata: std::collections::HashMap<String, String>,
    }

    #[test]
    fn test_json_serialization() {
        let serializer = IpcSerializer::json();
        let data = TestData {
            id: 42,
            name: "test".to_string(),
            values: vec![1, 2, 3, 4, 5],
            metadata: [("key".to_string(), "value".to_string())].into(),
        };

        let serialized = serializer.serialize_to_string(&data).unwrap();
        let deserialized: TestData = serializer.deserialize_from_string(&serialized).unwrap();

        assert_eq!(data, deserialized);
    }

    #[test]
    fn test_messagepack_serialization() {
        let serializer = IpcSerializer::messagepack();
        let data = TestData {
            id: 42,
            name: "test".to_string(),
            values: vec![1, 2, 3, 4, 5],
            metadata: [("key".to_string(), "value".to_string())].into(),
        };

        let serialized = serializer.serialize_to_string(&data).unwrap();
        let deserialized: TestData = serializer.deserialize_from_string(&serialized).unwrap();

        assert_eq!(data, deserialized);
    }

    #[test]
    fn test_compression() {
        let serializer = IpcSerializer::json().with_compression(true);
        let large_data = "x".repeat(2000); // Large string to trigger compression

        let serialized = serializer.serialize_to_string(&large_data).unwrap();
        assert!(serialized.starts_with("compressed:"));

        let deserialized: String = serializer.deserialize_from_string(&serialized).unwrap();
        assert_eq!(large_data, deserialized);
    }

    #[test]
    fn test_auto_deserialization() {
        let data = TestData {
            id: 42,
            name: "test".to_string(),
            values: vec![1, 2, 3, 4, 5],
            metadata: [("key".to_string(), "value".to_string())].into(),
        };

        // Test JSON auto-detection
        let json_serializer = IpcSerializer::json();
        let json_str = json_serializer.serialize_to_string(&data).unwrap();
        let json_result: TestData = deserialize_auto(&json_str).unwrap();
        assert_eq!(data, json_result);

        // Test MessagePack auto-detection
        let msgpack_serializer = IpcSerializer::messagepack();
        let msgpack_str = msgpack_serializer.serialize_to_string(&data).unwrap();
        let msgpack_result: TestData = deserialize_auto(&msgpack_str).unwrap();
        assert_eq!(data, msgpack_result);
    }
}
