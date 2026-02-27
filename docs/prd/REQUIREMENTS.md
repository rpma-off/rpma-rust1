# Requirements Document - RPMA v2

## Overview

This document outlines the existing features, user stories, data models, integrations, and technical constraints of RPMA v2 based on analysis of the codebase.

---

## Existing Features

### 1. Authentication & Authorization

**Implemented:**
- ✅ User login with email and password
- ✅ Session-based authentication using JWT tokens
- ✅ Password hashing with Argon2
- ✅ Session validation and refresh
- ✅ Role-Based Access Control (RBAC) with 4 roles
- ✅ User logout
- ✅ 2FA support infrastructure (backup codes, verification)
- ✅ Session management (revoke sessions, timeout configuration)

**Not Fully Implemented:**
- ⚠️ 2FA enable/disable workflows (marked as NOT_IMPLEMENTED)
- ⚠️ Token refresh mechanism (marked as NOT_IMPLEMENTED)

---

### 2. Task Management

**Implemented:**
- ✅ Create, Read, Update, Delete (CRUD) operations for tasks
- ✅ Task status transitions (13 statuses: draft, scheduled, in_progress, completed, cancelled, on_hold, pending, invalid, archived, failed, overdue, assigned, paused)
- ✅ Priority levels (low, medium, high, urgent)
- ✅ Task assignment to technicians
- ✅ Task history tracking
- ✅ Task filtering and searching
- ✅ Task number auto-generation
- ✅ Vehicle information tracking (plate, make, model, year, VIN)
- ✅ PPF zones specification
- ✅ Task notes and tags
- ✅ Soft delete support

**Task Status Flow:**
```
draft → scheduled → assigned → in_progress → completed/cancelled/archived
   ↓         ↓          ↓
 on_hold   paused    overdue
```

---

### 3. PPF Intervention Workflow

**Implemented:**
- ✅ 4-step guided workflow:
  1. **Inspection** - Document pre-existing conditions, environment readings, defects
  2. **Preparation** - Surface cleaning, film cutting, material verification
  3. **Installation** - Zone-by-zone film application with quality scoring
  4. **Finalization** - Final quality check and client briefing
- ✅ Step-by-step progress tracking
- ✅ Checklist validation per step
- ✅ Required photos per step with metadata
- ✅ Quality scoring (0-100) per intervention and step
- ✅ Environmental data capture (temperature, humidity, GPS)
- ✅ Workflow state management
- ✅ Auto-save functionality (offline-first)

**Workflow Diagram:**
```
┌─────────────────────────────────────────────────────────────────┐
│                    PPF INTERVENTION WORKFLOW                    │
└─────────────────────────────────────────────────────────────────┘
       │                              │                          │
       ▼                              ▼                          ▼
┌──────────────┐              ┌──────────────┐          ┌──────────────┐
│  Inspection  │              │ Preparation  │          │ Installation │
│   (~12 min)  │              │  (~18 min)   │          │ (~45 min)    │
├──────────────┤              ├──────────────┤          ├──────────────┤
│ • Vehicle     │              │ • Wash       │          │ • 6 Zones    │
│   check       │              │ • Decontam-  │          │ • Film       │
│ • Temperature │              │   ination    │          │   apply      │
│ • Humidity    │              │ • Degreasing  │          │ • Quality    │
│ • Defects     │              │ • Masking    │          │   score      │
│   logging     │              │ • Film       │          │ • Per-zone   │
│ • 4+ photos   │              │   pre-cut    │          │   checklist  │
│ • Checklist   │              │ • Materials  │          │ • 6+ photos  │
│   (6 items)   │              │   check      │          └──────────────┘
└──────────────┘              └──────────────┘                 │
       │                              │                          │
       └──────────────┬───────────────┴──────────────────────┘
                      │
                      ▼
              ┌──────────────┐
              │ Finalization │
              │   (~8 min)   │
              ├──────────────┤
              │ • Quality    │
              │   checks    │
              │ • Photos     │
              │   (3+)       │
              │ • Client     │
              │   briefing   │
              │ • Checklist  │
              │   (6 items)  │
              └──────────────┘
```

---

### 4. Client Management

**Implemented:**
- ✅ Create, Read, Update, Delete (CRUD) for clients
- ✅ Client search (full-text search)
- ✅ Customer type classification (individual/business)
- ✅ Contact information (email, phone)
- ✅ Address management
- ✅ Company information (for business clients)
- ✅ Notes and tags
- ✅ Task history per client
- ✅ Statistics tracking (total, active, completed tasks)
- ✅ Soft delete support

