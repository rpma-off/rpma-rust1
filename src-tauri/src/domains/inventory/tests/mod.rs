use crate::domains::inventory::domain::material::ensure_non_negative_stock;

#[test]
fn stock_cannot_go_negative() {
    assert!(ensure_non_negative_stock(1.0, -2.0).is_err());
}

#[test]
fn update_stock_validates_invariants() {
    assert!(ensure_non_negative_stock(10.0, -3.0).is_ok());
}
