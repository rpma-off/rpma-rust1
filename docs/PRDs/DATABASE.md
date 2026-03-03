# DATABASE.md

## RPMA v2 - Database Documentation

---

## 1. Database Overview

| Property | Value |
|----------|-------|
| **Database Engine** | SQLite |
| **Mode** | WAL (Write-Ahead Logging) |
| **Location** | Local file (desktop app) |
| **Schema Management** | Numbered migrations in `src-tauri/migrations/` |
| **ORM** | rusqlite with r2d2 connection pooling |
| **Current Migration Count** | 47 migrations (002-047) |

---

## 2. Database Schema

### 2.1 Core Tables

#### Users Table

```sql
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    username TEXT,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'supervisor', 'technician', 'viewer')),
    first_name TEXT,
    last_name TEXT,
    avatar_url TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER,
    synced INTEGER NOT NULL DEFAULT 0,
    last_synced_at INTEGER,
    two_factor_enabled INTEGER DEFAULT 0,
    two_factor_secret TEXT,
    consent_given INTEGER DEFAULT 0,
    consent_timestamp INTEGER
);
```

**Indexes:**
- `idx_users_email` on `email`
- `idx_users_role` on `role`

#### Sessions Table

```sql
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    token TEXT NOT NULL UNIQUE,
    ip_address TEXT,
    user_agent TEXT,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    last_activity_at INTEGER
);
```

**Indexes:**
- `idx_sessions_token` on `token`
- `idx_sessions_user_id` on `user_id`
- `idx_sessions_expires_at` on `expires_at`

#### Clients Table

```sql
CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    customer_type TEXT DEFAULT 'individual' CHECK(customer_type IN ('individual', 'business')),
    address_street TEXT,
    address_city TEXT,
    address_state TEXT,
    address_zip TEXT,
    address_country TEXT,
    tax_id TEXT,
    company_name TEXT,
    contact_person TEXT,
    notes TEXT,
    tags TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    created_by TEXT,
    deleted_at INTEGER,
    synced INTEGER DEFAULT 0,
    last_synced_at INTEGER
);
```

**Indexes:**
- `idx_clients_name` on `name`
- `idx_clients_email` on `email`
- `idx_clients_customer_type` on `customer_type`

#### Tasks Table

```sql
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    task_number TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'blocked', 'cancelled')),
    priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
    assigned_to TEXT REFERENCES users(id),
    technician_id TEXT REFERENCES users(id),
    client_id TEXT REFERENCES clients(id),
    vehicle_plate TEXT,
    vehicle_make TEXT,
    vehicle_model TEXT,
    vehicle_year TEXT,
    vehicle_vin TEXT,
    scheduled_date TEXT,
    start_time TEXT,
    end_time TEXT,
    estimated_duration INTEGER,
    actual_duration INTEGER,
    location TEXT,
    created_by TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER,
    synced INTEGER DEFAULT 0,
    last_synced_at INTEGER
);
```

**Indexes:**
- `idx_tasks_status` on `status`
- `idx_tasks_assigned_to` on `assigned_to`
- `idx_tasks_client_id` on `client_id`
- `idx_tasks_scheduled_date` on `scheduled_date`
- `idx_tasks_technician_id` on `technician_id`

#### Interventions Table

```sql
CREATE TABLE IF NOT EXISTS interventions (
    id TEXT PRIMARY KEY,
    task_id TEXT REFERENCES tasks(id),
    task_number TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed', 'cancelled')),
    current_step TEXT NOT NULL DEFAULT 'inspection' CHECK(current_step IN ('inspection', 'preparation', 'installation', 'finalization')),
    vehicle_condition TEXT,
    notes TEXT,
    started_at INTEGER,
    completed_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER,
    synced INTEGER DEFAULT 0,
    last_synced_at INTEGER
);
```

**Indexes:**
- `idx_interventions_task_id` on `task_id`
- `idx_interventions_status` on `status`
- `idx_interventions_current_step` on `current_step`

#### Intervention Steps Table

