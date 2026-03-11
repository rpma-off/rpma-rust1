//! Organization domain tests

#[cfg(test)]
mod tests {
    use crate::domains::organizations::domain::models::{
        CreateOrganizationRequest, OnboardingData, Organization, UpdateOrganizationRequest,
    };

    #[test]
    fn test_create_organization_request_validation() {
        let valid_request = CreateOrganizationRequest {
            name: "Test Organization".to_string(),
            slug: Some("test-org".to_string()),
            email: Some("test@example.com".to_string()),
            ..Default::default()
        };
        assert!(valid_request.validate().is_ok());

        let empty_name = CreateOrganizationRequest {
            name: "".to_string(),
            ..Default::default()
        };
        assert!(empty_name.validate().is_err());

        let invalid_email = CreateOrganizationRequest {
            name: "Test".to_string(),
            email: Some("invalid-email".to_string()),
            ..Default::default()
        };
        assert!(invalid_email.validate().is_err());
    }

    #[test]
    fn test_organization_default() {
        let org = Organization::default_org();
        assert_eq!(org.id, "default");
        assert_eq!(org.name, "My Organization");
        assert!(org.primary_color.is_some());
    }

    #[test]
    fn test_onboarding_data_validation() {
        let valid_data = OnboardingData {
            organization: CreateOrganizationRequest {
                name: "Test Org".to_string(),
                ..Default::default()
            },
            admin_email: "admin@example.com".to_string(),
            admin_password: "password123".to_string(),
            admin_first_name: "Admin".to_string(),
            admin_last_name: "User".to_string(),
        };
        assert!(valid_data.validate().is_ok());

        let short_password = OnboardingData {
            organization: CreateOrganizationRequest {
                name: "Test Org".to_string(),
                ..Default::default()
            },
            admin_email: "admin@example.com".to_string(),
            admin_password: "short".to_string(),
            admin_first_name: "Admin".to_string(),
            admin_last_name: "User".to_string(),
        };
        assert!(short_password.validate().is_err());
    }
}
