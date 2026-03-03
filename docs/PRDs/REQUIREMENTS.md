# REQUIREMENTS.md

## RPMA v2 - Project Requirements

Based on code analysis of the RPMA v2 codebase (Paint Protection Film Intervention Management Application).

---

## 1. Existing Features

### 1.1 Authentication & Authorization

| Feature | Status | Implementation |
|---------|--------|----------------|
| User login with email/password | ✅ Implemented | `auth_login` IPC command, Argon2 password hashing |
| Account creation (signup) | ✅ Implemented | `auth_create_account` command |
| Session management | ✅ Implemented | JWT-style session tokens with UUID |
| Session validation | ✅ Implemented | `auth_validate_session` command |
| Logout | ✅ Implemented | `auth_logout` command |
| Role-Based Access Control (RBAC) | ✅ Implemented | 4 roles: admin, supervisor, technician, viewer |
| 2FA (Two-Factor Authentication) | ⚠️ Not implemented | Commands defined but backend not ready |

### 1.2 Client Management

| Feature | Status | Implementation |
|---------|--------|----------------|
| Create client | ✅ Implemented | `client_crud` with CREATE operation |
| Read client(s) | ✅ Implemented | `client_crud` with READ operation |
| Update client | ✅ Implemented | `client_crud` with UPDATE operation |
| Delete client (soft delete) | ✅ Implemented | `client_crud` with DELETE operation |
| Client search/filter | ✅ Implemented | Query parameters in client repository |
| Client statistics | ✅ Implemented | `client_statistics` table, computed on changes |
| Business/Individual client types | ✅ Implemented | `CustomerType` enum (individual/business) |

### 1.3 Task Management

| Feature | Status | Implementation |
|---------|--------|----------------|
| Create task | ✅ Implemented | `task_crud` with CREATE |
| Read task(s) | ✅ Implemented | `task_crud` with READ |
| Update task | ✅ Implemented | `task_crud` with UPDATE |
| Delete task | ✅ Implemented | `task_crud` with DELETE |
| Task assignment validation | ✅ Implemented | `validate_task_assignment_change` |
| Task history tracking | ✅ Implemented | `get_task_history`, task_history table |
| Task status transitions | ✅ Implemented | `task_transition_status`, workflow validation |
| Task notes | ✅ Implemented | `add_task_note` |
| Task messaging | ✅ Implemented | `send_task_message` |
| Task delay reporting | ✅ Implemented | `delay_task` |
| Issue reporting | ✅ Implemented | `report_task_issue` |
| Task CSV export | ✅ Implemented | `export_tasks_csv` |
| Bulk task import | ✅ Implemented | `import_tasks_bulk` |
| Status distribution | ✅ Implemented | `task_get_status_distribution` |

### 1.4 Intervention Management (PPF Workflow)

| Feature | Status | Implementation |
|---------|--------|----------------|
| Start intervention | ✅ Implemented | `intervention_start` |
| Get intervention | ✅ Implemented | `intervention_get` |
| Update intervention | ✅ Implemented | `intervention_update` |
| Delete intervention | ✅ Implemented | `intervention_delete` |
| Intervention workflow | ✅ Implemented | `intervention_workflow` composite command |
| Intervention progress | ✅ Implemented | `intervention_progress` |
| Step progress save | ✅ Implemented | `intervention_save_step_progress` |
| Get step details | ✅ Implemented | `intervention_get_step` |
| Active intervention by task | ✅ Implemented | `intervention_get_active_by_task` |
| Latest intervention by task | ✅ Implemented | `intervention_get_latest_by_task` |

**PPF Workflow Steps:**
1. Inspection
2. Preparation
3. Installation
4. Finalization

### 1.5 Inventory & Materials Management

| Feature | Status | Implementation |
|---------|--------|----------------|
| List materials | ✅ Implemented | `material_list` |
| Create material | ✅ Implemented | `material_create` |
| Update material | ✅ Implemented | `material_update` |
| Get material by ID | ✅ Implemented | `material_get` |
| Get material by SKU | ✅ Implemented | `material_get_by_sku` |
| Delete material | ✅ Implemented | `material_delete` |
| Update stock level | ✅ Implemented | `material_update_stock` |
| Adjust stock | ✅ Implemented | `material_adjust_stock` |
| Record consumption | ✅ Implemented | `material_record_consumption` |
| Consumption history | ✅ Implemented | `material_get_consumption_history` |
| Intervention consumption | ✅ Implemented | `material_get_intervention_consumption` |
| Inventory transactions | ✅ Implemented | `material_create_inventory_transaction` |
| Transaction history | ✅ Implemented | `material_get_transaction_history` |
| Categories management | ✅ Implemented | `material_create_category`, `material_list_categories` |
| Suppliers management | ✅ Implemented | `material_create_supplier`, `material_list_suppliers` |
| Low stock alerts | ✅ Implemented | `material_get_low_stock`, `material_get_low_stock_materials` |
| Expired materials | ✅ Implemented | `material_get_expired`, `material_get_expired_materials` |
| Inventory statistics | ✅ Implemented | `inventory_get_stats`, `material_get_stats` |

