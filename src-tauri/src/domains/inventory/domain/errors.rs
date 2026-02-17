#[derive(Debug, thiserror::Error)]
pub(crate) enum InventoryDomainError {
    #[error("Stock cannot go negative")]
    NegativeStock,
}
