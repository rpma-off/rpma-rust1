//! Stream transfer domain policies.

/// Estimate total chunks from the currently received chunk metadata.
/// If the incoming chunk is marked as last, total is exact; otherwise the value is a lower bound.
pub fn estimate_total_chunks(chunk_index: usize, is_last: bool) -> usize {
    chunk_index + if is_last { 1 } else { 2 }
}

#[cfg(test)]
mod tests {
    use super::estimate_total_chunks;

    #[test]
    fn estimates_exact_total_when_last_chunk() {
        assert_eq!(estimate_total_chunks(3, true), 4);
    }

    #[test]
    fn estimates_lower_bound_when_not_last_chunk() {
        assert_eq!(estimate_total_chunks(3, false), 5);
    }
}
