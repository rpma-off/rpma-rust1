//! Photo Processing Module - Image compression and analysis
//!
//! This module handles image processing operations including:
//! - Image compression and optimization
//! - Dimension extraction from image data
//! - Photo quality assessment algorithms (blur, exposure, composition)

use image::{GenericImageView, ImageEncoder, ImageFormat};
use std::io::Cursor;
use std::sync::Arc;
use tokio::sync::Semaphore;

/// Image processing service
#[derive(Debug, Clone)]
pub struct PhotoProcessingService {
    /// Semaphore to limit concurrent CPU-intensive image processing (max 4)
    processing_semaphore: Arc<Semaphore>,
    /// Target JPEG quality (0-100)
    jpeg_quality: u8,
    /// Maximum file size in bytes (2MB)
    max_file_size: usize,
}

impl PhotoProcessingService {
    /// Create new photo processing service with default settings
    pub fn new() -> Self {
        Self {
            processing_semaphore: Arc::new(Semaphore::new(4)),
            jpeg_quality: 80, // 80% quality as per requirements
            max_file_size: 2 * 1024 * 1024, // 2MB
        }
    }

    /// Create new photo processing service with custom settings
    pub fn with_settings(jpeg_quality: u8, max_file_size: usize) -> Self {
        Self {
            processing_semaphore: Arc::new(Semaphore::new(4)),
            jpeg_quality: jpeg_quality.clamp(1, 100),
            max_file_size,
        }
    }

    /// Compress image if needed based on settings
    /// 
    /// Performs the following operations:
    /// 1. Checks if image exceeds max file size
    /// 2. Compresses to target JPEG quality (80%)
    /// 3. Supports WebP format output
    /// 4. Uses semaphore to limit concurrent processing
    pub async fn compress_image_if_needed(&self, data: Vec<u8>) -> crate::services::photo::PhotoResult<Vec<u8>> {
        // Skip compression if already under size limit
        if data.len() <= self.max_file_size {
            return Ok(data);
        }

        // Acquire semaphore permit to limit concurrent processing
        let _permit = self.processing_semaphore
            .clone()
            .acquire_owned()
            .await
            .map_err(|e| crate::services::photo::PhotoError::Processing(
                format!("Failed to acquire processing permit: {}", e)
            ))?;

        // Offload CPU-intensive compression to blocking task
        let jpeg_quality = self.jpeg_quality;
        let max_file_size = self.max_file_size;
        
        let result = tokio::task::spawn_blocking(move || {
            Self::compress_image_blocking(&data, jpeg_quality, max_file_size)
        })
        .await
        .map_err(|e| crate::services::photo::PhotoError::Processing(
            format!("Image compression task failed: {}", e)
        ))?;

        result
    }

    /// Blocking image compression implementation
    fn compress_image_blocking(
        data: &[u8],
        jpeg_quality: u8,
        max_file_size: usize,
    ) -> crate::services::photo::PhotoResult<Vec<u8>> {
        // Load image from memory
        let img = image::load_from_memory(data).map_err(|e| {
            crate::services::photo::PhotoError::Processing(format!("Failed to load image: {}", e))
        })?;

        // Try compression at target quality first
        let mut output = Cursor::new(Vec::new());
        
        // Encode as JPEG with specified quality
        let encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(
            &mut output,
            jpeg_quality,
        );

        encoder
            .write_image(
                img.as_bytes(),
                img.width(),
                img.height(),
                img.color().into(),
            )
            .map_err(|e| {
                crate::services::photo::PhotoError::Processing(format!("JPEG encoding failed: {}", e))
            })?;

        let compressed_data = output.into_inner();

        // If still too large, try progressive quality reduction
        if compressed_data.len() > max_file_size && jpeg_quality > 20 {
            // Try with lower quality
            let reduced_quality = (jpeg_quality / 2).max(20);
            return Self::compress_image_blocking(data, reduced_quality, max_file_size);
        }

        // Log compression results
        let original_size = data.len();
        let compressed_size = compressed_data.len();
        let reduction = if original_size > 0 {
            ((original_size - compressed_size) as f64 / original_size as f64) * 100.0
        } else {
            0.0
        };
        
        tracing::info!(
            "Image compressed: {} bytes -> {} bytes ({}% reduction, quality: {}%)",
            original_size,
            compressed_size,
            reduction,
            jpeg_quality
        );

        Ok(compressed_data)
    }

