use crate::shared::ipc::errors::AppError;

#[tokio::test]
async fn validate_login_input_rejects_invalid_email() {
    use crate::db::Database;
    use crate::domains::auth::application::auth_security_service::AuthSecurityService;
    use crate::domains::auth::infrastructure::session::SessionService;
    use std::sync::Arc;

    let db = Arc::new(
        Database::new_in_memory()
            .await
            .expect("in-memory DB for test"),
    );
    let session_service = Arc::new(SessionService::new(db));
    let sec_svc = AuthSecurityService::new(session_service);

    let err = sec_svc
        .validate_login_input("not-an-email", "StrongPass123!")
        .unwrap_err();

    assert!(matches!(err, AppError::Validation(_)));
}

#[tokio::test]
async fn validate_signup_input_rejects_weak_password() {
    use crate::db::Database;
    use crate::domains::auth::application::auth_security_service::AuthSecurityService;
    use crate::domains::auth::domain::models::auth::SignupRequest;
    use crate::domains::auth::infrastructure::session::SessionService;
    use std::sync::Arc;

    let db = Arc::new(
        Database::new_in_memory()
            .await
            .expect("in-memory DB for test"),
    );
    let session_service = Arc::new(SessionService::new(db));
    let sec_svc = AuthSecurityService::new(session_service);

    let request = SignupRequest {
        email: "valid@example.com".to_string(),
        first_name: "Jane".to_string(),
        last_name: "Doe".to_string(),
        password: "123".to_string(),
        role: Some("viewer".to_string()),
        correlation_id: None,
    };

    let err = sec_svc.validate_signup_input(&request).unwrap_err();
    assert!(matches!(err, AppError::Validation(_)));
}
