#[test]
fn validation_interventions_facade_type_is_exported() {
    let type_name = std::any::type_name::<crate::domains::interventions::InterventionsFacade>();
    assert!(type_name.contains("InterventionsFacade"));
}
