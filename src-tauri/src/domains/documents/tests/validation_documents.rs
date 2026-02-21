#[test]
fn validation_documents_facade_type_is_exported() {
    let type_name = std::any::type_name::<crate::domains::documents::DocumentsFacade>();
    assert!(type_name.contains("DocumentsFacade"));
}
