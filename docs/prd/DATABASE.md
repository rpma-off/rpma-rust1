# Database Documentation - RPMA v2

## Overview

RPMA v2 uses **SQLite** as its database backend with WAL (Write-Ahead Logging) mode for optimal performance and concurrency. The schema is versioned and currently at version 42, with 48 migration files across two directories.

**Database Engine:** SQLite 3.x
**WAL Mode:** Enabled
**Current Schema Version:** 42
**Total Tables:** 35
**Total Indexes:** 200+
**Total Triggers:** 10+
**Total Views:** 2

---

## Database Configuration

### Connection Pool

```rust
pub struct PoolConfig {
    pub max_connections: u32,      // Default: 10
    pub min_idle: Option<u32>,      // Default: Some(2)
    pub connection_timeout: Duration, // Default: 30s
    pub idle_timeout: Option<Duration>,  // Default: 10 min
    pub max_lifetime: Option<Duration>,  // Default: 60 min
}
```

### SQLite Optimization

```sql
PRAGMA journal_mode = WAL;         -- Write-Ahead Logging
PRAGMA synchronous = NORMAL;         -- Performance balance
PRAGMA busy_timeout = 5000;         -- 5s lock timeout
PRAGMA wal_autocheckpoint = 1000;   -- Checkpoint frequency
PRAGMA cache_size = 10000;          -- Cache size
PRAGMA temp_store = MEMORY;         -- Memory for temp tables
PRAGMA foreign_keys = ON;           -- Enforce FK constraints
```

---

## Complete Schema

### Entity Relationship Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   clients   │────▶│    tasks    │────▶│interventions│
└─────────────┘     └─────────────┘     └─────────────┘
       │                    │                    │
       │                    │                    ▼
       │                    │              ┌─────────────┐
       │                    │              │   steps    │
       │                    │              └─────────────┘
       │                    │                    │
       │                    │                    ▼
       │                    │              ┌─────────────┐
       │                    │              │   photos    │
       │                    │              └─────────────┘
       ▼                    ▼
┌─────────────┐     ┌─────────────┐
│   quotes    │     │ calendar_   │
└─────────────┘     │   events    │
       │            └─────────────┘
       │                    │
       ▼                    ▼
┌─────────────┐     ┌─────────────┐
│quote_items  │     │task_conflicts│
└─────────────┘     └─────────────┘

┌─────────────┐     ┌─────────────┐
│    users    │────▶│  sessions  │
└─────────────┘     └─────────────┘
       │
       ▼
┌─────────────┐     ┌─────────────┐
│user_settings│     │user_consent │
└─────────────┘     └─────────────┘

┌─────────────┐     ┌─────────────┐
│material_cats│────▶│  materials  │
└─────────────┘     └─────────────┘
                           │
                           ▼
                  ┌─────────────────────┐
                  │inventory_transactions│
                  └─────────────────────┘
                           │
                           ▼
                  ┌─────────────────────┐
                  │material_consumption  │
                  └─────────────────────┘

┌─────────────┐
│   sync_queue│
└─────────────┘

┌─────────────┐
│ audit_logs  │
└─────────────┘

