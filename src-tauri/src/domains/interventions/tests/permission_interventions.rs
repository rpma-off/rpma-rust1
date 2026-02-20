use crate::domains::interventions::InterventionsFacade;

#[test]
fn permission_interventions_facade_smoke() {
    let facade = InterventionsFacade::new();
    let clone = facade.clone();

    assert_eq!(format!("{:?}", facade), format!("{:?}", clone));
}
