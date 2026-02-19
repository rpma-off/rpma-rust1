use crate::domains::reports::ReportsFacade;

#[test]
fn unit_reports_facade_constructs() {
    let facade = ReportsFacade::new();
    let clone = facade.clone();

    assert_eq!(format!("{:?}", facade), format!("{:?}", clone));
}
