use crate::domains::reports::ReportsFacade;

#[test]
fn permission_reports_facade_smoke() {
    let facade = ReportsFacade::new();
    let clone = facade.clone();

    assert_eq!(format!("{:?}", facade), format!("{:?}", clone));
}
