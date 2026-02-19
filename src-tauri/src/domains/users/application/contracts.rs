use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(TS, Deserialize, Debug)]
pub struct CreateUserRequest {
    pub email: String,
    pub first_name: String,
    pub last_name: String,
    pub role: String,
    pub password: String,
}

#[derive(TS, Deserialize, Debug)]
pub struct UpdateUserRequest {
    pub email: Option<String>,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub role: Option<String>,
    pub is_active: Option<bool>,
}

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
    },
    ChangePassword {
        id: String,
        new_password: String,
    },
    ChangeRole {
        id: String,
        new_role: crate::models::auth::UserRole,
    },
    Ban {
        id: String,
    },
    Unban {
        id: String,
    },
}

#[derive(Serialize, TS)]
pub struct UserListResponse {
    pub data: Vec<crate::models::auth::UserAccount>,
}

#[derive(Serialize)]
#[serde(tag = "type")]
pub enum UserResponse {
    Created(crate::models::auth::UserAccount),
    Found(crate::models::auth::UserAccount),
    Updated(crate::models::auth::UserAccount),
    Deleted,
    NotFound,
    List(UserListResponse),
    PasswordChanged,
    RoleChanged,
    UserBanned,
    UserUnbanned,
}
