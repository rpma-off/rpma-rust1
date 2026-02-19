use crate::domains::sync::SyncFacade;

#[test]
fn validation_sync_facade_constructs() {
    let facade = SyncFacade::new();
    let clone = facade.clone();

    assert_eq!(format!("{:?}", facade), format!("{:?}", clone));
}
