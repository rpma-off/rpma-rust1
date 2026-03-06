//! `UserAccountManager` shared-contract implementation.

use crate::domains::auth::domain::models::auth::{UserAccount, UserRole};

impl crate::shared::contracts::user_account::UserAccountManager for super::AuthService {
    fn create_account(
        &self,
        email: &str,
        username: &str,
        first_name: &str,
        last_name: &str,
        role: UserRole,
        password: &str,
    ) -> Result<UserAccount, String> {
        self.create_account(email, username, first_name, last_name, role, password)
    }

    fn get_user(&self, user_id: &str) -> Result<Option<UserAccount>, String> {
        self.get_user(user_id)
    }

    fn update_user(
        &self,
        user_id: &str,
        email: Option<&str>,
        first_name: Option<&str>,
        last_name: Option<&str>,
        role: Option<UserRole>,
        is_active: Option<bool>,
    ) -> Result<UserAccount, String> {
        self.update_user(user_id, email, first_name, last_name, role, is_active)
    }

    fn delete_user(&self, user_id: &str) -> Result<(), String> {
        self.delete_user(user_id)
    }

    fn list_users(
        &self,
        limit: Option<i32>,
        offset: Option<i32>,
    ) -> Result<Vec<UserAccount>, String> {
        self.list_users(limit, offset)
    }

    fn change_password(&self, user_id: &str, new_password: &str) -> Result<(), String> {
        self.change_password(user_id, new_password)
    }
}
