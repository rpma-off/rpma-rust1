use crate::db::FromSqlRow;
use crate::domains::users::domain::models::user::{User, UserRole};
use rusqlite::Row;

impl FromSqlRow for User {
    fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(User {
            id: row.get("id")?,
            email: row.get("email")?,
            username: row.get("username")?,
            password_hash: row.get("password_hash")?,
            full_name: row.get("full_name")?,
            role: row
                .get::<_, String>("role")?
                .parse::<UserRole>()
                .unwrap_or(UserRole::Viewer),
            phone: row.get("phone")?,
            is_active: row.get::<_, i32>("is_active")? != 0,
            last_login_at: row.get("last_login_at")?,
            login_count: row.get("login_count")?,
            preferences: row
                .get::<_, Option<String>>("preferences")?
                .and_then(|s| serde_json::from_str(&s).ok()),
            synced: row.get::<_, i32>("synced")? != 0,
            last_synced_at: row.get("last_synced_at")?,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
        })
    }
}
