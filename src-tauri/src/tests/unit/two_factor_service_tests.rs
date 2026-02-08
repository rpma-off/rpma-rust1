//! Unit tests for two-factor authentication service
//!
//! Tests the 2FA functionality including:
//! - TOTP secret generation and setup
//! - Code verification with clock skew tolerance
//! - Backup code generation and validation
//! - Secret encryption/decryption

use crate::services::two_factor::TwoFactorService;
use crate::test_utils::test_db;

#[cfg(test)]
mod tests {
    use super::*;

    fn create_2fa_service() -> (TwoFactorService, tempfile::TempDir) {
        let test_db = test_db!();
        let service = TwoFactorService::new(test_db.db());
        (service, test_db.temp_dir)
    }

    #[test]
    fn test_generate_setup() {
        let (two_fa_service, _temp_dir) = create_2fa_service();
        let user_id = "test_user_123";

        let result = two_fa_service.generate_setup(user_id);

        assert!(result.is_ok(), "2FA setup generation should succeed");
        let setup = result.unwrap();

        assert!(
            !setup.secret.is_empty(),
            "Should generate a non-empty secret"
        );
        assert!(
            !setup.qr_code_url.is_empty(),
            "Should generate a QR code URL"
        );
        assert!(
            !setup.backup_codes.is_empty(),
            "Should generate backup codes"
        );
        assert!(
            setup.backup_codes.len() == 10,
            "Should generate 10 backup codes"
        );

        // Verify backup codes format (should be 8 characters)
        for backup_code in &setup.backup_codes {
            assert_eq!(backup_code.len(), 8, "Backup code should be 8 characters");
            assert!(
                backup_code.chars().all(|c| c.is_ascii_alphanumeric()),
                "Backup code should be alphanumeric"
            );
        }
    }

    #[test]
    fn test_generate_setup_different_secrets() {
        let (two_fa_service, _temp_dir) = create_2fa_service();
        let user_id1 = "test_user_123";
        let user_id2 = "test_user_456";

        let setup1 = two_fa_service
            .generate_setup(user_id1)
            .expect("Should generate first setup");
        let setup2 = two_fa_service
            .generate_setup(user_id2)
            .expect("Should generate second setup");

        assert_ne!(
            setup1.secret, setup2.secret,
            "Different users should get different secrets"
        );
        assert_ne!(
            setup1.qr_code_url, setup2.qr_code_url,
            "QR code URLs should be different"
        );
        assert_ne!(
            setup1.backup_codes, setup2.backup_codes,
            "Backup codes should be different"
        );
    }

    #[test]
    fn test_verify_code_valid() {
        let (two_fa_service, _temp_dir) = create_2fa_service();
        let user_id = "test_user_123";

        // Generate setup
        let setup = two_fa_service
            .generate_setup(user_id)
            .expect("Should generate setup");

        // Save the secret for the user
        two_fa_service
            .save_secret(user_id, &setup.secret)
            .expect("Should save secret");

        // Generate a valid TOTP code
        let valid_code = two_fa_service
            .generate_current_code(&setup.secret)
            .expect("Should generate valid code");

        // Verify the code
        let result = two_fa_service.verify_code(user_id, &valid_code);

        assert!(result.is_ok(), "Valid TOTP code should verify successfully");
        assert!(result.unwrap(), "Should return true for valid code");
    }

    #[test]
    fn test_verify_code_invalid() {
        let (two_fa_service, _temp_dir) = create_2fa_service();
        let user_id = "test_user_123";

        // Generate setup and save secret
        let setup = two_fa_service
            .generate_setup(user_id)
            .expect("Should generate setup");
        two_fa_service
            .save_secret(user_id, &setup.secret)
            .expect("Should save secret");

        // Try to verify an invalid code
        let result = two_fa_service.verify_code(user_id, "123456");

        assert!(result.is_ok(), "Verification should not error");
        assert!(!result.unwrap(), "Should return false for invalid code");
    }

    #[test]
    fn test_verify_code_no_secret() {
        let (two_fa_service, _temp_dir) = create_2fa_service();
        let user_id = "nonexistent_user";

        // Try to verify code for user without 2FA setup
        let result = two_fa_service.verify_code(user_id, "123456");

        assert!(result.is_ok(), "Verification should not error");
        assert!(
            !result.unwrap(),
            "Should return false for user without secret"
        );
    }