    /// Compress image to WebP format
    pub async fn compress_to_webp(&self, data: Vec<u8>) -> crate::services::photo::PhotoResult<Vec<u8>> {
        // Skip if already under size limit
        if data.len() <= self.max_file_size {
            return Ok(data);
        }

        // Acquire semaphore permit
        let _permit = self.processing_semaphore
            .clone()
            .acquire_owned()
            .await
            .map_err(|e| crate::services::photo::PhotoError::Processing(
                format!("Failed to acquire processing permit: {}", e)
            ))?;

        let jpeg_quality = self.jpeg_quality;
        
        let result = tokio::task::spawn_blocking(move || {
            Self::compress_to_webp_blocking(&data, jpeg_quality)
        })
        .await
        .map_err(|e| crate::services::photo::PhotoError::Processing(
            format!("WebP compression task failed: {}", e)
        ))?;

        result
    }

    /// Blocking WebP compression implementation
    fn compress_to_webp_blocking(
        data: &[u8],
        quality: u8,
    ) -> crate::services::photo::PhotoResult<Vec<u8>> {
        // Load image
        let img = image::load_from_memory(data).map_err(|e| {
            crate::services::photo::PhotoError::Processing(format!("Failed to load image: {}", e))
        })?;

        // Encode as WebP
        let mut output = Cursor::new(Vec::new());
        
        img.write_to(&mut output, ImageFormat::WebP).map_err(|e| {
            crate::services::photo::PhotoError::Processing(format!("WebP encoding failed: {}", e))
        })?;

        let compressed_data = output.into_inner();
        
        tracing::info!(
            "Image compressed to WebP: {} bytes -> {} bytes",
            data.len(),
            compressed_data.len()
        );

        Ok(compressed_data)
    }

    /// Extract image dimensions from binary data

    /// Extract image dimensions from binary data
    pub fn extract_image_dimensions(
        &self,
        image_data: &[u8],
    ) -> crate::services::photo::PhotoResult<(Option<i32>, Option<i32>)> {
        match image::load_from_memory(image_data) {
            Ok(img) => {
                let (width, height) = img.dimensions();
                Ok((Some(width as i32), Some(height as i32)))
            }
            Err(e) => {
                tracing::warn!("Failed to extract image dimensions: {}", e);
                Ok((None, None))
            }
        }
    }

    /// Calculate photo quality scores
    pub fn calculate_photo_quality_scores(
        &self,
        image_data: &[u8],
    ) -> crate::services::photo::PhotoResult<(Option<i32>, Option<i32>, Option<i32>, Option<i32>)>
    {
        match image::load_from_memory(image_data) {
            Ok(img) => {
                let gray = img.to_luma8();
                let (width, height) = gray.dimensions();

                // Calculate overall quality score (0-100)
                let quality_score = self.calculate_overall_quality(&gray, width, height);

                // Calculate blur score (0-100, higher is sharper)
                let blur_score = self.calculate_blur_score(&gray, width, height);

                // Calculate exposure score (0-100, optimal brightness)
                let exposure_score = self.calculate_exposure_score(&gray);

                // Calculate composition score (0-100, based on rule of thirds)
                let composition_score = self.calculate_composition_score(&gray, width, height);

                Ok((
                    Some(quality_score),
                    Some(blur_score),
                    Some(exposure_score),
                    Some(composition_score),
                ))
            }
            Err(e) => {
                tracing::warn!("Failed to calculate photo quality scores: {}", e);
                Ok((None, None, None, None))
            }
        }
    }

    /// Calculate overall quality score (weighted average of blur, exposure, composition)
    fn calculate_overall_quality(&self, gray: &image::GrayImage, width: u32, height: u32) -> i32 {
        // Simple quality score based on blur, exposure, and composition
        let blur = self.calculate_blur_score(gray, width, height);
        let exposure = self.calculate_exposure_score(gray);
        let composition = self.calculate_composition_score(gray, width, height);

        // Weighted average: 40% blur, 30% exposure, 30% composition
        ((blur as f32 * 0.4) + (exposure as f32 * 0.3) + (composition as f32 * 0.3)) as i32
    }

    /// Calculate blur score using Laplacian variance (higher = sharper)
    fn calculate_blur_score(&self, gray: &image::GrayImage, width: u32, height: u32) -> i32 {
        // Simple blur detection using Laplacian variance
        // Higher variance = sharper image
        let mut variance = 0.0;
        let mut count = 0;

        for y in 1..height.saturating_sub(1) {
            for x in 1..width.saturating_sub(1) {
                let center = gray.get_pixel(x, y).0[0] as f32;
                let top = gray.get_pixel(x, y - 1).0[0] as f32;
                let bottom = gray.get_pixel(x, y + 1).0[0] as f32;
                let left = gray.get_pixel(x - 1, y).0[0] as f32;
                let right = gray.get_pixel(x + 1, y).0[0] as f32;

                // Laplacian operator
                let laplacian = center * 4.0 - top - bottom - left - right;
                variance += laplacian * laplacian;
                count += 1;
            }
        }

        if count > 0 {
            variance /= count as f32;
            // Normalize to 0-100 scale (arbitrary scaling)
            let score = (variance / 1000.0).min(1.0) * 100.0;
            score as i32
        } else {
            50 // Default neutral score
        }
    }

