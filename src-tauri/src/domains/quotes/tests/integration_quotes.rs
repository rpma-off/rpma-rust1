use crate::domains::quotes::QuotesFacade;

#[test]
fn integration_quotes_facade_smoke() {
    let facade = QuotesFacade::new();
    let clone = facade.clone();

    assert_eq!(format!("{:?}", facade), format!("{:?}", clone));
}