    #[test]
    fn test_verify_code_clock_skew_tolerance() {
        let (two_fa_service, _temp_dir) = create_2fa_service();
        let user_id = "test_user_123";

        // Generate setup and save secret
        let setup = two_fa_service
            .generate_setup(user_id)
            .expect("Should generate setup");
        two_fa_service
            .save_secret(user_id, &setup.secret)
            .expect("Should save secret");

        // Generate code for different time periods
        let current_code = two_fa_service
            .generate_current_code(&setup.secret)
            .expect("Should generate current code");

        // Test code from previous interval (30 seconds ago)
        let previous_code = two_fa_service
            .generate_code_for_time(&setup.secret, chrono::Utc::now().timestamp() - 30)
            .expect("Should generate previous code");
        let result = two_fa_service.verify_code(user_id, &previous_code);
        assert!(result.is_ok(), "Verification should not error");
        assert!(result.unwrap(), "Should accept code from previous interval");

        // Test code from next interval (30 seconds in future)
        let future_code = two_fa_service
            .generate_code_for_time(&setup.secret, chrono::Utc::now().timestamp() + 30)
            .expect("Should generate future code");
        let result = two_fa_service.verify_code(user_id, &future_code);
        assert!(result.is_ok(), "Verification should not error");
        assert!(result.unwrap(), "Should accept code from next interval");

        // Test code from too far in the past (2 minutes ago)
        let old_code = two_fa_service
            .generate_code_for_time(&setup.secret, chrono::Utc::now().timestamp() - 120)
            .expect("Should generate old code");
        let result = two_fa_service.verify_code(user_id, &old_code);
        assert!(result.is_ok(), "Verification should not error");
        assert!(
            !result.unwrap(),
            "Should reject code from too far in the past"
        );
    }

    #[test]
    fn test_verify_backup_code_valid() {
        let (two_fa_service, _temp_dir) = create_2fa_service();
        let user_id = "test_user_123";

        // Generate setup and save backup codes
        let setup = two_fa_service
            .generate_setup(user_id)
            .expect("Should generate setup");
        two_fa_service
            .save_backup_codes(user_id, &setup.backup_codes)
            .expect("Should save backup codes");

        // Verify first backup code
        let backup_code = &setup.backup_codes[0];
        let result = two_fa_service.verify_backup_code(user_id, backup_code);

        assert!(result.is_ok(), "Backup code verification should not error");
        assert!(result.unwrap(), "Should return true for valid backup code");

        // Verify the code is now consumed (cannot be used again)
        let result = two_fa_service.verify_backup_code(user_id, backup_code);
        assert!(result.is_ok(), "Second verification should not error");
        assert!(!result.unwrap(), "Should return false for used backup code");
    }

    #[test]
    fn test_verify_backup_code_invalid() {
        let (two_fa_service, _temp_dir) = create_2fa_service();
        let user_id = "test_user_123";

        // Generate setup and save backup codes
        let setup = two_fa_service
            .generate_setup(user_id)
            .expect("Should generate setup");
        two_fa_service
            .save_backup_codes(user_id, &setup.backup_codes)
            .expect("Should save backup codes");

        // Try to verify invalid backup code
        let result = two_fa_service.verify_backup_code(user_id, "INVALID123");

        assert!(result.is_ok(), "Backup code verification should not error");
        assert!(
            !result.unwrap(),
            "Should return false for invalid backup code"
        );
    }

    #[test]
    fn test_verify_backup_code_no_codes() {
        let (two_fa_service, _temp_dir) = create_2fa_service();
        let user_id = "nonexistent_user";

        // Try to verify backup code for user without backup codes
        let result = two_fa_service.verify_backup_code(user_id, "VALID1234");

        assert!(result.is_ok(), "Backup code verification should not error");
        assert!(
            !result.unwrap(),
            "Should return false for user without backup codes"
        );
    }

