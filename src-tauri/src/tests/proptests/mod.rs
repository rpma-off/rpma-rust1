//! Proptest configuration and main entry point
//!
//! This module provides the main entry point for running all property-based tests
//! using the Proptest framework.

use proptest::test_runner::Config;

// Import all proptest modules
mod audit_service_proptests;
mod client_validation_proptests;
mod task_validation_proptests;

#[cfg(test)]
mod main {
    use proptest::prelude::*;

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
    fn email_strategy() -> impl Strategy<Value = String> {
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
    fn phone_strategy() -> impl Strategy<Value = String> {
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
    fn vehicle_plate_strategy() -> impl Strategy<Value = String> {
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
    fn task_title_strategy() -> impl Strategy<Value = String> {
        prop::string::string_regex(r"[a-zA-Z0-9\s\-_.,:;()]{1,255}")
            .prop_filter("Valid title", |title| {
                !title.trim().is_empty() && title.trim().len() <= 255
            })
    }

    // Custom strategy for generating client names
    fn client_name_strategy() -> impl Strategy<Value = String> {
        prop::string::string_regex(r"[a-zA-Z0-9\s\-_.,&]{1,255}")
            .prop_filter("Valid name", |name| {
                !name.trim().is_empty() && name.trim().len() >= 2 && name.trim().len() <= 255
            })
    }

    // Custom strategy for generating addresses
    fn address_strategy() -> impl Strategy<Value = String> {
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
    fn timestamp_strategy() -> impl Strategy<Value = chrono::DateTime<chrono::Utc>> {
        // Generate timestamps within reasonable range (past year to future year)
        prop::num::i32::between(-365, 365)
            .prop_map(|days_offset| chrono::Utc::now() + chrono::Duration::days(days_offset as i64))
    }

    // Export strategies for use in other proptest modules
    pub use address_strategy;
    pub use client_name_strategy;
    pub use email_strategy;
    pub use phone_strategy;
    pub use task_title_strategy;
    pub use timestamp_strategy;
    pub use vehicle_plate_strategy;
}