```sql
CREATE TABLE IF NOT EXISTS intervention_steps (
    id TEXT PRIMARY KEY,
    intervention_id TEXT NOT NULL REFERENCES interventions(id),
    step TEXT NOT NULL CHECK(step IN ('inspection', 'preparation', 'installation', 'finalization')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'skipped')),
    started_at INTEGER,
    completed_at INTEGER,
    technician_id TEXT REFERENCES users(id),
    notes TEXT,
    vehicle_area TEXT,
    film_type TEXT,
    film_brand TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);
```

### 2.2 Inventory Tables

#### Materials Table

```sql
CREATE TABLE IF NOT EXISTS materials (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sku TEXT NOT NULL UNIQUE,
    description TEXT,
    category_id TEXT,
    supplier_id TEXT,
    quantity INTEGER NOT NULL DEFAULT 0,
    min_quantity INTEGER DEFAULT 0,
    unit TEXT,
    unit_price INTEGER DEFAULT 0,
    expiration_date TEXT,
    location TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER,
    synced INTEGER DEFAULT 0,
    last_synced_at INTEGER
);
```

#### Material Categories Table

```sql
CREATE TABLE IF NOT EXISTS material_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);
```

#### Suppliers Table

```sql
CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    contact_person TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);
```

#### Inventory Transactions Table

```sql
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id TEXT PRIMARY KEY,
    material_id TEXT NOT NULL REFERENCES materials(id),
    transaction_type TEXT NOT NULL CHECK(transaction_type IN ('purchase', 'consumption', 'adjustment', 'transfer', 'waste')),
    quantity INTEGER NOT NULL,
    previous_quantity INTEGER,
    new_quantity INTEGER,
    reference_type TEXT,
    reference_id TEXT,
    notes TEXT,
    created_at INTEGER NOT NULL,
    created_by TEXT
);
```

**Indexes:**
- `idx_transactions_material_id` on `material_id`
- `idx_transactions_reference` on `reference_type, reference_id`

### 2.3 Quote Tables

#### Quotes Table

```sql
CREATE TABLE IF NOT EXISTS quotes (
    id TEXT PRIMARY KEY,
    quote_number TEXT NOT NULL UNIQUE,
    client_id TEXT NOT NULL REFERENCES clients(id),
    task_id TEXT REFERENCES tasks(id),
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
    valid_until INTEGER,
    notes TEXT,
    terms TEXT,
    subtotal INTEGER NOT NULL DEFAULT 0,
    tax_total INTEGER NOT NULL DEFAULT 0,
    total INTEGER NOT NULL DEFAULT 0,
    discount_percent REAL DEFAULT 0,
    vehicle_plate TEXT,
    vehicle_make TEXT,
    vehicle_model TEXT,
    vehicle_year TEXT,
    vehicle_vin TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    created_by TEXT,
    deleted_at INTEGER,
    synced INTEGER DEFAULT 0,
    last_synced_at INTEGER
);
```

#### Quote Items Table

```sql
CREATE TABLE IF NOT EXISTS quote_items (
    id TEXT PRIMARY KEY,
    quote_id TEXT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    kind TEXT NOT NULL DEFAULT 'service' CHECK(kind IN ('labor', 'material', 'service', 'discount')),
    label TEXT NOT NULL,
    description TEXT,
    qty REAL NOT NULL DEFAULT 1,
    unit_price INTEGER NOT NULL DEFAULT 0,
    tax_rate REAL,
    material_id TEXT REFERENCES materials(id),
    position INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);
```

#### Quote Attachments Table (Migration 033)

```sql
CREATE TABLE IF NOT EXISTS quote_attachments (
    id TEXT PRIMARY KEY,
    quote_id TEXT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    file_path TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    created_by TEXT
);
```

#### Quote Sharing Table (Migration 034)

```sql
CREATE TABLE IF NOT EXISTS quote_shares (
    id TEXT PRIMARY KEY,
    quote_id TEXT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    share_token TEXT NOT NULL UNIQUE,
    expires_at INTEGER,
    access_count INTEGER DEFAULT 0,
    max_accesses INTEGER,
    created_at INTEGER NOT NULL,
    created_by TEXT
);
```

### 2.4 Document/Photo Tables

```sql
CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    file_path TEXT NOT NULL,
    mime_type TEXT,
    metadata TEXT,
    created_at INTEGER NOT NULL,
    created_by TEXT,
    deleted_at INTEGER
);
```