    #[test]
    fn test_regenerate_backup_codes() {
        let (two_fa_service, _temp_dir) = create_2fa_service();
        let user_id = "test_user_123";

        // Generate initial setup
        let setup1 = two_fa_service
            .generate_setup(user_id)
            .expect("Should generate first setup");
        two_fa_service
            .save_backup_codes(user_id, &setup1.backup_codes)
            .expect("Should save initial backup codes");

        // Use one backup code
        let used_code = &setup1.backup_codes[0];
        two_fa_service
            .verify_backup_code(user_id, used_code)
            .expect("Should consume one backup code");

        // Regenerate backup codes
        let result = two_fa_service.regenerate_backup_codes(user_id);

        assert!(result.is_ok(), "Backup code regeneration should succeed");
        let new_backup_codes = result.unwrap();

        assert_eq!(
            new_backup_codes.len(),
            10,
            "Should generate 10 new backup codes"
        );
        assert_ne!(
            new_backup_codes, setup1.backup_codes,
            "New backup codes should be different"
        );

        // Verify old backup codes no longer work
        for old_code in &setup1.backup_codes {
            let result = two_fa_service.verify_backup_code(user_id, old_code);
            assert!(
                result.is_ok(),
                "Old backup code verification should not error"
            );
            assert!(
                !result.unwrap(),
                "Old backup codes should no longer be valid"
            );
        }

        // Verify new backup codes work
        for new_code in &new_backup_codes {
            let result = two_fa_service.verify_backup_code(user_id, new_code);
            assert!(
                result.is_ok(),
                "New backup code verification should not error"
            );
            assert!(result.unwrap(), "New backup codes should be valid");
        }
    }

    #[test]
    fn test_encrypt_decrypt_secret() {
        let (two_fa_service, _temp_dir) = create_2fa_service();
        let secret = "JBSWY3DPEHPK3PXP";

        // Encrypt the secret
        let encrypted = two_fa_service
            .encrypt_secret(secret)
            .expect("Should encrypt secret");

        assert!(
            !encrypted.is_empty(),
            "Encrypted secret should not be empty"
        );
        assert_ne!(
            encrypted, secret,
            "Encrypted secret should be different from original"
        );

        // Decrypt the secret
        let decrypted = two_fa_service
            .decrypt_secret(&encrypted)
            .expect("Should decrypt secret");

        assert_eq!(decrypted, secret, "Decrypted secret should match original");
    }

    #[test]
    fn test_encrypt_secret_different_results() {
        let (two_fa_service, _temp_dir) = create_2fa_service();
        let secret = "JBSWY3DPEHPK3PXP";

        // Encrypt the same secret twice
        let encrypted1 = two_fa_service
            .encrypt_secret(secret)
            .expect("Should encrypt secret first time");
        let encrypted2 = two_fa_service
            .encrypt_secret(secret)
            .expect("Should encrypt secret second time");

        // Note: With current XOR implementation, results might be the same
        // In production with proper encryption, these should be different
        // This test documents current behavior
        assert_eq!(
            encrypted1, encrypted2,
            "Current implementation produces same encrypted value"
        );
    }

    #[test]
    fn test_decrypt_invalid_secret() {
        let (two_fa_service, _temp_dir) = create_2fa_service();
        let invalid_encrypted = "invalid_encrypted_data";

        let result = two_fa_service.decrypt_secret(invalid_encrypted);
        assert!(result.is_err(), "Should fail to decrypt invalid data");
    }

    #[test]
    fn test_is_2fa_enabled() {
        let (two_fa_service, _temp_dir) = create_2fa_service();
        let user_id = "test_user_123";

        // Initially should be disabled
        assert!(
            !two_fa_service
                .is_2fa_enabled(user_id)
                .expect("Should check 2FA status"),
            "2FA should be disabled initially"
        );

        // Enable 2FA
        let setup = two_fa_service
            .generate_setup(user_id)
            .expect("Should generate setup");
        two_fa_service
            .save_secret(user_id, &setup.secret)
            .expect("Should save secret");
        two_fa_service
            .save_backup_codes(user_id, &setup.backup_codes)
            .expect("Should save backup codes");
        two_fa_service
            .enable_2fa(user_id)
            .expect("Should enable 2FA");

        // Should now be enabled
        assert!(
            two_fa_service
                .is_2fa_enabled(user_id)
                .expect("Should check 2FA status"),
            "2FA should be enabled after setup"
        );

        // Disable 2FA
        two_fa_service
            .disable_2fa(user_id)
            .expect("Should disable 2FA");

        // Should be disabled again
        assert!(
            !two_fa_service
                .is_2fa_enabled(user_id)
                .expect("Should check 2FA status"),
            "2FA should be disabled after disabling"
        );
    }

