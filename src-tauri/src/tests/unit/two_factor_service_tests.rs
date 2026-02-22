//! Unit tests for two-factor authentication service

use crate::domains::auth::infrastructure::two_factor::TwoFactorService;
use crate::test_db;
use base64::{engine::general_purpose, Engine as _};
use chrono::Utc;
use rusqlite::params;
use std::sync::Arc;
use totp_rs::{Algorithm, TOTP};

#[cfg(test)]
mod tests {
    use super::*;

    fn create_2fa_service() -> (
        TwoFactorService,
        Arc<crate::db::Database>,
        tempfile::TempDir,
    ) {
        let test_db = test_db!();
        let db = test_db.db();
        let service = TwoFactorService::new(Arc::clone(&db));
        (service, db, test_db.temp_dir)
    }

    fn insert_user(db: &crate::db::Database, user_id: &str) {
        let conn = db.get_connection().expect("Failed to get connection");
        conn.execute(
            "INSERT INTO users (id, email, username, password_hash, full_name, role, is_active, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                user_id,
                format!("{}@example.com", user_id),
                format!("user_{}", user_id),
                "hash",
                "Test User",
                "technician",
                1,
                Utc::now().timestamp_millis(),
                Utc::now().timestamp_millis()
            ],
        )
        .expect("Failed to insert user");
    }

    fn seed_two_factor_config(
        db: &crate::db::Database,
        user_id: &str,
        enabled: bool,
        secret: Option<String>,
        backup_codes: Vec<String>,
        verified_at: Option<String>,
    ) {
        let conn = db.get_connection().expect("Failed to get connection");
        let backup_codes_json =
            serde_json::to_string(&backup_codes).expect("Failed to serialize backup codes");
        conn.execute(
            "UPDATE users SET two_factor_enabled = ?1, two_factor_secret = ?2, backup_codes = ?3, verified_at = ?4, updated_at = ?5 WHERE id = ?6",
            params![
                enabled as i32,
                secret,
                backup_codes_json,
                verified_at,
                Utc::now().timestamp_millis(),
                user_id
            ],
        )
        .expect("Failed to update two-factor config");
    }

    fn encrypt_secret_base64(secret: &[u8]) -> String {
        let key = b"development_key_not_secure";
        let encrypted: Vec<u8> = secret
            .iter()
            .enumerate()
            .map(|(i, &byte)| byte ^ key[i % key.len()])
            .collect();
        general_purpose::STANDARD.encode(encrypted)
    }

    fn totp_for_secret(secret: &[u8]) -> TOTP {
        TOTP::new(
            Algorithm::SHA1,
            6,
            1,
            30,
            secret.to_vec(),
            Some("RPMA".to_string()),
            "test-user".to_string(),
        )
        .expect("Failed to create TOTP")
    }

    #[tokio::test]
    async fn test_generate_setup_success() {
        let (two_fa_service, db, _temp_dir) = create_2fa_service();
        let user_id = "test_user_123";
        insert_user(db.as_ref(), user_id);

        let setup = two_fa_service
            .generate_setup(user_id)
            .await
            .expect("2FA setup generation should succeed");

        assert!(
            !setup.secret.is_empty(),
            "Should generate a non-empty secret"
        );
        assert!(
            !setup.qr_code_url.is_empty(),
            "Should generate a QR code URL"
        );
        assert_eq!(
            setup.backup_codes.len(),
            10,
            "Should generate 10 backup codes"
        );

        for backup_code in &setup.backup_codes {
            assert_eq!(backup_code.len(), 6, "Backup code should be 6 characters");
            assert!(
                backup_code.chars().all(|c| c.is_ascii_digit()),
                "Backup code should be numeric"
            );
        }
    }

    #[tokio::test]
    async fn test_generate_setup_rejects_when_already_enabled() {
        let (two_fa_service, db, _temp_dir) = create_2fa_service();
        let user_id = "enabled_user";
        insert_user(db.as_ref(), user_id);
        seed_two_factor_config(
            db.as_ref(),
            user_id,
            true,
            Some("secret".to_string()),
            vec![],
            Some(Utc::now().to_rfc3339()),
        );

        let result = two_fa_service.generate_setup(user_id).await;
        assert!(result.is_err(), "Should reject setup when already enabled");
    }

    #[tokio::test]
    async fn test_generate_setup_different_secrets() {
        let (two_fa_service, db, _temp_dir) = create_2fa_service();
        let user_id1 = "test_user_123";
        let user_id2 = "test_user_456";
        insert_user(db.as_ref(), user_id1);
        insert_user(db.as_ref(), user_id2);

        let setup1 = two_fa_service
            .generate_setup(user_id1)
            .await
            .expect("Should generate first setup");
        let setup2 = two_fa_service
            .generate_setup(user_id2)
            .await
            .expect("Should generate second setup");

        assert_ne!(setup1.secret, setup2.secret, "Secrets should differ");
        assert_ne!(
            setup1.qr_code_url, setup2.qr_code_url,
            "QR URLs should differ"
        );
        assert_ne!(
            setup1.backup_codes, setup2.backup_codes,
            "Backup codes should differ"
        );
    }

    #[tokio::test]
    async fn test_is_enabled_toggle_with_enable_disable() {
        let (two_fa_service, db, _temp_dir) = create_2fa_service();
        let user_id = "toggle_user";
        insert_user(db.as_ref(), user_id);

        let enabled = two_fa_service
            .is_enabled(user_id)
            .await
            .expect("Should check 2FA status");
        assert!(!enabled, "2FA should be disabled initially");

        two_fa_service
            .enable_2fa(user_id, "123456", vec!["111111".to_string()])
            .await
            .expect("Should enable 2FA");

        let enabled = two_fa_service
            .is_enabled(user_id)
            .await
            .expect("Should check 2FA status");
        assert!(enabled, "2FA should be enabled after setup");

        two_fa_service
            .disable_2fa(user_id)
            .await
            .expect("Should disable 2FA");

        let enabled = two_fa_service
            .is_enabled(user_id)
            .await
            .expect("Should check 2FA status");
        assert!(!enabled, "2FA should be disabled after disabling");
    }

    #[tokio::test]
    async fn test_enable_2fa_rejects_when_already_enabled() {
        let (two_fa_service, db, _temp_dir) = create_2fa_service();
        let user_id = "already_enabled";
        insert_user(db.as_ref(), user_id);
        seed_two_factor_config(
            db.as_ref(),
            user_id,
            true,
            Some("secret".to_string()),
            vec![],
            Some(Utc::now().to_rfc3339()),
        );

        let result = two_fa_service
            .enable_2fa(user_id, "123456", vec!["111111".to_string()])
            .await;
        assert!(
            result.is_err(),
            "Should reject enabling when already enabled"
        );
    }

    #[tokio::test]
    async fn test_disable_2fa_rejects_when_not_enabled() {
        let (two_fa_service, db, _temp_dir) = create_2fa_service();
        let user_id = "not_enabled";
        insert_user(db.as_ref(), user_id);

        let result = two_fa_service.disable_2fa(user_id).await;
        assert!(result.is_err(), "Should reject disabling when not enabled");
    }

    #[tokio::test]
    async fn test_verify_code_valid() {
        let (two_fa_service, db, _temp_dir) = create_2fa_service();
        let user_id = "code_user";
        insert_user(db.as_ref(), user_id);

        let secret_bytes = b"0123456789ABCDEF0123456789ABCDEF".to_vec();
        let encrypted_secret = encrypt_secret_base64(&secret_bytes);
        seed_two_factor_config(
            db.as_ref(),
            user_id,
            true,
            Some(encrypted_secret),
            vec![],
            Some(Utc::now().to_rfc3339()),
        );

        let totp = totp_for_secret(&secret_bytes);
        let valid_code = totp
            .generate_current()
            .expect("Should generate current TOTP code");

        let result = two_fa_service
            .verify_code(user_id, &valid_code)
            .await
            .expect("Verification should not error");
        assert!(result, "Valid TOTP code should verify successfully");
    }

    #[tokio::test]
    async fn test_verify_code_invalid() {
        let (two_fa_service, db, _temp_dir) = create_2fa_service();
        let user_id = "code_invalid";
        insert_user(db.as_ref(), user_id);

        let secret_bytes = b"0123456789ABCDEF0123456789ABCDEF".to_vec();
        let encrypted_secret = encrypt_secret_base64(&secret_bytes);
        seed_two_factor_config(
            db.as_ref(),
            user_id,
            true,
            Some(encrypted_secret),
            vec![],
            Some(Utc::now().to_rfc3339()),
        );

        let result = two_fa_service
            .verify_code(user_id, "000000")
            .await
            .expect("Verification should not error");
        assert!(!result, "Invalid TOTP code should be rejected");
    }

    #[tokio::test]
    async fn test_verify_backup_code_consumes_code() {
        let (two_fa_service, db, _temp_dir) = create_2fa_service();
        let user_id = "backup_user";
        insert_user(db.as_ref(), user_id);

        let backup_codes = vec!["123456".to_string(), "234567".to_string()];
        seed_two_factor_config(
            db.as_ref(),
            user_id,
            true,
            Some("secret".to_string()),
            backup_codes.clone(),
            Some(Utc::now().to_rfc3339()),
        );

        let first = two_fa_service
            .verify_backup_code(user_id, "123456")
            .await
            .expect("Backup code verification should not error");
        assert!(first, "Backup code should be accepted");

        let second = two_fa_service
            .verify_backup_code(user_id, "123456")
            .await
            .expect("Second verification should not error");
        assert!(!second, "Backup code should be consumed after use");
    }

    #[tokio::test]
    async fn test_regenerate_backup_codes() {
        let (two_fa_service, db, _temp_dir) = create_2fa_service();
        let user_id = "regen_user";
        insert_user(db.as_ref(), user_id);

        let backup_codes = vec!["123456".to_string(), "234567".to_string()];
        seed_two_factor_config(
            db.as_ref(),
            user_id,
            true,
            Some("secret".to_string()),
            backup_codes.clone(),
            Some(Utc::now().to_rfc3339()),
        );

        let regenerated = two_fa_service
            .regenerate_backup_codes(user_id)
            .await
            .expect("Backup code regeneration should succeed");

        assert_eq!(regenerated.len(), 10, "Should generate 10 backup codes");
        assert_ne!(regenerated, backup_codes, "Backup codes should change");
    }
}
