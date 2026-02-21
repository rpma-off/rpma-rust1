#[test]
fn integration_settings_facade_type_is_exported() {
    let type_name = std::any::type_name::<crate::domains::settings::SettingsFacade>();
    assert!(type_name.contains("SettingsFacade"));
}
