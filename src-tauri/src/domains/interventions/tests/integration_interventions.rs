use crate::domains::interventions::InterventionsFacade;

#[test]
fn integration_interventions_facade_constructs() {
    let facade = InterventionsFacade::new();
    let clone = facade.clone();

    assert_eq!(format!("{:?}", facade), format!("{:?}", clone));
}
