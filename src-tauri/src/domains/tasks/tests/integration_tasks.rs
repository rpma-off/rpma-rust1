#[test]
fn integration_tasks_facade_type_is_exported() {
    let type_name = std::any::type_name::<crate::domains::tasks::TasksFacade>();
    assert!(type_name.contains("TasksFacade"));
}