### 1.6 Document & Photo Management

| Feature | Status | Implementation |
|---------|--------|----------------|
| Store photo | ✅ Implemented | `document_store_photo` |
| Get photos | ✅ Implemented | `document_get_photos` |
| Get single photo | ✅ Implemented | `document_get_photo` |
| Delete photo | ✅ Implemented | `document_delete_photo` |
| Get photo data | ✅ Implemented | `document_get_photo_data` |
| Update photo metadata | ✅ Implemented | `document_update_photo_metadata` |

### 1.7 Quotes Management

| Feature | Status | Implementation |
|---------|--------|----------------|
| Create quote | ✅ Implemented | `quote_create` |
| Get quote | ✅ Implemented | `quote_get` |
| Update quote | ✅ Implemented | `quote_update` |
| Delete quote | ✅ Implemented | `quote_delete` |
| List quotes | ✅ Implemented | `quote_list` |
| Quote PDF export | ✅ Implemented | `quote_export_pdf` |
| Quote sharing | ✅ Implemented | `quote_share` (migration 034) |
| Quote attachments | ✅ Implemented | `quote_attachments` (migration 033) |
| Quote discounts | ✅ Implemented | `quote_discounts` (migration 032) |

### 1.8 Calendar & Scheduling

| Feature | Status | Implementation |
|---------|--------|----------------|
| Calendar events | ✅ Implemented | `calendar_*` commands |
| Conflict detection | ✅ Implemented | Calendar queries with conflict checks |
| Schedule page | ✅ Implemented | `/schedule` route |

### 1.9 Notifications & Messages

| Feature | Status | Implementation |
|---------|--------|----------------|
| In-app notifications | ✅ Implemented | `notification_in_app_*` commands |
| Message system | ✅ Implemented | `message_*` commands |
| Real-time notifications | ✅ Implemented | WebSocket support in Tauri |

### 1.10 Reports & Analytics

| Feature | Status | Intervention |
|---------|--------|--------------|
| Intervention reports | ✅ Implemented | `export_intervention_report`, `save_intervention_report` |
| Dashboard metrics | ✅ Implemented | `/dashboard` route with analytics |
| Performance metrics | ✅ Implemented | Performance domain, benchmarks |

### 1.11 Audit & Security

| Feature | Status | Implementation |
|---------|--------|----------------|
| Audit event logging | ✅ Implemented | `audit_events` table (migration 025) |
| Security monitoring | ✅ Implemented | Security audit IPC commands |
| Session activity tracking | ✅ Implemented | `user_sessions` table with `updated_at` |

### 1.12 Offline Support

| Feature | Status | Implementation |
|---------|--------|----------------|
| Offline-first architecture | ✅ Implemented | SQLite local database |
| Sync queue | ✅ Implemented | `sync_*` IPC commands |
| Sync validation | ✅ Implemented | Domain-bounded sync tests |

---

## 2. User Stories (Deduced from Code)

### 2.1 Authentication

| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| US-001 | As a user, I want to log in with email and password | Login form validates credentials, returns session token |
| US-002 | As a new user, I want to create an account | Signup form validates input, creates user record |
| US-003 | As a logged-in user, I want my session to persist | Session token validated on each protected command |

### 2.2 Client Management

| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| US-010 | As an admin, I want to add new clients | Client form creates new client record |
| US-011 | As a user, I want to search clients | Search returns matching clients by name/email |
| US-012 | As a user, I want to view client history | Client detail shows all associated tasks |

### 2.3 Task Management

| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| US-020 | As a supervisor, I want to create tasks | Task creation form with validation |
| US-021 | As a technician, I want to view my assigned tasks | Task list filtered by user assignment |
| US-022 | As a technician, I want to update task status | Status transitions follow workflow rules |
| US-023 | As a supervisor, I want to track task history | History timeline shows all changes |

### 2.4 PPF Intervention Workflow

| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| US-030 | As a technician, I want to start an intervention | Intervention created linked to task |
| US-031 | As a technician, I want to document each step | Step progress saved with photos |
| US-032 | As a supervisor, I want to view intervention status | Progress dashboard shows completion % |

### 2.5 Inventory

| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| US-040 | As an admin, I want to manage materials | CRUD operations on materials |
| US-041 | As a technician, I want to record consumption | Consumption linked to intervention |
| US-042 | As an admin, I want low stock alerts | Notifications when stock below threshold |

### 2.6 Quotes

| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| US-050 | As a sales person, I want to create quotes | Quote creation with line items |
| US-051 | As a client, I want to receive a PDF quote | PDF export functionality |
| US-052 | As a user, I want to share quotes | Quote sharing via unique link |

---

## 3. Data Models (Key Entities)

### 3.1 Core Entities

