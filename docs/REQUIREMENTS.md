# RPMA v2 - Requirements Document

## Table of Contents

- [Introduction](#introduction)
- [Functional Requirements](#functional-requirements)
- [User Stories](#user-stories)
- [Data Models](#data-models)
- [Technical Constraints](#technical-constraints)
- [Third-Party Integrations](#third-party-integrations)
- [Non-Functional Requirements](#non-functional-requirements)

## Introduction

This document outlines the complete functional requirements, user stories, data models, technical constraints, and third-party integrations for **RPMA v2** (Resource Planning & Management Application), a desktop application for managing Paint Protection Film (PPF) installation interventions.

### Application Purpose

RPMA v2 is an **offline-first hybrid desktop application** that enables PPF installation businesses to:
- Manage tasks and interventions from creation to completion
- Track clients and their intervention history
- Schedule technicians and resources via calendar system
- Maintain inventory of materials and supplies
- Generate comprehensive reports and analytics
- Ensure quality control and compliance
- Operate seamlessly in offline environments with automatic synchronization

### Target Users

| User Type | Role | Permissions |
|-----------|------|-------------|
| **Administrator** | `admin` | Full access to all features, user management, system configuration |
| **Supervisor** | `supervisor` | Create/read/update tasks and clients, view reports, manage technicians |
| **Technician** | `technician` | Create/read/update assigned tasks, execute interventions, upload photos |
| **Viewer** | `viewer` | Read-only access to all data, view reports |

## Functional Requirements

### FR1: Task Management

#### FR1.1: Task Creation

**Description**: Users can create new PPF installation tasks with comprehensive vehicle and client information.

**Functional Specifications**:

| Requirement | Detail |
|-------------|---------|
| **FR1.1.1** | Task must include: title, description (optional), vehicle plate, vehicle make/model/year, VIN, PPF zones, film type |
| **FR1.1.2** | Task must have status: draft, scheduled, in_progress, completed, cancelled, on_hold, pending, invalid, archived, failed, overdue, assigned, paused |
| **FR1.1.3** | Task must have priority: low, medium, high, urgent |
| **FR1.1.4** | Task can be linked to existing client or new client |
| **FR1.1.5** | Task must have scheduled date/time (optional in draft) |
| **FR1.1.6** | Task can be assigned to technician |
| **FR1.1.7** | Task supports custom PPF zones (JSON) |
| **FR1.1.8** | Task supports estimated duration in minutes |
| **FR1.1.9** | Task supports checklist completion flag |
| **FR1.1.10** | Task supports tags and notes |

**Validation Rules**:

- Vehicle plate: Required (max 50 characters)
- Vehicle make: Required (max 100 characters)
- Vehicle model: Required (max 100 characters)
- VIN: Optional (max 20 characters)
- Priority: Required, default "medium"
- Status: Required, default "draft"

#### FR1.2: Task Retrieval

**Description**: Users can retrieve tasks with various filtering and pagination options.

**Functional Specifications**:

| Requirement | Detail |
|-------------|---------|
| **FR1.2.1** | Get single task by ID |
| **FR1.2.2** | List tasks with pagination (page, page_size) |
| **FR1.2.3** | Filter tasks by status |
| **FR1.2.4** | Filter tasks by priority |
| **FR1.2.5** | Filter tasks by technician_id |
| **FR1.2.6** | Filter tasks by client_id |
| **FR1.2.7** | Filter tasks by date range (scheduled_date) |
| **FR1.2.8** | Sort tasks by any field (created_at, scheduled_date, priority, status) |
| **FR1.2.9** | Search tasks by title, description, vehicle plate |
| **FR1.2.10** | Get task statistics (total, by status, by priority, by technician) |

#### FR1.3: Task Update

**Description**: Users can update task details based on permissions.

**Functional Specifications**:

| Requirement | Detail |
|-------------|---------|
| **FR1.3.1** | Admin/Supervisor can update any task |
| **FR1.3.2** | Technician can update assigned tasks only |
| **FR1.3.3** | Status transitions must follow valid transitions |
| **FR1.3.4** | Update audit trail (who, when, what changed) |
| **FR1.3.5** | Task number is immutable |
| **FR1.3.6** | Soft delete support (deleted_at timestamp) |

**Valid Status Transitions**:

```
draft → scheduled → in_progress → completed
                    ↓          ↓
                   paused     cancelled
                    ↓
                 on_hold
```

#### FR1.4: Task Deletion

**Description**: Admin can delete tasks with audit trail.

**Functional Specifications**:

| Requirement | Detail |
|-------------|---------|
| **FR1.4.1** | Only Admin can delete tasks |
| **FR1.4.2** | Soft delete (deleted_at timestamp) |
| **FR1.4.3** | Cannot delete tasks with active interventions |
| **FR1.4.4** | Record deletion in audit log |

#### FR1.5: Task Assignment

**Description**: Tasks can be assigned to technicians with conflict detection.

**Functional Specifications**:

| Requirement | Detail |
|-------------|---------|
| **FR1.5.1** | Check if technician is available at scheduled time |
| **FR1.5.2** | Detect scheduling conflicts with other tasks |
| **FR1.5.3** | Assignment by Admin/Supervisor |
| **FR1.5.4** | Assignment history tracked (assigned_at, assigned_by) |
| **FR1.5.5** | Notification sent to assigned technician |

#### FR1.6: Task Actions

**Description**: Users can perform actions on tasks.

**Functional Specifications**:

| Action | Requirement |
|--------|-------------|
| **Delay Task** | **FR1.6.1**: Reschedule task with reason, requires justification |
| **Report Issue** | **FR1.6.2**: Log issue with task, notify supervisor |
| **Send Message** | **FR1.6.3**: Send message about task to client/technician |
| **Add Note** | **FR1.6.4**: Add notes to task, visible to authorized users |

### FR2: Intervention Management

#### FR2.1: Intervention Creation

**Description**: Users can start PPF intervention workflow for a task.

**Functional Specifications**:

| Requirement | Detail |
|-------------|---------|
| **FR2.1.1** | Only one active intervention per task |
| **FR2.1.2** | Intervention must be linked to task_id |
| **FR2.1.3** | Intervention types: ppf, ceramic, detailing, other |
| **FR2.1.4** | Intervention starts in "pending" status |
| **FR2.1.5** | Auto-captures vehicle info from task |
| **FR2.1.6** | Auto-captures client info from task |
| **FR2.1.7** | Supports custom intervention metadata (JSON) |

**Validation Rules**:

- Task must exist and not have active intervention
- Current step initialized to 0
- Completion percentage initialized to 0

#### FR2.2: Intervention Workflow

**Description**: Guided multi-step workflow for PPF installation.

**Functional Specifications**:

| Requirement | Detail |
|-------------|---------|
| **FR2.2.1** | Default workflow steps: Preparation, Inspection, Installation, Finalization |
| **FR2.2.2** | Custom workflow steps supported |
| **FR2.2.3** | Each step has: step_number, step_name, step_type, step_status |
| **FR2.2.4** | Step types: inspection, preparation, installation, finalization |
| **FR2.2.5** | Step statuses: pending, in_progress, paused, completed, failed, skipped, rework |
| **FR2.2.6** | Steps can be marked mandatory or optional |
| **FR2.2.7** | Steps can require photos (min/max limits) |
| **FR2.2.8** | Steps can require supervisor approval |
| **FR2.2.9** | Step duration tracked (started_at, completed_at, duration_seconds) |
| **FR2.2.10** | Steps support custom data (JSON) |

**Workflow Progression**:

```
Step 1 (Preparation) → Step 2 (Inspection) → Step 3 (Installation) → Step 4 (Finalization)
       ↓                          ↓                          ↓                          ↓
   Pending               In Progress              In Progress              In Progress
   → Completed          → Completed              → Completed              → Completed
```

#### FR2.3: Step Advancement

**Description**: Technicians can advance through workflow steps.

**Functional Specifications**:

| Requirement | Detail |
|-------------|---------|
| **FR2.3.1** | Cannot advance if current step not completed |
| **FR2.3.2** | Cannot advance if mandatory photos not captured |
| **FR2.3.3** | Cannot advance if step requires approval and not approved |
| **FR2.3.4** | Step completion auto-updates intervention progress |
| **FR2.3.5** | Support step skipping (if optional) |
| **FR2.3.6** | Support step rework (return to previous step) |
| **FR2.3.7** | GPS location captured per step (optional) |

#### FR2.4: Intervention Finalization

**Description**: Intervention completion with customer sign-off.

**Functional Specifications**:

| Requirement | Detail |
|-------------|---------|
| **FR2.4.1** | All mandatory steps must be completed |
| **FR2.4.2** | Customer signature captured (Base64) |
| **FR2.4.3** | Customer satisfaction rating (1-10) |
| **FR2.4.4** | Quality score (0-100) calculated |
| **FR2.4.5** | Final observations and comments |
| **FR2.4.6** | Actual duration recorded |
| **FR2.4.7** | Task status updated to "completed" |
| **FR2.4.8** | Intervention closed, no further edits |

#### FR2.5: Intervention Reporting

**Description**: Generate comprehensive intervention reports.

**Functional Specifications**:

| Requirement | Detail |
|-------------|---------|
| **FR2.5.1** | Export intervention details to PDF |
| **FR2.5.2** | Include all steps and photos |
| **FR2.5.3** | Include customer signature |
| **FR2.5.4** | Include quality scores and observations |
| **FR2.5.5** | Report saved to file system |

### FR3: Photo Management

#### FR3.1: Photo Upload

**Description**: Users can upload photos for interventions.

**Functional Specifications**:

| Requirement | Detail |
|-------------|---------|
| **FR3.1.1** | Photo must be linked to intervention_id |
| **FR3.1.2** | Photo can be linked to step_id |
| **FR3.1.3** | Photo types: before, during, after |
| **FR3.1.4** | Photo categories: vehicle_condition, workspace, step_progress, qc_check, final_result, other |
| **FR3.1.5** | Support photo metadata: GPS location, timestamp, device info |
| **FR3.1.6** | Validate photo requirements per step (min/max) |
| **FR3.1.7** | Image quality validation: blur score, exposure score, composition score |
| **FR3.1.8** | Support photo approval/rejection workflow |
| **FR3.1.9** | Upload retry logic with error tracking |

**Validation Rules**:

- File size: Max 50MB
- MIME types: image/jpeg, image/png, image/webp
- Dimensions: Min 640x480, Max 8192x8192
- GPS accuracy: Max 100m (configurable)
- GPS freshness: Max 10 minutes (configurable)

#### FR3.2: Photo Organization

**Description**: Photos organized by intervention, step, and category.

**Functional Specifications**:

| Requirement | Detail |
|-------------|---------|
| **FR3.2.1** | Photos displayed in gallery view |
| **FR3.2.2** | Filter photos by type, category, step |
| **FR3.2.3** | Zoom and pan in photo viewer |
| **FR3.2.4** | Download individual photos |
| **FR3.2.5** | Download all photos for intervention (ZIP) |
| **FR3.2.6** | Support photo annotations (text, shapes) |

#### FR3.3: Photo Storage

**Description**: Photos stored locally with optional cloud backup.

**Functional Specifications**:

| Requirement | Detail |
|-------------|---------|
| **FR3.3.1** | Local file system storage |
| **FR3.3.2** | Optional Google Cloud Storage backup |
| **FR3.3.3** | Storage URL tracked for cloud photos |
| **FR3.3.4** | Thumbnail generation for performance |
| **FR3.3.5** | Cache frequently accessed photos |

### FR4: Client Management

#### FR4.1: Client Creation

**Description**: Users can create client records.

**Functional Specifications**:

| Requirement | Detail |
|-------------|---------|
| **FR4.1.1** | Client types: individual, business |
| **FR4.1.2** | Required fields: name, customer_type |
| **FR4.1.3** | Optional fields: email, phone, address (street, city, state, zip, country) |
| **FR4.1.4** | Business-specific: company_name, contact_person, tax_id |
| **FR4.1.5** | Support tags and notes |
| **FR4.1.6** | Client statistics auto-calculated (total_tasks, active_tasks, completed_tasks, last_task_date) |

**Validation Rules**:

- Name: Required (2-100 characters)
- Email: Valid format if provided
- Phone: Valid format if provided
- Customer_type: Required

#### FR4.2: Client Retrieval

**Description**: Users can retrieve client records.

**Functional Specifications**:

| Requirement | Detail |
|-------------|---------|
| **FR4.2.1** | Get single client by ID |
| **FR4.2.2** | List clients with pagination |
| **FR4.2.3** | Filter clients by type |
| **FR4.2.4** | Filter clients by active status |
| **FR4.2.5** | Search clients by name, email, phone |
| **FR4.2.6** | Get client with tasks |
| **FR4.2.7** | Get client statistics |

#### FR4.3: Client Update

**Description**: Users can update client details.

**Functional Specifications**:

| Requirement | Detail |
|-------------|---------|
| **FR4.3.1** | Admin/Supervisor can update any client |
| **FR4.3.2** | Client type immutable (for data integrity) |
| **FR4.3.3** | Update audit trail |
| **FR4.3.4** | Soft delete support |

#### FR4.4: Client Statistics

**Description**: Client statistics maintained via triggers.

**Functional Specifications**:

| Requirement | Detail |
|-------------|---------|
| **FR4.4.1** | Total tasks count |
| **FR4.4.2** | Active tasks count (in_progress, scheduled) |
| **FR4.4.3** | Completed tasks count |
| **FR4.4.4** | Last task date |
| **FR4.4.5** | Statistics updated on task CRUD operations |

### FR5: Calendar & Scheduling

#### FR5.1: Calendar Views

**Description**: Multiple calendar views for scheduling.

**Functional Specifications**:

| Requirement | Detail |
|-------------|---------|
| **FR5.1.1** | Month view - Show all tasks in month |
| **FR5.1.2** | Week view - Show tasks by day in week |
| **FR5.1.3** | Day view - Detailed hourly schedule |
| **FR5.1.4** | Agenda view - List view of upcoming tasks |
| **FR5.1.5** | Navigation: previous/next, go to today |
| **FR5.1.6** | Jump to specific date |
| **FR5.1.7** | Highlight current day |
| **FR5.1.8** | Show task details on hover/click |

#### FR5.2: Task Scheduling

**Description**: Drag-and-drop scheduling interface.

**Functional Specifications**:

| Requirement | Detail |
|-------------|---------|
| **FR5.2.1** | Drag tasks to reschedule |
| **FR5.2.2** | Resize tasks to adjust duration |
| **FR5.2.3** | Click to view task details |
| **FR5.2.4** | Double-click to edit task |
| **FR5.2.5** | Create new tasks via quick add |
| **FR5.2.6** | Conflict detection and warning |
| **FR5.2.7** | Overlap visualization |

#### FR5.3: Calendar Filtering

**Description**: Filter calendar by various criteria.

**Functional Specifications**:

| Requirement | Detail |
|-------------|---------|
| **FR5.3.1** | Filter by technician |
| **FR5.3.2** | Filter by task status |
| **FR5.3.3** | Filter by priority |
| **FR5.3.4** | Filter by client |
| **FR5.3.5** | Filter by intervention type |
| **FR5.3.6** | Show my tasks only (for technicians) |
| **FR5.3.7** | Date range filtering |
| **FR5.3.8** | Save filter presets |

#### FR5.4: Conflict Detection

**Description**: Detect and manage scheduling conflicts.

**Functional Specifications**:

| Requirement | Detail |
|-------------|---------|
| **FR5.4.1** | Detect time overlap for same technician |
| **FR5.4.2** | Detect technician overload (too many tasks) |
| **FR5.4.3** | Visual conflict indicators |
| **FR5.4.4** | Conflict resolution suggestions |
| **FR5.4.5** | Conflict history tracking |

### FR6: Inventory Management

#### FR6.1: Material Management

**Description**: Track PPF materials and supplies.

**Functional Specifications**:

| Requirement | Detail |
|-------------|---------|
| **FR6.1.1** | Material types: ppf_film, adhesive, cleaning_solution, tool, consumable |
| **FR6.1.2** | Required fields: sku, name, material_type |
| **FR6.1.3** | Inventory tracking: current_stock, minimum_stock, maximum_stock, reorder_point |
| **FR6.1.4** | Cost tracking: unit_cost, currency |
| **FR6.1.5** | Supplier tracking: supplier_id, supplier_name |
| **FR6.1.6** | Quality tracking: quality_grade, certification |
| **FR6.1.7** | Expiry tracking: expiry_date |
| **FR6.1.8** | Batch tracking: batch_number, serial_numbers |
| **FR6.1.9** | Storage location tracking |
| **FR6.1.10** | Material categories and subcategories (hierarchical) |

**Validation Rules**:

- SKU: Required, unique, max 50 characters
- Name: Required, max 200 characters
- Current stock: Required, non-negative
- Unit cost: Non-negative if provided
- Expiry date: Must be future date if provided

#### FR6.2: Material Usage

**Description**: Track material consumption per intervention.

**Functional Specifications**:

| Requirement | Detail |
|-------------|---------|
| **FR6.2.1** | Record material usage per intervention step |
| **FR6.2.2** | Track quantity used, unit cost, total cost |
| **FR6.2.3** | Track waste quantity and reason |
| **FR6.2.4** | Track batch used and expiry |
| **FR6.2.5** | Auto-deduct from inventory |
| **FR6.2.6** | Generate material usage reports |

#### FR6.3: Inventory Transactions

**Description**: Track all inventory movements.

**Functional Specifications**:

| Requirement | Detail |
|-------------|---------|
| **FR6.3.1** | Transaction types: stock_in, stock_out, adjustment, transfer, waste, return |
| **FR6.3.2** | Track previous_stock and new_stock |
| **FR6.3.3** | Reference tracking (task_id, intervention_id) |
| **FR6.3.4** | Performer tracking (who made the change) |
| **FR6.3.5** | Timestamp tracking |
| **FR6.3.6** | Full audit trail |

#### FR6.4: Supplier Management

**Description**: Manage material suppliers.

**Functional Specifications**:

| Requirement | Detail |
|-------------|---------|
| **FR6.4.1** | Supplier contact information (name, email, phone, website) |
| **FR6.4.2** | Supplier address |
| **FR6.4.3** | Business details (tax_id, business_license) |
| **FR6.4.4** | Payment terms and lead time |
| **FR6.4.5** | Supplier ratings (quality, delivery) |
| **FR6.4.6** | Preferred supplier flag |
| **FR6.4.7** | On-time delivery rate tracking |

#### FR6.5: Low Stock Alerts

**Description**: Notify when materials need reordering.

**Functional Specifications**:

| Requirement | Detail |
|-------------|---------|
| **FR6.5.1** | Identify materials below reorder_point |
| **FR6.5.2** | Identify expired materials |
| **FR6.5.3** | Generate low stock reports |
| **FR6.5.4** | Send alerts to administrators |
| **FR6.5.5** | Auto-suggest reorder quantities |

### FR7: Reporting & Analytics

#### FR7.1: Task Completion Reports

**Description**: Report on task completion metrics.

**Functional Specifications**:

| Requirement | Detail |
|-------------|---------|
| **FR7.1.1** | Total tasks completed in period |
| **FR7.1.2** | Completion rate (completed / scheduled) |
| **FR7.1.3** | Average completion time |
| **FR7.1.4** | Tasks overdue count |
| **FR7.1.5** | Breakdown by status |
| **FR7.1.6** | Breakdown by technician |
| **FR7.1.7** | Trend analysis over time |
| **FR7.1.8** | Export to CSV, Excel, PDF |

#### FR7.2: Technician Performance Reports

**Description**: Report on technician productivity and quality.

**Functional Specifications**:

| Requirement | Detail |
|-------------|---------|
| **FR7.2.1** | Tasks completed count |
| **FR7.2.2** | Average task duration |
| **FR7.2.3** | Quality scores |
| **FR7.2.4** | Customer satisfaction ratings |
| **FR7.2.5** | On-time completion rate |
| **FR7.2.6** | Material usage efficiency |
| **FR7.2.7** | Comparison to benchmarks |
| **FR7.2.8** | Export to CSV, Excel, PDF |

#### FR7.3: Client Analytics Reports

**Description**: Report on client behavior and value.

**Functional Specifications**:

| Requirement | Detail |
|-------------|---------|
| **FR7.3.1** | Total clients |
| **FR7.3.2** | New clients in period |
| **FR7.3.3** | Client retention rate |
| **FR7.3.4** | Top clients by revenue/tasks |
| **FR7.3.5** | Average tasks per client |
| **FR7.3.6** | Client satisfaction scores |
| **FR7.3.7** | Geographic distribution |
| **FR7.3.8** | Export to CSV, Excel, PDF |

#### FR7.4: Quality Compliance Reports

**Description**: Report on quality metrics and compliance.

**Functional Specifications**:

| Requirement | Detail |
|-------------|---------|
| **FR7.4.1** | Quality score distribution |
| **FR7.4.2** | Pass/fail rates per checkpoint |
| **FR7.4.3** | Rework rate |
| **FR7.4.4** | Customer complaints |
| **FR7.4.5** | Issues by type |
| **FR7.4.6** | Trend analysis |
| **FR7.4.7** | Export to CSV, Excel, PDF |

#### FR7.5: Material Usage Reports

**Description**: Report on material consumption and costs.

**Functional Specifications**:

| Requirement | Detail |
|-------------|---------|
| **FR7.5.1** | Material consumption by type |
| **FR7.5.2** | Cost analysis per intervention |
| **FR7.5.3** | Waste percentage |
| **FR7.5.4** | Inventory turnover |
| **FR7.5.5** | Reorder recommendations |
| **FR7.5.6** | Supplier performance |
| **FR7.5.7** | Export to CSV, Excel, PDF |

#### FR7.6: Geographic Reports

**Description**: Report on geographic distribution of interventions.

**Functional Specifications**:

| Requirement | Detail |
|-------------|---------|
| **FR7.6.1** | Interventions by location |
| **FR7.6.2** | Map visualization |
| **FR7.6.3** | Distance analysis |
| **FR7.6.4** | Service area coverage |
| **FR7.6.5** | Cluster analysis |
| **FR7.6.6** | Export to CSV, Excel, PDF |

#### FR7.7: Analytics Dashboard

**Description**: Real-time KPI dashboard.

**Functional Specifications**:

| Requirement | Detail |
|-------------|---------|
| **FR7.7.1** | Total tasks (today, week, month) |
| **FR7.7.2** | Completion rate |
| **FR7.7.3** | Active interventions |
| **FR7.7.4** | Overdue tasks |
| **FR7.7.5** | Average quality score |
| **FR7.7.6** | Top technicians |
| **FR7.7.7** | Top clients |
| **FR7.7.8** | Material stock levels |
| **FR7.7.9** | Upcoming schedule |
| **FR7.7.10** | Recent activities |

### FR8: User Management

#### FR8.1: User Creation

**Description**: Admin can create user accounts.

**Functional Specifications**:

| Requirement | Detail |
|-------------|---------|
| **FR8.1.1** | Required fields: email, username, full_name, password, role |
| **FR8.1.2** | Roles: admin, supervisor, technician, viewer |
| **FR8.1.3** | Email must be unique |
| **FR8.1.4** | Username must be unique |
| **FR8.1.5** | Password strength requirements (min 8 chars, 3 of 4 char types) |
| **FR8.1.6** | User auto-activated on creation |
| **FR8.1.7** | Support initial admin bootstrapping |

#### FR8.2: User Authentication

**Description**: Users can authenticate with email/password.

**Functional Specifications**:

| Requirement | Detail |
|-------------|---------|
| **FR8.2.1** | Login with email and password |
| **FR8.2.2** | Password hashed with Argon2 |
| **FR8.2.3** | Session tokens issued on successful login |
| **FR8.2.4** | Session timeout (configurable) |
| **FR8.2.5** | Session refresh via refresh token |
| **FR8.2.6** | Account lockout after failed attempts (configurable) |
| **FR8.2.7** | Last login timestamp tracking |
| **FR8.2.8** | Login count tracking |

#### FR8.3: Two-Factor Authentication

**Description**: Optional 2FA for enhanced security.

**Functional Specifications**:

| Requirement | Detail |
|-------------|---------|
| **FR8.3.1** | TOTP-based 2FA (Google Authenticator compatible) |
| **FR8.3.2** | QR code generation for easy setup |
| **FR8.3.3** | Backup codes for recovery |
| **FR8.3.4** | Regenerate backup codes |
| **FR8.3.5** | 2FA verification during login |
| **FR8.3.6** | Disable 2FA with password verification |

#### FR8.4: User Update

**Description**: Users can update their profile; Admin can update any user.

**Functional Specifications**:

| Requirement | Detail |
|-------------|---------|
| **FR8.4.1** | Profile fields: full_name, email, phone |
| **FR8.4.2** | Role change (Admin only) |
| **FR8.4.3** | Activate/deactivate users (Admin only) |
| **FR8.4.4** | Change password (self or Admin) |
| **FR8.4.5** | Avatar upload |
| **FR8.4.6** | Update preferences (theme, language, etc.) |
| **FR8.4.7** | Update notification preferences |

#### FR8.5: User Deletion

**Description**: Admin can delete user accounts.

**Functional Specifications**:

| Requirement | Detail |
|-------------|---------|
| **FR8.5.1** | Only Admin can delete users |
| **FR8.5.2** | Cannot delete yourself |
| **FR8.5.3** | Reassign tasks before deletion |
| **FR8.5.4** | Soft delete with audit trail |

### FR9: Messaging & Notifications

#### FR9.1: Internal Messaging

**Description**: Users can send messages to each other.

**Functional Specifications**:

| Requirement | Detail |
|-------------|---------|
| **FR9.1.1** | Message types: in_app, email, sms |
| **FR9.1.2** | Send from user to user |
| **FR9.1.3** | Subject and body fields |
| **FR9.1.4** | Link to task/client/intervention |
| **FR9.1.5** | Message status tracking (pending, sent, delivered, failed, read) |
| **FR9.1.6** | Message history |
| **FR9.1.7** | Mark as read |

#### FR9.2: Message Templates

**Description**: Pre-defined message templates for common communications.

**Functional Specifications**:

| Requirement | Detail |
|-------------|---------|
| **FR9.2.1** | Template categories: general, task, client, system, reminder |
| **FR9.2.2** | Variable substitution (e.g., {client_name}, {task_number}) |
| **FR9.2.3** | Template active/inactive |
| **FR9.2.4** | CRUD operations on templates (Admin) |

#### FR9.3: Notifications

**Description**: System notifications for important events.

**Functional Specifications**:

| Requirement | Detail |
|-------------|---------|
| **FR9.3.1** | Notification events: task_assigned, task_updated, task_completed, task_overdue, client_created, client_updated, system_alerts, maintenance_notifications |
| **FR9.3.2** | Notification channels: email, sms, in_app |
| **FR9.3.3** | User notification preferences per event type |
| **FR9.3.4** | Quiet hours (no notifications) |
| **FR9.3.5** | Email digest (immediate, daily, weekly) |
| **FR9.3.6** | Notification history |

#### FR9.4: Email Notifications

**Description**: Email integration for notifications.

**Functional Specifications**:

| Requirement | Detail |
|-------------|---------|
| **FR9.4.1** | Support SendGrid provider |
| **FR9.4.2** | Support Mailgun provider |
| **FR9.4.3** | Configure API key, from email, from name |
| **FR9.4.4** | Email templates with HTML support |
| **FR9.4.5** | Batching for efficiency |

#### FR9.5: SMS Notifications

**Description**: SMS integration for urgent notifications.

**Functional Specifications**:

| Requirement | Detail |
|-------------|---------|
| **FR9.5.1** | Support Twilio provider |
| **FR9.5.2** | Support AWS SNS provider |
| **FR9.5.3** | Configure API key, from number |
| **FR9.5.4** | SMS templates (text only) |
| **FR9.5.5** | Character limit tracking |

### FR10: Audit & Compliance

#### FR10.1: Audit Logging

**Description**: Comprehensive audit trail of all system actions.

**Functional Specifications**:

| Requirement | Detail |
|-------------|---------|
| **FR10.1.1** | Log all CRUD operations |
| **FR10.1.2** | Track user_id, action, resource_type, resource_id |
| **FR10.1.3** | Track timestamp, IP address, user_agent |
| **FR10.1.4** | Track previous_state and new_state (JSON) |
| **FR10.1.5** | Track result (success/failure) |
| **FR10.1.6** | Correlation ID for request tracking |
| **FR10.1.7** | Metadata for additional context |
| **FR10.1.8** | Query audit logs by filters |
| **FR10.1.9** | Export audit logs |

#### FR10.2: Task History

**Description**: Track task status changes.

**Functional Specifications**:

| Requirement | Detail |
|-------------|---------|
| **FR10.2.1** | Record every status change |
| **FR10.2.2** | Track old_status, new_status, reason |
| **FR10.2.3** | Track who made the change (changed_by) |
| **FR10.2.4** | Track timestamp |
| **FR10.2.5** | Display task history in UI |
| **FR10.2.6** | Export task history |

#### FR10.3: Settings Audit

**Description**: Track changes to user settings.

**Functional Specifications**:

| Requirement | Detail |
|-------------|---------|
| **FR10.3.1** | Track changes to profile, preferences, security, accessibility, notifications, performance |
| **FR10.3.2** | Track user_id, setting_type, details (JSON) |
| **FR10.3.3** | Track timestamp, IP address |
| **FR10.3.4** | Query settings audit log |

### FR11: Synchronization

#### FR11.1: Offline-First Operation

**Description**: Application works offline with sync queue.

**Functional Specifications**:

| Requirement | Detail |
|-------------|---------|
| **FR11.1.1** | All CRUD operations queued when offline |
| **FR11.1.2** | Sync queue supports: create, update, delete |
| **FR11.1.3** | Track entity_type, entity_id, data (JSON) |
| **FR11.1.4** | Track dependencies between operations |
| **FR11.1.5** | Retry logic with exponential backoff |
| **FR11.1.6** | Max retries configurable (default 3) |
| **FR11.1.7** | Track operation status: pending, processing, completed, failed, abandoned |
| **FR11.1.8** | Track errors for failed operations |

#### FR11.2: Background Sync

**Description**: Automatic synchronization service.

**Functional Specifications**:

| Requirement | Detail |
|-------------|---------|
| **FR11.2.1** | Configurable sync interval |
| **FR11.2.2** | Manual sync trigger |
| **FR11.2.3** | Sync status indicator in UI |
| **FR11.2.4** | Sync metrics (pending, completed, failed) |
| **FR11.2.5** | Start/stop background sync service |
| **FR11.2.6** | Handle dependencies in correct order |

#### FR11.3: Sync Status

**Description**: Track synchronization status.

**Functional Specifications**:

| Requirement | Detail |
|-------------|---------|
| **FR11.3.1** | Per-entity sync status (synced flag) |
| **FR11.3.2** | Last synced timestamp |
| **FR11.3.3** | Sync error tracking |
| **FR11.3.4** | Sync queue metrics |

### FR12: System Management

#### FR12.1: Health Checks

**Description**: System health monitoring.

**Functional Specifications**:

| Requirement | Detail |
|-------------|---------|
| **FR12.1.1** | Application health check |
| **FR12.1.2** | Database status check |
| **FR12.1.3** | Database statistics (size, row counts) |
| **FR12.1.4** | Connection pool health |
| **FR12.1.5** | App info (version, build) |
| **FR12.1.6** | Device info (OS, architecture) |

#### FR12.2: Database Maintenance

**Description**: Database optimization tools.

**Functional Specifications**:

| Requirement | Detail |
|-------------|---------|
| **FR12.2.1** | Database vacuum (optimize storage) |
| **FR12.2.2** | Database diagnostics |
| **FR12.2.3** | Migration health check |
| **FR12.2.4** | Backup database |

#### FR12.3: Performance Monitoring

**Description**: Track application performance.

**Functional Specifications**:

| Requirement | Detail |
|-------------|---------|
| **FR12.3.1** | IPC command performance tracking |
| **FR12.3.2** | Slow query detection (threshold: 100ms) |
| **FR12.3.3** | Performance metrics storage |
| **FR12.3.4** | Performance reports |
| **FR12.3.5** | Cache statistics |

#### FR12.4: Security Monitoring

**Description**: Security event tracking.

**Functional Specifications**:

| Requirement | Detail |
|-------------|---------|
| **FR12.4.1** | Security metrics (failed logins, suspicious activity) |
| **FR12.4.2** | Security event logging |
| **FR12.4.3** | Security alerts |
| **FR12.4.4** | Active session tracking |
| **FR12.4.5** | Session revocation |
| **FR12.4.6** | Session timeout configuration |

#### FR12.5: Caching

**Description**: In-memory caching for performance.

**Functional Specifications**:

| Requirement | Detail |
|-------------|---------|
| **FR12.5.1** | Cache types: query_result, image_thumbnail, computed_analytics, api_response |
| **FR12.5.2** | Cache backends: memory, disk, redis |
| **FR12.5.3** | Configurable TTL |
| **FR12.5.4** | Cache statistics (hit/miss ratio) |
| **FR12.5.5** | Cache clearing by type |
| **FR12.5.6** | Expired cache auto-cleanup |

## User Stories

### Epic: Task Management

| Story ID | As a | I want to | So that | Acceptance Criteria |
|----------|------|----------|---------|---------------------|
| **US1.1** | Administrator | Create new tasks with vehicle and client information | Track PPF installation work | - Task form with all required fields<br>- Support linking to existing/new client<br>- Task auto-assigned unique number |
| **US1.2** | Administrator | Assign tasks to technicians | Ensure proper workload distribution | - Select technician from list<br>- Conflict detection<br>- Notification sent to technician |
| **US1.3** | Technician | View my assigned tasks | Know what I need to do | - Filter tasks by assigned technician<br>- See task status, priority, schedule |
| **US1.4** | Supervisor | View all tasks | Monitor overall work progress | - View all tasks with filters<br>- See task statistics |
| **US1.5** | Administrator | Delay a task with reason | Reschedule when issues arise | - Select new date/time<br>- Provide reason<br>- Update task audit trail |

### Epic: Intervention Workflow

| Story ID | As a | I want to | So that | Acceptance Criteria |
|----------|------|----------|---------|---------------------|
| **US2.1** | Technician | Start intervention for a task | Begin guided PPF installation | - Only one active intervention per task<br>- Auto-load vehicle and client info<br>- Initialize workflow steps |
| **US2.2** | Technician | Follow step-by-step workflow | Ensure proper installation process | - Clear step instructions<br>- Track step progress<br>- Block advancement until step complete |
| **US2.3** | Technician | Capture photos for each step | Document installation process | - Upload photos to step<br>- Validate photo quality<br>- Meet minimum photo requirements |
| **US2.4** | Technician | Get supervisor approval for critical steps | Ensure quality control | - Request approval<br>- Supervisor can approve/reject<br>- Cannot advance until approved |
| **US2.5** | Technician | Finalize intervention with customer signature | Complete the installation | - All steps completed<br>- Capture customer signature<br>- Rate satisfaction<br>- Record quality score |
| **US2.6** | Supervisor | View intervention progress | Monitor work quality and progress | - See active interventions<br>- View step status and photos<br>- View GPS location |

### Epic: Photo Management

| Story ID | As a | I want to | So that | Acceptance Criteria |
|----------|------|----------|---------|---------------------|
| **US3.1** | Technician | Upload photos to intervention | Document installation | - Upload from device<br>- Tag with type/category<br>- GPS tagging optional |
| **US3.2** | Supervisor | Review and approve photos | Ensure quality standards | - View photo gallery<br>- Approve/reject photos<br>- Add annotations |
| **US3.3** | Technician | View photo gallery | Access all intervention photos | - Filter by type/step<br>- Zoom and pan<br>- Download individual/all |
| **US3.4** | Administrator | Backup photos to cloud | Protect against data loss | - Configure GCS storage<br>- Upload automatically<br>- Track backup status |

### Epic: Client Management

| Story ID | As a | I want to | So that | Acceptance Criteria |
|----------|------|----------|---------|---------------------|
| **US4.1** | Administrator | Create client records | Maintain customer database | - Individual/business types<br>- Contact information<br>- Address tracking |
| **US4.2** | Supervisor | View client history | Understand customer value | - See all tasks for client<br>- View client statistics<br>- See intervention history |
| **US4.3** | Administrator | Update client information | Keep records current | - Edit client details<br>- Audit trail of changes |

### Epic: Calendar & Scheduling

| Story ID | As a | I want to | So that | Acceptance Criteria |
|----------|------|----------|---------|---------------------|
| **US5.1** | Administrator | View tasks in calendar | Visualize schedule | - Month/Week/Day/Agenda views<br>- See task details<br>- Navigate dates |
| **US5.2** | Administrator | Drag tasks to reschedule | Easily adjust schedule | - Drag to new date/time<br>- Resize to adjust duration<br>- Conflict detection |
| **US5.3** | Supervisor | Filter calendar | Focus on specific area | - Filter by technician<br>- Filter by status/priority<br>- Filter by date range |
| **US5.4** | Administrator | Create tasks via calendar | Quick task creation | - Click to create<br>- Enter basic details<br>- Save to calendar |

### Epic: Inventory Management

| Story ID | As a | I want to | So that | Acceptance Criteria |
|----------|------|----------|---------|---------------------|
| **US6.1** | Administrator | Track material inventory | Know stock levels | - Add materials with SKU<br>- Track current stock<br>- Set reorder points |
| **US6.2** | Administrator | Record material usage | Track costs and consumption | - Record usage per intervention<br>- Auto-deduct from inventory<br>- Track waste |
| **US6.3** | Administrator | Manage suppliers | Source materials effectively | - Add supplier information<br>- Track supplier performance<br>- Link to materials |
| **US6.4** | Administrator | Receive low stock alerts | Avoid stockouts | - Automatic alerts when below reorder point<br>- View low stock report |

### Epic: Reporting & Analytics

| Story ID | As a | I want to | So that | Acceptance Criteria |
|----------|------|----------|---------|---------------------|
| **US7.1** | Supervisor | View analytics dashboard | Monitor key metrics | - Real-time KPIs<br>- Visual charts<br>- Customizable date range |
| **US7.2** | Administrator | Generate task completion report | Analyze productivity | - Select date range<br>- Apply filters<br>- Export to PDF/Excel |
| **US7.3** | Supervisor | View technician performance | Evaluate team performance | - Performance metrics<br>- Quality scores<br>- Comparison charts |
| **US7.4** | Administrator | Generate quality compliance report | Ensure standards met | - Quality metrics<br>- Pass/fail rates<br>- Trend analysis |
| **US7.5** | Administrator | View material usage report | Track costs | - Usage by material type<br>- Cost analysis<br>- Waste percentage |

### Epic: User Management

| Story ID | As a | I want to | So that | Acceptance Criteria |
|----------|------|----------|---------|---------------------|
| **US8.1** | Administrator | Create user accounts | Grant access to system | - Enter user details<br>- Assign role<br>- Set initial password |
| **US8.2** | Administrator | Manage user roles | Control access levels | - Change user role<br>- Activate/deactivate users |
| **US8.3** | User | Change my password | Maintain security | - Enter old and new password<br>- Password strength validation |
| **US8.4** | User | Enable 2FA | Add extra security | - Setup with QR code<br>- Enter verification code<br>- Save backup codes |
| **US8.5** | Administrator | View user activity | Monitor system usage | - See last login<br>- View login count<br>- See active sessions |

### Epic: Messaging & Notifications

| Story ID | As a | I want to | So that | Acceptance Criteria |
|----------|------|----------|---------|---------------------|
| **US9.1** | User | Send messages to colleagues | Communicate about tasks | - Select recipient<br>- Compose message<br>- Link to task/client |
| **US9.2** | User | Configure notification preferences | Control what I receive | - Enable/disable per event type<br>- Choose channels (email/sms/in_app)<br>- Set quiet hours |
| **US9.3** | Administrator | Configure email provider | Send email notifications | - Enter API key<br>- Set from address<br>- Test configuration |
| **US9.4** | User | Receive task assignment notification | Know when I'm assigned | - In-app notification<br>- Email notification (if enabled)<br>- Link to task |
| **US9.5** | User | Use message templates | Send consistent communications | - Select template<br>- Auto-fill variables<br>- Send to recipient |

### Epic: Audit & Compliance

| Story ID | As a | I want to | So that | Acceptance Criteria |
|----------|------|----------|---------|---------------------|
| **US10.1** | Administrator | View audit log | See all system changes | - Filter by user, date, action<br>- View before/after states<br>- Export log |
| **US10.2** | Supervisor | View task history | Track status changes | - See all status changes<br>- View change reasons<br>- View who made changes |
| **US10.3** | Administrator | View settings audit | Track configuration changes | - See all settings changes<br>- View change details<br>- Filter by user/date |

### Epic: Synchronization

| Story ID | As a | I want to | So that | Acceptance Criteria |
|----------|------|----------|---------|---------------------|
| **US11.1** | User | Work offline | Continue without internet | - All features work offline<br>- Changes queued for sync |
| **US11.2** | User | Sync when online | Share changes with others | - Manual sync button<br>- Auto-sync when online<br>- View sync status |
| **US11.3** | Administrator | View sync queue | Monitor synchronization | - See pending operations<br>- See failed operations<br>- Retry failed operations |
| **US11.4** | User | See sync status | Know if I'm up to date | - Status indicator in UI<br>- Last synced time<br>- Sync progress |

### Epic: System Management

| Story ID | As a | I want to | So that | Acceptance Criteria |
|----------|------|----------|---------|---------------------|
| **US12.1** | Administrator | Check system health | Monitor application status | - Health check endpoint<br>- Database status<br>- Connection pool health |
| **US12.2** | Administrator | Optimize database | Improve performance | - Run database vacuum<br>- View database stats<br>- Backup database |
| **US12.3** | Administrator | View performance metrics | Identify bottlenecks | - IPC command performance<br>- Slow query detection<br>- Performance reports |
| **US12.4** | Administrator | View security metrics | Monitor security incidents | - Failed login attempts<br>- Security events<br>- Security alerts |
| **US12.5** | Administrator | Manage cache | Improve response times | - View cache statistics<br>- Clear cache by type<br>- Configure cache settings |

## Data Models

### Core Entities

#### 1. Task

```typescript
interface Task {
  id: string;                          // UUID
  task_number: string;                  // Unique identifier
  title: string;
  description?: string;

  // Vehicle information
  vehicle_plate?: string;
  vehicle_model?: string;
  vehicle_year?: string;
  vehicle_make?: string;
  vin?: string;

  // PPF configuration
  ppf_zones?: string;                   // JSON array
  custom_ppf_zones?: string;            // JSON array

  // Status and priority
  status: TaskStatus;                   // enum
  priority: TaskPriority;               // enum

  // Assignment
  technician_id?: string;
  assigned_at?: number;                 // Unix timestamp
  assigned_by?: string;

  // Scheduling
  scheduled_date?: string;              // YYYY-MM-DD
  start_time?: string;                 // HH:MM
  end_time?: string;                   // HH:MM
  date_rdv?: string;                   // YYYY-MM-DD
  heure_rdv?: string;                  // HH:MM

  // Workflow
  template_id?: string;
  workflow_id?: string;
  workflow_status?: string;
  current_workflow_step_id?: string;
  started_at?: number;                 // Unix timestamp
  completed_at?: number;                // Unix timestamp
  completed_steps?: string;            // JSON array

  // Client
  client_id?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;

  // Other
  external_id?: string;
  lot_film?: string;
  checklist_completed: number;         // 0 or 1
  notes?: string;
  tags?: string;                       // JSON array
  estimated_duration?: number;          // minutes
  actual_duration?: number;             // minutes

  // Audit
  created_at: number;                  // Unix timestamp
  updated_at: number;                  // Unix timestamp
  creator_id?: string;
  created_by?: string;
  updated_by?: string;
  deleted_at?: number;
  deleted_by?: string;
  synced: number;                      // 0 or 1
  last_synced_at?: number;
}

enum TaskStatus {
  Draft = 'draft',
  Scheduled = 'scheduled',
  InProgress = 'in_progress',
  Completed = 'completed',
  Cancelled = 'cancelled',
  OnHold = 'on_hold',
  Pending = 'pending',
  Invalid = 'invalid',
  Archived = 'archived',
  Failed = 'failed',
  Overdue = 'overdue',
  Assigned = 'assigned',
  Paused = 'paused'
}

enum TaskPriority {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  Urgent = 'urgent'
}
```

#### 2. Intervention

```typescript
interface Intervention {
  id: string;
  task_id: string;
  task_number: string;

  // Status
  status: InterventionStatus;
  intervention_type: InterventionType;
  current_step: number;                // 0-based
  completion_percentage: number;        // 0-100

  // Vehicle
  vehicle_plate: string;
  vehicle_model?: string;
  vehicle_make?: string;
  vehicle_year?: number;
  vehicle_color?: string;
  vehicle_vin?: string;

  // Client
  client_id?: string;
  client_name?: string;
  client_email?: string;
  client_phone?: string;

  // Technician
  technician_id?: string;
  technician_name?: string;

  // PPF Configuration
  ppf_zones_config?: string;          // JSON array
  ppf_zones_extended?: string;       // JSON array
  film_type?: string;
  film_brand?: string;
  film_model?: string;

  // Temporality
  scheduled_at?: number;
  started_at?: number;
  completed_at?: number;
  paused_at?: number;
  estimated_duration?: number;         // minutes
  actual_duration?: number;            // minutes

  // Environment
  weather_condition?: WeatherCondition;
  lighting_condition?: LightingCondition;
  work_location?: WorkLocation;
  temperature_celsius?: number;
  humidity_percentage?: number;

  // GPS
  start_location_lat?: number;
  start_location_lon?: number;
  start_location_accuracy?: number;
  end_location_lat?: number;
  end_location_lon?: number;
  end_location_accuracy?: number;

  // Finalization
  customer_satisfaction?: number;     // 1-10
  quality_score?: number;              // 0-100
  final_observations?: string;        // JSON array
  customer_signature?: string;         // Base64
  customer_comments?: string;

  // Metadata
  metadata?: string;                  // JSON
  notes?: string;
  special_instructions?: string;
  device_info?: string;               // JSON
  app_version?: string;

  // Sync
  synced: number;
  last_synced_at?: number;
  sync_error?: string;

  // Audit
  created_at: number;
  updated_at: number;
  created_by?: string;
  updated_by?: string;
}

enum InterventionStatus {
  Pending = 'pending',
  InProgress = 'in_progress',
  Paused = 'paused',
  Completed = 'completed',
  Cancelled = 'cancelled'
}

enum InterventionType {
  PPF = 'ppf',
  Ceramic = 'ceramic',
  Detailing = 'detailing',
  Other = 'other'
}

enum WeatherCondition {
  Sunny = 'sunny',
  Cloudy = 'cloudy',
  Rainy = 'rainy',
  Foggy = 'foggy',
  Windy = 'windy'
}

enum LightingCondition {
  Natural = 'natural',
  Artificial = 'artificial',
  Mixed = 'mixed'
}

enum WorkLocation {
  Indoor = 'indoor',
  Outdoor = 'outdoor',
  SemiCovered = 'semi_covered'
}
```

#### 3. InterventionStep

```typescript
interface InterventionStep {
  id: string;
  intervention_id: string;

  // Configuration
  step_number: number;
  step_name: string;
  step_type: StepType;
  step_status: StepStatus;

  // Description
  description?: string;
  instructions?: string;             // JSON
  quality_checkpoints?: string;       // JSON array

  // Requirements
  is_mandatory: number;              // 0 or 1
  requires_photos: number;           // 0 or 1
  min_photos_required: number;
  max_photos_allowed: number;

  // Timing
  started_at?: number;
  completed_at?: number;
  paused_at?: number;
  duration_seconds?: number;
  estimated_duration_seconds?: number;

  // Data
  step_data?: string;                // JSON
  collected_data?: string;           // JSON
  measurements?: string;             // JSON
  observations?: string;             // JSON array

  // Photos
  photo_count: number;
  required_photos_completed: number;  // 0 or 1
  photo_urls?: string;               // JSON array

  // Validation
  validation_data?: string;          // JSON
  validation_errors?: string;        // JSON array
  validation_score?: number;         // 0-100

  // Approval
  requires_supervisor_approval: number; // 0 or 1
  approved_by?: string;
  approved_at?: number;
  rejection_reason?: string;

  // GPS
  location_lat?: number;
  location_lon?: number;
  location_accuracy?: number;

  // Timestamps
  device_timestamp?: number;
  server_timestamp?: number;

  // Other
  title?: string;
  notes?: string;
  synced: number;
  last_synced_at?: number;

  // Audit
  created_at: number;
  updated_at: number;
}

enum StepType {
  Inspection = 'inspection',
  Preparation = 'preparation',
  Installation = 'installation',
  Finalization = 'finalization'
}

enum StepStatus {
  Pending = 'pending',
  InProgress = 'in_progress',
  Paused = 'paused',
  Completed = 'completed',
  Failed = 'failed',
  Skipped = 'skipped',
  Rework = 'rework'
}
```

#### 4. Photo

```typescript
interface Photo {
  id: string;
  intervention_id: string;
  step_id?: string;
  step_number?: number;

  // File information
  file_path: string;
  file_name?: string;
  file_size?: number;                // bytes
  mime_type: string;
  width?: number;
  height?: number;

  // Photo type and category
  photo_type?: PhotoType;
  photo_category?: PhotoCategory;
  photo_angle?: string;
  zone?: string;

  // Description
  title?: string;
  description?: string;
  notes?: string;
  annotations?: string;             // JSON

  // GPS
  gps_location_lat?: number;
  gps_location_lon?: number;
  gps_location_accuracy?: number;

  // Quality
  quality_score?: number;            // 0-100
  blur_score?: number;
  exposure_score?: number;
  composition_score?: number;

  // Approval
  is_required: number;               // 0 or 1
  is_approved: number;               // 0 or 1
  approved_by?: string;
  approved_at?: number;
  rejection_reason?: string;

  // Sync
  synced: number;
  storage_url?: string;
  upload_retry_count: number;
  upload_error?: string;
  last_synced_at?: number;

  // Timestamps
  captured_at?: number;
  uploaded_at?: number;
  created_at: number;
  updated_at: number;
}

enum PhotoType {
  Before = 'before',
  During = 'during',
  After = 'after'
}

enum PhotoCategory {
  VehicleCondition = 'vehicle_condition',
  Workspace = 'workspace',
  StepProgress = 'step_progress',
  QCCheck = 'qc_check',
  FinalResult = 'final_result',
  Other = 'other'
}
```

#### 5. Client

```typescript
interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  customer_type: CustomerType;

  // Address
  address_street?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
  address_country?: string;

  // Business
  tax_id?: string;
  company_name?: string;
  contact_person?: string;

  // Other
  notes?: string;
  tags?: string;                     // JSON array

  // Statistics (auto-calculated)
  total_tasks: number;
  active_tasks: number;
  completed_tasks: number;
  last_task_date?: string;

  // Audit
  created_at: number;
  updated_at: number;
  created_by?: string;
  deleted_at?: number;
  deleted_by?: string;
  synced: number;
  last_synced_at?: number;
}

enum CustomerType {
  Individual = 'individual',
  Business = 'business'
}
```

#### 6. User

```typescript
interface User {
  id: string;
  email: string;
  username: string;
  password_hash: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  is_active: number;                // 0 or 1
  last_login_at?: number;
  login_count: number;

  // 2FA
  two_factor_enabled: number;        // 0 or 1
  two_factor_secret?: string;

  // Preferences
  preferences?: string;             // JSON

  // Sync
  synced: number;
  last_synced_at?: number;

  // Audit
  created_at: number;
  updated_at: number;
}

enum UserRole {
  Admin = 'admin',
  Technician = 'technician',
  Supervisor = 'supervisor',
  Viewer = 'viewer'
}
```

#### 7. Material

```typescript
interface Material {
  id: string;
  sku: string;
  name: string;
  description?: string;
  material_type: MaterialType;
  category?: string;
  subcategory?: string;
  category_id?: string;

  // Brand and model
  brand?: string;
  model?: string;
  specifications?: string;          // JSON

  // Inventory
  unit_of_measure: string;          // piece, meter, liter, gram, roll
  current_stock: number;
  minimum_stock: number;
  maximum_stock?: number;
  reorder_point?: number;

  // Cost
  unit_cost?: number;
  currency: string;                // default 'EUR'

  // Supplier
  supplier_id?: string;
  supplier_name?: string;
  supplier_sku?: string;

  // Quality
  quality_grade?: string;
  certification?: string;

  // Expiry
  expiry_date?: number;             // Unix timestamp
  batch_number?: string;
  serial_numbers?: string;          // JSON array

  // Status
  is_active: number;               // 0 or 1
  is_discontinued: number;          // 0 or 1

  // Storage
  storage_location?: string;
  warehouse_id?: string;

  // Audit
  created_at: number;
  updated_at: number;
  created_by?: string;
  updated_by?: string;
  synced: number;
  last_synced_at?: number;
}

enum MaterialType {
  PPFFilm = 'ppf_film',
  Adhesive = 'adhesive',
  CleaningSolution = 'cleaning_solution',
  Tool = 'tool',
  Consumable = 'consumable'
}
```

#### 8. Supplier

```typescript
interface Supplier {
  id: string;
  name: string;
  code?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  website?: string;

  // Address
  address_street?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
  address_country?: string;

  // Business
  tax_id?: string;
  business_license?: string;
  payment_terms?: string;
  lead_time_days: number;

  // Status
  is_active: number;
  is_preferred: number;

  // Ratings
  quality_rating: number;          // 0.0-5.0
  delivery_rating: number;          // 0.0-5.0
  on_time_delivery_rate: number;    // 0.0-100.0

  // Other
  notes?: string;
  special_instructions?: string;

  // Audit
  created_at: number;
  updated_at: number;
  created_by?: string;
  updated_by?: string;
  synced: number;
  last_synced_at?: number;
}
```

#### 9. Message

```typescript
interface Message {
  id: string;
  message_type: MessageType;
  sender_id?: string;
  recipient_id?: string;
  recipient_email?: string;
  recipient_phone?: string;
  subject?: string;
  body: string;
  template_id?: string;
  task_id?: string;
  client_id?: string;

  // Status
  status: MessageStatus;
  priority: MessagePriority;

  // Scheduling
  scheduled_at?: number;
  sent_at?: number;
  read_at?: number;
  error_message?: string;

  // Metadata
  metadata?: string;               // JSON

  // Audit
  created_at: number;
  updated_at: number;
}

enum MessageType {
  Email = 'email',
  SMS = 'sms',
  InApp = 'in_app'
}

enum MessageStatus {
  Pending = 'pending',
  Sent = 'sent',
  Delivered = 'delivered',
  Failed = 'failed',
  Read = 'read'
}

enum MessagePriority {
  Low = 'low',
  Normal = 'normal',
  High = 'high',
  Urgent = 'urgent'
}
```

#### 10. SyncOperation

```typescript
interface SyncOperation {
  id: number;                      // Auto-increment
  operation_type: SyncOperationType;
  entity_type: EntityType;
  entity_id: string;
  data: string;                    // JSON
  dependencies?: string;            // JSON array
  timestamp_utc: number;

  // Retry logic
  retry_count: number;
  max_retries: number;
  last_error?: string;

  // Status
  status: SyncStatus;

  // Audit
  created_at: number;
  updated_at: number;
}

enum SyncOperationType {
  Create = 'create',
  Update = 'update',
  Delete = 'delete'
}

enum EntityType {
  Task = 'task',
  Intervention = 'intervention',
  Client = 'client',
  User = 'user',
  Material = 'material',
  Supplier = 'supplier',
  Photo = 'photo',
  Step = 'step',
  Message = 'message'
}

enum SyncStatus {
  Pending = 'pending',
  Processing = 'processing',
  Completed = 'completed',
  Failed = 'failed',
  Abandoned = 'abandoned'
}
```

## Technical Constraints

### TC1: Database Constraints

| Constraint | Description |
|------------|-------------|
| **TC1.1** | SQLite database with WAL mode for concurrent access |
| **TC1.2** | Maximum database file size: 140TB (SQLite limit) |
| **TC1.3** | Maximum row size: 1GB (SQLite limit) |
| **TC1.4** | All timestamps stored as Unix milliseconds for JavaScript compatibility |
| **TC1.5** | UUID primary keys for all tables (TEXT, 36 chars) |
| **TC1.6** | Soft delete pattern (deleted_at, deleted_by) for audit trail |
| **TC1.7** | CHECK constraints for enum values and ranges |
| **TC1.8** | FOREIGN KEY constraints with ON DELETE CASCADE/SET NULL |
| **TC1.9** | Partial indexes for common query patterns |
| **TC1.10** | Triggers for automatic statistics updates |

### TC2: Performance Constraints

| Constraint | Description |
|------------|-------------|
| **TC2.1** | IPC response time: < 100ms for simple queries, < 500ms for complex queries |
| **TC2.2** | Slow query threshold: 100ms (trigger logging) |
| **TC2.3** | Database connection pool: max 100 connections, min 1 idle |
| **TC2.4** | Connection retry: 3 attempts with exponential backoff |
| **TC2.5** | Prepared statement caching for performance |
| **TC2.6** | WAL periodic checkpointing: every 60 seconds |
| **TC2.7** | Virtual scrolling for large data sets (threshold: 1000 items) |
| **TC2.8** | Response compression: auto-compress > 1KB payloads |
| **TC2.9** | Cache TTL: configurable, default 5 minutes |
| **TC2.10** | Rate limiting: 100 req/min for client ops, 200 req/min for calendar ops |

### TC3: Security Constraints

| Constraint | Description |
|------------|-------------|
| **TC3.1** | Password hashing: Argon2id with min 32MB memory, 3 iterations |
| **TC3.2** | Session timeout: configurable, default 8 hours |
| **TC3.3** | Account lockout: configurable, default 5 failed attempts |
| **TC3.4** | JWT tokens: HS256 algorithm, 24-hour expiry |
| **TC3.5** | TOTP 2FA: 6-digit codes, 30-second validity |
| **TC3.6** | GPS accuracy: max 100m for PPF work (configurable) |
| **TC3.7** | GPS freshness: max 10 minutes (configurable) |
| **TC3.8** | Photo validation: blur/exposure/composition scoring |
| **TC3.9** | Audit logging: all CRUD operations logged |
| **TC3.10** | SQL injection prevention: parameterized queries only |

### TC4: File Storage Constraints

| Constraint | Description |
|------------|-------------|
| **TC4.1** | Photo file size: max 50MB |
| **TC4.2** | Photo dimensions: min 640x480, max 8192x8192 |
| **TC4.3** | Photo formats: JPEG, PNG, WebP |
| **TC4.4** | Thumbnail size: 200x200 pixels |
| **TC4.5** | Local storage path: configurable |
| **TC4.6** | Google Cloud Storage: optional backup |
| **TC4.7** | Storage URL tracking for cloud photos |
| **TC4.8** | Upload retry: 3 attempts with exponential backoff |
| **TC4.9** | Photo deletion: soft delete (deleted_at flag) |
| **TC4.10** | PDF export: max 10MB per report |

### TC5: Network Constraints

| Constraint | Description |
|------------|-------------|
| **TC5.1** | Offline-first: application works 100% offline |
| **TC5.2** | Sync queue: persistent, survives app restart |
| **TC5.3** | Sync retry: exponential backoff, max 3 retries |
| **TC5.4** | WebSocket: real-time updates when online |
| **TC5.5** | HTTP timeout: 30 seconds |
| **TC5.6** | HTTP retry: 3 attempts with exponential backoff |
| **TC5.7** | Email provider timeout: 30 seconds |
| **TC5.8** | SMS provider timeout: 30 seconds |
| **TC5.9** | Stream transfer: chunked, max 1MB chunks |
| **TC5.10** | MessagePack support: binary format for efficiency |

### TC6: UI/UX Constraints

| Constraint | Description |
|------------|-------------|
| **TC6.1** | Dark mode support: complete theme implementation |
| **TC6.2** | High contrast mode: for accessibility |
| **TC6.3** | Reduced motion: respect prefers-reduced-motion |
| **TC6.4** | Keyboard navigation: all features accessible via keyboard |
| **TC6.5** | Screen reader support: ARIA attributes throughout |
| **TC6.6** | Touch targets: minimum 44x44 pixels |
| **TC6.7** | Contrast ratio: minimum 4.5:1 for normal text |
| **TC6.8** | Loading states: skeleton screens for async operations |
| **TC6.9** | Error boundaries: graceful error handling |
| **TC6.10** | Responsive design: 1280x800 minimum resolution |

### TC7: Data Validation Constraints

| Constraint | Description |
|------------|-------------|
| **TC7.1** | Email validation: RFC 5322 format, max 254 chars |
| **TC7.2** | Password validation: min 8 chars, 3 of 4 char types |
| **TC7.3** | Name validation: 2-100 chars, letters/spaces/hyphens/apostrophes |
| **TC7.4** | Phone validation: international format (E.164) |
| **TC7.5** | GPS coordinates: lat -90 to 90, lon -180 to 180 |
| **TC7.6** | Date validation: YYYY-MM-DD format |
| **TC7.7** | Time validation: HH:MM format (24-hour) |
| **TC7.8** | Rating validation: 1-10 for satisfaction, 0-100 for quality |
| **TC7.9** | Percentage validation: 0-100 range |
| **TC7.10** | Currency validation: non-negative, 2 decimal places max |

### TC8: Role-Based Access Control

| Role | Create | Read | Update | Delete |
|------|--------|------|--------|--------|
| **Admin** | All entities | All entities | All entities | All entities (except self) |
| **Supervisor** | Tasks, Clients, Messages | All entities | Tasks, Clients, Messages | None |
| **Technician** | Assigned Tasks, Photos | Assigned Tasks, Photos | Assigned Tasks, Photos | None |
| **Viewer** | None | All entities | None | None |

### TC9: Migration Constraints

| Constraint | Description |
|------------|-------------|
| **TC9.1** | Migrations: sequential, versioned (001, 002, etc.) |
| **TC9.2** | Migration rollback: not supported (forward-only) |
| **TC9.3** | Migration testing: test before production |
| **TC9.4** | Data migration: must preserve all existing data |
| **TC9.5** | Index creation: must be part of migration |
| **TC9.6** | Trigger creation: must be part of migration |
| **TC9.7** | View creation: must be part of migration |
| **TC9.8** | Schema validation: validate after migration |
| **TC9.9** | Migration health: check before app start |
| **TC9.10** | Migration history: tracked in database |

### TC10: Deployment Constraints

| Constraint | Description |
|------------|-------------|
| **TC10.1** | Build targets: app, dmg, msi, appimage |
| **TC10.2** | Minimum OS: Windows 10+, macOS 10.15+, Linux (Ubuntu 20.04+) |
| **TC10.3** | Auto-update: enabled via Tauri updater plugin |
| **TC10.4** | Environment variables: .env file only (no hardcoded secrets) |
| **TC10.5** | CI/CD: GitHub Actions for automated testing and building |
| **TC10.6** | Rust version: minimum 1.77 |
| **TC10.7** | Node version: minimum 18.0.0 |
| **TC10.8** | NPM version: minimum 9.0.0 |
| **TC10.9** | Bundle size: maximum 200MB for production build |
| **TC10.10** | Startup time: maximum 5 seconds |

## Third-Party Integrations

### TPI1: Email Providers

#### SendGrid

| Configuration | Key | Required |
|---------------|-----|----------|
| API Key | `SENDGRID_API_KEY` | Yes |
| From Email | `SENDGRID_FROM_EMAIL` | Yes |
| From Name | `SENDGRID_FROM_NAME` | No |

**Features**:
- Transactional emails
- Email templates
- Batch sending
- Delivery tracking

**API Endpoint**: `https://api.sendgrid.com/v3/mail/send`

#### Mailgun

| Configuration | Key | Required |
|---------------|-----|----------|
| API Key | `MAILGUN_API_KEY` | Yes |
| Domain | `MAILGUN_DOMAIN` | Yes |
| From Email | `MAILGUN_FROM_EMAIL` | Yes |
| From Name | `MAILGUN_FROM_NAME` | No |

**Features**:
- Transactional emails
- Email templates
- Batch sending
- Delivery tracking

**API Endpoint**: `https://api.mailgun.net/v3/{domain}/messages`

### TPI2: SMS Providers

#### Twilio

| Configuration | Key | Required |
|---------------|-----|----------|
| Account SID | `TWILIO_ACCOUNT_SID` | Yes |
| Auth Token | `TWILIO_AUTH_TOKEN` | Yes |
| From Number | `TWILIO_FROM_NUMBER` | Yes |

**Features**:
- SMS notifications
- Delivery tracking
- International support

**API Endpoint**: `https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json`

#### AWS SNS

| Configuration | Key | Required |
|---------------|-----|----------|
| Access Key | `AWS_ACCESS_KEY` | Yes |
| Secret Key | `AWS_SECRET_KEY` | Yes |
| Region | `AWS_REGION` | Yes |
| Topic ARN | `AWS_SNS_TOPIC_ARN` | Yes |

**Features**:
- SMS notifications
- Delivery tracking
- International support

**API Endpoint**: AWS SNS API (regional)

### TPI3: Cloud Storage

#### Google Cloud Storage

| Configuration | Key | Required |
|---------------|-----|----------|
| Service Account Key | `GCS_SERVICE_ACCOUNT_KEY` | Yes |
| Bucket Name | `GCS_BUCKET_NAME` | Yes |
| Storage URL Prefix | `GCS_STORAGE_URL_PREFIX` | No |

**Features**:
- Photo backup
- Large file support
- Public/private access
- CDN support

**API Endpoint**: `https://storage.googleapis.com/{bucket}/{key}`

### TPI4: Development Tools

#### GitHub Actions

| Feature | Description |
|---------|-------------|
| CI Pipeline | Automated testing (unit, integration, E2E) |
| Build Pipeline | Multi-platform builds (Windows, macOS, Linux) |
| Release Pipeline | Automated releases on git tags |
| Security Pipeline | Dependency scanning (cargo-audit, cargo-deny) |

#### Codecov (Optional)

| Feature | Description |
|---------|-------------|
| Coverage Tracking | Upload test coverage reports |
| PR Checks | Coverage diff on pull requests |
| Badge | Display coverage badge in README |

#### Sentry (Optional)

| Feature | Description |
|---------|-------------|
| Error Tracking | Capture frontend and backend errors |
| Performance Monitoring | Track slow operations |
| User Feedback | Allow users to report issues |

## Non-Functional Requirements

### NFR1: Performance

| Requirement | Target | Metric |
|-------------|---------|--------|
| **NFR1.1** | Application startup time | < 5 seconds |
| **NFR1.2** | IPC response time (simple) | < 100ms |
| **NFR1.3** | IPC response time (complex) | < 500ms |
| **NFR1.4** | Database query time (simple) | < 50ms |
| **NFR1.5** | Database query time (complex) | < 200ms |
| **NFR1.6** | Photo upload time (1MB) | < 10 seconds |
| **NFR1.7** | Page load time | < 2 seconds |
| **NFR1.8** | List rendering time (1000 items) | < 100ms |
| **NFR1.9** | Sync operation time (100 ops) | < 30 seconds |
| **NFR1.10** | Report generation (1000 tasks) | < 10 seconds |

| **NFR2.5** | Response times | Average response time < 200ms for 95% of API calls |
| **NFR2.6** | Data throughput | Support 1000+ operations/second |

---

### NFR3: Reliability

| Requirement | Target | Metric |
|-------------|---------|--------|
| **NFR3.1** | Application uptime | > 99.9% (excluding user actions) |
| **NFR3.2** | Error recovery | Graceful degradation on service failures |
| **NFR3.3** | Data integrity | Zero data loss with SQLite durability |
| **NFR3.4** | Backup frequency | Manual backup option available |

---

### NFR4: Availability

| Requirement | Target | Metric |
|-------------|---------|--------|
| **NFR4.1** | Offline mode | 100% functionality available without internet |
| **NFR4.2** | Sync availability | Automatic sync when online with 5-minute maximum disruption |
| **NFR4.3** | External service tolerance | Graceful degradation if external services unavailable |
| **NFR4.4** | Local data access | Full access to all data without internet |

---

### NFR5: Security

| Requirement | Target | Metric |
|-------------|---------|--------|
| **NFR5.1** | Authentication security | Multi-factor with TOTP and backup codes |
| **NFR5.2** | Session security | Configurable timeout with auto-revocation |
| **NFR5.3** | Authorization security | Role-based access with granular permissions |
| **NFR5.4** | Data encryption | Sensitive data encrypted at rest and in transit |
| **NFR5.5** | SQL injection protection | Parameterized queries only |
| **NFR5.6** | XSS protection | Input sanitization and CSP headers |
| **NFR5.7** | CSRF protection | Token-based API requests |
| **NFR5.8** | Security monitoring | Failed login tracking and alerts |

---

### NFR6: Usability

| Requirement | Target | Metric |
|-------------|---------|--------|
| **NFR6.1** | Learnability | New users productive in <1 hour |
| **NFR6.2** | Efficiency | Common tasks <5 clicks |
| **NFR6.3** | Error messages | Clear, actionable, with recovery options |
| **NFR6.4** | Accessibility | WCAG 2.1 AA compliance with screen reader support |
| **NFR6.5** | Keyboard navigation | All features accessible via shortcuts |
| **NFR6.6** | Visual consistency | Consistent design system across components |

---

### NFR7: Compatibility

| Requirement | Target | Metric |
|-------------|---------|--------|
| **NFR7.1** | Cross-platform | Windows (x86_64), macOS (Intel/ARM64), Linux (Ubuntu 20.04+) |
| **NFR7.2** | Browser compatibility | Chromium 120+ for web version |
| **NFR7.3** | Legacy systems | Support for importing data from previous RPMA version |
| **NFR7.4** | Screen resolution | Minimum 1280x800 for desktop build |

---

### NFR8: Maintainability

| Requirement | Target | Metric |
|-------------|---------|--------|
| **NFR8.1** | Code quality | 95% test coverage, 0% critical issues |
| **NFR8.2** | Documentation | All APIs documented with comprehensive examples |
| **NFR8.3** | Version control | Semantic versioning for releases |
| **NFR8.4** | Automated updates | Tauri updater with background downloads |
| **NFR8.5** | Migration system | Automated database migrations with rollback support |

---

### NFR9: Testability

| Requirement | Target | Metric |
|-------------|---------|--------|
| **NFR9.1** | Unit test coverage | 100% business logic covered |
| **NFR9.2** | Integration testing | All third-party integrations tested |
| **NFR9.3** | E2E testing | Critical user flows covered |
| **NFR9.4** | Performance testing | Benchmarks for critical paths |
| **NFR9.5** | Security testing | OWASP Top 10 compliance |

---

**Document Version**: 2.0
**Last Updated**: Based on comprehensive codebase analysis

### NFR3: Reliability

| Requirement | Target | Metric |
|-------------|---------|--------|
| **NFR3.1** | Application uptime | > 99% (excluding user actions) |
| **NFR3.2** | Data integrity | Zero data loss (SQLite durability) |
| **NFR3.3** | Backup frequency | Manual backup option |
| **NFR3.4** | Error recovery | Graceful degradation |
| **NFR3.5** | Crash recovery | Auto-restart, state preserved |

### NFR4: Availability

| Requirement | Target | Metric |
|-------------|---------|--------|
| **NFR4.1** | Offline mode | 100% functionality offline |
| **NFR4.2** | Sync availability | Sync when online, queue when offline |
| **NFR4.3** | External services | Graceful degradation if unavailable |

### NFR5: Security

| Requirement | Target | Metric |
|-------------|---------|--------|
| **NFR5.1** | Authentication | Session-based with RBAC |
| **NFR5.2** | Password security | Argon2 hashing |
| **NFR5.3** | Two-factor auth | TOTP with backup codes |
| **NFR5.4** | SQL injection | Prevention via parameterized queries |
| **NFR5.5** | XSS prevention | Input sanitization |
| **NFR5.6** | CSRF protection | Token-based for API routes |
| **NFR5.7** | Audit logging | All CRUD operations logged |
| **NFR5.8** | Data encryption | SQLite encryption (optional) |

### NFR6: Usability

| Requirement | Target | Metric |
|-------------|---------|--------|
| **NFR6.1** | Learnability | New users productive in < 1 hour |
| **NFR6.2** | Efficiency | Common tasks < 5 clicks |
| **NFR6.3** | Error messages | Clear, actionable |
| **NFR6.4** | Help documentation | Comprehensive and accessible |
| **NFR6.5** | Keyboard shortcuts | Power user features |
| **NFR6.6** | Dark mode | Full theme support |
| **NFR6.7** | Accessibility | WCAG 2.1 AA compliance |

### NFR7: Compatibility

| Requirement | Target | Metric |
|-------------|---------|--------|
| **NFR7.1** | Windows | Windows 10+ |
| **NFR7.2** | macOS | macOS 10.15+ (Catalina) |
| **NFR7.3** | Linux | Ubuntu 20.04+, Debian 11+, Fedora 35+ |
| **NFR7.4** | Screen resolution | Minimum 1280x800 |
| **NFR7.5** | Browser compatibility | Chromium-based (for web version) |

### NFR8: Maintainability

| Requirement | Target | Metric |
|-------------|---------|--------|
| **NFR8.1** | Code coverage | > 80% (backend), > 70% (frontend) |
| **NFR8.2** | Documentation | All APIs documented |
| **NFR8.3** | Code style | Consistent (ESLint, Clippy) |
| **NFR8.4** | Type safety | Full TypeScript coverage |
| **NFR8.5** | Error handling | Structured error types |
| **NFR8.6** | Logging | Comprehensive with correlation IDs |

### NFR9: Testability

| Requirement | Target | Metric |
|-------------|---------|--------|
| **NFR9.1** | Unit tests | All business logic covered |
| **NFR9.2** | Integration tests | All IPC commands tested |
| **NFR9.3** | E2E tests | Critical user flows covered |
| **NFR9.4** | Performance tests | Benchmarks for critical paths |
| **NFR9.5** | Security tests | OWASP Top 10 coverage |

---

**Document Version**: 1.0
**Last Updated**: Based on codebase analysis
