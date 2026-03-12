---
title: "Compressed API Responses for Large Payloads"
summary: "Automatically compress large IPC responses using gzip to reduce memory overhead and improve performance for bulk data transfers."
domain: ipc
status: accepted
created: 2026-03-12
---

## Context

Some IPC responses contain large datasets:

- Task lists with hundreds of items
- Client data with task history
- Inventory snapshots
- Report exports

Large JSON payloads cause:

- High memory usage during serialization
- Slow IPC transfer across the bridge
- Increased GC pressure on frontend

## Decision

**Automatically compress API responses exceeding a size threshold.**

### Response Types

Defined in `src-tauri/src/shared/ipc/response.rs`:

```rust
#[derive(Serialize, TS)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<ApiError>,
    pub correlation_id: Option<String>,
}

#[derive(Serialize)]
pub struct CompressedApiResponse {
    pub compressed: bool,
    pub encoding: String,        // "gzip"
    pub data: String,            // Base64-encoded compressed data
    pub uncompressed_size: usize,
}
```

### Compression Threshold

```rust
impl<T: Serialize> ApiResponse<T> {
    pub fn to_compressed_if_large(self) -> Result<CompressedApiResponse, AppError> {
        let json = serde_json::to_string(&self)?;
        let uncompressed_size = json.len();
        
        if uncompressed_size > COMPRESSION_THRESHOLD {
            // Compress and return CompressedApiResponse
        } else {
            // Return as normal response
        }
    }
}
```

### Compression Implementation

```rust
fn compress_json(json: &str) -> Result<(String, usize), AppError> {
    let mut encoder = GzEncoder::new(Vec::new(), Compression::fast());
    encoder.write_all(json.as_bytes())?;
    let compressed = encoder.finish()?;
    
    Ok((
        general_purpose::STANDARD.encode(&compressed),
        json.len(),
    ))
}
```

### Frontend Decompression

Frontend must decompress responses:

```typescript
async function handleResponse(response: CompressedApiResponse | ApiResponse<T>): Promise<T> {
    if ('compressed' in response && response.compressed) {
        const decoded = atob(response.data);
        const decompressed = await decompressGzip(decoded);
        return JSON.parse(decompressed);
    }
    return response.data;
}
```

### Test Command

```rust
#[tauri::command]
pub async fn get_large_test_data(
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> Result<CompressedApiResponse, AppError> {
    // Generate 1000 test items
    let large_data: Vec<TestItem> = (0..1000).map(|i| TestItem { ... }).collect();
    
    ApiResponse::success(large_data)
        .with_correlation_id(Some(ctx.correlation_id))
        .to_compressed_if_large()
}
```

## Consequences

### Positive

- **Reduced Memory**: Compressed data uses less memory during transfer
- **Faster Transfer**: Smaller payloads cross the IPC bridge faster
- **Automatic**: Compression is transparent to callers
- **Metadata**: Original size preserved for progress indicators

### Negative

- **CPU Overhead**: Compression/decompression requires CPU cycles
- **Complexity**: Frontend must handle both compressed and uncompressed responses
- **Debugging**: Compressed responses are harder to inspect
- **Threshold Tuning**: Wrong threshold can hurt performance

## Related Files

- `src-tauri/src/shared/ipc/response.rs` — Response types and compression
- `src-tauri/src/commands/mod.rs` — `get_large_test_data` test command
- `src-tauri/src/commands/errors.rs` — Error handling
- `frontend/src/lib/ipc/core/response-handlers.ts` — Response handling

## Read When

- Adding new bulk data endpoints
- Investigating slow IPC responses
- Debugging compression-related errors
- Tuning compression thresholds
- Implementing frontend decompression
- Testing large data transfers
