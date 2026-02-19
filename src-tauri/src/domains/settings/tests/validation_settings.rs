use crate::domains::settings::SettingsFacade;

#[test]
fn validation_settings_facade_constructs() {
    let facade = SettingsFacade::new();
    let clone = facade.clone();

    assert_eq!(format!("{:?}", facade), format!("{:?}", clone));
}
