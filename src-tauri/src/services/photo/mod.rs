mod facade;
mod upload;
mod storage;
mod statistics;
mod processing;
mod metadata;

// Re-export main service and types for backward compatibility
// Re-export main service and types for backward compatibility
pub use facade::{
    GetPhotosRequest, GetPhotosResponse, PhotoError, PhotoResult, PhotoService,
};
