use crate::domains::tasks::TasksFacade;

#[test]
fn unit_tasks_facade_smoke() {
    let facade = TasksFacade::new();
    let clone = facade.clone();

    assert_eq!(format!("{:?}", facade), format!("{:?}", clone));
}
