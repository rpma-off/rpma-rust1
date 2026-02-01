//! Unit tests for auth service

use rpma_ppf_intervention::db::Database;
use rpma_ppf_intervention::models::auth::UserRole;
use rpma_ppf_intervention::services::auth::AuthService;

#[cfg(test)]
mod tests {
    use super::*;

    fn setup_test_db() -> Database {
        let temp_file = tempfile::NamedTempFile::new().unwrap();
        let db = Database::new(temp_file.path()).unwrap();
        db.init().unwrap();
        db
    }

    #[test]
    fn test_user_creation() {
        let db = setup_test_db();
        let auth_service = AuthService::new(db);

        let result = auth_service.create_account(
            "test@example.com",
            "testuser",
            "Test",
            "User",
            UserRole::Technician,
            "password123",
        );
        assert!(result.is_ok(), "User creation should succeed");

        let user = result.unwrap();
        assert_eq!(user.email, "test@example.com");
        assert_eq!(user.role, UserRole::Technician);
    }

    #[test]
    fn test_user_authentication() {
        let db = setup_test_db();
        let auth_service = AuthService::new(db);

        // Create user first
        let _ = auth_service
            .create_account(
                "test@example.com",
                "testuser",
                "Test",
                "User",
                UserRole::Technician,
                "password123",
            )
            .unwrap();

        // Test authentication
        let auth_result = auth_service.authenticate("test@example.com", "password123");
        assert!(auth_result.is_ok(), "Authentication should succeed");

        let session = auth_result.unwrap();
        assert_eq!(session.email, "test@example.com");
        assert!(!session.token.is_empty());
    }

    #[test]
    fn test_invalid_authentication() {
        let db = setup_test_db();
        let auth_service = AuthService::new(db);

        let auth_result = auth_service.authenticate("nonexistent", "password");
        assert!(
            auth_result.is_err(),
            "Authentication should fail for nonexistent user"
        );
    }
}
