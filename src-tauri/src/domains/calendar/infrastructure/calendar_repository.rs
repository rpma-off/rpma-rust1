//! CalendarRepository — infrastructure-layer event queries for the calendar domain.
//!
//! Owns all SQL that operates on `calendar_events` within epoch-millisecond
//! time ranges.  The companion trait `CalendarEventQueries` lets callers
//! depend on the abstraction rather than the concrete struct.

// TODO: ADR Violation (ADR-012) - CalendarRepository uses ISO-8601 strings in the database
// (start_datetime, end_datetime) instead of i64 milliseconds.

use crate::db::Database;
use crate::domains::calendar::models::CalendarEvent;
use crate::shared::repositories::base::{RepoError, RepoResult};
use async_trait::async_trait;
use std::sync::Arc;

// ── SQL helpers ───────────────────────────────────────────────────────────────

/// Column list shared by every `SELECT … FROM calendar_events` query.
const EVENT_SELECT: &str = r#"
    SELECT
        id, title, description, start_datetime, end_datetime, all_day, timezone,
        event_type, category, task_id, client_id, technician_id, location, meeting_link,
        is_virtual, participants, is_recurring, recurrence_rule, parent_event_id,
        reminders, status, color, tags, notes, synced, last_synced_at,
        created_at, updated_at, created_by, updated_by, deleted_at, deleted_by
    FROM calendar_events
"#;

// ── Trait ─────────────────────────────────────────────────────────────────────

/// Query contract for calendar-event range lookups.
#[async_trait]
pub trait CalendarEventQueries: Send + Sync {
    /// Return all non-deleted events whose `start_datetime` falls at or after
    /// `from` **and** whose `end_datetime` falls at or before `to`, where both
    /// bounds are Unix epoch **milliseconds**.
    ///
    /// When `technician_id` is `Some`, only events assigned to that technician
    /// are included.
    async fn find_events_in_range(
        &self,
        from: i64,
        to: i64,
        technician_id: Option<&str>,
    ) -> RepoResult<Vec<CalendarEvent>>;
}

// ── Concrete struct ───────────────────────────────────────────────────────────

/// SQLite-backed implementation of [`CalendarEventQueries`].
pub struct CalendarRepository {
    db: Arc<Database>,
}

impl CalendarRepository {
    pub fn new(db: Arc<Database>) -> Self {
        Self { db }
    }
}

// ── CalendarEventQueries impl ─────────────────────────────────────────────────