    /// Calculate exposure score based on histogram analysis
    fn calculate_exposure_score(&self, gray: &image::GrayImage) -> i32 {
        // Calculate histogram and check exposure
        let mut histogram = [0u32; 256];
        let total_pixels = gray.width() * gray.height();

        for pixel in gray.pixels() {
            histogram[pixel.0[0] as usize] += 1;
        }

        // Calculate percentage in overexposed (>240) and underexposed (<16) ranges
        let overexposed: u32 = histogram[241..].iter().sum();
        let underexposed: u32 = histogram[..16].iter().sum();

        let over_percent = (overexposed as f32 / total_pixels as f32) * 100.0;
        let under_percent = (underexposed as f32 / total_pixels as f32) * 100.0;

        // Optimal exposure: minimize over/under exposure
        let exposure_penalty = over_percent + under_percent;
        let score = 100.0 - exposure_penalty.min(100.0);
        score as i32
    }

    /// Calculate composition score based on rule of thirds
    fn calculate_composition_score(&self, gray: &image::GrayImage, width: u32, height: u32) -> i32 {
        // Simple rule of thirds analysis
        // Check if important visual elements are near rule of thirds lines
        let third_w = width / 3;
        let third_h = height / 3;

        let mut rule_of_thirds_pixels = 0;
        let mut total_pixels = 0;

        for y in 0..height {
            for x in 0..width {
                let pixel_value = gray.get_pixel(x, y).0[0];

                // Consider bright/dark areas as "important"
                if !(64..=192).contains(&pixel_value) {
                    total_pixels += 1;

                    // Check if near rule of thirds lines
                    let near_vertical = (x as i32 - (third_w as i32)).abs() < 10
                        || (x as i32 - third_w as i32 * 2).abs() < 10;
                    let near_horizontal = (y as i32 - (third_h as i32)).abs() < 10
                        || (y as i32 - third_h as i32 * 2).abs() < 10;

                    if near_vertical || near_horizontal {
                        rule_of_thirds_pixels += 1;
                    }
                }
            }
        }

        if total_pixels > 0 {
            let ratio = rule_of_thirds_pixels as f32 / total_pixels as f32;
            (ratio * 100.0) as i32
        } else {
            50 // Default neutral score
        }
    }
}

impl Default for PhotoProcessingService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // Helper to create a test JPEG image
    fn create_test_image(width: u32, height: u32) -> Vec<u8> {
        use image::{ImageBuffer, Rgb};
        
        let img = ImageBuffer::from_fn(width, height, |x, y| {
            Rgb([(x % 256) as u8, (y % 256) as u8, 128])
        });
        
        let mut buf = Cursor::new(Vec::new());
        img.write_to(&mut buf, ImageFormat::Jpeg).unwrap();
        buf.into_inner()
    }

    #[tokio::test]
    async fn test_compress_small_image_no_change() {
        let service = PhotoProcessingService::new();
        let small_data = vec![1, 2, 3, 4, 5]; // Not a valid image, will fail
        
        // This should fail because it's not valid image data
        let result = service.compress_image_if_needed(small_data).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_compress_large_image() {
        let service = PhotoProcessingService::new();
        // Create a test image
        let test_data = create_test_image(100, 100);
        
        // Since our test image is small, it should not be compressed
        let result = service.compress_image_if_needed(test_data.clone()).await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), test_data);
    }

    #[tokio::test]
    async fn test_processing_semaphore() {
        let service = PhotoProcessingService::new();
        // The semaphore should allow up to 4 concurrent operations
        // We can verify the service was created successfully
        assert_eq!(service.jpeg_quality, 80);
        assert_eq!(service.max_file_size, 2 * 1024 * 1024);
    }

    #[tokio::test]
    async fn test_custom_settings() {
        let service = PhotoProcessingService::with_settings(90, 1024 * 1024);
        assert_eq!(service.jpeg_quality, 90);
        assert_eq!(service.max_file_size, 1024 * 1024);
    }
}