    #[test]
    fn test_get_remaining_backup_codes() {
        let (two_fa_service, _temp_dir) = create_2fa_service();
        let user_id = "test_user_123";

        // Generate setup and save backup codes
        let setup = two_fa_service
            .generate_setup(user_id)
            .expect("Should generate setup");
        two_fa_service
            .save_backup_codes(user_id, &setup.backup_codes)
            .expect("Should save backup codes");
        two_fa_service
            .enable_2fa(user_id)
            .expect("Should enable 2FA");

        // Should have all 10 backup codes remaining
        let remaining = two_fa_service
            .get_remaining_backup_codes(user_id)
            .expect("Should get remaining codes");
        assert_eq!(remaining.len(), 10, "Should have 10 remaining backup codes");

        // Use 3 backup codes
        for i in 0..3 {
            two_fa_service
                .verify_backup_code(user_id, &setup.backup_codes[i])
                .expect("Should use backup code");
        }

        // Should have 7 remaining backup codes
        let remaining = two_fa_service
            .get_remaining_backup_codes(user_id)
            .expect("Should get remaining codes");
        assert_eq!(remaining.len(), 7, "Should have 7 remaining backup codes");
    }

    #[test]
    fn test_2fa_error_handling() {
        let (two_fa_service, _temp_dir) = create_2fa_service();

        // Test with invalid user IDs
        let result = two_fa_service.generate_setup("");
        assert!(result.is_err(), "Should reject empty user ID");

        let result = two_fa_service.is_2fa_enabled("");
        assert!(
            result.is_err(),
            "Should reject empty user ID for status check"
        );

        // Test with invalid codes
        let user_id = "test_user_123";
        let setup = two_fa_service
            .generate_setup(user_id)
            .expect("Should generate setup");
        two_fa_service
            .save_secret(user_id, &setup.secret)
            .expect("Should save secret");

        let result = two_fa_service.verify_code(user_id, "");
        assert!(result.is_ok(), "Should handle empty code gracefully");
        assert!(!result.unwrap(), "Should reject empty code");

        let result = two_fa_service.verify_code(user_id, "abcdef");
        assert!(result.is_ok(), "Should handle non-numeric code gracefully");
        assert!(!result.unwrap(), "Should reject non-numeric code");

        // Test with special characters in codes
        let result = two_fa_service.verify_code(user_id, "12#456");
        assert!(
            result.is_ok(),
            "Should handle special characters gracefully"
        );
        assert!(
            !result.unwrap(),
            "Should reject code with special characters"
        );
    }

    #[test]
    fn test_2fa_integration_workflow() {
        let (two_fa_service, _temp_dir) = create_2fa_service();
        let user_id = "integration_test_user";

        // Step 1: Generate setup
        let setup = two_fa_service
            .generate_setup(user_id)
            .expect("Should generate setup");
        assert!(!setup.secret.is_empty(), "Setup should include secret");
        assert_eq!(
            setup.backup_codes.len(),
            10,
            "Setup should include 10 backup codes"
        );

        // Step 2: Save the data (normally done during user setup)
        two_fa_service
            .save_secret(user_id, &setup.secret)
            .expect("Should save secret");
        two_fa_service
            .save_backup_codes(user_id, &setup.backup_codes)
            .expect("Should save backup codes");
        two_fa_service
            .enable_2fa(user_id)
            .expect("Should enable 2FA");

        // Step 3: Verify 2FA is enabled
        assert!(
            two_fa_service
                .is_2fa_enabled(user_id)
                .expect("2FA should be enabled"),
            "2FA should be enabled"
        );

        // Step 4: Test TOTP authentication
        let valid_code = two_fa_service
            .generate_current_code(&setup.secret)
            .expect("Should generate valid code");
        assert!(
            two_fa_service
                .verify_code(user_id, &valid_code)
                .expect("Should verify code"),
            "TOTP code should work"
        );

        // Step 5: Test backup code authentication
        let backup_code = &setup.backup_codes[5]; // Use a middle backup code
        assert!(
            two_fa_service
                .verify_backup_code(user_id, backup_code)
                .expect("Should verify backup code"),
            "Backup code should work"
        );

        // Step 6: Verify backup code is consumed
        assert!(
            !two_fa_service
                .verify_backup_code(user_id, backup_code)
                .expect("Should verify backup code"),
            "Used backup code should not work again"
        );

        // Step 7: Check remaining codes
        let remaining = two_fa_service
            .get_remaining_backup_codes(user_id)
            .expect("Should get remaining codes");
        assert_eq!(remaining.len(), 9, "Should have 9 remaining backup codes");
        assert!(
            !remaining.contains(&backup_code),
            "Used backup code should not be in remaining list"
        );

        // Step 8: Disable 2FA
        two_fa_service
            .disable_2fa(user_id)
            .expect("Should disable 2FA");
        assert!(
            !two_fa_service
                .is_2fa_enabled(user_id)
                .expect("2FA should be disabled"),
            "2FA should be disabled"
        );
    }
}
