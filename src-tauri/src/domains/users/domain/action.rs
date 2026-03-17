use crate::domains::users::application::{CreateUserRequest, UpdateUserRequest};
use serde::Deserialize;
use ts_rs::TS;

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
}