### 2.5 Calendar & Scheduling Tables

#### Task Conflicts Table

```sql
CREATE TABLE IF NOT EXISTS task_conflicts (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id),
    conflicting_task_id TEXT NOT NULL REFERENCES tasks(id),
    conflict_type TEXT NOT NULL,
    detected_at INTEGER NOT NULL,
    resolved_at INTEGER
);
```

### 2.6 Audit & Security Tables

#### Audit Events Table

```sql
CREATE TABLE IF NOT EXISTS audit_events (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    resource_id TEXT,
    resource_type TEXT,
    description TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    result TEXT NOT NULL,
    previous_state TEXT,
    new_state TEXT,
    timestamp INTEGER NOT NULL,
    metadata TEXT,
    session_id TEXT,
    request_id TEXT,
    created_at INTEGER DEFAULT (unixepoch() * 1000)
);
```

**Indexes:**
- `idx_audit_events_user_id` on `user_id`
- `idx_audit_events_timestamp` on `timestamp`
- `idx_audit_events_resource` on `resource_type, resource_id`
- `idx_audit_events_event_type` on `event_type`
- `idx_audit_events_result` on `result`
- Composite: `idx_audit_events_user_timestamp` on `(user_id, timestamp DESC)`
- Composite: `idx_audit_events_resource_timestamp` on `(resource_type, resource_id, timestamp DESC)`

### 2.7 Messaging & Notifications Tables

#### Messages Table

```sql
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    sender_id TEXT NOT NULL REFERENCES users(id),
    recipient_id TEXT REFERENCES users(id),
    task_id TEXT REFERENCES tasks(id),
    subject TEXT,
    body TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL
);
```

#### Notifications Table

```sql
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    link TEXT,
    metadata TEXT,
    created_at INTEGER NOT NULL
);
```

### 2.8 Task History Table

```sql
CREATE TABLE IF NOT EXISTS task_history (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    action TEXT NOT NULL,
    field_changed TEXT,
    old_value TEXT,
    new_value TEXT,
    notes TEXT,
    created_at INTEGER NOT NULL
);
```

### 2.9 Settings & Cache Tables

#### App Settings Table

```sql
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    updated_by TEXT
);
```

#### Cache Metadata Table

```sql
CREATE TABLE IF NOT EXISTS cache_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    expires_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);
```

---

## 3. Relationships (ER Diagram)

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    users    │       │   clients   │       │    tasks    │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)    │       │ id (PK)    │       │ id (PK)    │
│ email      │       │ name       │       │ task_number │
│ role       │◄──────│ client_id  │──────►│ assigned_to │
│ password   │       │ customer_  │       │ technician_ │
│ ...        │       │ type       │       │ id          │
└──────┬──────┘       └──────┬──────┘       │ client_id   │
       │                    │               │ status      │
       │                    │               └──────┬──────┘
       │                    │                      │
       │                    │                      │
┌──────▼──────┐       ┌──────▼──────┐       ┌──────▼──────┐
│  sessions   │       │ interventions│      │  quotes    │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)    │       │ id (PK)    │       │ id (PK)    │
│ user_id    │       │ task_id(FK)│       │ client_id  │
│ token      │       │ current_   │       │ task_id    │
│ expires_at │       │ step       │       │ status     │
└─────────────┘       │ status     │       └─────────────┘
                      └─────────────┘
                             │
                      ┌──────▼──────┐
                      │intervention_│
                      │   steps     │
                      ├─────────────┤
                      │ id (PK)    │
                      │ step       │
                      │ status     │
                      │ technician_│
                      │ _id        │
                      └─────────────┘