┌─────────────┐
│audit_events │
└─────────────┘
```

---

## Core Business Tables

### 1. tasks

General task management for all work types (can spawn interventions).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | UUID |
| task_number | TEXT | UNIQUE NOT NULL | Auto-generated task number |
| title | TEXT | NOT NULL | Task title |
| description | TEXT | NULL | Task description |
| vehicle_plate | TEXT | NULL | Vehicle license plate |
| vehicle_model | TEXT | NULL | Vehicle model |
| vehicle_year | TEXT | NULL | Vehicle year |
| vehicle_make | TEXT | NULL | Vehicle make |
| vin | TEXT | NULL | Vehicle identification number |
| ppf_zones | TEXT | NULL | PPF zones (JSON) |
| custom_ppf_zones | TEXT | NULL | Custom PPF zones (JSON) |
| status | TEXT | NOT NULL | Status (13 values) |
| priority | TEXT | NOT NULL | Priority (4 values) |
| technician_id | TEXT | FK → users(id) | Assigned technician |
| assigned_at | INTEGER | NULL | Assignment timestamp (ms) |
| assigned_by | TEXT | NULL | Assigned by user ID |
| scheduled_date | TEXT | NULL | Scheduled date (ISO) |
| start_time | TEXT | NULL | Start time (ISO) |
| end_time | TEXT | NULL | End time (ISO) |
| workflow_id | TEXT | FK → interventions(id) | Current workflow |
| current_workflow_step_id | TEXT | FK → intervention_steps(id) | Current step |
| client_id | TEXT | FK → clients(id) | Client ID |
| customer_name | TEXT | NULL | Customer name (snapshot) |
| customer_email | TEXT | NULL | Customer email (snapshot) |
| customer_phone | TEXT | NULL | Customer phone (snapshot) |
| customer_address | TEXT | NULL | Customer address (snapshot) |
| template_id | TEXT | NULL | Template ID |
| lot_film | TEXT | NULL | Film lot number |
| checklist_completed | INTEGER | DEFAULT 0 | Checklist completed flag |
| notes | TEXT | NULL | Task notes |
| tags | TEXT | NULL | Task tags (JSON) |
| estimated_duration | INTEGER | NULL | Estimated duration (minutes) |
| actual_duration | INTEGER | NULL | Actual duration (minutes) |
| deleted_at | INTEGER | NULL | Soft delete timestamp |
| deleted_by | TEXT | NULL | Deleted by user ID |
| synced | INTEGER | DEFAULT 0 | Sync status (0=unsynced, 1=synced) |
| created_at | INTEGER | NOT NULL | Creation timestamp (ms) |
| updated_at | INTEGER | NOT NULL | Update timestamp (ms) |

**Status Values:** `draft`, `scheduled`, `in_progress`, `completed`, `cancelled`, `on_hold`, `pending`, `invalid`, `archived`, `failed`, `overdue`, `assigned`, `paused`

**Priority Values:** `low`, `medium`, `high`, `urgent`

**Indexes:** 30+ indexes including composites for query optimization

---

### 2. interventions

Detailed PPF intervention records with workflow steps, photos, and quality tracking.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | UUID |
| task_id | TEXT | FK → tasks(id) ON DELETE CASCADE | Task ID |
| status | TEXT | NOT NULL | Intervention status |
| vehicle_plate | TEXT | NULL | Vehicle license plate |
| vehicle_model | TEXT | NULL | Vehicle model |
| vehicle_make | TEXT | NULL | Vehicle make |
| vehicle_year | TEXT | NULL | Vehicle year |
| client_id | TEXT | FK → clients(id) ON DELETE SET NULL | Client ID |
| client_name | TEXT | NULL | Client name (snapshot) |
| client_email | TEXT | NULL | Client email (snapshot) |
| client_phone | TEXT | NULL | Client phone (snapshot) |
| technician_id | TEXT | FK → users(id) ON DELETE SET NULL | Technician ID |
| technician_name | TEXT | NULL | Technician name (snapshot) |
| current_step | INTEGER | DEFAULT 1 | Current workflow step |
| completion_percentage | INTEGER | DEFAULT 0 | Completion % (0-100) |
| film_type | TEXT | NULL | Film type |
| film_brand | TEXT | NULL | Film brand |
| film_model | TEXT | NULL | Film model |
| scheduled_at | INTEGER | NULL | Scheduled timestamp (ms) |
| started_at | INTEGER | NULL | Started timestamp (ms) |
| completed_at | INTEGER | NULL | Completed timestamp (ms) |
| paused_at | INTEGER | NULL | Paused timestamp (ms) |
| weather_condition | TEXT | NULL | Weather condition |
| lighting_condition | TEXT | NULL | Lighting condition |
| temperature_celsius | REAL | NULL | Temperature (°C) |
| humidity_percentage | REAL | NULL | Humidity (%) |
| start_location_lat | REAL | NULL | Start GPS latitude |
| start_location_lon | REAL | NULL | Start GPS longitude |
| end_location_lat | REAL | NULL | End GPS latitude |
| end_location_lon | REAL | NULL | End GPS longitude |
| customer_satisfaction | INTEGER | CHECK(1-10) | Satisfaction score (1-10) |
| quality_score | INTEGER | CHECK(0-100) | Quality score (0-100) |
| task_number | TEXT | NULL | Task number (snapshot) |
| synced | INTEGER | DEFAULT 0 | Sync status |
| created_at | INTEGER | NOT NULL | Creation timestamp (ms) |
| updated_at | INTEGER | NOT NULL | Update timestamp (ms) |

**Status Values:** `pending`, `in_progress`, `paused`, `completed`, `cancelled`

**Indexes:** 17 indexes for status, technician, client, scheduled dates

---

### 3. intervention_steps

Step-by-step workflow steps for each intervention.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | UUID |
| intervention_id | TEXT | FK → interventions(id) ON DELETE CASCADE | Intervention ID |
| step_number | INTEGER | NOT NULL | Step number (1-4) |
| step_name | TEXT | NOT NULL | Step name |
| step_type | TEXT | NOT NULL | Step type |
| step_status | TEXT | NOT NULL | Step status |
| is_mandatory | INTEGER | DEFAULT 1 | Mandatory flag |
| requires_photos | INTEGER | DEFAULT 1 | Photos required flag |
| min_photos_required | INTEGER | DEFAULT 0 | Minimum photos |
| max_photos_allowed | INTEGER | NULL | Maximum photos |
| started_at | INTEGER | NULL | Started timestamp (ms) |
| completed_at | INTEGER | NULL | Completed timestamp (ms) |
| duration_seconds | INTEGER | NULL | Duration (seconds) |
| photo_count | INTEGER | DEFAULT 0 | Photo count |
| required_photos_completed | INTEGER | DEFAULT 0 | Required photos completed |
| photo_urls | TEXT | NULL | Photo URLs (JSON) |
| validation_score | INTEGER | CHECK(0-100) | Validation score (0-100) |
| requires_supervisor_approval | INTEGER | DEFAULT 0 | Supervisor approval required |
| approved_by | TEXT | NULL | Approved by user ID |
| approved_at | INTEGER | NULL | Approved timestamp (ms) |
| location_lat | REAL | NULL | GPS latitude |
| location_lon | REAL | NULL | GPS longitude |
| location_accuracy | REAL | NULL | GPS accuracy (meters) |
| synced | INTEGER | DEFAULT 0 | Sync status |
| created_at | INTEGER | NOT NULL | Creation timestamp (ms) |
| updated_at | INTEGER | NOT NULL | Update timestamp (ms) |

**Unique Index:** `(intervention_id, step_number)`

**Step Status Values:** `pending`, `in_progress`, `paused`, `completed`, `failed`, `skipped`, `rework`

---

### 4. photos

Photos attached to interventions with EXIF data and GPS coordinates.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | UUID |
| intervention_id | TEXT | FK → interventions(id) ON DELETE CASCADE | Intervention ID |
| step_id | TEXT | FK → intervention_steps(id) ON DELETE SET NULL | Step ID |
| file_path | TEXT | NOT NULL | File path |
| file_name | TEXT | NOT NULL | File name |
| file_size | INTEGER | NULL | File size (bytes) |
| mime_type | TEXT | NULL | MIME type |
| width | INTEGER | NULL | Image width (px) |
| height | INTEGER | NULL | Image height (px) |
| photo_type | TEXT | NOT NULL | Photo type |
| photo_category | TEXT | NULL | Photo category |
| zone | TEXT | NULL | PPF zone |
| exif_data | TEXT | NULL | EXIF data (JSON) |
| camera_make | TEXT | NULL | Camera make |
| camera_model | TEXT | NULL | Camera model |
| capture_datetime | INTEGER | NULL | Capture timestamp (ms) |
| gps_location_lat | REAL | NULL | GPS latitude |
| gps_location_lon | REAL | NULL | GPS longitude |
| gps_location_accuracy | REAL | NULL | GPS accuracy (meters) |
| gps_altitude | REAL | NULL | GPS altitude (meters) |
| quality_score | INTEGER | CHECK(0-100) | Quality score (0-100) |
| blur_score | INTEGER | CHECK(0-100) | Blur score (0-100) |
| exposure_score | INTEGER | CHECK(0-100) | Exposure score (0-100) |
| composition_score | INTEGER | CHECK(0-100) | Composition score (0-100) |
| is_required | INTEGER | DEFAULT 0 | Required flag |
| is_approved | INTEGER | DEFAULT 0 | Approved flag |
| approved_by | TEXT | NULL | Approved by user ID |
| approved_at | INTEGER | NULL | Approved timestamp (ms) |
| synced | INTEGER | DEFAULT 0 | Sync status |
| storage_url | TEXT | NULL | Storage URL |
| upload_retry_count | INTEGER | DEFAULT 0 | Upload retry count |
| captured_at | INTEGER | NOT NULL | Capture timestamp (ms) |
| uploaded_at | INTEGER | NULL | Upload timestamp (ms) |

**Photo Type Values:** `before`, `during`, `after`

**Indexes:** intervention_id, step_id, photo_type, synced

---

### 5. clients

Client/customer information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | UUID |
| name | TEXT | NOT NULL | Client name |
| email | TEXT | UNIQUE NULL | Email address |
| phone | TEXT | NULL | Phone number |
| customer_type | TEXT | DEFAULT 'individual' | Customer type |
| address_street | TEXT | NULL | Street address |
| address_city | TEXT | NULL | City |
| address_state | TEXT | NULL | State/province |
| address_zip | TEXT | NULL | ZIP/postal code |
| address_country | TEXT | NULL | Country |
| tax_id | TEXT | NULL | Tax ID |
| company_name | TEXT | NULL | Company name |
| contact_person | TEXT | NULL | Contact person |
| notes | TEXT | NULL | Notes |
| tags | TEXT | NULL | Tags (JSON) |
| total_tasks | INTEGER | DEFAULT 0 | Total tasks (computed) |
| active_tasks | INTEGER | DEFAULT 0 | Active tasks (computed) |
| completed_tasks | INTEGER | DEFAULT 0 | Completed tasks (computed) |
| last_task_date | INTEGER | NULL | Last task date (ms) |
| deleted_at | INTEGER | NULL | Soft delete timestamp |
| deleted_by | TEXT | NULL | Deleted by user ID |
| synced | INTEGER | DEFAULT 0 | Sync status |
| created_at | INTEGER | NOT NULL | Creation timestamp (ms) |
| updated_at | INTEGER | NOT NULL | Update timestamp (ms) |

**Customer Type Values:** `individual`, `business`

**Indexes:** name (case-insensitive), email, customer_type, created_at, synced

---

### 6. users

User accounts and authentication.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | UUID |
| email | TEXT | UNIQUE NOT NULL | Email address |
| username | TEXT | UNIQUE NOT NULL | Username |
| password_hash | TEXT | NOT NULL | Password hash (Argon2) |
| salt | TEXT | NOT NULL | Password salt |
| first_name | TEXT | NULL | First name |
| last_name | TEXT | NULL | Last name |
| full_name | TEXT | NULL | Full name |
| role | TEXT | NOT NULL | User role |
| phone | TEXT | NULL | Phone number |
| is_active | INTEGER | DEFAULT 1 | Active flag |
| last_login_at | INTEGER | NULL | Last login timestamp (ms) |
| login_count | INTEGER | DEFAULT 0 | Login count |
| preferences | TEXT | NULL | User preferences (JSON) |
| deleted_at | INTEGER | NULL | Soft delete timestamp |
| synced | INTEGER | DEFAULT 0 | Sync status |
| created_at | INTEGER | NOT NULL | Creation timestamp (ms) |
| updated_at | INTEGER | NOT NULL | Update timestamp (ms) |

**Role Values:** `admin`, `supervisor`, `technician`, `viewer`

**Indexes:** email, username, role, is_active, role+is_active

---

### 7. sessions

Simplified sessions table using plain UUID tokens.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | UUID session token |
| user_id | TEXT | FK → users(id) ON DELETE CASCADE | User ID |
| username | TEXT | NOT NULL | Username (snapshot) |
| email | TEXT | NOT NULL | Email (snapshot) |
| role | TEXT | NOT NULL | Role (snapshot) |
| created_at | INTEGER | NOT NULL | Creation timestamp (ms) |
| expires_at | INTEGER | NOT NULL | Expiration timestamp (ms) |
| last_activity | INTEGER | NOT NULL | Last activity timestamp (ms) |

**Indexes:** user_id, expires_at

---

### 8. user_settings

User-specific settings and preferences.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | UUID |
| user_id | TEXT | UNIQUE FK → users(id) | User ID |
| full_name | TEXT | NULL | Display name |
| email | TEXT | NULL | Email |
| phone | TEXT | NULL | Phone |
| avatar_url | TEXT | NULL | Avatar URL |
| notes | TEXT | NULL | Notes |
| email_notifications | INTEGER | DEFAULT 1 | Email notifications |
| push_notifications | INTEGER | DEFAULT 1 | Push notifications |
| theme | TEXT | DEFAULT 'light' | Theme (light/dark) |
| language | TEXT | DEFAULT 'en' | Language code |
| date_format | TEXT | DEFAULT 'YYYY-MM-DD' | Date format |
| time_format | TEXT | DEFAULT 'HH:mm' | Time format |
| high_contrast | INTEGER | DEFAULT 0 | High contrast mode |
| large_text | INTEGER | DEFAULT 0 | Large text mode |
| reduce_motion | INTEGER | DEFAULT 0 | Reduce motion |
| screen_reader | INTEGER | DEFAULT 0 | Screen reader support |
| two_factor_enabled | INTEGER | DEFAULT 0 | 2FA enabled |
| session_timeout | INTEGER | DEFAULT 3600 | Session timeout (seconds) |
| cache_enabled | INTEGER | DEFAULT 1 | Cache enabled |
| cache_size | INTEGER | DEFAULT 100 | Cache size (MB) |
| offline_mode | INTEGER | DEFAULT 1 | Offline mode |
| sync_on_startup | INTEGER | DEFAULT 1 | Sync on startup |
| created_at | INTEGER | NOT NULL | Creation timestamp (ms) |
| updated_at | INTEGER | NOT NULL | Update timestamp (ms) |

**Index:** user_id

---

### 9. user_consent

User consent preferences (GDPR compliance).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Auto-increment ID |
| user_id | TEXT | UNIQUE FK → users(id) ON DELETE CASCADE | User ID |
| consent_data | TEXT | NULL | Consent data (JSON) |
| updated_at | INTEGER | NOT NULL | Update timestamp (ms) |
| created_at | INTEGER | NOT NULL | Creation timestamp (ms) |

**Index:** user_id

---

## Inventory Tables

### 10. materials

Inventory master data for PPF materials and consumables.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | UUID |
| sku | TEXT | UNIQUE NOT NULL | Stock keeping unit |
| name | TEXT | NOT NULL | Material name |
| description | TEXT | NULL | Description |
| material_type | TEXT | NOT NULL | Material type |
| category | TEXT | NULL | Category name |
| subcategory | TEXT | NULL | Subcategory |
| category_id | TEXT | FK → material_categories(id) ON DELETE SET NULL | Category ID |
| brand | TEXT | NULL | Brand |
| model | TEXT | NULL | Model |
| specifications | TEXT | NULL | Specifications (JSON) |
| unit_of_measure | TEXT | NOT NULL | Unit of measure |
| current_stock | INTEGER | DEFAULT 0 CHECK(>=0) | Current stock |
| minimum_stock | INTEGER | DEFAULT 0 CHECK(>=0) | Minimum stock |
| maximum_stock | INTEGER | NULL | Maximum stock |
| reorder_point | INTEGER | DEFAULT 0 CHECK(>=0) | Reorder point |
| unit_cost | REAL | NULL | Unit cost |
| currency | TEXT | DEFAULT 'EUR' | Currency code |
| supplier_id | TEXT | FK → suppliers(id) ON DELETE SET NULL | Supplier ID |
| supplier_name | TEXT | NULL | Supplier name (snapshot) |
| supplier_sku | TEXT | NULL | Supplier SKU |
| quality_grade | TEXT | NULL | Quality grade |
| certification | TEXT | NULL | Certification |
| expiry_date | INTEGER | NULL | Expiry timestamp (ms) |
| batch_number | TEXT | NULL | Batch number |
| serial_numbers | TEXT | NULL | Serial numbers (JSON) |
| is_active | INTEGER | DEFAULT 1 | Active flag |
| is_discontinued | INTEGER | DEFAULT 0 | Discontinued flag |
| storage_location | TEXT | NULL | Storage location |
| warehouse_id | TEXT | NULL | Warehouse ID |
| created_by | TEXT | FK → users(id) ON DELETE SET NULL | Created by user ID |
| updated_by | TEXT | FK → users(id) ON DELETE SET NULL | Updated by user ID |
| synced | INTEGER | DEFAULT 0 | Sync status |
| created_at | INTEGER | NOT NULL | Creation timestamp (ms) |
| updated_at | INTEGER | NOT NULL | Update timestamp (ms) |

**Material Type Values:** `ppf_film`, `adhesive`, `cleaning_solution`, `tool`, `consumable`

**Unit of Measure Values:** `piece`, `meter`, `liter`, `gram`, `roll`

**Indexes:** sku, type, supplier, active, category_id

---

### 11. inventory_transactions

Tracks all inventory movements (in/out/adjustments/transfer/waste/return).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | UUID |
| material_id | TEXT | FK → materials(id) ON DELETE RESTRICT | Material ID |
| transaction_type | TEXT | NOT NULL | Transaction type |
| quantity | INTEGER | CHECK(>=0) | Quantity |
| previous_stock | INTEGER | CHECK(>=0) | Previous stock |
| new_stock | INTEGER | CHECK(>=0) | New stock |
| reference_number | TEXT | NULL | Reference number |
| reference_type | TEXT | NULL | Reference type |
| notes | TEXT | NULL | Notes |
| unit_cost | REAL | NULL | Unit cost |
| total_cost | REAL | NULL | Total cost |
| warehouse_id | TEXT | NULL | Warehouse ID |
| location_from | TEXT | NULL | Location from |
| location_to | TEXT | NULL | Location to |
| batch_number | TEXT | NULL | Batch number |
| expiry_date | INTEGER | NULL | Expiry timestamp (ms) |
| quality_status | TEXT | NULL | Quality status |
| intervention_id | TEXT | FK → interventions(id) ON DELETE SET NULL | Intervention ID |
| step_id | TEXT | FK → intervention_steps(id) ON DELETE SET NULL | Step ID |
| performed_by | TEXT | FK → users(id) ON DELETE RESTRICT | Performed by user ID |
| performed_at | INTEGER | NOT NULL | Performed timestamp (ms) |
| synced | INTEGER | DEFAULT 0 | Sync status |
| created_at | INTEGER | NOT NULL | Creation timestamp (ms) |
| updated_at | INTEGER | NOT NULL | Update timestamp (ms) |

**Transaction Type Values:** `stock_in`, `stock_out`, `adjustment`, `transfer`, `waste`, `return`

**Indexes:** material_id, type, performed_at, reference_number

---

### 12. material_consumption

Tracks material usage per intervention.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | UUID |
| intervention_id | TEXT | FK → interventions(id) ON DELETE CASCADE | Intervention ID |
| material_id | TEXT | FK → materials(id) ON DELETE RESTRICT | Material ID |
| step_id | TEXT | FK → intervention_steps(id) ON DELETE SET NULL | Step ID |
| quantity_used | REAL | CHECK(>=0) | Quantity used |
| unit_cost | REAL | NULL | Unit cost |
| total_cost | REAL | NULL | Total cost |
| waste_quantity | REAL | CHECK(>=0) | Waste quantity |
| waste_reason | TEXT | NULL | Waste reason |
| batch_used | TEXT | NULL | Batch used |
| expiry_used | INTEGER | NULL | Expiry timestamp (ms) |
| quality_notes | TEXT | NULL | Quality notes |
| step_number | INTEGER | NULL | Step number |
| recorded_by | TEXT | FK → users(id) ON DELETE SET NULL | Recorded by user ID |
| recorded_at | INTEGER | NOT NULL | Recorded timestamp (ms) |
| synced | INTEGER | DEFAULT 0 | Sync status |
| created_at | INTEGER | NOT NULL | Creation timestamp (ms) |
| updated_at | INTEGER | NOT NULL | Update timestamp (ms) |

**Indexes:** intervention_id, material_id, step_id, recorded_by

---

## Quote Tables

### 13. quotes

Quote management for interventions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | UUID |
| quote_number | TEXT | UNIQUE NOT NULL | Quote number |
| client_id | TEXT | FK → clients(id) | Client ID |
| task_id | TEXT | FK → tasks(id) | Task ID |
| status | TEXT | DEFAULT 'draft' | Quote status |
| valid_until | INTEGER | NULL | Valid until timestamp (ms) |
| notes | TEXT | NULL | Notes |
| terms | TEXT | NULL | Terms |
| subtotal | REAL | DEFAULT 0 | Subtotal |
| tax_total | REAL | DEFAULT 0 | Tax total |
| total | REAL | DEFAULT 0 | Total |
| vehicle_plate | TEXT | NULL | Vehicle plate |
| vehicle_make | TEXT | NULL | Vehicle make |
| vehicle_model | TEXT | NULL | Vehicle model |
| vehicle_year | TEXT | NULL | Vehicle year |
| vehicle_vin | TEXT | NULL | Vehicle VIN |
| created_by | TEXT | FK → users(id) | Created by user ID |
| synced | INTEGER | DEFAULT 0 | Sync status |
| created_at | INTEGER | NOT NULL | Creation timestamp (ms) |
| updated_at | INTEGER | NOT NULL | Update timestamp (ms) |

**Status Values:** `draft`, `sent`, `accepted`, `rejected`, `expired`

**Indexes:** quote_number, client_id, status, created_at, task_id

---

### 14. quote_items

Line items for quotes.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | UUID |
| quote_id | TEXT | FK → quotes(id) ON DELETE CASCADE | Quote ID |
| kind | TEXT | NOT NULL | Item kind |
| label | TEXT | NOT NULL | Item label |
| description | TEXT | NULL | Description |
| qty | REAL | CHECK(>0) | Quantity |
| unit_price | REAL | CHECK(>=0) | Unit price |
| tax_rate | REAL | DEFAULT 0 | Tax rate |
| material_id | TEXT | FK → materials(id) | Material ID |
| position | INTEGER | NOT NULL | Position |
| synced | INTEGER | DEFAULT 0 | Sync status |
| created_at | INTEGER | NOT NULL | Creation timestamp (ms) |
| updated_at | INTEGER | NOT NULL | Update timestamp (ms) |

**Kind Values:** `labor`, `material`, `service`, `discount`

**Indexes:** quote_id, position, material_id

---

## Calendar Tables

### 15. calendar_events

Calendar events for meetings, appointments, and task blocks.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | UUID |
| title | TEXT | NOT NULL | Event title |
| description | TEXT | NULL | Description |
| start_datetime | TEXT | NOT NULL | Start datetime (ISO 8601) |
| end_datetime | TEXT | NOT NULL | End datetime (ISO 8601) |
| all_day | INTEGER | DEFAULT 0 | All-day flag |
| timezone | TEXT | NULL | Timezone |
| event_type | TEXT | DEFAULT 'appointment' | Event type |
| category | TEXT | NULL | Category |
| task_id | TEXT | FK → tasks(id) ON DELETE CASCADE | Task ID |
| client_id | TEXT | FK → clients(id) ON DELETE SET NULL | Client ID |
| technician_id | TEXT | FK → users(id) ON DELETE CASCADE | Technician ID |
| location | TEXT | NULL | Location |
| meeting_link | TEXT | NULL | Meeting link |
| is_virtual | INTEGER | DEFAULT 0 | Virtual event flag |
| participants | TEXT | NULL | Participants (JSON) |
| is_recurring | INTEGER | DEFAULT 0 | Recurring flag |
| recurrence_rule | TEXT | NULL | Recurrence rule |
| parent_event_id | TEXT | FK → calendar_events(id) ON DELETE CASCADE | Parent event ID |
| reminders | TEXT | NULL | Reminders (JSON array) |
| status | TEXT | DEFAULT 'confirmed' | Event status |
| color | TEXT | NULL | Display color |
| tags | TEXT | NULL | Tags (JSON) |
| notes | TEXT | NULL | Notes |
| deleted_at | INTEGER | NULL | Soft delete timestamp |
| deleted_by | TEXT | NULL | Deleted by user ID |
| synced | INTEGER | DEFAULT 0 | Sync status |
| created_at | INTEGER | NOT NULL | Creation timestamp (ms) |
| updated_at | INTEGER | NOT NULL | Update timestamp (ms) |
| created_by | TEXT | FK → users(id) ON DELETE SET NULL | Created by user ID |
| updated_by | TEXT | FK → users(id) ON DELETE SET NULL | Updated by user ID |

**Event Type Values:** `meeting`, `appointment`, `task`, `reminder`, `other`

**Status Values:** `confirmed`, `tentative`, `cancelled`

**Indexes:** technician_id, task_id, client_id, start_datetime, end_datetime

---

## Sync & Audit Tables

### 16. sync_queue

Offline-first synchronization queue.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Auto-increment ID |
| operation_type | TEXT | NOT NULL | Operation type |
| entity_type | TEXT | NOT NULL | Entity type |
| entity_id | TEXT | NOT NULL | Entity ID |
| data | TEXT | NULL | Data (JSON) |
| dependencies | TEXT | NULL | Dependencies (JSON array) |
| retry_count | INTEGER | DEFAULT 0 | Retry count |
| max_retries | INTEGER | DEFAULT 3 | Max retries |
| last_retry_at | INTEGER | NULL | Last retry timestamp (ms) |
| next_retry_at | INTEGER | NULL | Next retry timestamp (ms) |
| last_error | TEXT | NULL | Last error |
| status | TEXT | DEFAULT 'pending' | Status |
| priority | INTEGER | DEFAULT 5 | Priority (1-10) |
| user_id | TEXT | FK → users(id) ON DELETE SET NULL | User ID |
| device_id | TEXT | NULL | Device ID |
| batch_id | TEXT | NULL | Batch ID |
| timestamp_utc | INTEGER | NOT NULL | Timestamp (ms) |
| created_at | INTEGER | NOT NULL | Creation timestamp (ms) |
| updated_at | INTEGER | NOT NULL | Update timestamp (ms) |
| processed_at | INTEGER | NULL | Processed timestamp (ms) |

**Operation Type Values:** `create`, `update`, `delete`

**Status Values:** `pending`, `processing`, `completed`, `failed`, `abandoned`

**Indexes:** status+retry_count+created_at, entity_type+entity_id, timestamp_utc

---

### 17. audit_events

Comprehensive security audit trail.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | UUID |
| event_type | TEXT | NOT NULL | Event type |
| user_id | TEXT | FK → users(id) | User ID |
| action | TEXT | NOT NULL | Action |
| resource_id | TEXT | NULL | Resource ID |
| resource_type | TEXT | NULL | Resource type |
| description | TEXT | NULL | Description |
| ip_address | TEXT | NULL | IP address |
| user_agent | TEXT | NULL | User agent |
| result | TEXT | NULL | Result |
| previous_state | TEXT | NULL | Previous state (JSON) |
| new_state | TEXT | NULL | New state (JSON) |
| timestamp | INTEGER | NOT NULL | Timestamp (ms) |
| metadata | TEXT | NULL | Metadata (JSON) |
| session_id | TEXT | NULL | Session ID |
| request_id | TEXT | NULL | Request ID |
| created_at | INTEGER | NOT NULL | Creation timestamp (ms) |

**Indexes:** user_id, timestamp, resource_type+resource_id, event_type

---

## Views

### 1. client_statistics

Optimized client statistics view:

```sql
SELECT
  c.id,
  c.name,
  c.customer_type,
  c.created_at,
  COUNT(DISTINCT t.id) as total_tasks,
  COUNT(DISTINCT CASE WHEN t.status IN ('pending', 'in_progress') THEN t.id END) as active_tasks,
  COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_tasks,
  MAX(t.updated_at) as last_task_date
