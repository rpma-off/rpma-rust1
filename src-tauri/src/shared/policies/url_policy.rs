//! URL safety validation policy.

/// TODO: document
pub fn validate_https_url(url: &str) -> Result<(), String> {
    if url.is_empty() {
        return Err("URL cannot be empty".to_string());
    }

    if !url.starts_with("https://") {
        return Err("Invalid URL format - only HTTPS URLs are allowed".to_string());
    }

    let authority = url
        .strip_prefix("https://")
        .and_then(|s| s.split('/').next())
        .unwrap_or("");

    if authority.contains('@') {
        return Err("URLs with embedded credentials are not allowed".to_string());
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::validate_https_url;

    #[test]
    fn rejects_empty_url() {
        let result = validate_https_url("");
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "URL cannot be empty");
    }

    #[test]
    fn rejects_non_https_url() {
        let result = validate_https_url("http://example.com");
        assert!(result.is_err());
        assert_eq!(
            result.unwrap_err(),
            "Invalid URL format - only HTTPS URLs are allowed"
        );
    }

    #[test]
    fn rejects_embedded_credentials() {
        let result = validate_https_url("https://user:pass@example.com");
        assert!(result.is_err());
        assert_eq!(
            result.unwrap_err(),
            "URLs with embedded credentials are not allowed"
        );
    }

    #[test]
    fn accepts_valid_https_url() {
        let result = validate_https_url("https://example.com/path?query=1");
        assert!(result.is_ok());
    }
}
