mod facade;
mod metadata;
mod processing;
mod statistics;
mod storage;
mod upload;

// Re-export main service and types for backward compatibility
// Re-export main service and types for backward compatibility
pub use facade::{
    GetPhotosRequest, GetPhotosResponse, PhotoError, PhotoMetadataUpdate, PhotoResult, PhotoService,
    StorePhotoRequest, StorePhotoResponse,
};
