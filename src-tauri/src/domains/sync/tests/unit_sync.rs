use crate::domains::sync::SyncFacade;

#[test]
fn unit_sync_facade_smoke() {
    let facade = SyncFacade::new();
    let clone = facade.clone();

    assert_eq!(format!("{:?}", facade), format!("{:?}", clone));
}
