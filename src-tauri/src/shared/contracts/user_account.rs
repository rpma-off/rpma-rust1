//! Shared contract for user account management.
//!
//! This trait allows the users domain to manage accounts without
//! depending directly on the auth infrastructure.

use crate::shared::contracts::auth::{UserAccount, UserRole};

/// Port for user account CRUD operations across bounded contexts.
pub trait UserAccountManager: Send + Sync {
    fn create_account(
        &self,
        email: &str,
        username: &str,
        first_name: &str,
        last_name: &str,
        role: UserRole,
        password: &str,
    ) -> Result<UserAccount, String>;

    fn get_user(&self, user_id: &str) -> Result<Option<UserAccount>, String>;

    fn update_user(
        &self,
        user_id: &str,
        email: Option<&str>,
        first_name: Option<&str>,
        last_name: Option<&str>,
        role: Option<UserRole>,
        is_active: Option<bool>,
    ) -> Result<UserAccount, String>;

    fn delete_user(&self, user_id: &str) -> Result<(), String>;

    fn list_users(
        &self,
        limit: Option<i32>,
        offset: Option<i32>,
    ) -> Result<Vec<UserAccount>, String>;

    fn change_password(&self, user_id: &str, new_password: &str) -> Result<(), String>;
}
