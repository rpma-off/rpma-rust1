use crate::domains::clients::ClientsFacade;

#[test]
fn validation_clients_facade_smoke() {
    let facade = ClientsFacade::new();
    let clone = facade.clone();

    assert_eq!(format!("{:?}", facade), format!("{:?}", clone));
}
