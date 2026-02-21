#[test]
fn permission_sync_facade_type_is_exported() {
    let type_name = std::any::type_name::<crate::domains::sync::SyncFacade>();
    assert!(type_name.contains("SyncFacade"));
}
