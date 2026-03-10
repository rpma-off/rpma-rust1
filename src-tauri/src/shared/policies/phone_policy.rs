//! Phone number validation and normalization policy.

/// TODO: document
pub fn normalize_dialable_phone_number(phone_number: &str) -> Result<String, String> {
    if phone_number.is_empty() {
        return Err("Phone number cannot be empty".to_string());
    }

    if !phone_number.chars().any(|c| c.is_ascii_digit()) {
        return Err("Phone number must contain at least one digit".to_string());
    }

    let clean_number: String = phone_number
        .chars()
        .filter(|c| c.is_ascii_digit() || *c == '+' || *c == '(' || *c == ')' || *c == '-')
        .collect();

    Ok(clean_number)
}

#[cfg(test)]
mod tests {
    use super::normalize_dialable_phone_number;

    #[test]
    fn rejects_empty_phone() {
        let result = normalize_dialable_phone_number("");
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Phone number cannot be empty");
    }

    #[test]
    fn rejects_phone_without_digits() {
        let result = normalize_dialable_phone_number("++(--)");
        assert!(result.is_err());
        assert_eq!(
            result.unwrap_err(),
            "Phone number must contain at least one digit"
        );
    }

    #[test]
    fn normalizes_dialable_phone_number() {
        let result = normalize_dialable_phone_number(" +33 (0)6 12 34 56 78 ");
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "+33(0)612345678");
    }
}
