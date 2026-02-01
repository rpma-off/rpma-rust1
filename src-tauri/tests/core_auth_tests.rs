//! Unit tests for authentication and 2FA services

use base64::{engine::general_purpose, Engine as _};
use rpma_ppf_intervention::db::Database;
use rpma_ppf_intervention::models::auth::UserRole;
use rpma_ppf_intervention::services::auth::AuthService;
use rpma_ppf_intervention::services::two_factor::TwoFactorService;

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;

    fn setup_test_db() -> Database {
        let temp_file = tempfile::NamedTempFile::new().unwrap();
        let db = Database::new(temp_file.path(), "test_encryption_key_32_bytes_long!").unwrap();
        db.init().unwrap();
        db
    }

    fn setup_test_env() {
        env::set_var(
            "JWT_SECRET",
            "test_jwt_secret_that_is_long_enough_for_testing_purposes_12345",
        );
    }

    #[test]
    fn test_auth_service_creation() {
        setup_test_env();
        let db = setup_test_db();
        let auth_service = AuthService::new(db);
        assert!(
            auth_service.is_ok(),
            "AuthService should be created successfully"
        );
    }

    #[test]
    fn test_user_creation() {
        setup_test_env();
        let db = setup_test_db();
        let auth_service = AuthService::new(db).unwrap();

        let result = auth_service.create_account(
            "test@example.com",
            "testuser",
            "Test",
            "User",
            UserRole::Technician,
            "Password123!",
        );
        assert!(result.is_ok(), "User creation should succeed");

        let user = result.unwrap();
        assert_eq!(user.email, "test@example.com");
        assert_eq!(user.role, UserRole::Technician);
    }

    #[test]
    fn test_user_authentication() {
        setup_test_env();
        let db = setup_test_db();
        let auth_service = AuthService::new(db).unwrap();

        // Create user first
        let _ = auth_service
            .create_account(
                "test@example.com",
                "testuser",
                "Test",
                "User",
                UserRole::Technician,
                "Password123!",
            )
            .unwrap();

        // Test authentication
        let auth_result = auth_service.authenticate("test@example.com", "Password123!");
        assert!(auth_result.is_ok(), "Authentication should succeed");

        let session = auth_result.unwrap();
        assert_eq!(session.email, "test@example.com");
        assert!(!session.token.is_empty());
    }

    #[test]
    fn test_invalid_authentication() {
        setup_test_env();
        let db = setup_test_db();
        let auth_service = AuthService::new(db).unwrap();

        let auth_result = auth_service.authenticate("nonexistent", "password");
        assert!(
            auth_result.is_err(),
            "Authentication should fail for nonexistent user"
        );
    }

    #[test]
    fn test_password_validation() {
        setup_test_env();
        let db = setup_test_db();
        let auth_service = AuthService::new(db).unwrap();

        // Test weak password
        let weak_result = auth_service.create_account(
            "weak@example.com",
            "weakuser",
            "Weak",
            "User",
            UserRole::Technician,
            "123",
        );
        assert!(weak_result.is_err(), "Weak password should be rejected");

        // Test password without special character
        let no_special_result = auth_service.create_account(
            "nospecial@example.com",
            "nospecialuser",
            "No",
            "Special",
            UserRole::Technician,
            "password123",
        );
        assert!(
            no_special_result.is_err(),
            "Password without special character should be rejected"
        );

        // Test valid password
        let valid_result = auth_service.create_account(
            "valid@example.com",
            "validuser",
            "Valid",
            "User",
            UserRole::Technician,
            "Password123!",
        );
        assert!(valid_result.is_ok(), "Valid password should be accepted");
    }

    #[test]
    fn test_duplicate_email() {
        setup_test_env();
        let db = setup_test_db();
        let auth_service = AuthService::new(db).unwrap();

        // Create first user
        let _ = auth_service
            .create_account(
                "duplicate@example.com",
                "user1",
                "Test",
                "User1",
                UserRole::Technician,
                "Password123!",
            )
            .unwrap();

        // Try to create user with same email
        let duplicate_result = auth_service.create_account(
            "duplicate@example.com",
            "user2",
            "Test",
            "User2",
            UserRole::Technician,
            "Password456!",
        );
        assert!(
            duplicate_result.is_err(),
            "Duplicate email should be rejected"
        );
    }

    #[test]
    fn test_two_factor_service_creation() {
        std::env::set_var(
            "RPMA_2FA_ENCRYPTION_KEY",
            "TEST_2FA_KEY_32_BYTES_FOR_TESTING",
        );
        let db = setup_test_db();
        let two_factor_service = TwoFactorService::new(db).unwrap();
        // Service should be created successfully
        assert!(true, "TwoFactorService should be created successfully");
    }

    #[test]
    fn test_2fa_secret_encryption_decryption() {
        std::env::set_var(
            "RPMA_2FA_ENCRYPTION_KEY",
            "TEST_2FA_KEY_32_BYTES_FOR_TESTING",
        );
        let db = setup_test_db();
        let two_factor_service = TwoFactorService::new(db).unwrap();

        // Test data - 32 bytes (256 bits) like a real TOTP secret
        let secret = b"test_secret_32_bytes_exact_len!";
        assert_eq!(secret.len(), 32, "Test secret should be 32 bytes");

        // Encrypt the secret
        let encrypted = two_factor_service.encrypt_secret(secret).unwrap();

        // Encrypted data should be longer than original (includes nonce)
        assert!(
            encrypted.len() > secret.len(),
            "Encrypted data should include nonce"
        );

        // Convert to base64 for storage simulation
        let encrypted_b64 = general_purpose::STANDARD.encode(&encrypted);

        // Decrypt the secret
        let decrypted = two_factor_service.decrypt_secret(&encrypted_b64).unwrap();

        // Should match original
        assert_eq!(decrypted, secret, "Decrypted secret should match original");
    }

    #[test]
    fn test_2fa_setup_generation() {
        std::env::set_var(
            "RPMA_2FA_ENCRYPTION_KEY",
            "TEST_2FA_KEY_32_BYTES_FOR_TESTING",
        );
        let db = setup_test_db();
        let two_factor_service = TwoFactorService::new(db).unwrap();

        let result = two_factor_service.generate_setup("test-user-123");
        assert!(result.is_ok(), "2FA setup generation should succeed");

        let setup = result.unwrap();
        assert!(!setup.secret.is_empty(), "Secret should not be empty");
        assert!(
            !setup.qr_code_url.is_empty(),
            "QR code URL should not be empty"
        );
        assert!(
            setup.qr_code_url.contains("otpauth://"),
            "QR code URL should be valid TOTP URL"
        );
        assert_eq!(
            setup.backup_codes.len(),
            10,
            "Should generate 10 backup codes"
        );

        // Each backup code should be 6 digits
        for code in &setup.backup_codes {
            assert_eq!(code.len(), 6, "Backup code should be 6 characters");
            assert!(
                code.chars().all(|c| c.is_numeric()),
                "Backup code should contain only digits"
            );
        }
    }

    #[test]
    fn test_2fa_backup_codes_generation() {
        std::env::set_var(
            "RPMA_2FA_ENCRYPTION_KEY",
            "TEST_2FA_KEY_32_BYTES_FOR_TESTING",
        );
        let db = setup_test_db();
        let two_factor_service = TwoFactorService::new(db).unwrap();

        let codes = two_factor_service.generate_backup_codes();
        assert_eq!(codes.len(), 10, "Should generate 10 backup codes");

        // All codes should be unique
        let mut unique_codes = std::collections::HashSet::new();
        for code in &codes {
            assert_eq!(code.len(), 6, "Each backup code should be 6 digits");
            assert!(
                code.chars().all(|c| c.is_numeric()),
                "Backup codes should be numeric"
            );
            assert!(
                unique_codes.insert(code.clone()),
                "Backup codes should be unique"
            );
        }
    }

    #[test]
    fn test_2fa_encryption_uniqueness() {
        std::env::set_var(
            "RPMA_2FA_ENCRYPTION_KEY",
            "TEST_2FA_KEY_32_BYTES_FOR_TESTING",
        );
        let db = setup_test_db();
        let two_factor_service = TwoFactorService::new(db).unwrap();

        let secret1 = b"secret_one_32_bytes_exact_len!!";
        let secret2 = b"secret_two_32_bytes_exact_len!!";

        // Encrypt the same secret twice
        let encrypted1 = two_factor_service.encrypt_secret(secret1).unwrap();
        let encrypted2 = two_factor_service.encrypt_secret(secret1).unwrap();

        // Even with same input, ciphertext should be different due to random nonce
        assert_ne!(
            encrypted1, encrypted2,
            "Same input should produce different ciphertext due to random nonce"
        );

        // But both should decrypt to the same plaintext
        let decrypted1 = two_factor_service
            .decrypt_secret(&general_purpose::STANDARD.encode(&encrypted1))
            .unwrap();
        let decrypted2 = two_factor_service
            .decrypt_secret(&general_purpose::STANDARD.encode(&encrypted2))
            .unwrap();

        assert_eq!(
            decrypted1, secret1,
            "First decryption should match original"
        );
        assert_eq!(
            decrypted2, secret1,
            "Second decryption should match original"
        );
        assert_eq!(
            decrypted1, decrypted2,
            "Both decryptions should be identical"
        );
    }

    #[test]
    fn test_2fa_invalid_base64() {
        std::env::set_var(
            "RPMA_2FA_ENCRYPTION_KEY",
            "TEST_2FA_KEY_32_BYTES_FOR_TESTING",
        );
        let db = setup_test_db();
        let two_factor_service = TwoFactorService::new(db).unwrap();

        let invalid_b64 = "invalid-base64!";
        let result = two_factor_service.decrypt_secret(invalid_b64);
        assert!(
            result.is_err(),
            "Invalid base64 should cause decryption to fail"
        );
    }

    #[test]
    fn test_2fa_corrupted_ciphertext() {
        std::env::set_var(
            "RPMA_2FA_ENCRYPTION_KEY",
            "TEST_2FA_KEY_32_BYTES_FOR_TESTING",
        );
        let db = setup_test_db();
        let two_factor_service = TwoFactorService::new(db).unwrap();

        let secret = b"test_secret_32_bytes_exact_len!";
        let encrypted = two_factor_service.encrypt_secret(secret).unwrap();

        // Corrupt the ciphertext
        let mut corrupted = encrypted.clone();
        if corrupted.len() > 12 {
            corrupted[12] ^= 0xFF; // Flip bits in ciphertext portion
        }

        let corrupted_b64 = general_purpose::STANDARD.encode(&corrupted);
        let result = two_factor_service.decrypt_secret(&corrupted_b64);
        assert!(
            result.is_err(),
            "Corrupted ciphertext should cause decryption to fail"
        );
    }
}
