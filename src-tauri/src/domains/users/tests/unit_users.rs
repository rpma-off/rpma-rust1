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