#[async_trait]
impl CalendarEventQueries for CalendarRepository {
    async fn find_events_in_range(
        &self,
        from: i64,
        to: i64,
        technician_id: Option<&str>,
    ) -> RepoResult<Vec<CalendarEvent>> {
        // `unixepoch(start_datetime)` converts ISO-8601 strings stored in the
        // database to Unix seconds; multiplying by 1000 gives milliseconds so
        // the comparison is consistent with the `from`/`to` parameters.
        let mut sql = format!(
            "{} WHERE deleted_at IS NULL \
             AND unixepoch(start_datetime) * 1000 >= ? \
             AND unixepoch(end_datetime) * 1000 <= ?",
            EVENT_SELECT
        );

        let mut params_vec: Vec<rusqlite::types::Value> =
            vec![from.into(), to.into()];

        if let Some(tech_id) = technician_id {
            sql.push_str(" AND technician_id = ?");
            params_vec.push(tech_id.to_string().into());
        }

        sql.push_str(" ORDER BY start_datetime ASC");

        self.db
            .query_as(&sql, rusqlite::params_from_iter(params_vec.iter()))
            .map_err(|e| {
                RepoError::Database(format!("Failed to query events in range: {}", e))
            })
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::Database;
    use std::sync::Arc;

    async fn setup_db() -> Arc<Database> {
        Arc::new(
            Database::new_in_memory()
                .await
                .expect("in-memory database"),
        )
    }

    fn insert_event(db: &Database, id: &str, start: &str, end: &str, tech_id: Option<&str>) {
        let now = chrono::Utc::now().timestamp_millis();

        // Insert user first so the technician_id FK constraint is satisfied.
        if let Some(t) = tech_id {
            db.execute(
                r#"INSERT OR IGNORE INTO users
                   (id, email, username, password_hash, full_name, role, is_active, created_at, updated_at)
                   VALUES (?1, ?2, ?1, 'hash', ?1, 'technician', 1, ?3, ?3)"#,
                rusqlite::params![t, format!("{}@test.com", t), now],
            )
            .expect("insert user for technician");
        }

        db.execute(
            r#"INSERT INTO calendar_events
               (id, title, start_datetime, end_datetime, all_day, timezone,
                event_type, participants, is_recurring, reminders, status, tags,
                synced, created_at, updated_at)
               VALUES (?1, ?2, ?3, ?4, 0, 'UTC',
                       'meeting', '[]', 0, '[]', 'confirmed', '[]',
                       0, ?5, ?5)"#,
            rusqlite::params![id, format!("Event {}", id), start, end, now],
        )
        .expect("insert event");

        if let Some(t) = tech_id {
            db.execute(
                "UPDATE calendar_events SET technician_id = ?1 WHERE id = ?2",
                rusqlite::params![t, id],
            )
            .expect("set technician");
        }
    }

    fn ms(iso: &str) -> i64 {
        // Parse as NaiveDateTime then convert to epoch ms.
        let formats = [
            "%Y-%m-%dT%H:%M:%S",
            "%Y-%m-%dT%H:%M:%SZ",
            "%Y-%m-%d %H:%M:%S",
        ];
        for fmt in &formats {
            if let Ok(ndt) = chrono::NaiveDateTime::parse_from_str(iso, fmt) {
                return ndt.and_utc().timestamp_millis();
            }
        }
        panic!("Cannot parse: {}", iso);
    }

    #[tokio::test]
    async fn test_find_events_in_range_returns_matching_events() {
        let db = setup_db().await;
        insert_event(
            &db,
            "evt-1",
            "2025-06-15T09:00:00",
            "2025-06-15T10:00:00",
            None,
        );
        insert_event(
            &db,
            "evt-2",
            "2025-06-16T09:00:00",
            "2025-06-16T10:00:00",
            None,
        );

        let repo = CalendarRepository::new(db);
        let results = repo
            .find_events_in_range(
                ms("2025-06-15T00:00:00"),
                ms("2025-06-15T23:59:59"),
                None,
            )
            .await
            .expect("find_events_in_range");

        assert_eq!(results.len(), 1);
        assert_eq!(results[0].id, "evt-1");
    }

    #[tokio::test]
    async fn test_find_events_in_range_filters_by_technician() {
        let db = setup_db().await;
        insert_event(
            &db,
            "evt-tech1",
            "2025-06-15T09:00:00",
            "2025-06-15T10:00:00",
            Some("tech-1"),
        );
        insert_event(
            &db,
            "evt-tech2",
            "2025-06-15T11:00:00",
            "2025-06-15T12:00:00",
            Some("tech-2"),
        );

        let repo = CalendarRepository::new(db);
        let results = repo
            .find_events_in_range(
                ms("2025-06-15T00:00:00"),
                ms("2025-06-15T23:59:59"),
                Some("tech-1"),
            )
            .await
            .expect("find_events_in_range");

        assert_eq!(results.len(), 1);
        assert_eq!(results[0].id, "evt-tech1");
    }

    #[tokio::test]
    async fn test_find_events_in_range_excludes_deleted_events() {
        let db = setup_db().await;
        insert_event(
            &db,
            "evt-del",
            "2025-06-15T09:00:00",
            "2025-06-15T10:00:00",
            None,
        );
        let now = chrono::Utc::now().timestamp_millis();
        db.execute(
            "UPDATE calendar_events SET deleted_at = ?1 WHERE id = 'evt-del'",
            rusqlite::params![now],
        )
        .expect("soft-delete event");

        let repo = CalendarRepository::new(db);
        let results = repo
            .find_events_in_range(
                ms("2025-06-15T00:00:00"),
                ms("2025-06-15T23:59:59"),
                None,
            )
            .await
            .expect("find_events_in_range");

        assert!(results.is_empty(), "Deleted events must not appear");
    }

    #[tokio::test]
    async fn test_find_events_in_range_excludes_events_outside_range() {
        let db = setup_db().await;
        insert_event(
            &db,
            "evt-before",
            "2025-06-14T09:00:00",
            "2025-06-14T10:00:00",
            None,
        );
        insert_event(
            &db,
            "evt-after",
            "2025-06-16T09:00:00",
            "2025-06-16T10:00:00",
            None,
        );

        let repo = CalendarRepository::new(db);
        let results = repo
            .find_events_in_range(
                ms("2025-06-15T00:00:00"),
                ms("2025-06-15T23:59:59"),
                None,
            )
            .await
            .expect("find_events_in_range");

        assert!(results.is_empty(), "Events outside the range must not appear");
    }

    #[tokio::test]
    async fn test_find_events_in_range_returns_results_ordered_by_start_datetime() {
        let db = setup_db().await;
        insert_event(
            &db,
            "evt-b",
            "2025-06-15T14:00:00",
            "2025-06-15T15:00:00",
            None,
        );
        insert_event(
            &db,
            "evt-a",
            "2025-06-15T09:00:00",
            "2025-06-15T10:00:00",
            None,
        );

        let repo = CalendarRepository::new(db);
        let results = repo
            .find_events_in_range(
                ms("2025-06-15T00:00:00"),
                ms("2025-06-15T23:59:59"),
                None,
            )
            .await
            .expect("find_events_in_range");

        assert_eq!(results.len(), 2);
        assert_eq!(results[0].id, "evt-a", "Earlier event should come first");
        assert_eq!(results[1].id, "evt-b");
    }
}
