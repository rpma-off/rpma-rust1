# Repository SQL Audit (src-tauri/src/repositories)

## Scope
- Reviewed the repository layer in `src-tauri/src/repositories` for SQL safety, performance risks, and model/error mapping consistency.
- Focused on query composition, filters, ordering, and potential N+1 patterns.

## SQL Safety (Parameterized Queries)
- All repository queries use `rusqlite` parameters for user-provided values.
- Dynamic SQL appears in count/search methods (for example `format!("SELECT COUNT(*) FROM clients {}", where_clause)`), but `where_clause` is built from fixed column names and parameter placeholders.
- **Actionable convention:** keep dynamic SQL limited to trusted, internal builders and **never** concatenate raw user input into SQL fragments. Continue using `validate_sort_column` and `QueryBuilder` ordering to avoid order-by injection.

## Top Slow-Query Candidates + Suggested Indexes
The following queries are most likely to grow slower with data volume. Suggested indexes are listed for future migrations.

### Clients
- **Queries:** `ClientRepository::search`, `ClientRepository::count`, `ClientRepository::count_all`.
- **Patterns:** `LIKE` searches on `name`, `email`, `phone`, `company_name`, and `tags` with `ORDER BY created_at`.
- **Suggested indexes:**
  - `clients(deleted_at, created_at)` for the default ordering.
  - `clients(customer_type)` for type filters.
  - `clients(address_city)` for city filters.
  - `clients(email)`, `clients(phone)` for exact matches.
  - Consider **FTS5** for `%term%` searches across `name`, `email`, `phone`, `company_name`, `tags` (standard b-tree indexes are not used with leading wildcards).

### Tasks
- **Queries:** `TaskRepository::find_with_query`.
- **Patterns:** `LIKE` searches on `title`, `task_number`, `customer_name` with filters on `status`, `technician_id`, `client_id` and dynamic ordering.
- **Suggested indexes:**
  - `tasks(status)`, `tasks(technician_id)`, `tasks(client_id)` for equality filters.
  - `tasks(created_at)` for common ordering.
  - `tasks(task_number)` for direct lookups.
  - Consider **FTS5** for `%term%` search across `title` and `customer_name`.

### Audit Events
- **Queries:** `AuditRepository::find_by_user`, `find_by_resource`, `find_by_event_type`, `search`.
- **Patterns:** filters on `user_id`, `resource_type`, `resource_id`, `event_type`, ordered by `timestamp`.
- **Suggested indexes:**
  - `audit_events(user_id, timestamp)`
  - `audit_events(resource_type, resource_id, timestamp)`
  - `audit_events(event_type, timestamp)`

### Task History
- **Queries:** `TaskHistoryRepository` filters by `task_id`, `new_status`, `changed_by`, ordered by `changed_at`.
- **Suggested indexes:**
  - `task_history(task_id, changed_at)`
  - `task_history(new_status, changed_at)`
  - `task_history(changed_by, changed_at)`

### Photos
- **Queries:** `PhotoRepository` filters by `intervention_id`, `step_id`, `photo_category`, `photo_type`, `synced`, `is_approved`, ordered by `captured_at`.
- **Suggested indexes:**
  - `photos(intervention_id, captured_at)`
  - `photos(step_id, captured_at)`
  - `photos(photo_category, captured_at)`
  - `photos(photo_type, captured_at)`
  - `photos(synced, captured_at)`
  - `photos(is_approved, is_required, captured_at)`

### Interventions
- **Queries:** `InterventionRepository::find_by_task_id`, `find_active_for_task`, `search`.
- **Patterns:** filter by `task_id` and `status`, order by `created_at`.
- **Suggested indexes:**
  - `interventions(task_id, created_at)`
  - `interventions(status, created_at)`

### Notifications & Messages
- **Queries:** `NotificationTemplateRepository` and `MessageRepository` filter by `message_type`, `channel`, `category`, `created_by`, `status`, `sender_id`, `recipient_id` with ordering by `created_at`/`name`.
- **Suggested indexes:**
  - `message_templates(message_type, created_at)`
  - `message_templates(channel, created_at)`
  - `message_templates(category, name)`
  - `message_templates(created_by, created_at)`
  - `messages(message_type, created_at)`
  - `messages(status, created_at)`
  - `messages(sender_id, created_at)`
  - `messages(recipient_id, created_at)`
  - Consider **FTS5** for `%term%` searches on `subject`/`body`.

### Materials
- **Queries:** `MaterialRepository::search` with `LIKE` on `name`, `sku`, `description`.
- **Suggested indexes:**
  - `materials(material_type)`
  - `materials(sku)` for direct lookups.
  - Consider **FTS5** for `%term%` search on `name`/`description`.

## Where to Batch Queries
- **`Repository::find_by_ids` / `delete_by_ids` (base.rs)** currently loops per ID, producing N+1 queries. Prefer a single `WHERE id IN (...)` query or batched `IN` chunks.
- **`ClientRepository::update_statistics`** issues multiple correlated subqueries for each count. Consider a single aggregation query (or `LEFT JOIN` with `GROUP BY`) to compute totals in one pass.

## Recommended Repository Conventions
1. **Prefer explicit column lists** over `SELECT *` to avoid wide reads and accidental mapping drift.
2. **Keep SQL parameterized** — only compose SQL with internal helpers that inject placeholders (never raw user strings).
3. **Validate dynamic ordering** using `validate_sort_column` or `QueryBuilder` to avoid injection.
4. **Use consistent error mapping** (`RepoError::Database` with context) and avoid `eprintln!` for validation failures (use structured logging instead).
5. **Normalize cache keys** with stable, deterministic inputs (avoid `format!("{:?}", query)` when possible).
6. **Centralize pagination limits** and always include `deleted_at IS NULL` filters when applicable.
7. **Prefer batched fetches** (bulk queries + `IN (...)`) instead of per-row loops for ID collections.