```

---

## 4. Migrations

### 4.1 Migration History

| Migration | Description |
|-----------|--------------|
| 002 | Rename ppf_zone table |
| 003 | Add client statistics triggers |
| 004 | Add task_client index |
| 005 | Add task indexes |
| 006 | Add step location columns |
| 007 | Add user consent |
| 008 | Add workflow constraints |
| 009 | Add task_number to interventions |
| 010 | Fix task statuses |
| 011 | Prevent duplicate interventions |
| 012 | Add material tables |
| 013 | Add suppliers table |
| 014 | Add avatar URL |
| 015 | Add two-factor auth (structure) |
| 016 | Add task assignment indexes |
| 017 | Add cache metadata |
| 018 | Add settings audit log |
| 019 | Enhanced performance indexes |
| 020 | Fix cache metadata schema |
| 021 | Add client statistics view |
| 022 | Add task history table |
| 023 | Add messaging tables |
| 024 | Add inventory management |
| 025 | Add analytics dashboard |
| 026 | Fix user settings |
| 027 | Add task constraints |
| 028 | Add two-factor user columns |
| 029 | Add users first/last name |
| 030 | Add user sessions updated_at |
| 031 | Add inventory non-negative checks |
| 032 | Add intervention task FK |
| 033 | Add task workflow FKs |
| 034 | Add session activity index |
| 035 | Add tasks deleted_at index |
| 036 | Core screen indexes |
| 037 | Quotes table |
| 038 | Inventory transaction lookup index |
| 039 | Add FK indexes |
| 040 | Add activity and reference indexes |
| 041 | Replace user_sessions with sessions |
| 042 | Fix client statistics view |
| 043 | Add parent_id index |
| 044 | Add notifications table |
| 045 | Add user settings insert trigger |
| 046 | Drop user settings insert trigger |
| 047 | Add quotes missing columns |

### 4.2 Migration Rules

1. **Naming**: Use sequential numbers with descriptive name: `NNN_description.sql`
2. **Idempotency**: Use `IF NOT EXISTS`, `IF EXISTS` for all DDL
3. **Rollback**: Each migration should be reversible or documented
4. **No Schema Direct Changes**: All schema changes must go through migrations

---

## 5. Indexes Summary

### 5.1 Performance Indexes

| Index | Table | Columns | Purpose |
|-------|-------|---------|---------|
| `idx_tasks_status` | tasks | status | Filter by status |
| `idx_tasks_assigned_to` | tasks | assigned_to | User task list |
| `idx_tasks_scheduled_date` | tasks | scheduled_date | Calendar view |
| `idx_interventions_task_id` | interventions | task_id | Task interventions |
| `idx_materials_category` | materials | category_id | Category filter |
| `idx_quotes_client_id` | quotes | client_id | Client quotes |

### 5.2 Audit Indexes

| Index | Table | Columns |
|-------|-------|---------|
| `idx_audit_events_user_id` | audit_events | user_id |
| `idx_audit_events_timestamp` | audit_events | timestamp |
| `idx_audit_events_resource` | audit_events | resource_type, resource_id |

---

## 6. Views

### 6.1 Calendar Tasks View

```sql
CREATE VIEW calendar_tasks AS
SELECT 
  t.id, t.task_number, t.title, t.status, t.priority,
  t.scheduled_date, t.start_time, t.end_time,
  t.vehicle_plate, t.vehicle_model,
  t.technician_id, u.username as technician_name,
  t.client_id, c.name as client_name,
  t.estimated_duration, t.actual_duration
FROM tasks t
LEFT JOIN users u ON t.technician_id = u.id
LEFT JOIN clients c ON t.client_id = c.id
WHERE t.scheduled_date IS NOT NULL AND t.deleted_at IS NULL;
```

---

## 7. Constraints

### 7.1 Check Constraints

- **Task status**: `pending`, `in_progress`, `completed`, `blocked`, `cancelled`
- **Task priority**: `low`, `medium`, `high`, `urgent`
- **Customer type**: `individual`, `business`
- **Intervention status**: `active`, `completed`, `cancelled`
- **Intervention step**: `inspection`, `preparation`, `installation`, `finalization`
- **Quote status**: `draft`, `sent`, `accepted`, `rejected`, `expired`
- **User role**: `admin`, `supervisor`, `technician`, `viewer`

### 7.2 Foreign Key Constraints

All foreign keys use `ON DELETE RESTRICT` or `ON DELETE CASCADE` as appropriate.

---

## 8. Database Configuration

### 8.1 SQLite PRAGMA Settings

```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;
PRAGMA cache_size = -64000; -- 64MB
PRAGMA temp_store = MEMORY;
```

### 8.2 Connection Pool

- **Pool Size**: Configured in `AppState`
- **Timeout**: 5 seconds busy timeout
- **Validation**: Connection validation on checkout