FROM clients c
LEFT JOIN tasks t ON t.client_id = c.id AND t.deleted_at IS NULL
WHERE c.deleted_at IS NULL
GROUP BY c.id, c.name, c.customer_type, c.created_at
```

### 2. calendar_tasks

Calendar task view for scheduling:

```sql
SELECT
  t.id,
  t.task_number,
  t.title,
  t.status,
  t.priority,
  t.scheduled_date,
  t.start_time,
  t.end_time,
  t.vehicle_plate,
  t.vehicle_model,
  t.technician_id,
  u.username as technician_name,
  t.client_id,
  c.name as client_name,
  t.estimated_duration,
  t.actual_duration
FROM tasks t
LEFT JOIN users u ON t.technician_id = u.id
LEFT JOIN clients c ON t.client_id = c.id
WHERE t.scheduled_date IS NOT NULL AND t.deleted_at IS NULL
```

---

## Triggers

### Client Statistics Triggers

```sql
-- On INSERT into tasks
CREATE TRIGGER task_insert_update_client_stats
AFTER INSERT ON tasks
BEGIN
  UPDATE clients
  SET total_tasks = total_tasks + 1,
      last_task_date = NEW.updated_at
  WHERE id = NEW.client_id AND deleted_at IS NULL;
END;

-- On UPDATE of tasks
CREATE TRIGGER task_update_update_client_stats
AFTER UPDATE ON tasks
BEGIN
  UPDATE clients
  SET last_task_date = NEW.updated_at
  WHERE id = NEW.client_id AND deleted_at IS NULL;
