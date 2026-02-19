use crate::domains::documents::DocumentsFacade;

#[test]
fn unit_documents_facade_constructs() {
    let facade = DocumentsFacade::new();
    let clone = facade.clone();

    assert_eq!(format!("{:?}", facade), format!("{:?}", clone));
}
