use crate::domains::clients::ClientsFacade;

#[test]
fn integration_clients_facade_constructs() {
    let facade = ClientsFacade::new();
    let clone = facade.clone();

    assert_eq!(format!("{:?}", facade), format!("{:?}", clone));
}
