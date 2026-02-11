# High-Impact, Low-Risk Refactors

This document lists low-risk refactors that improve readability, reduce duplication, or improve testability without changing behavior. Each item is scoped to a small change set and aligns with the existing architecture (Frontend → IPC → Services → Repositories → SQLite).

## Prioritized Refactor List

| Priority | Refactor | Locations (examples) | Estimated Effort | Expected Benefit | Risk |
| --- | --- | --- | --- | --- | --- |
| 1 | Extract shared `validate_sort_column` helper | `src-tauri/src/repositories/*_repository.rs` | 1–2h | Removes ~8 duplicate helpers, consistent validation | Very low |
| 2 | Consolidate `setup_test_db`/test fixtures | `src-tauri/src/repositories/*`, `src-tauri/src/tests/*` | 2–3h | Less duplication, easier test setup | Very low |
| 3 | Reduce redundant clones in services | `src-tauri/src/services/task_creation.rs`, `task_update.rs`, `report_jobs.rs` | 2–3h | Clearer ownership, fewer allocations | Low |
| 4 | Standardize error builder usage | `src-tauri/src/commands/error_utils.rs`, command handlers | 1–2h | Consistent error messages, smaller handlers | Very low |
| 5 | Extract cache key helpers | Repositories using `cache_key_builder.query(...)` | 1h | Readability, fewer repeated literals | Very low |
| 6 | Consolidate date validation | `src-tauri/src/services/reports/validation.rs`, `src-tauri/src/commands/reports/generation/validation.rs` | 30–60m | Single source of truth | Very low |
| 7 | Extract `RepoResult` mapping helpers | `src-tauri/src/repositories/*` | 30–60m | Less repetitive `map_err` boilerplate | Very low |

## Example Diffs (Illustrative, No Behavior Change)

### 1) Shared `validate_sort_column`

_Problem_: 8 repositories define nearly identical validation helpers.

```diff
--- a/src-tauri/src/repositories/message_repository.rs
+++ b/src-tauri/src/repositories/message_repository.rs
@@
-    fn validate_sort_column(sort_by: &str) -> Result<String, RepoError> {
-        let allowed_columns = [
-            "created_at",
-            "updated_at",
-            "message_type",
-            "status",
-            "priority",
-            "scheduled_at",
-            "sent_at",
-            "read_at",
-            "subject",
-        ];
-        allowed_columns
-            .iter()
-            .find(|&&col| col == sort_by)
-            .map(|s| s.to_string())
-            .ok_or_else(|| RepoError::Validation(format!("Invalid sort column: {}", sort_by)))
-    }
+    fn validate_sort_column(sort_by: &str) -> Result<String, RepoError> {
+        crate::repositories::base::validate_sort_column(
+            sort_by,
+            &[
+                "created_at",
+                "updated_at",
+                "message_type",
+                "status",
+                "priority",
+                "scheduled_at",
+                "sent_at",
+                "read_at",
+                "subject",
+            ],
+        )
+    }
```

### 2) Test Fixture Consolidation

_Problem_: multiple test modules include their own `setup_test_db`.

```diff
--- a/src-tauri/src/tests/integration/task_lifecycle_tests.rs
+++ b/src-tauri/src/tests/integration/task_lifecycle_tests.rs
@@
-use crate::tests::integration::task_lifecycle_tests::setup_test_db;
+use crate::tests::support::TestDb;
@@
-fn setup_test_db() -> Database {
-    let db = Database::new_in_memory().expect("test db");
-    db.initialize().expect("init schema");
-    db
-}
+// TestDb::new() encapsulates the shared setup.
```

### 3) Reduce Redundant Clones in Services

_Problem_: services clone request objects before spawning tasks.

```diff
--- a/src-tauri/src/services/task_creation.rs
+++ b/src-tauri/src/services/task_creation.rs
@@
-        let req = req.clone();
-        let db = self.db.clone();
-        tokio::spawn(async move {
-            TaskCreationService::persist_task(db, req).await
-        });
+        let db = self.db.clone();
+        tokio::spawn({
+            let req = req;
+            async move { TaskCreationService::persist_task(db, req).await }
+        });
```

### 4) Standardize Error Helpers

_Problem_: command handlers build similar error strings.

```diff
--- a/src-tauri/src/commands/tasks.rs
+++ b/src-tauri/src/commands/tasks.rs
@@
-    service
-        .create_task(request)
-        .await
-        .map_err(|e| AppError::Database(format!("create_task failed: {}", e)))
+    service
+        .create_task(request)
+        .await
+        .map_err(|e| crate::commands::error_utils::db_op_error("create_task", e))
```

### 5) Cache Key Helper

_Problem_: repeated literal arrays passed to `cache_key_builder.query`.

```diff
--- a/src-tauri/src/repositories/message_repository.rs
+++ b/src-tauri/src/repositories/message_repository.rs
@@
-        let cache_key = self
-            .cache_key_builder
-            .query(&["type", &message_type.to_string()]);
+        let cache_key = self.cache_key_builder.query_type(&message_type);
```

## Notes

- These refactors are intentionally scoped to minimize risk and avoid behavior changes.
- Each item should include tests or updated fixtures when implemented.
- Start with Priority 1 and 2 for maximum payoff and minimal risk.