```
User
├── id (UUID)
├── email
├── password_hash
├── role (admin|supervisor|technician|viewer)
├── first_name, last_name
├── created_at, updated_at
├── synced, last_synced_at
└── deleted_at (soft delete)

Client
├── id (UUID)
├── name
├── email, phone
├── customer_type (individual|business)
├── address_* fields
├── tax_id, company_name, contact_person
├── total_tasks, active_tasks, completed_tasks
├── last_task_date
├── created_at, updated_at
└── deleted_at (soft delete)

Task
├── id (UUID)
├── title, description
├── status (pending|in_progress|completed|blocked|cancelled)
├── priority (low|medium|high|urgent)
├── assigned_to (user_id)
├── client_id
├── scheduled_date, due_date
├── created_by
├── created_at, updated_at
└── deleted_at (soft delete)

Intervention
├── id (UUID)
├── task_id
├── status (active|completed|cancelled)
├── current_step (inspection|preparation|installation|finalization)
├── started_at, completed_at
├── created_at, updated_at
└── deleted_at (soft delete)

Material
├── id (UUID)
├── name, sku, description
├── category_id
├── supplier_id
├── quantity, min_quantity, unit
├── unit_price
├── expiration_date
├── created_at, updated_at
└── deleted_at (soft delete)

Quote
├── id (UUID)
├── client_id
├── status (draft|sent|accepted|rejected|expired)
├── total_amount, discount_percent
├── valid_until
├── created_by
├── created_at, updated_at
└── deleted_at (soft delete)

AuditEvent
├── id (UUID)
├── event_type
├── user_id
├── action
├── resource_id, resource_type
├── description
├── result (success|failure)
├── timestamp
├── session_id, request_id
└── metadata (JSON)
```

---

## 4. Third-Party Integrations

### 4.1 Detected Integrations

| Service | Purpose | Status |
|---------|---------|--------|
| Tauri IPC | Desktop app framework | ✅ Active |
| Next.js | Frontend framework | ✅ Active |
| SQLite | Local database | ✅ Active |
| Radix UI | UI component primitives | ✅ Active |
| Tailwind CSS | Styling | ✅ Active |
| Zustand | State management | ✅ Active |
| TanStack Query | Server state | ✅ Active |
| Recharts | Dashboard charts | ✅ Active |
| Tiptap | Rich text editor | ✅ Active |
| Leaflet | Map integration | ✅ Active |
| JOSE | JWT handling | ✅ Active |
| Zod | Schema validation | ✅ Active |
| Argon2 | Password hashing | ✅ Active |
| Supabase | SSR helpers | ✅ Active |

### 4.2 Not Implemented / Deprecated

| Service | Purpose | Notes |
|---------|---------|-------|
| 2FA (TOTP) | Two-factor auth | Commands defined but not implemented |
| Cloud sync | Remote sync | Offline-first, local-only currently |
| Real-time collaboration | Multi-user | Single-user desktop app |

---

## 5. Technical Constraints

### 5.1 Architecture Constraints

| Constraint | Description |
|------------|-------------|
| 4-layer architecture | Presentation → IPC → Application → Infrastructure |
| Bounded contexts | Domain isolation enforced, no cross-domain imports |
| Type sync | Rust types → TypeScript must be synchronized |
| Migration idempotency | All migrations must be repeatable |

### 5.2 Security Constraints

| Constraint | Description |
|------------|-------------|
| Session token required | All protected commands validate session |
| RBAC enforcement | Role-based permissions checked per operation |
| Password hashing | Argon2id algorithm required |
| No secrets in code | Environment variables only |

### 5.3 Performance Constraints

| Constraint | Target |
|------------|--------|
| Query performance | Indexed columns for common queries |
| Offline-first | 100% operation without network |
| Bundle size | Analyzed via webpack bundle analyzer |

---

## 6. Gaps & Inconsistencies

### 6.1 Identified Gaps

| Gap | Priority | Notes |
|-----|----------|-------|
| 2FA implementation | Medium | Commands defined but no backend |
| Real-time sync | Low | Offline-first, cloud sync not planned |
| PDF generation for quotes | Medium | Quote export needs implementation |
| Full-text search | Low | Could enhance client/task search |

### 6.2 Code Quality Observations

| Area | Status | Notes |
|------|--------|-------|
| Type synchronization | ✅ Good | `types:sync` pipeline working |
| Bounded context validation | ✅ Good | `validate:bounded-contexts` script |
| Error handling | ✅ Good | Custom error types in each domain |
| Test coverage | ✅ Good | Unit, integration, and E2E tests |

---

## 7. Future Considerations

Based on code analysis, potential enhancements could include:

1. **Cloud synchronization** - While offline-first is current requirement
2. **Multi-tenant support** - Currently single-tenant
3. **Mobile companion app** - Web-based for field technicians
4. **Advanced reporting** - Custom report builder
5. **Integration with accounting software** - ERP connectors
