#[test]
fn permission_reports_facade_type_is_exported() {
    let type_name = std::any::type_name::<crate::domains::reports::ReportsFacade>();
    assert!(type_name.contains("ReportsFacade"));
}
