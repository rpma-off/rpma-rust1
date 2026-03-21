use serde::Serialize;
use ts_rs::TS;

/// TODO: document
#[derive(Serialize, TS)]
pub struct UserListResponse {
    pub data: Vec<crate::shared::contracts::auth::UserAccount>,
}

/// Discriminated-union IPC response for user CRUD commands.
///
/// Variants map to the action that was executed:
/// `Created`, `Found`, `Updated`, `Deleted`, `NotFound`, `List`,
/// `PasswordChanged`, `RoleChanged`, `UserBanned`, `UserUnbanned`.
#[derive(Serialize, TS)]
#[serde(tag = "type")]
pub enum UserResponse {
    Created(crate::shared::contracts::auth::UserAccount),
    Found(crate::shared::contracts::auth::UserAccount),
    Updated(crate::shared::contracts::auth::UserAccount),
    Deleted,
    NotFound,
    List(UserListResponse),
    PasswordChanged,
    RoleChanged,
    UserBanned,
    UserUnbanned,
    /// Contains the generated temporary password (shown once to the admin).
    PasswordReset(String),
}
