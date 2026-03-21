# Schema Map

This document maps each persistent table to the bootstrap schema file or numbered migration that introduces it.

## Migration strategy

This repository does not include a `001_initial_schema.sql` file. Fresh databases are bootstrapped from `src-tauri/src/db/schema.sql`, and then numbered migrations in `src-tauri/migrations/` (starting from 002) are applied in order.

## Bootstrap schema assessment

- Bootstrap source: `src-tauri/src/db/schema.sql`
- `CREATE TABLE` statements: 31
- `CREATE INDEX` statements: 181
- `CREATE TRIGGER` statements: 8
- Logical groupings: core auth, workflow, clients & quotes, inventory, messaging, audit & cache, calendar/system

## Table origins

| Table | Introduced by | Current bootstrap source | Logical group |
| --- | --- | --- | --- |
| interventions | Pre-numbered bootstrap schema | `src-tauri/src/db/schema.sql` | Workflow |
| intervention_steps | Pre-numbered bootstrap schema | `src-tauri/src/db/schema.sql` | Workflow |
| photos | Pre-numbered bootstrap schema | `src-tauri/src/db/schema.sql` | Workflow |
| tasks | Pre-numbered bootstrap schema | `src-tauri/src/db/schema.sql` | Workflow |
| clients | Pre-numbered bootstrap schema | `src-tauri/src/db/schema.sql` | Clients & Quotes |
| sync_queue | Pre-numbered bootstrap schema | `src-tauri/src/db/schema.sql` | Workflow |
| users | Pre-numbered bootstrap schema | `src-tauri/src/db/schema.sql` | Core auth |
| audit_logs | Pre-numbered bootstrap schema | `src-tauri/src/db/schema.sql` | Audit |
| audit_events | Pre-numbered bootstrap schema | `src-tauri/src/db/schema.sql` | Audit |
| user_settings | Pre-numbered bootstrap schema | `src-tauri/src/db/schema.sql` | Core auth |
| calendar_events | Pre-numbered bootstrap schema | `src-tauri/src/db/schema.sql` | Calendar |
| schema_version | Pre-numbered bootstrap schema | `src-tauri/src/db/schema.sql` | System |
| user_consent | `007_add_user_consent.sql` | `src-tauri/src/db/schema.sql` | Core auth |
| materials | `012_add_material_tables.sql` | `src-tauri/src/db/schema.sql` | Inventory |
| material_consumption | `012_add_material_tables.sql` | `src-tauri/src/db/schema.sql` | Inventory |
| suppliers | `013_add_suppliers_table.sql` | `src-tauri/src/db/schema.sql` | Inventory |
| two_factor_backup_codes | `015_add_two_factor_auth.sql` | Added by migration only | Core auth |
| two_factor_attempts | `015_add_two_factor_auth.sql` | Added by migration only | Core auth |
| cache_metadata | `017_add_cache_metadata.sql` | `src-tauri/src/db/schema.sql` | Audit & Cache |
| cache_statistics | `017_add_cache_metadata.sql` | `src-tauri/src/db/schema.sql` | Audit & Cache |
| settings_audit_log | `018_add_settings_audit_log.sql` | `src-tauri/src/db/schema.sql` | Audit |
| task_history | `022_add_task_history_table.sql` | `src-tauri/src/db/schema.sql` | Workflow |
| message_templates | `023_add_messaging_tables.sql` | `src-tauri/src/db/schema.sql` | Messaging |
| messages | `023_add_messaging_tables.sql` | `src-tauri/src/db/schema.sql` | Messaging |
| notification_preferences | `023_add_messaging_tables.sql` | `src-tauri/src/db/schema.sql` | Messaging |
| material_categories | `024_add_inventory_management.sql` | `src-tauri/src/db/schema.sql` | Inventory |
| inventory_transactions | `024_add_inventory_management.sql` | `src-tauri/src/db/schema.sql` | Inventory |
| analytics_kpis | `025_add_analytics_dashboard.sql` | Added by migration only | Analytics |
| analytics_metrics | `025_add_analytics_dashboard.sql` | Added by migration only | Analytics |
| analytics_dashboards | `025_add_analytics_dashboard.sql` | Added by migration only | Analytics |
| quotes | `037_quotes.sql` | `src-tauri/src/db/schema.sql` | Clients & Quotes |
| quote_items | `037_quotes.sql` | `src-tauri/src/db/schema.sql` | Clients & Quotes |
| sessions | `041_replace_user_sessions_with_sessions.sql` | `src-tauri/src/db/schema.sql` | Core auth |
| notifications | `044_add_notifications_table.sql` | `src-tauri/src/db/schema.sql` | Messaging |
| quote_attachments | `047_add_quotes_missing_columns.sql` | `src-tauri/src/db/schema.sql` | Clients & Quotes |
| intervention_reports | `052_add_intervention_reports_table.sql` | Added by migration only | Workflow |
| app_settings | `054_app_settings_table.sql` | Added by migration only | System |
| organizations | `055_organizations_table.sql` | Added by migration only | System |
| organization_settings | `056_organization_settings_table.sql` | Added by migration only | System |
| login_attempts | `057_add_login_attempts_table.sql` | `src-tauri/src/db/schema.sql` | Core auth |

## How to use this map

- If a table is marked **Pre-numbered bootstrap schema**, treat `src-tauri/src/db/schema.sql` as the effective historical bootstrap source in this repository.
- If a table is marked **Added by migration only**, it was introduced after the current bootstrap snapshot baseline and is still created exclusively by its numbered migration on fresh-database startup.
- Migration-only tables should be folded into `src-tauri/src/db/schema.sql` only when the team intentionally refreshes the bootstrap snapshot to include newer migrations.
- For any schema change, follow ADR-010: create a new numbered migration first, then update the bootstrap snapshot only when needed to keep fresh-database initialization aligned with the latest applied migrations.
