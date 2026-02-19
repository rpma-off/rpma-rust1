use crate::domains::quotes::QuotesFacade;

#[test]
fn permission_quotes_facade_constructs() {
    let facade = QuotesFacade::new();
    let clone = facade.clone();

    assert_eq!(format!("{:?}", facade), format!("{:?}", clone));
}
