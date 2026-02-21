#[test]
fn permission_calendar_facade_type_is_exported() {
    let type_name = std::any::type_name::<crate::domains::calendar::CalendarFacade>();
    assert!(type_name.contains("CalendarFacade"));
}
