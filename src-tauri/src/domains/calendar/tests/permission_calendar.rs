use crate::domains::calendar::CalendarFacade;

#[test]
fn permission_calendar_facade_constructs() {
    let facade = CalendarFacade::new();
    let clone = facade.clone();

    assert_eq!(format!("{:?}", facade), format!("{:?}", clone));
}
