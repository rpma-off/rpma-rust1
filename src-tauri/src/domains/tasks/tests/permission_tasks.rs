use crate::domains::tasks::TasksFacade;

#[test]
fn permission_tasks_facade_constructs() {
    let facade = TasksFacade::new();
    let clone = facade.clone();

    assert_eq!(format!("{:?}", facade), format!("{:?}", clone));
}