---

### 5. Inventory & Material Management

**Implemented:**
- ✅ Material master data (SKU, name, description, type)
- ✅ Material categories with hierarchy
- ✅ Supplier management
- ✅ Stock tracking (current, minimum, maximum, reorder point)
- ✅ Stock adjustment operations
- ✅ Consumption tracking per intervention
- ✅ Inventory transactions (stock_in, stock_out, adjustment, transfer, waste, return)
- ✅ Low stock alerts
- ✅ Expired materials tracking
- ✅ Batch number and expiry date tracking
- ✅ Warehouse/location tracking
- ✅ Material statistics and reports

**Material Types:**
- PPF films
- Adhesives
- Cleaning solutions
- Tools & equipment
- Consumables

---

### 6. Quote Management

**Implemented:**
- ✅ Create, Read, Update, Delete (CRUD) for quotes
- ✅ Quote number auto-generation
- ✅ Quote to task conversion
- ✅ Line items (labor, material, service, discount)
- ✅ Tax calculation
- ✅ Total calculation (subtotal, tax, total)
- ✅ Quote status tracking (draft, sent, accepted, rejected, expired)
- ✅ Validity period
- ✅ PDF export (infrastructure ready)

---

### 7. Reporting & Analytics

**Implemented:**
- ✅ Task completion reports
- ✅ Technician performance reports
- ✅ Client analytics reports
- ✅ Quality compliance reports
- ✅ Material usage reports
- ✅ Geographic distribution reports
- ✅ System overview reports
- ✅ Seasonal analysis reports
- ✅ Operational intelligence reports
- ✅ Report generation (async)
- ✅ Export to CSV
- ✅ Export to PDF
- ✅ KPI dashboard (analytics_kpis table)

**Dashboard Metrics:**
- Task completion rate
- Average completion time
- Client satisfaction
- Material utilization
- Revenue per hour
- Quality score
- Inventory turnover
- First-time fix rate

---

### 8. Calendar & Scheduling

**Implemented:**
- ✅ Calendar event creation and management
- ✅ Event types (meeting, appointment, task, reminder)
- ✅ Task scheduling with date and time
- ✅ Conflict detection
- ✅ Recurring events
- ✅ Event reminders
- ✅ Technician calendar view
- ✅ Task calendar integration
- ✅ All-day events
- ✅ Timezone support

---

### 9. User Management

**Implemented:**
- ✅ Create, Read, Update, Delete (CRUD) for users
- ✅ User profiles (name, email, phone)
- ✅ Role management (admin, supervisor, technician, viewer)
- ✅ User activation/deactivation
- ✅ User preferences
- ✅ Password change
- ✅ User statistics
- ✅ First admin bootstrap

**Roles & Permissions:**

| Role | Tasks | Clients | Users | Settings |
|------|-------|---------|-------|----------|
| Admin | All | All | All | All |
| Supervisor | Create, Read, Update, Assign | Create, Read, Update | Read, Update | Read |
| Technician | Create, Read, Update own | Create, Read, Update own | Read/Update self | Read |
| Viewer | Read | Read | Read self | Read |

---

### 10. Photo & Document Management

**Implemented:**
- ✅ Photo upload to interventions
- ✅ Photo metadata capture (EXIF, GPS, camera info)
- ✅ Photo categorization (before, during, after)
- ✅ Photo quality scoring
- ✅ Required photos validation
- ✅ Photo approval workflow
- ✅ Photo storage references
- ✅ Zone-based photo organization

---

### 11. Notifications & Messaging

**Implemented:**
- ✅ In-app messages
- ✅ Message templates
- ✅ Notification preferences
- ✅ Recent activities feed
- ✅ Message status tracking (pending, sent, delivered, failed, read)
- ✅ Quiet hours
- ✅ Email frequency settings

**Message Channels:**
- Email
- SMS (infrastructure ready)
- In-app notifications

---

### 12. Settings Management

**Implemented:**
- ✅ Application settings
- ✅ User profile settings
- ✅ User preferences (theme, language, date/time format)
- ✅ Accessibility settings (high contrast, large text, reduce motion)
- ✅ Security settings (session timeout, 2FA)
- ✅ Performance settings (cache, offline mode)
- ✅ Notification preferences (per category)
- ✅ Session management (active sessions, revoke)
- ✅ Data consent (GDPR)
- ✅ User avatar upload

---

### 13. Offline-First & Synchronization

