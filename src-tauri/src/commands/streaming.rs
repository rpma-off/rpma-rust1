//! IPC streaming utilities
//!
//! This module provides streaming capabilities for large data transfers
//! allowing progressive loading and better memory management.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;

/// Stream configuration
#[derive(Debug, Clone)]
pub struct StreamConfig {
    pub chunk_size: usize,
    pub max_concurrent_chunks: usize,
    pub timeout_seconds: u64,
}

impl Default for StreamConfig {
    fn default() -> Self {
        Self {
            chunk_size: 64 * 1024, // 64KB chunks
            max_concurrent_chunks: 4,
            timeout_seconds: 30,
        }
    }
}

/// Stream metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamMetadata {
    pub stream_id: String,
    pub total_size: usize,
    pub total_chunks: usize,
    pub chunk_size: usize,
    pub content_type: String,
    pub checksum: String, // For integrity verification
}

/// Stream chunk
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamChunk {
    pub stream_id: String,
    pub chunk_index: usize,
    pub data: Vec<u8>,
    pub is_last: bool,
}

/// Stream session for managing active streams
pub struct StreamSession {
    pub metadata: StreamMetadata,
    pub chunks: HashMap<usize, Vec<u8>>,
    pub received_chunks: usize,
    pub completed: bool,
}

impl StreamSession {
    pub fn new(metadata: StreamMetadata) -> Self {
        Self {
            metadata,
            chunks: HashMap::new(),
            received_chunks: 0,
            completed: false,
        }
    }

    pub fn add_chunk(&mut self, chunk: StreamChunk) -> Result<bool, Box<dyn std::error::Error>> {
        if chunk.stream_id != self.metadata.stream_id {
            return Err("Stream ID mismatch".into());
        }

        if chunk.chunk_index >= self.metadata.total_chunks {
            return Err("Invalid chunk index".into());
        }

        self.chunks.insert(chunk.chunk_index, chunk.data);
        self.received_chunks += 1;

        if chunk.is_last || self.received_chunks == self.metadata.total_chunks {
            self.completed = true;
        }

        Ok(self.completed)
    }

    pub fn get_data(&self) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
        if !self.completed {
            return Err("Stream not completed".into());
        }

        let mut data = Vec::with_capacity(self.metadata.total_size);

        for i in 0..self.metadata.total_chunks {
            if let Some(chunk) = self.chunks.get(&i) {
                data.extend_from_slice(chunk);
            } else {
                return Err(format!("Missing chunk {}", i).into());
            }
        }

        Ok(data)
    }

    pub fn is_complete(&self) -> bool {
        self.completed
    }
}

/// Global stream manager
pub struct StreamManager {
    streams: HashMap<String, Arc<Mutex<StreamSession>>>,
    config: StreamConfig,
}

impl StreamManager {
    pub fn new(config: StreamConfig) -> Self {
        Self {
            streams: HashMap::new(),
            config,
        }
    }

    pub async fn create_stream(
        &mut self,
        metadata: StreamMetadata,
    ) -> Result<String, Box<dyn std::error::Error>> {
        let stream_id = metadata.stream_id.clone();
        let session = Arc::new(Mutex::new(StreamSession::new(metadata)));
        self.streams.insert(stream_id.clone(), session);
        Ok(stream_id)
    }

    pub async fn add_chunk(&self, chunk: StreamChunk) -> Result<bool, Box<dyn std::error::Error>> {
        let session = self
            .streams
            .get(&chunk.stream_id)
            .ok_or("Stream not found")?;

        let mut session = session.lock().await;
        session.add_chunk(chunk)
    }

    pub async fn get_stream_data(
        &self,
        stream_id: &str,
    ) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
        let session = self.streams.get(stream_id).ok_or("Stream not found")?;

        let session = session.lock().await;
        session.get_data()
    }

    pub async fn is_stream_complete(
        &self,
        stream_id: &str,
    ) -> Result<bool, Box<dyn std::error::Error>> {
        let session = self.streams.get(stream_id).ok_or("Stream not found")?;

        let session = session.lock().await;
        Ok(session.is_complete())
    }

    pub async fn cleanup_stream(&mut self, stream_id: &str) {
        self.streams.remove(stream_id);
    }

    pub fn get_config(&self) -> &StreamConfig {
        &self.config
    }
}

/// Create chunks from data
pub fn create_chunks(data: &[u8], stream_id: &str, chunk_size: usize) -> Vec<StreamChunk> {
    let total_chunks = (data.len() + chunk_size - 1) / chunk_size;
    let mut chunks = Vec::with_capacity(total_chunks);

    for (i, chunk_data) in data.chunks(chunk_size).enumerate() {
        chunks.push(StreamChunk {
            stream_id: stream_id.to_string(),
            chunk_index: i,
            data: chunk_data.to_vec(),
            is_last: i == total_chunks - 1,
        });
    }

    chunks
}

/// Calculate checksum for data integrity
pub fn calculate_checksum(data: &[u8]) -> String {
    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    hasher.update(data);
    format!("{:x}", hasher.finalize())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_stream_session() {
        let metadata = StreamMetadata {
            stream_id: "test-stream".to_string(),
            total_size: 1000,
            total_chunks: 2,
            chunk_size: 500,
            content_type: "application/json".to_string(),
            checksum: "test-checksum".to_string(),
        };

        let mut session = StreamSession::new(metadata);

        let chunk1 = StreamChunk {
            stream_id: "test-stream".to_string(),
            chunk_index: 0,
            data: vec![1, 2, 3],
            is_last: false,
        };

        let chunk2 = StreamChunk {
            stream_id: "test-stream".to_string(),
            chunk_index: 1,
            data: vec![4, 5, 6],
            is_last: true,
        };

        assert!(!session.add_chunk(chunk1).unwrap());
        assert!(session.add_chunk(chunk2).unwrap());

        let data = session.get_data().unwrap();
        assert_eq!(data, vec![1, 2, 3, 4, 5, 6]);
    }

    #[test]
    fn test_chunking() {
        let data = vec![1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        let chunks = create_chunks(&data, "test-stream", 3);

        assert_eq!(chunks.len(), 4);
        assert_eq!(chunks[0].data, vec![1, 2, 3]);
        assert_eq!(chunks[1].data, vec![4, 5, 6]);
        assert_eq!(chunks[2].data, vec![7, 8, 9]);
        assert_eq!(chunks[3].data, vec![10]);
        assert!(chunks[3].is_last);
    }
}
