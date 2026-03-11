//! Organization access policy

use crate::shared::contracts::auth::{UserRole, UserSession};
use crate::shared::ipc::errors::AppError;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OrganizationCategory {
    Read,
    Update,
    Settings,
    Branding,
}

pub struct OrganizationAccessPolicy;

impl OrganizationAccessPolicy {
    pub fn ensure_access(
        user: &UserSession,
        category: OrganizationCategory,
    ) -> Result<(), AppError> {
        let has_access = match category {
            OrganizationCategory::Read => true,
            OrganizationCategory::Update
            | OrganizationCategory::Settings
            | OrganizationCategory::Branding => {
                matches!(user.role, UserRole::Admin)
            }
        };

        if !has_access {
            return Err(AppError::Authorization(format!(
                "User role '{}' cannot access organization category '{:?}'",
                user.role, category
            )));
        }

        Ok(())
    }

    pub fn can_update_organization(user: &UserSession) -> bool {
        matches!(user.role, UserRole::Admin)
    }

    pub fn can_manage_settings(user: &UserSession) -> bool {
        matches!(user.role, UserRole::Admin)
    }

    pub fn can_upload_logo(user: &UserSession) -> bool {
        matches!(user.role, UserRole::Admin)
    }
}
