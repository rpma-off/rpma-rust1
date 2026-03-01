mod facade;
mod metadata;
mod processing;
mod statistics;
mod storage;
mod upload;

// Re-export main service and types for backward compatibility
#[allow(unused_imports)]
pub use facade::{
    GetPhotosRequest, GetPhotosResponse, PhotoError, PhotoMetadataUpdate, PhotoResult,
    PhotoService, PhotoStorageSettings, StorePhotoRequest, StorePhotoResponse,
};
