//! Proptest configuration and main entry point
//!
//! This module provides the main entry point for running all property-based tests
//! using the Proptest framework.

use proptest::test_runner::Config;

// Import all proptest modules
mod analytics_service_proptests;
mod audit_service_proptests;
mod auth_service_proptests;
mod client_validation_proptests;
mod inventory_management_proptests;
mod messaging_system_proptests;
mod task_validation_comprehensive;
mod task_validation_proptests;
mod task_validation_service_proptests;
mod user_settings_proptests;

#[cfg(test)]
mod main {
    use proptest::prelude::*;
    use proptest::test_runner::Config;

    // Custom test configuration with more iterations for thorough testing
    fn custom_proptest_config() -> Config {
        Config {
            // Increase the number of test cases for better coverage
            cases: 1000,
            // Enable failure persistence for debugging
            failure_persistence: Some(Box::new(
                proptest::test_runner::FileFailurePersistence::new("proptest-regressions"),
            )),
            // Use a fixed seed for reproducible tests
            fork: true,
            // Enable verbose output for debugging
            verbose: 0,
            ..Config::default()
        }
    }

    // Custom strategy for generating valid email addresses
    pub fn email_strategy() -> impl Strategy<Value = String> {
        prop::string::string_regex(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}").prop_filter(
            "Valid email",
            |email| {
                !email.starts_with('.')
                    && !email.starts_with('@')
                    && !email.ends_with('.')
                    && !email.ends_with('@')
                    && email.matches('@').count() == 1
                    && email.len() <= 254
            },
        )
    }

    // Custom strategy for generating phone numbers
    pub fn phone_strategy() -> impl Strategy<Value = String> {
        prop_oneof![
            // North American format
            (prop::string::string_regex(r"[2-9]\d{2}-\d{3}-\d{4}")),
            // International format
            (prop::string::string_regex(r"\+\d{1,3}-\d{1,4}-\d{1,4}-\d{1,4}")),
            // Simple digits
            (prop::string::string_regex(r"\d{7,15}")),
        ]
    }

    // Custom strategy for generating vehicle plates
    pub fn vehicle_plate_strategy() -> impl Strategy<Value = String> {
        prop_oneof![
            // US format: ABC123
            (prop::string::string_regex(r"[A-Z]{3}[0-9]{1,4}")),
            // European format: AB-123-CD
            (prop::string::string_regex(r"[A-Z]{2}-\d{3}-[A-Z]{2}")),
            // Custom format: Letters and numbers
            (prop::string::string_regex(r"[A-Z0-9]{3,10}")),
        ]
    }

    // Custom strategy for generating task titles
    pub fn task_title_strategy() -> impl Strategy<Value = String> {
        prop::string::string_regex(r"[a-zA-Z0-9\s\-_.,:;()]{1,255}")
            .prop_filter("Valid title", |title| {
                !title.trim().is_empty() && title.trim().len() <= 255
            })
    }

    // Custom strategy for generating client names
    pub fn client_name_strategy() -> impl Strategy<Value = String> {
        prop::string::string_regex(r"[a-zA-Z0-9\s\-_.,&]{1,255}")
            .prop_filter("Valid name", |name| {
                !name.trim().is_empty() && name.trim().len() >= 2 && name.trim().len() <= 255
            })
    }

    // Custom strategy for generating addresses
    pub fn address_strategy() -> impl Strategy<Value = String> {
        prop::string::string_regex(r"[a-zA-Z0-9\s\-_.,#]{5,500}").prop_filter(
            "Valid address",
            |address| {
                !address.trim().is_empty()
                    && address.trim().len() >= 5
                    && address.trim().len() <= 500
            },
        )
    }

    // Custom strategy for generating timestamps
    pub fn timestamp_strategy() -> impl Strategy<Value = chrono::DateTime<chrono::Utc>> {
        // Generate timestamps within reasonable range (past year to future year)
        any::<i32>().prop_filter_map("Valid timestamp", |days_offset| {
            if days_offset >= -365 && days_offset <= 365 {
                Some(chrono::Utc::now() + chrono::Duration::days(days_offset as i64))
            } else {
                None
            }
        })
    }

    // All strategies are already public above
}
