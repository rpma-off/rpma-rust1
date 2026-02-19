use crate::domains::audit::AuditFacade;

#[test]
fn unit_audit_facade_constructs() {
    let facade = AuditFacade::new();
    let clone = facade.clone();

    assert_eq!(format!("{:?}", facade), format!("{:?}", clone));
}