END;

-- On DELETE of tasks
CREATE TRIGGER task_delete_update_client_stats
AFTER DELETE ON tasks
BEGIN
  UPDATE clients
  SET total_tasks = total_tasks - 1
  WHERE id = OLD.client_id AND deleted_at IS NULL;
END;
```

### Workflow Synchronization Triggers

```sql
-- Sync task on intervention start
CREATE TRIGGER sync_task_on_intervention_start
AFTER INSERT ON interventions
BEGIN
  UPDATE tasks
  SET status = 'in_progress',
      workflow_id = NEW.id
  WHERE id = NEW.task_id;
END;

-- Sync task on intervention update
CREATE TRIGGER sync_task_on_intervention_update
AFTER UPDATE ON interventions
BEGIN
  UPDATE tasks
  SET status = CASE
    WHEN NEW.status = 'completed' THEN 'completed'
    WHEN NEW.status = 'cancelled' THEN 'cancelled'
    ELSE 'in_progress'
  END
  WHERE id = NEW.task_id;
END;
```

### User Settings Trigger

```sql
-- Auto-create user_settings on user creation
CREATE TRIGGER user_insert_create_settings
AFTER INSERT ON users
BEGIN
  INSERT INTO user_settings (id, user_id, created_at, updated_at)
  VALUES (
    (SELECT lower(hex(randomblob(16)) || hex(randomblob(16)) || hex(randomblob(16)) || hex(randomblob(16))),
    NEW.id,
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
  );
END;
```

### Session Validation Trigger

```sql
-- Enforce valid roles in sessions
CREATE TRIGGER validate_sessions_role
BEFORE INSERT ON sessions
BEGIN
  SELECT CASE
    WHEN NEW.role NOT IN ('admin', 'supervisor', 'technician', 'viewer')
    THEN RAISE(ABORT, 'Invalid user role')
  END;
END;
```

### Cache Cleanup Trigger

```sql
-- Auto-delete expired cache entries
CREATE TRIGGER cleanup_expired_cache
AFTER INSERT ON cache_metadata
WHEN (SELECT COUNT(*) FROM cache_metadata WHERE expires_at <= strftime('%s', 'now') * 1000) > 100
BEGIN
  DELETE FROM cache_metadata WHERE expires_at <= strftime('%s', 'now') * 1000;
END;
```

---

## Index Summary

### Total Indexes: 200+

**Categories:**
- **Primary Indexes:** All PRIMARY KEY columns
- **Foreign Key Indexes:** All FK columns
- **Single-column Indexes:** ~120
- **Composite Indexes:** ~60
- **Partial/Filtered Indexes:** ~20
- **Unique Indexes:** ~10

**Key Indexed Columns:**
- Tasks: status, priority, technician_id, client_id, scheduled_date, task_number
- Interventions: status, technician_id, client_id, started_at, completed_at
- Clients: name, email, customer_type, created_at
- Users: email, username, role, is_active
- Materials: sku, type, category_id, supplier_id, is_active
- Quotes: quote_number, client_id, status
- Calendar: start_datetime, end_datetime, technician_id, task_id, client_id

---

## Migration History

### Summary

| Version | Description | Date |
|----------|-------------|------|
| 002-011 | Core schema fixes (ppf_zone rename, constraints, workflow) | - |
| 012-016 | Material tracking, suppliers, 2FA support | - |
| 017-020 | Cache metadata, audit logging, performance indexes | - |
| 021-024 | Statistics view, task history, messaging, inventory | - |
| 025-028 | Analytics dashboard, user settings fixes, 2FA columns | - |
| 031-037 | Inventory constraints, FK indexes, session management | - |
| 038-042 | Transaction indexes, core screen indexes, sessions replacement | - |

**Current Version:** 42
**Total Migrations:** 48

---

## Best Practices

### 1. Migrations

- ✅ Always use numbered migration files (e.g., `043_add_column.sql`)
- ✅ Make migrations idempotent: use `IF NOT EXISTS`, `IF EXISTS`
- ✅ Never modify schema outside of migration files
- ✅ Validate: `node scripts/validate-migration-system.js`
- **Migration order:** add migration → run `types:sync` → run all tests

### 2. Queries

- ✅ Use prepared statements
- ✅ Leverage indexes for filtering
- ✅ Use views for complex aggregations
- ✅ Batch operations for bulk inserts/updates
- ✅ Use transactions for multi-step operations

### 3. Data Integrity

- ✅ Use CHECK constraints for validation
- ✅ Use foreign keys with appropriate cascades
- ✅ Use unique constraints for business keys
- ✅ Use soft deletes for audit trail
- ✅ Use triggers for computed values

### 4. Performance

- ✅ WAL mode for better concurrency
- ✅ Appropriate indexing strategy
- ✅ Connection pooling (max: 10)
- ✅ Cache frequently accessed data
- ✅ Use partial indexes for filtered queries

---

## Backup & Restore

### Backup

```bash
# Using SQLite command line
sqlite3 rpma.db ".backup 'backup-$(date +%Y%m%d-%H%M%S).db'"

# Using VACUUM
VACUUM INTO 'backup-$(date +%Y%m%d-%H%M%S).db'
```

### Restore

```bash
# Stop application
# Restore from backup
cp backup.db rpma.db

# Verify integrity
sqlite3 rpma.db "PRAGMA integrity_check;"
```

---

*Document Version: 1.0*
*Last Updated: Based on codebase analysis*
