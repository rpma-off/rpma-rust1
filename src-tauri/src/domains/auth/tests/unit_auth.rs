use crate::domains::auth::AuthFacade;

#[test]
fn unit_auth_facade_constructs() {
    let facade = AuthFacade::new();
    let clone = facade.clone();

    assert_eq!(format!("{:?}", facade), format!("{:?}", clone));
}
