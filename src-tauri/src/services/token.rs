//! Secure JWT token management service

use crate::models::auth::UserRole;
use chrono::{DateTime, Duration, TimeZone, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, TokenData, Validation};
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum TokenError {
    #[error("Invalid token: {0}")]
    InvalidToken(String),
    #[error("Token expired")]
    ExpiredToken,
    #[error("Encoding error: {0}")]
    EncodingError(String),
    #[error("Decoding error: {0}")]
    DecodingError(String),
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,        // User ID
    pub email: String,      // User email
    pub username: String,   // Username
    pub role: String,       // User role
    pub iat: i64,           // Issued at
    pub exp: i64,           // Expiration
    pub jti: String,        // JWT ID (unique token identifier)
    pub session_id: String, // Session identifier
}

pub struct TokenService {
    encoding_key: EncodingKey,
    decoding_key: DecodingKey,
    access_token_duration: Duration,
    refresh_token_duration: Duration,
}

impl std::fmt::Debug for TokenService {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("TokenService")
            .field("access_token_duration", &self.access_token_duration)
            .field("refresh_token_duration", &self.refresh_token_duration)
            .finish()
    }
}

impl TokenService {
    pub fn new(secret: &str) -> Self {
        Self {
            encoding_key: EncodingKey::from_secret(secret.as_ref()),
            decoding_key: DecodingKey::from_secret(secret.as_ref()),
            access_token_duration: Duration::hours(2), // 2 hours for development
            refresh_token_duration: Duration::days(7), // 7 days
        }
    }

    /// Generate access token
    pub fn generate_access_token(
        &self,
        user_id: &str,
        email: &str,
        username: &str,
        role: &UserRole,
        session_id: &str,
    ) -> Result<String, TokenError> {
        let now = Utc::now();
        let exp = now + self.access_token_duration;

        let claims = Claims {
            sub: user_id.to_string(),
            email: email.to_string(),
            username: username.to_string(),
            role: role.to_string(),
            iat: now.timestamp(),
            exp: exp.timestamp(),
            jti: uuid::Uuid::new_v4().to_string(),
            session_id: session_id.to_string(),
        };

        encode(&Header::default(), &claims, &self.encoding_key)
            .map_err(|e| TokenError::EncodingError(e.to_string()))
    }

    /// Generate refresh token
    pub fn generate_refresh_token(
        &self,
        user_id: &str,
        session_id: &str,
    ) -> Result<String, TokenError> {
        let now = Utc::now();
        let exp = now + self.refresh_token_duration;

        let claims = Claims {
            sub: user_id.to_string(),
            email: "".to_string(), // Not needed for refresh token
            username: "".to_string(),
            role: "".to_string(),
            iat: now.timestamp(),
            exp: exp.timestamp(),
            jti: uuid::Uuid::new_v4().to_string(),
            session_id: session_id.to_string(),
        };

        encode(&Header::default(), &claims, &self.encoding_key)
            .map_err(|e| TokenError::EncodingError(e.to_string()))
    }

    /// Validate and decode access token
    pub fn validate_access_token(&self, token: &str) -> Result<Claims, TokenError> {
        let validation = Validation::new(jsonwebtoken::Algorithm::HS256);

        let token_data: TokenData<Claims> = decode(token, &self.decoding_key, &validation)
            .map_err(|e| match e.kind() {
                jsonwebtoken::errors::ErrorKind::ExpiredSignature => TokenError::ExpiredToken,
                _ => TokenError::DecodingError(e.to_string()),
            })?;

        Ok(token_data.claims)
    }

    /// Validate refresh token (less strict validation)
    pub fn validate_refresh_token(&self, token: &str) -> Result<Claims, TokenError> {
        let mut validation = Validation::new(jsonwebtoken::Algorithm::HS256);
        validation.validate_exp = true;
        validation.aud = None;
        validation.iss = None;

        let token_data: TokenData<Claims> = decode(token, &self.decoding_key, &validation)
            .map_err(|e| match e.kind() {
                jsonwebtoken::errors::ErrorKind::ExpiredSignature => TokenError::ExpiredToken,
                _ => TokenError::DecodingError(e.to_string()),
            })?;

        Ok(token_data.claims)
    }

    /// Check if token is close to expiration (within 5 minutes)
    pub fn should_refresh_token(&self, token: &str) -> Result<bool, TokenError> {
        let claims = self.validate_access_token(token)?;
        let now = Utc::now().timestamp();
        let time_until_expiry = claims.exp - now;

        // Refresh if less than 5 minutes remaining
        Ok(time_until_expiry < 300)
    }

    /// Get token expiration time
    pub fn get_token_expiration(&self, token: &str) -> Result<DateTime<Utc>, TokenError> {
        let claims = self.validate_access_token(token)?;
        Utc.timestamp_opt(claims.exp, 0)
            .single()
            .ok_or(TokenError::InvalidToken(
                "Invalid expiration timestamp".to_string(),
            ))
    }

    /// Extract session ID from token
    pub fn extract_session_id(&self, token: &str) -> Result<String, TokenError> {
        let claims = self.validate_access_token(token)?;
        Ok(claims.session_id)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::auth::UserRole;

    #[test]
    fn test_token_generation_and_validation() {
        let service = TokenService::new("test_secret_key_that_is_long_enough");
        let user_id = "user123";
        let email = "test@example.com";
        let username = "testuser";
        let role = UserRole::Admin;
        let session_id = "session123";

        // Generate access token
        let token = service
            .generate_access_token(user_id, email, username, &role, session_id)
            .expect("Failed to generate token");

        // Validate token
        let claims = service
            .validate_access_token(&token)
            .expect("Failed to validate token");

        assert_eq!(claims.sub, user_id);
        assert_eq!(claims.email, email);
        assert_eq!(claims.username, username);
        assert_eq!(claims.role, "admin");
        assert_eq!(claims.session_id, session_id);
    }

    #[test]
    fn test_expired_token() {
        let service = TokenService::new("test_secret");
        // Create a service with very short duration for testing
        let mut short_service = TokenService::new("test_secret");
        short_service.access_token_duration = Duration::seconds(1);

        let token = short_service
            .generate_access_token(
                "user123",
                "test@example.com",
                "testuser",
                &UserRole::Admin,
                "session123",
            )
            .expect("Failed to generate token");

        // Wait for token to expire
        std::thread::sleep(std::time::Duration::from_secs(2));

        let result = service.validate_access_token(&token);
        assert!(matches!(result, Err(TokenError::ExpiredToken)));
    }
}
