use image::{GenericImageView, ImageEncoder, ImageFormat};
use std::io::Cursor;
use std::path::{Path, PathBuf};

use crate::domains::documents::{PhotoError, PhotoResult};

pub(super) fn compress_image_blocking(
    data: &[u8],
    quality: u8,
    max_size: usize,
) -> PhotoResult<Vec<u8>> {
    let img = image::load_from_memory(data).map_err(|e| PhotoError::Processing(e.to_string()))?;
    let mut output = Cursor::new(Vec::new());
    let encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut output, quality);
    encoder
        .write_image(
            img.as_bytes(),
            img.width(),
            img.height(),
            img.color().into(),
        )
        .map_err(|e| PhotoError::Processing(e.to_string()))?;
    let compressed = output.into_inner();
    if compressed.len() > max_size && quality > 20 {
        return compress_image_blocking(data, quality / 2, max_size);
    }
    Ok(compressed)
}

pub(super) fn extract_image_dimensions(data: &[u8]) -> PhotoResult<(Option<i32>, Option<i32>)> {
    match image::load_from_memory(data) {
        Ok(img) => {
            let (w, h) = img.dimensions();
            Ok((Some(w as i32), Some(h as i32)))
        }
        Err(_) => Ok((None, None)),
    }
}

pub(super) fn calculate_photo_quality_scores(
    data: &[u8],
) -> PhotoResult<(Option<i32>, Option<i32>, Option<i32>, Option<i32>)> {
    match image::load_from_memory(data) {
        Ok(img) => {
            let gray = img.to_luma8();
            let (w, h) = gray.dimensions();
            let blur = calculate_blur_score(&gray, w, h);
            let exposure = calculate_exposure_score(&gray);
            let composition = calculate_composition_score(&gray, w, h);
            let overall =
                ((blur as f32 * 0.4) + (exposure as f32 * 0.3) + (composition as f32 * 0.3)) as i32;
            Ok((Some(overall), Some(blur), Some(exposure), Some(composition)))
        }
        Err(_) => Ok((None, None, None, None)),
    }
}

fn calculate_blur_score(gray: &image::GrayImage, w: u32, h: u32) -> i32 {
    let mut variance = 0.0;
    let mut count = 0;
    for y in 1..h.saturating_sub(1) {
        for x in 1..w.saturating_sub(1) {
            let center = gray.get_pixel(x, y).0[0] as f32;
            let top = gray.get_pixel(x, y - 1).0[0] as f32;
            let bottom = gray.get_pixel(x, y + 1).0[0] as f32;
            let left = gray.get_pixel(x - 1, y).0[0] as f32;
            let right = gray.get_pixel(x + 1, y).0[0] as f32;
            let laplacian = center * 4.0 - top - bottom - left - right;
            variance += laplacian * laplacian;
            count += 1;
        }
    }
    if count > 0 {
        ((variance / count as f32) / 1000.0).min(1.0) as i32 * 100
    } else {
        50
    }
}

fn calculate_exposure_score(gray: &image::GrayImage) -> i32 {
    let mut hist = [0u32; 256];
    for p in gray.pixels() {
        hist[p.0[0] as usize] += 1;
    }
    let total = gray.width() * gray.height();
    let over: u32 = hist[241..].iter().sum();
    let under: u32 = hist[..16].iter().sum();
    let penalty = (over as f32 / total as f32 + under as f32 / total as f32) * 100.0;
    (100.0 - penalty.min(100.0)) as i32
}

fn calculate_composition_score(gray: &image::GrayImage, w: u32, h: u32) -> i32 {
    let tw = w / 3;
    let th = h / 3;
    let mut thirds_pixels = 0;
    let mut total_important = 0;
    for y in 0..h {
        for x in 0..w {
            let val = gray.get_pixel(x, y).0[0];
            if !(64..=192).contains(&val) {
                total_important += 1;
                let near_v =
                    (x as i32 - tw as i32).abs() < 10 || (x as i32 - (tw * 2) as i32).abs() < 10;
                let near_h =
                    (y as i32 - th as i32).abs() < 10 || (y as i32 - (th * 2) as i32).abs() < 10;
                if near_v || near_h {
                    thirds_pixels += 1;
                }
            }
        }
    }
    if total_important > 0 {
        (thirds_pixels as f32 / total_important as f32 * 100.0) as i32
    } else {
        50
    }
}

pub(super) fn thumbnail_path(path: &Path) -> PathBuf {
    let stem = path.file_stem().unwrap_or_default().to_string_lossy();
    let ext = path.extension().unwrap_or_default().to_string_lossy();
    path.with_file_name(format!("{}_thumb.{}", stem, ext))
}

pub(super) fn generate_thumbnail_blocking(data: &[u8], path: &Path) -> PhotoResult<()> {
    let img = image::load_from_memory(data).map_err(|e| PhotoError::Processing(e.to_string()))?;
    let thumb = img.thumbnail(300, 300);
    let format = match path
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase())
        .as_deref()
    {
        Some("png") => ImageFormat::Png,
        Some("webp") => ImageFormat::WebP,
        _ => ImageFormat::Jpeg,
    };
    let tmp = path.with_extension("tmp");
    thumb
        .save_with_format(&tmp, format)
        .map_err(|e| PhotoError::Processing(e.to_string()))?;
    std::fs::rename(&tmp, path).map_err(|e| {
        let _ = std::fs::remove_file(&tmp);
        PhotoError::from(e)
    })?;
    Ok(())
}
