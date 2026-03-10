pub fn generate_uuid_string() -> String {
    uuid::Uuid::new_v4().to_string()
}

#[cfg(test)]
mod tests {
    use super::generate_uuid_string;

    #[test]
    fn generates_unique_uuid_strings() {
        let first = generate_uuid_string();
        let second = generate_uuid_string();

        assert_ne!(first, second);
        assert!(uuid::Uuid::parse_str(&first).is_ok());
        assert!(uuid::Uuid::parse_str(&second).is_ok());
    }
}
