use crate::domains::users::UsersFacade;

#[test]
fn validation_users_facade_constructs() {
    let facade = UsersFacade::new();
    let clone = facade.clone();

    assert_eq!(format!("{:?}", facade), format!("{:?}", clone));
}
