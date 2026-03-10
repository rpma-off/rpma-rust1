pub fn in_clause_placeholders<T>(values: &[T]) -> String {
    std::iter::repeat("?")
        .take(values.len())
        .collect::<Vec<_>>()
        .join(", ")
}

#[cfg(test)]
mod tests {
    use super::in_clause_placeholders;

    #[test]
    fn returns_empty_string_for_empty_values() {
        let values: [i32; 0] = [];
        assert_eq!(in_clause_placeholders(&values), "");
    }

    #[test]
    fn returns_expected_placeholder_list() {
        assert_eq!(in_clause_placeholders(&[1]), "?");
        assert_eq!(in_clause_placeholders(&[1, 2, 3]), "?, ?, ?");
    }
}
