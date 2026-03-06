//! Shared SQL column definitions for the `users` table.
//!
//! Centralises the SELECT column list so that every query stays in sync when
//! the schema evolves.

/// Standard SELECT column list for the `users` table.
pub(super) const USER_COLUMNS: &str = r#"
    id, email, username, password_hash, full_name, role, phone, is_active,
    last_login_at, login_count, preferences, synced, last_synced_at,
    created_at, updated_at, deleted_at
"#;
