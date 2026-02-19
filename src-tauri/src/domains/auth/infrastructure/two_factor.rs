//! Two-Factor Authentication service for TOTP and backup codes

use crate::commands::AppError;
use crate::db::Database;
use crate::models::auth::{TwoFactorConfig, TwoFactorSetup};
use base64::{engine::general_purpose, Engine as _};
use chrono::Utc;
use rand::Rng;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use totp_rs::{Algorithm, TOTP};
use tracing::{info, instrument};

#[derive(Clone, Debug)]
pub struct TwoFactorService {
    db: Arc<Database>,
    // In production, this should be encrypted and stored securely
    encryption_key: Vec<u8>,
    pending_setups: Arc<Mutex<HashMap<String, Vec<u8>>>>,
}

impl TwoFactorService {
    pub fn new(db: Arc<Database>) -> Self {
        // TODO: Load encryption key from secure configuration
        let encryption_key = b"development_key_not_secure".to_vec();

        Self {
            db,
            encryption_key,
            pending_setups: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Generate a new TOTP secret and setup data for a user
    #[instrument(skip(self), err)]
    pub async fn generate_setup(&self, user_id: &str) -> Result<TwoFactorSetup, AppError> {
        // Check if user already has 2FA enabled
        if self.is_enabled(user_id).await? {
            return Err(AppError::Validation(
                "Two-factor authentication is already enabled for this user".to_string(),
            ));
        }

        // Generate a new TOTP secret (32 bytes = 256 bits)
        let mut secret_bytes = [0u8; 32];
        rand::Rng::fill(&mut rand::thread_rng(), &mut secret_bytes);
        let secret_vec = secret_bytes.to_vec();

        let totp = TOTP::new(
            Algorithm::SHA1,
            6, // 6-digit code
            1, // 30-second window
            30,
            secret_vec.clone(),
            Some("RPMA".to_string()), // Issuer
            user_id.to_string(),      // Account name
        )
        .map_err(|e| AppError::Internal(format!("Failed to create TOTP: {}", e)))?;

        // Generate QR code URL
        let qr_code_url = totp.get_url();

        // Generate backup codes
        let backup_codes = self.generate_backup_codes();

        // Encrypt the secret for storage
        let encrypted_secret = self.encrypt_secret(&secret_vec)?;

        // Keep the plaintext secret in memory until verification succeeds.
        self.pending_setups
            .lock()
            .map_err(|_| {
                AppError::Internal("Failed to access pending 2FA setup store".to_string())
            })?
            .insert(user_id.to_string(), secret_vec.clone());

        Ok(TwoFactorSetup {
            secret: general_purpose::STANDARD.encode(&encrypted_secret),
            qr_code_url,
            backup_codes: backup_codes.clone(),
        })
    }

    /// Enable 2FA for a user after verifying the setup code
    #[instrument(skip(self), err)]
    pub async fn enable_2fa(
        &self,
        user_id: &str,
        verification_code: &str,
        backup_codes: Vec<String>,
    ) -> Result<(), AppError> {
        // Check if user already has 2FA enabled
        if self.is_enabled(user_id).await? {
            return Err(AppError::Validation(
                "Two-factor authentication is already enabled".to_string(),
            ));
        }

        let secret = self
            .pending_setups
            .lock()
            .map_err(|_| {
                AppError::Internal("Failed to access pending 2FA setup store".to_string())
            })?
            .get(user_id)
            .cloned()
            .ok_or_else(|| {
                AppError::Validation(
                    "No pending 2FA setup found. Generate setup before enabling 2FA.".to_string(),
                )
            })?;

        let totp = TOTP::new(
            Algorithm::SHA1,
            6,
            1,
            30,
            secret.clone(),
            Some("RPMA".to_string()),
            user_id.to_string(),
        )
        .map_err(|e| AppError::Internal(format!("Failed to create TOTP: {}", e)))?;

        let current_time = Utc::now().timestamp() as u64;
        let is_valid = totp.check(verification_code, current_time)
            || totp.check(verification_code, current_time.saturating_sub(30))
            || totp.check(verification_code, current_time + 30);

        if !is_valid {
            return Err(AppError::Authentication(
                "Invalid 2FA verification code".to_string(),
            ));
        }

        let encrypted_secret = self.encrypt_secret(&secret)?;

        // Store the 2FA configuration
        let config = TwoFactorConfig {
            enabled: true,
            secret: Some(general_purpose::STANDARD.encode(&encrypted_secret)),
            backup_codes,
            verified_at: Some(Utc::now().to_rfc3339()),
        };

        self.save_2fa_config(user_id, &config).await?;
        let _ = self
            .pending_setups
            .lock()
            .map(|mut pending| pending.remove(user_id));

        info!("2FA enabled for user: {}", user_id);
        Ok(())
    }

    /// Disable 2FA for a user
    #[instrument(skip(self), err)]
    pub async fn disable_2fa(&self, user_id: &str) -> Result<(), AppError> {
        // Check if 2FA is enabled
        if !self.is_enabled(user_id).await? {
            return Err(AppError::Validation(
                "Two-factor authentication is not enabled".to_string(),
            ));
        }

        // Remove the 2FA configuration
        self.delete_2fa_config(user_id).await?;

        info!("2FA disabled for user: {}", user_id);
        Ok(())
    }

    /// Verify a TOTP code for a user
    #[instrument(skip(self), err)]
    pub async fn verify_code(&self, user_id: &str, code: &str) -> Result<bool, AppError> {
        let config = self.get_2fa_config(user_id).await?;

        if !config.enabled {
            return Ok(false);
        }

        if let Some(encrypted_secret) = &config.secret {
            let secret = self.decrypt_secret(encrypted_secret)?;

            let totp = TOTP::new(
                Algorithm::SHA1,
                6,
                1,
                30,
                secret,
                Some("RPMA".to_string()),
                user_id.to_string(),
            )
            .map_err(|e| AppError::Internal(format!("Failed to create TOTP: {}", e)))?;

            // Check current time window and adjacent windows for clock skew
            let current_time = Utc::now().timestamp() as u64;
            let is_valid = totp.check(code, current_time);

            // Also check previous and next time windows for clock skew tolerance
            let prev_time = current_time.saturating_sub(30);
            let next_time = current_time + 30;

            let is_valid_prev = totp.check(code, prev_time);
            let is_valid_next = totp.check(code, next_time);

            Ok(is_valid || is_valid_prev || is_valid_next)
        } else {
            Ok(false)
        }
    }

    /// Verify and consume a backup code
    #[instrument(skip(self), err)]
    pub async fn verify_backup_code(&self, user_id: &str, code: &str) -> Result<bool, AppError> {
        let mut config = self.get_2fa_config(user_id).await?;

        if !config.enabled {
            return Ok(false);
        }

        // Check if the code exists in backup codes
        if let Some(index) = config.backup_codes.iter().position(|c| c == code) {
            // Remove the used backup code
            config.backup_codes.remove(index);
            self.save_2fa_config(user_id, &config).await?;

            info!("Backup code used for user: {}", user_id);
            Ok(true)
        } else {
            Ok(false)
        }
    }

    /// Regenerate backup codes for a user
    #[instrument(skip(self), err)]
    pub async fn regenerate_backup_codes(&self, user_id: &str) -> Result<Vec<String>, AppError> {
        let mut config = self.get_2fa_config(user_id).await?;

        if !config.enabled {
            return Err(AppError::Validation(
                "Two-factor authentication is not enabled".to_string(),
            ));
        }

        let new_codes = self.generate_backup_codes();
        config.backup_codes = new_codes.clone();

        self.save_2fa_config(user_id, &config).await?;

        info!("Backup codes regenerated for user: {}", user_id);
        Ok(new_codes)
    }

    /// Check if 2FA is enabled for a user
    #[instrument(skip(self), err)]
    pub async fn is_enabled(&self, user_id: &str) -> Result<bool, AppError> {
        let config = self.get_2fa_config(user_id).await?;
        Ok(config.enabled)
    }

    /// Get 2FA configuration for a user
    #[instrument(skip(self), err)]
    async fn get_2fa_config(&self, user_id: &str) -> Result<TwoFactorConfig, AppError> {
        let conn = self.db.get_connection()?;
        let mut stmt = conn.prepare(
            "SELECT two_factor_enabled, two_factor_secret, backup_codes, verified_at
             FROM users WHERE id = ?",
        )?;

        let config = stmt
            .query_row(rusqlite::params![user_id], |row| {
                let enabled: bool = row.get(0)?;
                let secret: Option<String> = row.get(1)?;
                let backup_codes_json: Option<String> = row.get(2)?;
                let verified_at: Option<String> = row.get(3)?;

                let backup_codes = if let Some(json) = backup_codes_json {
                    serde_json::from_str(&json).unwrap_or_default()
                } else {
                    Vec::new()
                };

                Ok(TwoFactorConfig {
                    enabled,
                    secret,
                    backup_codes,
                    verified_at,
                })
            })
            .unwrap_or_else(|_| TwoFactorConfig {
                enabled: false,
                secret: None,
                backup_codes: Vec::new(),
                verified_at: None,
            });

        Ok(config)
    }

    /// Save 2FA configuration for a user
    #[instrument(skip(self), err)]
    async fn save_2fa_config(
        &self,
        user_id: &str,
        config: &TwoFactorConfig,
    ) -> Result<(), AppError> {
        let conn = self.db.get_connection()?;
        let backup_codes_json = serde_json::to_string(&config.backup_codes)
            .map_err(|e| AppError::Internal(format!("Failed to serialize backup codes: {}", e)))?;

        conn.execute(
            "UPDATE users SET
             two_factor_enabled = ?,
             two_factor_secret = ?,
             backup_codes = ?,
             verified_at = ?,
             updated_at = ?
             WHERE id = ?",
            rusqlite::params![
                config.enabled,
                config.secret,
                backup_codes_json,
                config.verified_at,
                Utc::now().timestamp(),
                user_id
            ],
        )?;

        Ok(())
    }

    /// Delete 2FA configuration for a user
    #[instrument(skip(self), err)]
    async fn delete_2fa_config(&self, user_id: &str) -> Result<(), AppError> {
        let conn = self.db.get_connection()?;

        conn.execute(
            "UPDATE users SET
             two_factor_enabled = false,
             two_factor_secret = NULL,
             backup_codes = NULL,
             verified_at = NULL,
             updated_at = ?
             WHERE id = ?",
            rusqlite::params![Utc::now().timestamp(), user_id],
        )?;

        Ok(())
    }

    /// Generate a set of backup codes
    fn generate_backup_codes(&self) -> Vec<String> {
        let mut rng = rand::thread_rng();
        (0..10)
            .map(|_| {
                let code: u32 = rng.gen_range(100000..999999);
                format!("{:06}", code)
            })
            .collect()
    }

    /// Encrypt a TOTP secret
    fn encrypt_secret(&self, secret: &[u8]) -> Result<Vec<u8>, AppError> {
        // Simple XOR encryption for development - use proper encryption in production
        let encrypted: Vec<u8> = secret
            .iter()
            .enumerate()
            .map(|(i, &byte)| byte ^ self.encryption_key[i % self.encryption_key.len()])
            .collect();

        Ok(encrypted)
    }

    /// Decrypt a TOTP secret
    fn decrypt_secret(&self, encrypted_secret: &str) -> Result<Vec<u8>, AppError> {
        let encrypted = general_purpose::STANDARD
            .decode(encrypted_secret)
            .map_err(|e| AppError::Internal(format!("Failed to decode secret: {}", e)))?;

        // Simple XOR decryption for development - use proper decryption in production
        let decrypted: Vec<u8> = encrypted
            .iter()
            .enumerate()
            .map(|(i, &byte)| byte ^ self.encryption_key[i % self.encryption_key.len()])
            .collect();

        Ok(decrypted)
    }
}
