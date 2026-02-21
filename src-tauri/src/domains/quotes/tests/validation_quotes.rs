#[test]
fn validation_quotes_facade_type_is_exported() {
    let type_name = std::any::type_name::<crate::domains::quotes::QuotesFacade>();
    assert!(type_name.contains("QuotesFacade"));
}
