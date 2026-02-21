#[test]
fn permission_audit_facade_type_is_exported() {
    let type_name = std::any::type_name::<crate::domains::audit::AuditFacade>();
    assert!(type_name.contains("AuditFacade"));
}
