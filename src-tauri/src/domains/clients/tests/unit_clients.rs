use crate::domains::clients::ClientsFacade;

#[test]
fn unit_clients_facade_smoke() {
    let facade = ClientsFacade::new();
    let clone = facade.clone();

    assert_eq!(format!("{:?}", facade), format!("{:?}", clone));
}
