//! Organization application service

use std::sync::Arc;
use tracing::info;

use crate::db::Database;
use crate::domains::organizations::domain::models::{
    OnboardingData, OnboardingStatus, Organization, OrganizationSettings,
    UpdateOrganizationRequest, UpdateOrganizationSettingsRequest,
};
use crate::domains::organizations::domain::policy::{
    OrganizationAccessPolicy, OrganizationCategory,
};
use crate::domains::organizations::infrastructure::OrganizationRepository;
use crate::shared::contracts::auth::UserSession;
use crate::shared::ipc::errors::AppError;

pub struct OrganizationService {
    repository: Arc<OrganizationRepository>,
    db: Arc<Database>,
}

impl std::fmt::Debug for OrganizationService {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("OrganizationService")
            .field("repository", &"OrganizationRepository")
            .field("db", &"Database")
            .finish()
    }
}

impl OrganizationService {
    pub fn new(db: Arc<Database>) -> Self {
        let repository = Arc::new(OrganizationRepository::new(db.clone()));
        Self { repository, db }
    }

    pub fn get_onboarding_status(&self) -> Result<OnboardingStatus, AppError> {
        let (completed, current_step) = self.repository.get_onboarding_status()?;
        let has_organization = self.repository.get_organization()?.is_some();
        let has_admin_user = self.repository.has_admin_users()?;

        Ok(OnboardingStatus {
            completed,
            current_step,
            has_organization,
            has_admin_user,
        })
    }

    pub fn complete_onboarding(&self, data: &OnboardingData) -> Result<Organization, AppError> {
        data.validate().map_err(|e| AppError::Validation(e))?;

        if self.repository.get_organization()?.is_some() {
            return Err(AppError::Validation(
                "Organization already exists".to_string(),
            ));
        }

        let organization = self.repository.create_organization(&data.organization)?;
        self.repository.complete_onboarding()?;

        info!(
            "Onboarding completed for organization: {}",
            organization.name
        );
        Ok(organization)
    }

    pub fn get_organization(&self) -> Result<Option<Organization>, AppError> {
        self.repository.get_organization()
    }

    pub fn get_organization_or_default(&self) -> Result<Organization, AppError> {
        self.repository.get_organization()?.ok_or_else(|| {
            AppError::NotFound("Organization not found. Please complete onboarding.".to_string())
        })
    }

    pub fn update_organization(
        &self,
        user: &UserSession,
        request: &UpdateOrganizationRequest,
    ) -> Result<Organization, AppError> {
        OrganizationAccessPolicy::ensure_access(user, OrganizationCategory::Update)?;
        self.repository.update_organization(request)
    }

    pub fn get_settings(&self) -> Result<OrganizationSettings, AppError> {
        self.repository.get_all_settings()
    }

    pub fn update_settings(
        &self,
        user: &UserSession,
        request: &UpdateOrganizationSettingsRequest,
    ) -> Result<OrganizationSettings, AppError> {
        OrganizationAccessPolicy::ensure_access(user, OrganizationCategory::Settings)?;
        self.repository.update_settings(&request.settings)?;
        self.repository.get_all_settings()
    }

    pub fn upload_logo(
        &self,
        user: &UserSession,
        logo_url: Option<String>,
        logo_data: Option<String>,
    ) -> Result<Organization, AppError> {
        OrganizationAccessPolicy::ensure_access(user, OrganizationCategory::Branding)?;

        let request = UpdateOrganizationRequest {
            logo_url,
            logo_data,
            ..Default::default()
        };

        self.repository.update_organization(&request)
    }
}