**Implemented:**
- ✅ SQLite local database with WAL mode
- ✅ Sync queue for offline operations
- ✅ Background sync service
- ✅ Sync metrics tracking
- ✅ Conflict resolution infrastructure
- ✅ Sync operation prioritization
- ✅ Batch sync operations
- ✅ Sync failure handling with retry

---

### 14. Audit & Security Logging

**Implemented:**
- ✅ Comprehensive audit log (audit_events table)
- ✅ User action tracking
- ✅ IP address logging
- ✅ User agent tracking
- ✅ Security alerts
- ✅ Event correlation IDs
- ✅ Security metrics

---

## User Stories

### Authentication

1. **US-AUTH-001:** As a new user, I want to create an account so that I can access the system.
2. **US-AUTH-002:** As a returning user, I want to log in with my email and password so that I can access my dashboard.
3. **US-AUTH-003:** As a security-conscious user, I want to enable 2FA so that my account is more secure.
4. **US-AUTH-004:** As a user, I want to log out so that I can securely end my session.
5. **US-AUTH-005:** As an admin, I want to revoke user sessions so that compromised accounts can be secured.

### Task Management

6. **US-TASK-001:** As a supervisor, I want to create a new task so that work can be assigned to technicians.
7. **US-TASK-002:** As a technician, I want to view my assigned tasks so that I can plan my work.
8. **US-TASK-003:** As a supervisor, I want to assign tasks to technicians so that work is distributed.
9. **US-TASK-004:** As a technician, I want to update task status so that progress is tracked.
10. **US-TASK-005:** As a manager, I want to view task history so that I can audit changes.
11. **US-TASK-006:** As a technician, I want to add notes to tasks so that I can document observations.
12. **US-TASK-007:** As a scheduler, I want to set task dates and times so that work is organized.
13. **US-TASK-008:** As a user, I want to filter and search tasks so that I can find specific tasks.

### PPF Workflow

14. **US-WORKFLOW-001:** As a technician, I want to start the PPF workflow so that I can follow the guided process.
15. **US-WORKFLOW-002:** As a technician, I want to complete the inspection step so that pre-existing conditions are documented.
16. **US-WORKFLOW-003:** As a technician, I want to complete the preparation step so that the surface is ready for film application.
17. **US-WORKFLOW-004:** As a technician, I want to complete the installation step so that PPF is applied correctly.
18. **US-WORKFLOW-005:** As a technician, I want to complete the finalization step so that quality is verified and client is briefed.
19. **US-WORKFLOW-006:** As a quality manager, I want to view quality scores so that work standards are maintained.
20. **US-WORKFLOW-007:** As a technician, I want to attach photos at each step so that work is documented.

### Client Management

21. **US-CLIENT-001:** As a staff member, I want to create a new client so that I can track customer information.
22. **US-CLIENT-002:** As a staff member, I want to search for clients so that I can quickly find customer records.
23. **US-CLIENT-003:** As a staff member, I want to view client history so that I can see past interventions.
24. **US-CLIENT-004:** As a staff member, I want to update client information so that records stay current.
25. **US-CLIENT-005:** As a manager, I want to see client statistics so that I can understand customer engagement.

### Inventory

26. **US-INVENTORY-001:** As a warehouse manager, I want to add new materials so that inventory is tracked.
27. **US-INVENTORY-002:** As a technician, I want to record material consumption so that stock is updated.
28. **US-INVENTORY-003:** As a warehouse manager, I want to adjust stock levels so that discrepancies are corrected.
29. **US-INVENTORY-004:** As a manager, I want to see low stock alerts so that reordering can happen timely.
30. **US-INVENTORY-005:** As a manager, I want to view inventory reports so that I can analyze material usage.

### Quotes

31. **US-QUOTE-001:** As a salesperson, I want to create a quote so that I can provide pricing to clients.
32. **US-QUOTE-002:** As a salesperson, I want to add line items to quotes so that pricing is detailed.
33. **US-QUOTE-003:** As a client, I want to review quotes so that I can make a decision.
34. **US-QUOTE-004:** As a scheduler, I want to convert quotes to tasks so that work can begin.
35. **US-QUOTE-005:** As a salesperson, I want to export quotes to PDF so that I can share them with clients.

### Reports & Analytics

36. **US-REPORT-001:** As a manager, I want to view performance reports so that I can assess technician efficiency.
37. **US-REPORT-002:** As a manager, I want to view task completion reports so that I can track productivity.
38. **US-REPORT-003:** As a manager, I want to view client analytics so that I can understand customer behavior.
39. **US-REPORT-004:** As a quality manager, I want to view quality compliance reports so that standards are maintained.
40. **US-REPORT-005:** As a manager, I want to export reports to CSV so that I can analyze data externally.

