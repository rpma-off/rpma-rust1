//! Password hashing, verification, and change operations.

use argon2::password_hash::{rand_core::OsRng, PasswordHasher, SaltString};
use argon2::{Argon2, PasswordHash, PasswordVerifier};
use chrono::Utc;
use rusqlite::params;

impl super::AuthService {
    /// Hash password using Argon2
    pub(super) fn hash_password(&self, password: &str) -> Result<String, String> {
        let salt = SaltString::generate(&mut OsRng);
        let argon2 = Argon2::default();

        let password_hash = argon2
            .hash_password(password.as_bytes(), &salt)
            .map_err(|e| format!("Failed to hash password: {}", e))?
            .to_string();

        Ok(password_hash)
    }

    /// Verify password against hash
    pub fn verify_password(&self, password: &str, hash: &str) -> Result<bool, String> {
        let parsed_hash =
            PasswordHash::new(hash).map_err(|e| format!("Invalid password hash: {}", e))?;

        let argon2 = Argon2::default();
        let result = argon2.verify_password(password.as_bytes(), &parsed_hash);

        Ok(result.is_ok())
    }

    /// Verify a user's password by looking up the stored hash from the database.
    ///
    /// Returns `Ok(true)` if the password matches, `Ok(false)` if the password is invalid.
    /// Returns `Err` if the user is not found, inactive, or a database error occurs.
    pub fn verify_user_password(&self, user_id: &str, password: &str) -> Result<bool, String> {
        let conn = self.db.get_connection()?;
        let stored_hash: String = conn
            .query_row(
                "SELECT password_hash FROM users WHERE id = ? AND is_active = 1",
                [user_id],
                |row| row.get(0),
            )
            .map_err(|_| "User not found or inactive".to_string())?;

        self.verify_password(password, &stored_hash)
    }

    /// Change user password
    pub fn change_password(&self, user_id: &str, new_password: &str) -> Result<(), String> {
        let password_hash = self.hash_password(new_password)?;
        let conn = self.db.get_connection()?;

        conn.execute(
            "UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?",
            params![password_hash, Utc::now().timestamp_millis(), user_id],
        )
        .map_err(|e| format!("Failed to change password: {}", e))?;

        Ok(())
    }
}
