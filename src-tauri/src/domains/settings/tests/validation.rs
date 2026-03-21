//! Validation tests for `settings` domain.
//!
//! ADR-008: field validation and boundary rules.

#[cfg(test)]
mod tests {
    use crate::domains::settings::models::{CreateOrganizationRequest, OnboardingData};

    // ── Organization validation ───────────────────────────────────────────────

    #[test]
    fn test_create_organization_empty_name_returns_validation_error() {
        let req = CreateOrganizationRequest {
            name: "".to_string(),
            ..Default::default()
        };
        let result = req.validate();
        assert!(result.is_err(), "Empty org name should fail validation");
        let msg = result.unwrap_err();
        assert!(
            msg.to_lowercase().contains("name"),
            "Error should mention 'name', got: {msg}"
        );
    }

    #[test]
    fn test_create_organization_valid_name_passes_validation() {
        let req = CreateOrganizationRequest {
            name: "ACME Corp".to_string(),
            ..Default::default()
        };
        assert!(req.validate().is_ok());
    }

    // ── OnboardingData validation ─────────────────────────────────────────────

    #[test]
    fn test_onboarding_data_valid_input_passes_validation() {
        let data = OnboardingData {
            organization: CreateOrganizationRequest {
                name: "ACME Corp".to_string(),
                ..Default::default()
            },
        };
        assert!(data.validate().is_ok());
    }
}

