use serde::Deserialize;
use ts_rs::TS;

/// Request DTO for creating a user.
#[derive(TS, Deserialize, Debug)]
#[serde(deny_unknown_fields)]
pub struct CreateUserRequest {
    pub email: String,
    pub first_name: String,
    pub last_name: String,
    pub role: String,
    pub password: String,
}

/// Request DTO for updating a user.
#[derive(TS, Deserialize, Debug)]
#[serde(deny_unknown_fields)]
pub struct UpdateUserRequest {
    pub email: Option<String>,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub role: Option<String>,
    pub is_active: Option<bool>,
}

/// Domain-level user management action.
#[derive(TS, Deserialize, Debug)]
#[serde(tag = "action")]
pub enum UserAction {
    Create {
        data: CreateUserRequest,
    },
    Get {
        id: String,
    },
    Update {
        id: String,
        data: UpdateUserRequest,
    },
    Delete {
        id: String,
    },
    List {
        limit: Option<i32>,
        offset: Option<i32>,
        search: Option<String>,
        role_filter: Option<String>,
    },
    ChangePassword {
        id: String,
        new_password: String,
    },
    ChangeRole {
        id: String,
        new_role: crate::shared::contracts::auth::UserRole,
    },
    Ban {
        id: String,
    },
    Unban {
        id: String,
    },
    /// Admin-initiated password reset: generates a temporary password and returns it once.
    AdminResetPassword {
        id: String,
    },
}
