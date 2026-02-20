use crate::domains::audit::AuditFacade;

#[test]
fn validation_audit_facade_smoke() {
    let facade = AuditFacade::new();
    let clone = facade.clone();

    assert_eq!(format!("{:?}", facade), format!("{:?}", clone));
}
