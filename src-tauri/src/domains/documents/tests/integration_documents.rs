use crate::domains::documents::DocumentsFacade;

#[test]
fn integration_documents_facade_smoke() {
    let facade = DocumentsFacade::new();
    let clone = facade.clone();

    assert_eq!(format!("{:?}", facade), format!("{:?}", clone));
}
