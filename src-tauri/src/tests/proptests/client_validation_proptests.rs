//! Property-based tests for client validation
//!
//! This module uses Proptest to verify client validation properties
//! across a wide range of inputs to ensure robust validation logic.

use crate::models::client::CreateClientRequest;
use crate::services::client_validation::ClientValidationService;
use crate::test_utils::{test_db, TestDatabase};
use proptest::prelude::*;

proptest! {
    #[test]
    fn test_client_name_validation_properties(name in "\\PC*") {
        let test_db = test_db!();
        let service = ClientValidationService::new(test_db.db());

        let client_request = CreateClientRequest {
            name: name.clone(),
            email: Some("valid@example.com".to_string()),
            phone: Some("555-1234".to_string()),
            address: Some("Valid Address".to_string()),
            company: None,
            notes: None,
            is_active: true,
        };

        let result = service.validate_create_client_request(&client_request).unwrap();

        // Properties that should always hold:
        if name.is_empty() {
            prop_assert!(!result.is_valid);
            prop_assert!(result.errors.iter().any(|e| e.contains("Name is required")));
        } else if name.len() > 255 {
            prop_assert!(!result.is_valid);
            prop_assert!(result.errors.iter().any(|e| e.contains("Name too long")));
        } else {
            prop_assert!(result.is_valid);
        }
    }

    #[test]
    fn test_client_email_validation_properties(email_local in "[a-zA-Z0-9]{1,10}",
                                           email_domain in "[a-zA-Z0-9]{1,10}") {
        let test_db = test_db!();
        let service = ClientValidationService::new(test_db.db());

        let email = format!("{}@{}.com", email_local, email_domain);

        let client_request = CreateClientRequest {
            name: "Valid Client Name".to_string(),
            email: Some(email.clone()),
            phone: Some("555-1234".to_string()),
            address: Some("Valid Address".to_string()),
            company: None,
            notes: None,
            is_active: true,
        };

        let result = service.validate_create_client_request(&client_request).unwrap();

        // Valid email pattern should always pass validation
        prop_assert!(result.is_valid);
    }

    #[test]
    fn test_client_phone_validation_properties(digits in "[0-9]{7,15}") {
        let test_db = test_db!();
        let service = ClientValidationService::new(test_db.db());

        // Format phone numbers in different ways
        let formats = vec![
            digits.clone(),
            format!("{}-{}", &digits[..3], &digits[3..]),
            format!("({}) {}", &digits[..3], &digits[3..]),
            format!("({})-{}", &digits[..3], &digits[3..]),
            format!("+1-{}", digits),
        ];

        for phone in formats {
            let client_request = CreateClientRequest {
                name: "Valid Client Name".to_string(),
                email: Some("valid@example.com".to_string()),
                phone: Some(phone.clone()),
                address: Some("Valid Address".to_string()),
                company: None,
                notes: None,
                is_active: true,
            };

            let result = service.validate_create_client_request(&client_request).unwrap();

            // Valid phone number formats should pass validation
            prop_assert!(result.is_valid, "Phone number {} should be valid", phone);
        }
    }

    #[test]
    fn test_client_address_validation_properties(address in "\\PC*") {
        let test_db = test_db!();
        let service = ClientValidationService::new(test_db.db());

        let client_request = CreateClientRequest {
            name: "Valid Client Name".to_string(),
            email: Some("valid@example.com".to_string()),
            phone: Some("555-1234".to_string()),
            address: Some(address.clone()),
            company: None,
            notes: None,
            is_active: true,
        };

        let result = service.validate_create_client_request(&client_request).unwrap();

        // Address is optional, so any address should be valid (unless too long)
        if address.len() > 1000 {
            prop_assert!(!result.is_valid);
            prop_assert!(result.errors.iter().any(|e| e.contains("Address too long")));
        } else {
            prop_assert!(result.is_valid);
        }
    }

    #[test]
    fn test_client_minimal_request_properties(
        name in "[a-zA-Z]{5,50}"
    ) {
        let test_db = test_db!();
        let service = ClientValidationService::new(test_db.db());

        let client_request = CreateClientRequest {
            name: name.clone(),
            email: None,
            phone: None,
            address: None,
            company: None,
            notes: None,
            is_active: true,
        };

        let result = service.validate_create_client_request(&client_request).unwrap();

        // Minimal valid request should always pass
        prop_assert!(result.is_valid);
        prop_assert_eq!(result.name, name);
    }

    #[test]
    fn test_client_request_roundtrip_properties(
        name in "[a-zA-Z0-9 ]{1,50}",
        company in prop_oneof![
            Just(None),
            Just(Some("Valid Company".to_string())),
        ],
        notes in prop_oneof![
            Just(None),
            Just(Some("Valid notes".to_string())),
        ],
        is_active in prop_oneof![true, false]
    ) {
        let test_db = test_db!();
        let service = ClientValidationService::new(test_db.db());

        let client_request = CreateClientRequest {
            name: name.clone(),
            email: Some("valid@example.com".to_string()),
            phone: Some("555-1234".to_string()),
            address: Some("Valid Address".to_string()),
            company: company.clone(),
            notes: notes.clone(),
            is_active,
        };

        let result = service.validate_create_client_request(&client_request).unwrap();

        // Valid request should pass validation
        prop_assert!(result.is_valid);

        // Request properties should be preserved
        prop_assert_eq!(result.name, name);
        prop_assert_eq!(result.company, company);
        prop_assert_eq!(result.notes, notes);
        prop_assert_eq!(result.is_active, is_active);
    }

    #[test]
    fn test_client_validation_error_accumulation_properties(
        name_errors in prop_oneof!["", "A".repeat(256)],
        email_errors in prop_oneof!["invalid-email", "no-at-symbol.com", "@missing-local.com"],
        phone_errors in prop_oneof!["invalid", "ABC", "123".to_string()]
    ) {
        let test_db = test_db!();
        let service = ClientValidationService::new(test_db.db());

        let client_request = CreateClientRequest {
            name: name_errors.clone(),
            email: Some(email_errors.clone()),
            phone: Some(phone_errors.clone()),
            address: Some("Valid Address".to_string()),
            company: None,
            notes: None,
            is_active: true,
        };

        let result = service.validate_create_client_request(&client_request).unwrap();

        // Should have multiple validation errors
        prop_assert!(!result.is_valid);
        prop_assert!(result.errors.len() >= 2);

        // Should have specific errors for each invalid field
        if name_errors.is_empty() {
            prop_assert!(result.errors.iter().any(|e| e.contains("Name is required")));
        } else if name_errors.len() > 255 {
            prop_assert!(result.errors.iter().any(|e| e.contains("Name too long")));
        }

        if email_errors.contains("invalid-email") {
            prop_assert!(result.errors.iter().any(|e| e.contains("Invalid email")));
        }

        if phone_errors.len() < 7 {
            prop_assert!(result.errors.iter().any(|e| e.contains("Invalid phone")));
        }
    }

    #[test]
    fn test_client_email_uniqueness_properties(
        base_email in "[a-zA-Z0-9]{5,10}",
        duplicate_count in 1..5usize
    ) {
        let test_db = test_db!();
        let service = ClientValidationService::new(test_db.db());
        let client_service = crate::services::client::ClientService::new(test_db.db());

        // Create first client with unique email
        let email = format!("{}@example.com", base_email);

        let client1_request = CreateClientRequest {
            name: "Client One".to_string(),
            email: Some(email.clone()),
            phone: Some("555-1111".to_string()),
            address: Some("Address One".to_string()),
            company: None,
            notes: None,
            is_active: true,
        };

        // This should succeed
        let result1 = service.validate_create_client_request(&client1_request).unwrap();
        prop_assert!(result1.is_valid);

        // Create the client
        client_service.create_client_async(client1_request, "test_user").await.unwrap();

        // Try to create duplicate clients
        for i in 1..=duplicate_count {
            let duplicate_request = CreateClientRequest {
                name: format!("Client {}", i + 1),
                email: Some(email.clone()),
                phone: Some(format!("555-{:04}", i + 1)),
                address: Some(format!("Address {}", i + 1)),
                company: None,
                notes: None,
                is_active: true,
            };

            let result = service.validate_create_client_request(&duplicate_request).unwrap();

            // All duplicates should fail validation
            prop_assert!(!result.is_valid);
            prop_assert!(result.errors.iter().any(|e| e.contains("Email already exists")));
        }
    }

    #[test]
    fn test_client_phone_format_properties(
        country_code in prop_oneof!["+1", "+44", "+33", ""],
        area_code in "[0-9]{3}",
        prefix in "[0-9]{3}",
        line_number in "[0-9]{4}"
    ) {
        let test_db = test_db!();
        let service = ClientValidationService::new(test_db.db());

        // Format phone numbers in various international formats
        let formats = vec![
            format!("{}{}-{}-{}", country_code, area_code, prefix, line_number),
            format!("{}({}) {}-{}", country_code, area_code, prefix, line_number),
            format!("{}{}{}{}", country_code, area_code, prefix, line_number),
            format!("{}({}){}-{}", country_code, area_code, prefix, line_number),
        ];

        for phone in formats {
            let client_request = CreateClientRequest {
                name: "Valid Client Name".to_string(),
                email: Some("valid@example.com".to_string()),
                phone: Some(phone.clone()),
                address: Some("Valid Address".to_string()),
                company: None,
                notes: None,
                is_active: true,
            };

            let result = service.validate_create_client_request(&client_request).unwrap();

            // Most well-formatted phone numbers should be valid
            if phone.len() <= 20 && phone.chars().all(|c| c.is_ascii_digit() || c == '+' || c == '-' || c == '(' || c == ')' || c == ' ') {
                prop_assert!(result.is_valid, "Phone number {} should be valid", phone);
            }
        }
    }
}
