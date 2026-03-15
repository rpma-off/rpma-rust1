use crate::domains::users::application::{CreateUserRequest, UserAction};
use crate::domains::users::UsersFacade;

#[test]
fn required_permission_for_create_is_create() {
    let facade = UsersFacade::new();
    let action = UserAction::Create {
        data: CreateUserRequest {
            email: "user@example.com".to_string(),
            first_name: "First".to_string(),
            last_name: "Last".to_string(),
            role: "viewer".to_string(),
            password: "StrongPass123!".to_string(),
        },
    };

    assert_eq!(facade.required_permission(&action), "create");
}

#[test]
fn required_permission_for_list_is_read() {
    let facade = UsersFacade::new();
    let action = UserAction::List {
        limit: Some(10),
        offset: Some(0),
    };

    assert_eq!(facade.required_permission(&action), "read");
}

// --- derive_username_from_email ---

#[test]
fn test_derive_username_email_with_dots_replaces_with_underscore() {
    assert_eq!(
        UsersFacade::derive_username_from_email("first.last@example.com"),
        "first_last"
    );
}

#[test]
fn test_derive_username_email_plain_local_part_unchanged() {
    assert_eq!(
        UsersFacade::derive_username_from_email("johndoe@example.com"),
        "johndoe"
    );
}

#[test]
fn test_derive_username_email_no_at_sign_sanitizes_full_string() {
    assert_eq!(
        UsersFacade::derive_username_from_email("nodomain"),
        "nodomain"
    );
}

#[test]
fn test_derive_username_email_short_local_part_gets_padded() {
    // "a" → trimmed "a" → len 1 < 3 → "u_a"
    assert_eq!(
        UsersFacade::derive_username_from_email("a@example.com"),
        "u_a"
    );
}

#[test]
fn test_derive_username_email_leading_trailing_dots_trimmed() {
    // ".user." → sanitize → "_user_" → trim → "user"
    assert_eq!(
        UsersFacade::derive_username_from_email(".user.@example.com"),
        "user"
    );
}

#[test]
fn test_derive_username_email_truncated_to_50_chars() {
    let long_local = "a".repeat(60);
    let email = format!("{}@example.com", long_local);
    let result = UsersFacade::derive_username_from_email(&email);
    assert_eq!(result.len(), 50);
}
