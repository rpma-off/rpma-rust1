# User Flows Documentation

## Table of Contents
1. [Overview](#overview)
2. [Authentication Flows](#authentication-flows)
3. [Task Management Flows](#task-management-flows)
4. [Intervention Workflow](#intervention-workflow)
5. [Client Management Flows](#client-management-flows)
6. [Material Management Flows](#material-management-flows)
7. [Reporting Flows](#reporting-flows)
8. [Settings & Configuration](#settings--configuration)
9. [Error Handling](#error-handling)
10. [Offline Scenarios](#offline-scenarios)

## Overview

This document describes the user journeys through the RPMA v2 application, deduced from the codebase structure, routes, and business logic implemented in services and commands.

### User Roles

Based on `src-tauri/src/models/user.rs` and `src-tauri/src/db/schema.sql`:

1. **Admin** - Full system access, user management
2. **Supervisor** - Manage tasks, approve work, view reports
3. **Technician** - Perform interventions, manage assigned tasks
4. **Viewer** - Read-only access to reports and data

## Authentication Flows

### 1. First-Time Application Launch

```
┌─────────────────────────────────────────────────────────────┐
│ User launches application                                    │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ Check: has_admins() command                                  │
└───────────────────┬─────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
      FALSE                   TRUE
        │                       │
        ▼                       ▼
┌──────────────────┐   ┌──────────────────┐
│ Redirect to      │   │ Redirect to      │
│ /bootstrap-admin │   │ /login           │
└────────┬─────────┘   └────────┬─────────┘
         │                      │
         ▼                      ▼
┌──────────────────┐   ┌──────────────────┐
│ Bootstrap Admin  │   │ Login Flow       │
│ Form             │   │ (see below)      │
└────────┬─────────┘   └──────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│ bootstrap_first_admin(email, password,   │
│   first_name, last_name)                 │
└────────┬─────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│ Creates first admin user                 │
│ Auto-login                               │
│ Redirects to /dashboard                  │
└──────────────────────────────────────────┘
```

**Files Involved:**
- Route: `/app/bootstrap-admin/page.tsx`
- Command: `user::bootstrap_first_admin`
- Service: `services/user.rs`

### 2. Login Flow

```
┌─────────────────────────────────────────────────────────────┐
│ /login page                                                  │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ User enters email + password                                 │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ auth_login(email, password)                                  │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ AuthService::login()                                         │
│  - Verify credentials (Argon2)                               │
│  - Check user.is_active                                      │
└───────────────────┬─────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
  2FA ENABLED?                2FA DISABLED
        │                       │
        ▼                       ▼
┌──────────────────┐   ┌──────────────────┐
│ Return partial   │   │ Generate JWT     │
│ auth state       │   │ Create session   │
│ require_2fa=true │   │ Return token     │
└────────┬─────────┘   └────────┬─────────┘
         │                      │
         ▼                      ▼
┌──────────────────┐   ┌──────────────────┐
│ Show 2FA input   │   │ Store in local   │
│ form             │   │ state/cookies    │
└────────┬─────────┘   │ Redirect to      │
         │             │ /dashboard       │
         ▼             └──────────────────┘
┌──────────────────┐
│ User enters      │
│ 2FA code         │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ verify_2fa_code  │
│ (email, code)    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ If valid:        │
│  - Generate JWT  │
│  - Create session│
│  - Redirect to   │
│    /dashboard    │
└──────────────────┘
```

**Files Involved:**
- Route: `/app/login/page.tsx`
- Commands: `auth::auth_login`, `auth::verify_2fa_code`
- Service: `services/auth.rs`
- Models: `models/auth.rs`

### 3. Session Management

```
┌─────────────────────────────────────────────────────────────┐
│ Every page load / API request                                │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ auth_validate_session(token)                                 │
└───────────────────┬─────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
      VALID                  EXPIRED/INVALID
        │                       │
        ▼                       ▼
┌──────────────────┐   ┌──────────────────┐
│ Update           │   │ Clear session    │
│ last_activity    │   │ Redirect to      │
│ Allow access     │   │ /login           │
└──────────────────┘   └──────────────────┘
```

**Auto-Logout:**
- Configurable session timeout (default: 480 minutes)
- Tracked in `user_sessions.expires_at`
- Setting: `user_settings.session_timeout`

### 4. Logout Flow

```
User clicks "Logout"
    │
    ▼
auth_logout(user_id)
    │
    ▼
- Delete session from user_sessions table
- Clear frontend auth state
- Redirect to /login
```

## Task Management Flows

### 1. Create New Task

```
┌─────────────────────────────────────────────────────────────┐
│ /tasks/new page                                              │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ TaskForm Component                                           │
│  - Basic Info (title, description, vehicle details)         │
│  - Client Selection (existing or create new)                │
│  - PPF Zones Configuration                                   │
│  - Scheduling (date, time, technician)                       │
│  - Priority selection                                        │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ Form Validation (Zod schema)                                 │
│  - Required fields                                           │
│  - Vehicle plate format                                      │
│  - Date/time validity                                        │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ task_crud("create", task_data)                               │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ TaskService::create_task()                                   │
│  - Generate task_number (auto-increment)                     │
│  - Validate client exists (if client_id provided)            │
│  - Check technician availability (if assigned)               │
│  - Set status = 'draft' or 'scheduled'                       │
│  - Save to tasks table                                       │
│  - Create audit log entry                                    │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ Success:                                                     │
│  - Mark as unsynced (synced=0)                               │
│  - Add to sync_queue                                         │
│  - Show success toast                                        │
│  - Redirect to /tasks/[id]                                   │
└──────────────────────────────────────────────────────────────┘
```

**Files Involved:**
- Route: `/app/tasks/new/page.tsx`
- Component: `TaskForm/`
- Command: `task::task_crud`
- Service: `services/task_crud.rs`
- Repository: `repositories/task_repository.rs`

### 2. View Task Details

```
/tasks/[id]
    │
    ▼
task_crud("read", { id })
    │
    ▼
TaskRepository::find_by_id(id)
    │
    ▼
Display:
  - Task Info Card
  - Vehicle Details
  - Client Info (with link)
  - Assigned Technician
  - PPF Zones visualization
  - Scheduling info
  - Status badge
  - Actions:
    * Edit Task
    * Start Intervention
    * Assign Technician
    * Change Status
    * Delete (if allowed)
```

### 3. Edit Task

```
/tasks/[id]/edit
    │
    ▼
Load existing task data
    │
    ▼
Pre-populate TaskForm
    │
    ▼
User modifies fields
    │
    ▼
task_crud("update", task_data)
    │
    ▼
TaskService::update_task()
  - Validate changes
  - Check status transitions (via StatusService)
  - Update updated_at timestamp
  - Update updated_by (current user)
  - Save changes
  - Mark as unsynced
    │
    ▼
Redirect to /tasks/[id]
```

### 4. Assign Task to Technician

```
Task Details Page
    │
    ▼
Click "Assign Technician" button
    │
    ▼
Dialog opens with technician selector
    │
    ▼
check_task_availability(task_id, technician_id, date)
    │
    ▼
If available:
  - update_task({ technician_id, assigned_at, assigned_by, status: 'assigned' })
  - Create notification for technician
  - Add to calendar
  - Log audit event
```

**Validation Rules (from `services/task_validation.rs`):**
- Technician must be active
- Technician must have role = 'technician' or 'supervisor'
- Check for scheduling conflicts
- Verify task not already completed/cancelled

### 5. Task Status Transitions

```
Current Status → Allowed Transitions

draft → [scheduled, cancelled]
scheduled → [in_progress, on_hold, cancelled]
in_progress → [completed, on_hold, paused, cancelled]
on_hold → [scheduled, cancelled]
paused → [in_progress, cancelled]
completed → [archived]
cancelled → [archived]
```

**Command:** `status::task_transition_status(task_id, new_status, reason)`

**Service:** `services/task.rs` validates transitions

## Intervention Workflow

### 1. Start Intervention

```
Task Details (/tasks/[id])
    │
    ▼
Click "Start Intervention" button
    │
    ▼
intervention_start(task_id)
    │
    ▼
InterventionWorkflowService::start_intervention()
  - Validate task exists and is ready
  - Check no active intervention for this task
  - Create new intervention record
  - Set status = 'in_progress'
  - Initialize workflow steps
  - Capture start GPS location (if available)
  - Start timer
    │
    ▼
Redirect to /interventions/[intervention_id]
```

**Files Involved:**
- Command: `intervention::intervention_start`
- Service: `services/intervention_workflow.rs`
- Models: `models/intervention.rs`, `models/step.rs`

### 2. Intervention Wizard Flow

```
┌─────────────────────────────────────────────────────────────┐
│ /interventions/[id]                                          │
│ Multi-Step Wizard UI                                         │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 1: INSPECTION                                           │
│  - Vehicle condition check                                   │
│  - Photo upload (before photos)                              │
│  - Environmental conditions (weather, lighting, temp)        │
│  - GPS location capture                                      │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼ intervention_save_step_progress()
┌─────────────────────────────────────────────────────────────┐
│ Step 2: PREPARATION                                          │
│  - Surface cleaning verification                             │
│  - Material preparation                                      │
│  - Material consumption logging                              │
│  - Tool checklist                                            │
│  - During photos                                             │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼ intervention_save_step_progress()
┌─────────────────────────────────────────────────────────────┐
│ Step 3: INSTALLATION                                         │
│  - PPF application per zone                                  │
│  - Quality checkpoints                                       │
│  - Photos per zone                                           │
│  - Measurements and observations                             │
│  - Issue reporting (if any)                                  │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼ intervention_save_step_progress()
┌─────────────────────────────────────────────────────────────┐
│ Step 4: FINALIZATION                                         │
│  - Final inspection                                          │
│  - After photos                                              │
│  - Quality control score                                     │
│  - Customer signature capture                                │
│  - Customer satisfaction rating                              │
│  - Final observations                                        │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ intervention_finalize(intervention_id)                       │
│  - Validate all mandatory steps completed                    │
│  - Generate intervention report (PDF)                        │
│  - Capture end GPS location                                  │
│  - Calculate total duration                                  │
│  - Update task status to 'completed'                         │
│  - Mark intervention as 'completed'                          │
│  - Queue for sync                                            │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ Success: Show summary & offer PDF download/share             │
│ Error: Display validation errors, allow corrections          │
└──────────────────────────────────────────────────────────────┘
```

**Step Navigation:**
- `intervention_advance_step()` - Move to next step
- `intervention_get_step()` - Get step details
- `intervention_get_progress()` - Get overall progress %

**Files Involved:**
- Routes: `/app/interventions/[id]/page.tsx`
- Commands: `intervention::*` (multiple commands)
- Services: `intervention_workflow.rs`, `workflow_progression.rs`, `workflow_validation.rs`

### 3. Photo Management During Intervention

```
Within each intervention step:
    │
    ▼
Click "Add Photo" button
    │
    ▼
PhotoUpload Component
  - Camera/file picker
  - Local preview
  - Auto-compress image
  - Capture GPS coordinates
  - Add annotations/notes
    │
    ▼
Upload photo to local storage
    │
    ▼
Create photo record in photos table
  - Link to intervention_id and step_id
  - Store file_path (local)
  - Extract EXIF data
  - Calculate quality scores
  - Mark as unsynced
    │
    ▼
Display in photo gallery
Increment step.photo_count
```

**Commands (Planned, many TODOs in code):**
- `photo::photo_crud`
- `photo::store_photo_with_data`
- `photo::get_photo_data`

## Client Management Flows

### 1. Create New Client

```
/clients/new OR inline from TaskForm
    │
    ▼
ClientForm
  - Name (required)
  - Email
  - Phone
  - Type (individual/business)
  - Address fields
  - Company info (if business)
  - Notes
    │
    ▼
Validate (Zod + backend)
    │
    ▼
client_crud("create", client_data)
    │
    ▼
ClientService::create()
  - Validate unique email (if provided)
  - Generate client ID
  - Initialize statistics (total_tasks=0, active_tasks=0)
  - Save to clients table
  - Add to FTS index (for search)
    │
    ▼
Success: Redirect to /clients/[id]
```

### 2. View Client Details

```
/clients/[id]
    │
    ▼
Load client data + statistics
    │
    ▼
Display:
  - Client Information Card
  - Contact Details
  - Statistics:
    * Total tasks
    * Active tasks
    * Completed tasks
    * Last task date
  - Related Tasks List (clickable)
  - Related Interventions
  - Timeline/History
  - Actions:
    * Edit Client
    * Create Task for Client
    * Delete Client (if no active tasks)
```

### 3. Client Search

```
Dashboard or /clients page
    │
    ▼
Global search bar
    │
    ▼
Type client name/email/phone
    │
    ▼
FTS5 full-text search query on clients_fts
    │
    ▼
Display matching results
Click to navigate to client details
```

**Implementation:** `repositories/client_repository.rs` uses FTS5

## Material Management Flows

### 1. View Inventory

```
/inventory page
    │
    ▼
material_list(filters)
    │
    ▼
Display inventory table:
  - Material name
  - SKU
  - Category
  - Current stock quantity
  - Unit price
  - Supplier
  - Expiration date
  - Status badges (low stock, expired)
    │
    ▼
Filters:
  - Category
  - Supplier
  - Stock level (in stock, low stock, out of stock)
  - Expiration status
```

### 2. Record Material Consumption

```
During intervention (Step 2: Preparation)
    │
    ▼
Material consumption form
  - Select material (dropdown/search)
  - Enter quantity used
  - Optional notes
    │
    ▼
material_record_consumption(intervention_id, material_id, quantity)
    │
    ▼
MaterialService::record_consumption()
  - Validate material exists
  - Check sufficient stock
  - Deduct quantity from current_quantity
  - Create material_consumption record
  - Link to intervention_id
  - Update material_usage table
    │
    ▼
Success: Update UI, show new stock level
```

### 3. Low Stock Alerts

```
material_get_low_stock(threshold)
    │
    ▼
Returns materials where:
  current_quantity <= low_stock_threshold
    │
    ▼
Display alerts in:
  - Dashboard widget
  - Settings → Alerts
  - Email notifications (if configured)
```

## Reporting Flows

### 1. Generate Task Completion Report

```
/reports/tasks page
    │
    ▼
Select date range + filters
  - Start date, end date
  - Technician (optional)
  - Status (optional)
    │
    ▼
get_task_completion_report(params)
    │
    ▼
ReportsService::generate_task_report()
  - Query tasks table with filters
  - Calculate metrics:
    * Total tasks
    * Completed tasks
    * Completion rate
    * Average duration
    * By status distribution
    * By priority distribution
  - Aggregate by date/technician
    │
    ▼
Display:
  - Summary cards (KPIs)
  - Charts (completion trends, status distribution)
  - Data table (exportable)
  - Export buttons (CSV, PDF)
```

**Files Involved:**
- Route: `/app/reports/tasks/page.tsx`
- Command: `reports::get_task_completion_report`
- Service: `services/reports/task_reports.rs`

### 2. Technician Performance Report

```
/reports/technicians
    │
    ▼
Select technician + date range
    │
    ▼
get_technician_performance_report(technician_id, start_date, end_date)
    │
    ▼
Metrics:
  - Tasks assigned
  - Tasks completed
  - Completion rate
  - Average task duration
  - Quality scores (from interventions)
  - Customer satisfaction avg
  - Material usage efficiency
    │
    ▼
Display:
  - Performance dashboard
  - Trend charts
  - Comparison to team average
  - Strengths/areas for improvement
```

### 3. Export Report

```
Report page (any type)
    │
    ▼
Click "Export" button
    │
    ▼
Select format:
  - CSV (data only)
  - PDF (formatted report)
    │
    ▼
If CSV:
  - export_tasks_csv(filters)
  - Download CSV file

If PDF:
  - Generate PDF via pdf_generation service
  - Include charts, tables, summary
  - Download PDF
```

## Settings & Configuration

### 1. User Settings

```
/settings page
    │
    ▼
Tabs:
  - Profile
  - Security
  - Notifications
  - Appearance
  - Performance
  - Accessibility
    │
    ▼
get_user_settings(user_id)
    │
    ▼
Load current settings from user_settings table
    │
    ▼
User modifies settings
    │
    ▼
update_user_[category](user_id, settings)
    │
    ▼
Save to user_settings table
Show success toast
```

**Available Settings:**

**Profile:**
- Name, email, phone
- Avatar upload
- Password change

**Security:**
- Enable/disable 2FA
- Session timeout
- Password requirements

**Notifications:**
- Email, push, in-app toggles
- Quiet hours
- Notification types

**Performance:**
- Cache settings
- Offline mode
- Sync preferences
- Image compression

**Accessibility:**
- High contrast
- Large text
- Reduced motion
- Screen reader support

### 2. Enable Two-Factor Authentication

```
Settings → Security → Enable 2FA
    │
    ▼
enable_2fa(user_id)
    │
    ▼
TwoFactorService::enable_2fa()
  - Generate TOTP secret
  - Create QR code
  - Return QR code + backup codes
    │
    ▼
User scans QR with authenticator app
    │
    ▼
User enters test code
    │
    ▼
verify_2fa_setup(user_id, code)
    │
    ▼
If valid:
  - Save secret to users.two_factor_secret
  - Set users.two_factor_enabled = 1
  - Show backup codes
  - require 2FA on next login
```

## Error Handling

### Global Error States

**Component Error Boundaries:**
```tsx
<ErrorBoundary fallback={<ErrorFallback />}>
  <Component />
</ErrorBoundary>
```

**Page-Level Errors:**
- `error.tsx` - Handles page errors
- `global-error.tsx` - Handles fatal errors
- `not-found.tsx` - 404 handler

### Command Error Handling

All Tauri commands return `Result<T, Error>`:

```rust
#[tauri::command]
async fn task_crud(operation: String, data: Value) -> Result<Value, String> {
    match operation.as_str() {
        "create" => /* ... */,
        _ => Err("Unknown operation".to_string())
    }
}
```

**Frontend Handling:**
```tsx
try {
  const result = await invoke('task_crud', { operation: 'create', data });
  toast.success("Task created");
} catch (error) {
  toast.error(`Failed: ${error}`);
  console.error(error);
}
```

### Validation Errors

**Frontend (Zod):**
```tsx
const schema = z.object({
  email: z.string().email("Invalid email"),
  title: z.string().min(3, "Title too short"),
});

// Errors displayed inline in forms
<FormMessage>Title too short</FormMessage>
```

**Backend (Rust):**
```rust
// Business rule validation
if task.scheduled_date < Utc::now() {
    return Err("Cannot schedule in the past".into());
}
```

## Offline Scenarios

### Working Offline

```
User performs actions while offline:
    │
    ▼
All CRUD operations save locally:
  - Save to SQLite
  - Mark entity.synced = 0
  - Add operation to sync_queue
  - Show "Offline" indicator in UI
    │
    ▼
User can continue working:
  - Create tasks/clients
  - Start interventions
  - Upload photos (local storage)
  - All data persisted locally
```

### Coming Back Online

```
Network detected
    │
    ▼
Background sync service activates
    │
    ▼
sync_now() or automatic sync
    │
    ▼
SyncEngine::process_queue()
  - Fetch pending operations (status='pending')
  - Sort by dependency order
  - Batch operations
    │
    ▼
For each operation:
  - Send to backend API (not yet implemented)
  - If success:
    * Mark entity.synced = 1
    * Update sync_queue status = 'completed'
  - If failure:
    * Increment retry_count
    * Schedule retry with backoff
    * If max_retries exceeded → status = 'failed'
    │
    ▼
Show sync status in UI:
  - Success: Green checkmark
  - Pending: Syncing spinner
  - Failed: Red X with retry option
```

### Conflict Resolution

**Current Implementation:** Last-write-wins (LWW)
- Backend timestamp is authoritative
- No conflict UI (future enhancement)

**Future Enhancement:**
- Detect conflicts based on updated_at
- Present conflict resolution UI
- Allow user to choose version or merge

## State Transitions Summary

### Task Lifecycle

```
[CREATED]
     │
     ▼
 assign technician
[ASSIGNED]
     │
     ▼
 schedule                                      │
[SCHEDULED] ─────────────────────────────────────►
     │                                               │
     ▼                                               │
 start intervention                            │
[IN_PROGRESS]                                    │
     │                                               │
     │         ▲                                     │
     │         │ pause                                │
     │         ▼                                     │
     │     [PAUSED] ───────────────────────────────────►
     │
     ▼
 complete
[COMPLETED]
     │
     ▼
 archive
[ARCHIVED]
```

### Intervention Lifecycle

```
[NOT_STARTED]
     │
     ▼
 start_intervention()
[PENDING]
     │
     ▼
 advance_step()
[IN_PROGRESS]
     │         │
     │         ▼ pause
     │     [PAUSED]
     │         │
     │         ▼ resume
     │         │
[IN_PROGRESS]
     │
     ▼
 finalize()
[COMPLETED]
```

---

## Page Navigation Structure

### Complete Page Inventory (20+ pages)

```
RPMA Application
├── / (Root)
│   ├── /login (Authentication)
│   ├── /signup (Registration)
│   ├── /bootstrap-admin (First-time setup)
│   ├── /unauthorized (Access denied)
│   │
│   ├── /dashboard (Main dashboard)
│   │
│   ├── /tasks (Task management)
│   │   ├── /tasks/[id] (Task detail)
│   │   └── /tasks/[id]/workflow/ppf (PPF workflow)
│   │
│   ├── /clients (Client management)
│   │   ├── /clients/new (Create client)
│   │   ├── /clients/[id] (Client detail)
│   │   └── /clients/[id]/edit (Edit client)
│   │
│   ├── /interventions (Intervention workflows)
│   │   └── /interventions/[id] (Intervention detail)
│   │
│   ├── /schedule (Calendar & scheduling)
│   │
│   ├── /inventory (Material inventory)
│   │
│   ├── /messages (Messaging center)
│   │
│   ├── /reports (Reports & analytics)
│   │
│   ├── /analytics (Analytics dashboard)
│   │   ├── /analytics/system-health
│   │   ├── /analytics/task-statistics
│   │   ├── /analytics/technician-performance
│   │   └── /analytics/workflow-analytics
│   │
│   ├── /team (Team management)
│   ├── /technicians (Technician management)
│   ├── /users (User management)
│   │
│   ├── /data-explorer (Data search & exploration)
│   │
│   ├── /configuration (System configuration)
│   │
│   ├── /settings (User settings)
│   │
│   ├── /audit (Audit log viewer)
│   │
│   └── /admin (Admin panel)
```

---

## Navigation Flows

### 1. Dashboard Navigation

```typescript
User lands on /dashboard
    │
    ├─→ Shows calendar view with scheduled tasks
    ├─→ Quick action cards (Create Task, Create Client)
    ├─→ Statistics widgets (Interventions, Tasks, Performance)
    ├─→ Recent activity feed
    └─→ Upcoming tasks list

User can navigate to:
    - /tasks (from quick actions)
    - /schedule (from calendar widget)
    - /interventions (from active interventions)
    - /clients (from quick actions)
    - /reports (from statistics)
```

### 2. Task List Navigation

```typescript
User navigates to /tasks
    │
    ├─→ Shows task table with filters
    │   - Status filter (all statuses)
    │   - Technician filter
    │   - Date range filter
    │   - Priority filter
    │   - Search input
    │
    ├─→ User clicks "Create Task" → /tasks/new (inline modal)
    ├─→ User clicks task row → /tasks/[id]
    ├─→ User clicks "Start Intervention" → /tasks/[id]/workflow/ppf
    ├─→ User clicks "Assign" → Assignment dialog
    └─→ User clicks "Export" → CSV download
```

### 3. Task Detail Navigation

```typescript
User opens /tasks/[id]
    │
    ├─→ Shows task information
    │   - Vehicle details
    │   - Client card (with link to /clients/[id])
    │   - Technician assignment
    │   - Scheduling information
    │   - PPF zones configuration
    │   - Status timeline
    │
    ├─→ Action buttons:
    │   - "Edit Task" → Edit modal
    │   - "Start Intervention" → /tasks/[id]/workflow/ppf
    │   - "Assign Technician" → Assignment dialog
    │   - "Change Status" → Status change dropdown
    │   - "Delete Task" → Confirmation dialog
    │
    └─→ Related sections:
        - Client tasks history
        - Related interventions
        - Task comments/notes
```

### 4. PPF Intervention Workflow Navigation

```typescript
User starts intervention from /tasks/[id]/workflow/ppf
    │
    ├─→ Shows multi-step wizard:
    │
    │   Step 1: Inspection
    │   ├─→ Vehicle condition form
    │   ├─→ Defect documentation (scratch, dent, chip, paint_issue, crack)
    │   ├─→ Before photos upload
    │   ├─→ GPS location capture
    │   └─→ "Next" → Step 2
    │
    │   Step 2: Preparation
    │   ├─→ Environment form (weather, lighting, temp, humidity)
    │   ├─→ Surface preparation checklist
    │   ├─→ Materials preparation
    │   ├─→ During photos
    │   └─→ "Next" → Step 3
    │
    │   Step 3: Installation
    │   ├─→ PPF zone selection
    │   ├─→ Film type/brand selection
    │   ├─→ Application per zone
    │   ├─→ Material consumption logging
    │   ├─→ Quality checkpoints
    │   ├─→ In-progress photos per zone
    │   └─→ "Next" → Step 4
    │
    │   Step 4: Finalization
    │   ├─→ Final inspection checklist
    │   ├─→ After photos
    │   ├─→ Quality score input
    │   ├─→ Customer signature capture
    │   ├─→ Satisfaction rating (1-10)
    │   ├─→ Final observations
    │   ├─→ "Finalize" → Complete intervention
    │   └─→ "Back" → Previous step
    │
    └─→ Actions available:
        - "Pause" → Pauses workflow
        - "Save Progress" → Saves current state
        - "Cancel" → Cancels intervention
        - Navigation progress indicator
        - Step breadcrumbs
```

### 5. Calendar Navigation

```typescript
User navigates to /schedule
    │
    ├─→ Calendar view switcher:
    │   - Month view (default)
    │   - Week view
    │   - Day view
    │   - Agenda view
    │
    ├─→ Calendar toolbar:
    │   - Today button
    │   - Previous/Next navigation
    │   - Date range picker
    │   - View switcher
    │
    ├─→ Calendar display:
    │   - Tasks/events as calendar items
    │   - Color-coded by status
    │   - Technician assignment
    │   - Drag-and-drop to reschedule
    │   - Click to view details
    │
    ├─→ Side panel filters:
    │   - Technician filter
    │   - Status filter
    │   - Client filter
    │   - Task type filter
    │
    └─→ Actions:
        - Click empty slot → "Create Event" dialog
        - Click task → Task details
        - Drag event → Reschedule
        - Right-click → Context menu
```

### 6. Client Management Navigation

```typescript
Client list: /clients
    │
    ├─→ Client cards/table
    ├─→ Search bar
    ├─→ Filters (type, tags)
    ├─→ Sort options
    ├─→ "Create Client" → /clients/new
    └─→ Click client → /clients/[id]

Client detail: /clients/[id]
    │
    ├─→ Client information card
    │   - Contact details
    │   - Address
    │   - Business info
    │   - Tags
    │
    ├─→ Statistics:
    │   - Total tasks
    │   - Active tasks
    │   - Completed tasks
    │   - Last task date
    │   - Task timeline
    │
    ├─→ Related tasks list
    ├─→ Related interventions
    ├─→ "Edit Client" → /clients/[id]/edit
    ├─→ "Create Task" → Pre-fill client form
    └─→ "Delete Client" → Confirmation
```

### 7. Analytics Navigation

```typescript
Analytics dashboard: /analytics
    │
    ├─→ KPI cards grid:
    │   - Total interventions
    │   - Completion rate
    │   - Quality score
    │   - Customer satisfaction
    │   - Material usage
    │
    ├─→ Chart sections:
    │   - Trend charts (line/area)
    │   - Distribution charts (bar/pie)
    │   - Performance comparisons
    │   - Geographic heat map
    │
    ├─→ Time range selector
    │   - Last 7 days
    │   - Last 30 days
    │   - Last 90 days
    │   - Custom range
    │
    ├─→ Filters:
    │   - Technician
    │   - Client
    │   - Status
    │   - PPF type
    │
    └─→ Actions:
        - "View Details" → Drill down
        - "Export Report" → PDF/CSV
        - "Compare Periods" → Comparison view
```

### 8. Settings Navigation

```typescript
Settings page: /settings
    │
    ├─→ Tabs navigation:
    │
    │   Profile Tab:
    │   ├─→ Name, email, phone
    │   ├─→ Avatar upload
    │   ├─→ Notes
    │   └─→ Save button
    │
    │   Security Tab:
    │   ├─→ Password change form
    │   ├─→ 2FA management
    │   │   - Enable/Disable
    │   │   - View backup codes
    │   │   - Regenerate codes
    │   ├─→ Session settings
    │   └─→ Active sessions list
    │
    │   Notifications Tab:
    │   ├─→ Email notifications toggle
    │   ├─→ Push notifications toggle
    │   ├─→ In-app notifications toggle
    │   ├── Notification type preferences
    │   ├─→ Quiet hours configuration
    │   └─→ Digest frequency
    │
    │   Appearance Tab:
    │   ├─→ Theme selector (light/dark/system)
    │   ├─→ Font size slider
    │   ├─→ Accent color picker
    │   ├─→ Compact view toggle
    │   └─→ Language selector
    │
    │   Performance Tab:
    │   ├─→ Cache settings
    │   ├─→ Offline mode toggle
    │   ├─→ Sync preferences
    │   ├─→ Image compression toggle
    │   └─→ Preload data toggle
    │
    │   Accessibility Tab:
    │   ├─→ High contrast toggle
    │   ├─→ Large text toggle
    │   ├─→ Reduce motion toggle
    │   ├─→ Screen reader support
    │   └─→ Keyboard navigation indicators
    │
    └─→ Save on each tab change
```

### 9. Admin Panel Navigation

```typescript
Admin dashboard: /admin
    │
    ├─→ Overview section:
    │   - System statistics
    │   - User counts
    │   - Recent activity
    │
    ├─→ User Management:
    │   ├─→ User list with filters
    │   ├─→ "Create User" → User form
    │   ├─→ Click user → User details
    │   ├─→ "Change Role" → Role change dialog
    │   ├─→ "Disable/Enable" → Toggle status
    │   └─→ "Delete User" → Confirmation
    │
    ├─→ Configuration:
    │   ├─→ Business rules
    │   ├─→ System settings
    │   ├─→ Configuration history
    │   └─→ Validation
    │
    ├─→ Integrations:
    │   ├─→ External services list
    │   ├─→ API key management
    │   └─→ Service configuration
    │
    └─→ Maintenance:
        - Database operations
        - Cache management
        - Log viewer
```

### 10. Offline Mode Flows

```typescript
App detects no network connection
    │
    ├─→ Show "Offline Mode" banner (persistent)
    ├─→ All data continues to work from local SQLite
    ├─→ Operations queue in sync_queue table
    ├─→ Show sync status indicator
    │   - Green: All synced
    │   - Yellow: Pending sync
    │   - Red: Sync failed
    │
    └─→ When connection restored:
        ├─→ Background sync service activates
        ├─→ Process queue in batches
        ├─→ Handle conflicts (last-write-wins)
        └─→ Update sync status indicator
```

---

## Cross-Page Navigation

### Quick Actions Pattern

```typescript
From any page, user can access:
    ├─→ Global search (Ctrl+K) → Command palette
    ├─→ Quick create (Ctrl+N) → New task modal
    ├─→ Calendar (Ctrl+D) → /schedule
    ├─→ Dashboard (Ctrl+H) → /
    ├─→ Tasks (Ctrl+T) → /tasks
    ├─→ Clients (Ctrl+C) → /clients
    └─→ Settings (Ctrl+,) → /settings
```

### Breadcrumb Navigation

```typescript
Example: Dashboard → Tasks → Task Detail

/tasks/[id]
    │
    ├─→ Breadcrumbs: [Dashboard] [Tasks] [Task #123]
    ├─→ Click "Dashboard" → /
    ├─→ Click "Tasks" → /tasks
    └─→ Current page indicator
```

---

## Role-Based Access

### Access Control Matrix

```
Page/Feature          Admin  Supervisor  Technician  Viewer
─────────────────────────────────────────────────────
Dashboard             ✓      ✓          ✓         ✓
Tasks                 ✓      ✓          ✓         ✓
- Create/Edit           ✓      ✓          ✗         ✗
- Delete               ✓      ✓          ✗         ✗
- Assign               ✓      ✓          ✓         ✗
Interventions         ✓      ✓          ✓         ✓
- Start                ✓      ✓          ✓         ✓
- Pause                ✓      ✓          ✓         ✗
- Finalize            ✓      ✓          ✓         ✗
Clients               ✓      ✓          ✓         ✓
- Create/Edit/Delete   ✓      ✓          ✓         ✗
Calendar              ✓      ✓          ✓         ✓
Schedule              ✓      ✓          ✓         ✗
Inventory             ✓      ✓          ✗         ✗
- Material Adjust      ✓      ✓          ✗         ✗
Reports               ✓      ✓          ✓         ✓
Analytics             ✓      ✓          ✓         ✓
Settings (Profile)    ✓      ✓          ✓         ✓
Settings (Security)    ✓      ✓          ✗         ✗
Admin Panel            ✓      ✗          ✗         ✗
Audit Logs            ✓      ✓          ✓         ✓
```

---

---

**Document Version**: 2.0
**Last Updated**: 2026-02-03
**Maintained By**: RPMA Team