### Calendar & Scheduling

41. **US-CAL-001:** As a scheduler, I want to view the calendar so that I can see upcoming work.
42. **US-CAL-002:** As a scheduler, I want to create calendar events so that appointments are recorded.
43. **US-CAL-003:** As a scheduler, I want to check for conflicts so that double-booking is avoided.
44. **US-CAL-004:** As a technician, I want to see my calendar so that I can plan my day.
45. **US-CAL-005:** As a manager, I want to view team calendar so that I can coordinate work.

### User Management

46. **US-USER-001:** As an admin, I want to create users so that team members can access the system.
47. **US-USER-002:** As an admin, I want to assign roles so that permissions are controlled.
48. **US-USER-003:** As a user, I want to update my profile so that my information is current.
49. **US-USER-004:** As an admin, I want to deactivate users so that access can be revoked.
50. **US-USER-005:** As an admin, I want to reset user passwords so that account recovery is possible.

---

## Data Models

### Core Entities

#### Task
- **Fields:** id, task_number, title, description, vehicle_plate, vehicle_model, vehicle_year, vehicle_make, vin, ppf_zones, status, priority, technician_id, assigned_at, assigned_by, scheduled_date, start_time, end_time, workflow_id, current_workflow_step_id, client_id, customer_name, customer_email, customer_phone, customer_address, template_id, lot_film, checklist_completed, notes, tags, estimated_duration, actual_duration, deleted_at, deleted_by, synced, created_at, updated_at
- **Statuses:** 13 (draft, scheduled, in_progress, completed, cancelled, on_hold, pending, invalid, archived, failed, overdue, assigned, paused)
- **Priorities:** low, medium, high, urgent

#### Intervention
- **Fields:** id, task_id, status, vehicle_plate, vehicle_model, vehicle_make, vehicle_year, client_id, client_name, client_email, client_phone, technician_id, technician_name, current_step, completion_percentage, film_type, film_brand, film_model, scheduled_at, started_at, completed_at, paused_at, weather_condition, lighting_condition, temperature_celsius, humidity_percentage, start_location_lat, start_location_lon, end_location_lat, end_location_lon, customer_satisfaction, quality_score, task_number, synced, created_at, updated_at
- **Statuses:** pending, in_progress, paused, completed, cancelled

#### Client
- **Fields:** id, name, email, phone, customer_type, address_street, address_city, address_state, address_zip, address_country, tax_id, company_name, contact_person, notes, tags, total_tasks, active_tasks, completed_tasks, last_task_date, deleted_at, deleted_by, synced, created_at, updated_at

#### User
- **Fields:** id, email, username, password_hash, salt, first_name, last_name, full_name, role, phone, is_active, last_login_at, login_count, preferences, deleted_at, synced, created_at, updated_at
- **Roles:** admin, supervisor, technician, viewer

#### Material
- **Fields:** id, sku, name, description, material_type, category, subcategory, category_id, brand, model, specifications, unit_of_measure, current_stock, minimum_stock, maximum_stock, reorder_point, unit_cost, currency, supplier_id, supplier_name, supplier_sku, quality_grade, certification, expiry_date, batch_number, serial_numbers, is_active, is_discontinued, storage_location, warehouse_id, created_by, updated_by, synced, created_at, updated_at
- **Types:** ppf_film, adhesive, cleaning_solution, tool, consumable

#### Quote
- **Fields:** id, quote_number, client_id, task_id, status, valid_until, notes, terms, subtotal, tax_total, total, vehicle_plate, vehicle_make, vehicle_model, vehicle_year, vehicle_vin, created_by
- **Statuses:** draft, sent, accepted, rejected, expired

### Relationships

```
clients (1) ──< (N) tasks (1) ──< (1) interventions (1) ──< (N) intervention_steps (1) ──< (N) photos
clients (1) ──< (N) quotes
clients (1) ──< (N) messages
users (1) ──< (N) tasks (as technician)
users (1) ──< (N) interventions (as technician)
users (1) ──< (N) sessions
material_categories (1) ──< (N) materials
suppliers (1) ──< (N) materials
materials (1) ──< (N) inventory_transactions
materials (1) ──< (N) material_consumption
quotes (1) ──< (N) quote_items
```

---

## Third-Party Integrations

### Internal Integrations

