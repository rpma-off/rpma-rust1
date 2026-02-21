#[test]
fn integration_clients_facade_type_is_exported() {
    let type_name = std::any::type_name::<crate::domains::clients::ClientsFacade>();
    assert!(type_name.contains("ClientsFacade"));
}
