use crate::domains::settings::SettingsFacade;

#[test]
fn permission_settings_facade_smoke() {
    let facade = SettingsFacade::new();
    let clone = facade.clone();

    assert_eq!(format!("{:?}", facade), format!("{:?}", clone));
}