| Integration | Purpose | Status |
|-------------|---------|--------|
| **Tauri IPC** | Frontend-backend communication | ✅ Implemented |
| **ts-rs** | TypeScript type generation from Rust | ✅ Implemented |
| **Zod** | Runtime validation | ✅ Implemented |
| **Argon2** | Password hashing | ✅ Implemented |
| **JWT (jose)** | Token generation/validation | ✅ Implemented |

### External APIs

| Integration | Purpose | Status |
|-------------|---------|--------|
| **Supabase** | Database/backend (fallback) | ⚠️ Partially integrated |
| **DigiCert Timestamp** | Code signing | ✅ Configured |
| **Geolocation API** | GPS coordinates for photos | ✅ Implemented |

---

## Technical Constraints

### Platform Constraints

- **Target Platforms:** Windows, macOS, Linux
- **Desktop-Only Application:** No web-based deployment
- **Local-First Architecture:** SQLite database (no external database required)
- **Offline-First:** Must work without internet connectivity

### Performance Constraints

- **Startup Time:** < 5 seconds
- **Page Load Time:** < 2 seconds
- **API Response Time:** < 500ms (p95)
- **Database Queries:** < 100ms for typical operations
- **Sync Operations:** Background, non-blocking

### Security Constraints

- **Passwords:** Minimum 8 characters, Argon2 hashing
- **Session Tokens:** JWT with 1-hour expiration
- **Session Storage:** Secure local storage
- **RBAC:** Mandatory for all protected operations
- **Audit Trail:** All user actions must be logged
- **CSP:** Content Security Policy enforced

### Data Constraints

- **Character Encoding:** UTF-8 only
- **Timestamp Format:** Unix epoch milliseconds (INTEGER) or ISO 8601 (TEXT)
- **Primary Keys:** TEXT (UUID) for most tables, INTEGER AUTOINCREMENT for some
- **Soft Deletes:** Cannot delete certain entities (must use soft delete)
- **Foreign Keys:** Cascading rules enforced (CASCADE, SET NULL, RESTRICT)

### Development Constraints

- **Type Safety:** Strict TypeScript, no `any` types allowed
- **Domain Boundaries:** No cross-domain imports (except via public API)
- **Layer Architecture:** 4-layer DDD (facade, application, domain, infrastructure)
- **Testing:** 70% code coverage threshold
- **Commit Convention:** Conventional commits enforced
- **Git Workflow:** No direct pushes to `main` branch

---

## Known Limitations & Gaps

### Authentication
- ⚠️ Token refresh not fully implemented
- ⚠️ 2FA enable/disable workflows incomplete
- ⚠️ Password reset flow not implemented

### Inventory
- ⚠️ Supplier ordering automation not implemented
- ⚠️ Stock forecasting not implemented

### Reports
- ⚠️ Custom report builder not implemented
- ⚠️ Scheduled reports not implemented

### Notifications
- ⚠️ SMS delivery not configured
- ⚠️ Email templates not fully customizable

### Sync
- ⚠️ Conflict resolution logic minimal
- ⚠️ Server sync endpoint not defined (client-side only)

---

## Compliance & Regulations

### Data Privacy (GDPR)

- ✅ User consent tracking (`user_consent` table)
- ✅ Data export functionality (`export_user_data`)
- ✅ Account deletion functionality (`delete_user_account`)
- ✅ Audit logging for compliance
- ✅ Session management with timeout

### Accessibility

- ✅ High contrast mode support
- ✅ Large text support
- ✅ Reduced motion support
- ✅ Screen reader support
- ✅ Keyboard navigation
- ✅ Focus management

---

## Performance Requirements

- **Support:** 1000+ concurrent users (desktop instances)
- **Database Size:** Up to 10GB SQLite database
- **Concurrent Operations:** 100+ simultaneous sync operations
- **Memory Usage:** < 500MB typical, < 1GB peak
- **Storage Growth:** ~100MB per 1000 interventions with photos

---

## Future Enhancements (Not Yet Implemented)

1. **Mobile App:** Native iOS/Android application
2. **Web Dashboard:** Optional web-based admin interface
3. **Multi-Tenancy:** Support for multiple organizations
4. **Advanced Analytics:** AI-powered predictions and insights
5. **Integration APIs:** REST API for third-party integrations
6. **Barcode/QR Scanning:** For inventory management
7. **Voice Notes:** Attach voice memos to tasks
8. **Video Support:** Attach videos to interventions
9. **Custom Workflows:** User-defined workflow templates
10. **Advanced Reporting:** Custom report builder with drag-and-drop

---

*Document Version: 1.0*
*Last Updated: Based on codebase analysis*
