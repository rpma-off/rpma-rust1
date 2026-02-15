# 09 - User Flows and UX

## User Roles and Personas

### 1. Admin
**Primary Responsibilities**: System configuration, user management, oversight

**Key Features**:
- User account creation and role assignment
- System settings configuration
- Access to all data and reports
- Audit log review

**Example User**: Julie (Shop Owner)

---

### 2. Supervisor
**Primary Responsibilities**: Task management, technician oversight, reporting

**Key Features**:
- Create and assign tasks
- View all tasks and interventions
- Generate reports
- Manage clients and inventory

**Example User**: Marc (Operations Manager)

---

### 3. Technician
**Primary Responsibilities**: Execute interventions, capture photos, record materials

**Key Features**:
- View assigned tasks
- Start/pause/complete interventions
- Execute workflow steps
- Capture photos and record material usage
- View own performance metrics

**Example User**: Thomas (PPF Installer)

---

### 4. Viewer
**Primary Responsibilities**: Read-only access for monitoring

**Key Features**:
- View tasks, clients, and reports (read-only)
- No modification permissions

**Example User**: Kevin (Accountant)

---

## Core User Flows

### Flow 1: Login and Authentication

**Route**: `/login` (page: `frontend/src/app/login/page.tsx`)

**Components**: `frontend/src/components/auth/LoginForm.tsx`

**Steps**:
1. User opens application
   - If valid session exists → Redirect to `/dashboard`
   - If no session or expired → Show login screen
2. Enter email + password (with validation)
3. Click "Sign In" button
4. Backend validates via `auth_login` command (`src-tauri/src/commands/auth.rs:31-77`)
   - Rate limiting check (5 attempts max per 15 min)
   - Password verification with Argon2
   - If 2FA enabled → Prompt for TOTP code
   - If invalid credentials → Show generic error message (security)
5. Frontend stores session_token (in memory + secure storage)
6. Redirect to `/dashboard` (or intended destination)

**UX Details**:
- Form validation: Email format (Zod schema), password min 8 chars
- Error messages: Generic for security ("Invalid credentials")
- Loading state: Disable button, show spinner
- Remember me: Optional (stores refresh token)
- Password reset link (if applicable)
- Auto-focus on email field

**Backend**: 
- Command: `auth_login` (`src-tauri/src/commands/auth.rs:31-77`)
- Service: `AuthService::authenticate` (`src-tauri/src/services/auth.rs:449-666`)
- Rate Limiter: `RateLimiterService` (`src-tauri/src/services/rate_limiter.rs`)

---

### Flow 2: Create Task (Supervisor)

**Route**: `/tasks/new` (page: `frontend/src/app/tasks/new/page.tsx`)

**Components**: `frontend/src/components/tasks/CreateTaskForm.tsx`

**Steps**:
1. Navigate to `/tasks/new` from dashboard or tasks list
2. Fill in form with validation:
   - Title* (required, min 3 chars)
   - Description (optional, long text)
   - Client (search/select from existing clients)
   - Vehicle plate* (required, format validation)
   - Vehicle make/model/year (optional)
   - VIN (optional, validation)
   - Priority (Low/Medium/High/Urgent)
   - PPF zones (visual diagram with multi-select)
   - Scheduled date (calendar picker)
   - Technician assignment (optional)
3. Client-side validation (Zod schema: `frontend/src/lib/validation/task.ts`)
4. Submit via `task_crud` command with `TaskAction::Create`
5. Backend processing (`src-tauri/src/commands/task/facade.rs`):
   - Permission check (Admin/Supervisor only)
   - Business validation (`src-tauri/src/services/task_validation.rs`)
   - Generate unique task_number (format: `T-YYYYMMDD-NNN`)
   - Set timestamps (created_at, updated_at)
   - Publish TaskCreated event
6. Success response:
   - Toast notification: "Task created successfully"
   - Redirect to `/tasks/[id]` (detail view)
   - Or stay on page with reset form (optional)

**UX Details**:
- Autosave draft to localStorage every 30 seconds
- Client autocomplete search (FTS5 search)
- PPF zone visual selection with vehicle diagram
- Inline validation errors (red border + message)
- Required field indicators (asterisk)
- Loading spinner during submission
- Keyboard shortcuts (Ctrl+S to save)

**Frontend**: 
- Page: `frontend/src/app/tasks/new/page.tsx`
- Hook: `useCreateTask()` (`frontend/src/hooks/useTaskActions.ts`)

**Backend**: 
- Command: `task_crud` with `TaskAction::Create` (`src-tauri/src/commands/task/facade.rs`)
- Service: `TaskCreationService::create_task` (`src-tauri/src/services/task_creation.rs`)

---

### Flow 3: Assign Task to Technician (Supervisor)

**Route**: `/tasks/[id]` (page: `frontend/src/app/tasks/[id]/page.tsx`)

**Components**: `frontend/src/components/tasks/AssignTaskModal.tsx`, `TaskDetailView.tsx`

**Steps**:
1. View task detail (current status: "Draft" or "Pending")
2. Click "Assign Technician" button (visible to Supervisor/Admin only)
3. Modal opens with form:
   - Select technician (dropdown filtered by role=Technician, is_active=true)
   - Select scheduled date (calendar with conflict detection)
   - Optional note/instructions
   - Show technician availability
4. Submit assignment
5. Backend processing via task update or calendar command:
   - Permission check (Admin/Supervisor only)
   - Check technician availability (calendar conflicts)
   - Updates task:
     - `technician_id` → selected user ID
     - `status` → "Assigned"
     - `scheduled_date` → selected date
   - Creates calendar event
   - Creates notification for technician
   - Publishes TaskAssigned event
6. UI updates:
   - Toast: "Task assigned to [Technician Name]"
   - Task status badge updates to "Assigned"
   - Assigned technician displayed
   - Notification sent to technician

**UX Details**:
- Technician filter: Only show active technicians
- Calendar integration: Shows conflicts as warnings
- Warning for double-booking: "Technician has 2 other tasks scheduled this day"
- Availability indicator: Green (available), Yellow (busy), Red (fully booked)
- Notes field for special instructions

**Frontend**:
- Component: `frontend/src/components/tasks/AssignTaskModal.tsx`
- Hook: `useTaskActions()` (`frontend/src/hooks/useTaskActions.ts`)

**Backend**:
- Command: Task update with assignment logic
- Service: `TaskService`, `CalendarService`
- Validation: `TaskValidationService`, conflict detection

---

### Flow 4: Start Intervention (Technician)

**Route**: `/tasks/[id]`

**Steps**:
1. Technician views assigned tasks on dashboard
2. Clicks task to view details
3. Status: "Assigned"
4. Click "Start Intervention"
5. Backend via `intervention_start`:
   - Creates intervention record
   - Generates workflow steps
   - Updates task status to "In Progress"
6. Redirect to intervention execution

**UX Details**:
- Confirmation modal
- GPS permission request
- Offline support

**Frontend**: `frontend/src/app/tasks/[id]/workflow/ppf/`

**Backend**: `intervention_start` command

---

### Flow 5: Execute Intervention Steps (Technician)

**Route**: `/tasks/[id]/workflow/ppf/steps/[step]` (dynamic route for each workflow step)

**Components**: 
- `frontend/src/components/workflow/ppf/` (PPF-specific components)
- `frontend/src/components/workflow/StepExecutionForm.tsx`
- `frontend/src/components/PhotoUpload/` (photo capture)

**Steps**:
1. Show current step UI (e.g., "Step 1/5: Vehicle Preparation")
   - Step title and description
   - Progress bar showing completion (e.g., "20% complete")
   - Step-specific instructions with checklist
2. Technician actions:
   - Read instructions and requirements
   - Add notes (text area, optional but recommended)
   - Take photo (camera/upload):
     - Camera access request (if not granted)
     - Live preview with capture button
     - Photo quality check (minimum resolution)
     - GPS coordinates capture (if available)
   - Record materials consumed (optional):
     - Material autocomplete search
     - Quantity input with unit
     - Consumption reason (optional)
3. Click "Complete Step" button
4. Backend via `intervention_advance_step`:
   - Validates step ownership (technician is assigned)
   - Validates step sequence (previous steps completed)
   - Saves photo to local storage:
     - File path recorded
     - GPS coordinates stored
     - Thumbnail generated
   - Records material consumption in inventory
   - Marks step status as "Completed"
   - Updates step duration (completed_at - started_at)
   - Updates intervention progress percentage
   - Publishes InterventionStepCompleted event
5. Advance to next step automatically
   - UI transitions to next step
   - Progress bar updates
6. Repeat until all steps done (100%)

**UX Details**:
- Progress bar at top: "3/5 steps completed (60%)"
- Photo preview thumbnail with zoom/delete
- Material autocomplete with recent items
- Required steps cannot be skipped (button disabled)
- Optional steps show "Skip" button
- Offline mode supported:
  - Photos cached locally
  - Synced when online
  - Offline indicator shown
- Auto-save notes every 30 seconds
- Confirmation for step completion
- Previous step review (read-only)

**Frontend**:
- Routes: `frontend/src/app/tasks/[id]/workflow/ppf/steps/` (preparation, inspection, installation, finalization)
- Components: `frontend/src/components/workflow/ppf/` (PPFWorkflowHeader, StepProgress, VehicleDiagram)
- Context: `PPFWorkflowContext` (`frontend/src/contexts/PPFWorkflowContext.tsx`)
- Hooks: `useInterventionWorkflow()`, `useInterventionActions()`

**Backend**:
- Command: `intervention_advance_step` (`src-tauri/src/commands/intervention/workflow.rs`)
- Service: `InterventionWorkflowService::advance_step` (`src-tauri/src/services/intervention_workflow.rs`)
- Photo Service: `PhotoService::save_photo` (`src-tauri/src/services/photo/`)

---

### Flow 6: Finalize Intervention (Technician)

**Steps**:
1. All steps completed (100%)
2. "Finalize Intervention" button enabled
3. Finalization form:
   - Quality score (1-100 slider)
   - Final notes
   - Customer signature (canvas)
4. Submit via `intervention_finalize`
5. Backend:
   - Updates intervention.status = "Completed"
   - Updates task.status = "Completed"
   - Calculates duration
   - Triggers notifications
6. Success screen with summary

**UX Details**:
- Signature canvas for touch/mouse
- Summary preview before finalize
- Celebration animation

**Frontend**: `frontend/src/components/workflow/FinalizeInterventionForm.tsx`

**Backend**: `intervention_finalize` command

---

### Flow 7: View Reports (Supervisor)

**Route**: `/reports`

**Steps**:
1. Navigate to `/reports`
2. Select report type:
   - Task Completion Report
   - Material Usage Report
   - Technician Performance Report
   - Client Activity Report
3. Set filters:
   - Date range (presets + custom)
   - Technician
   - Status
4. Click "Generate Report"
5. Backend via `get_task_completion_report`
6. Display:
   - Table with task list
   - Charts (pie, bar)
   - KPIs
   - Export options (PDF, CSV)

**UX Details**:
- Date range presets (7 days, 30 days, this month)
- Live chart preview
- PDF with branding

**Frontend**: `frontend/src/app/reports/page.tsx`

**Backend**: Report commands in `commands/reports/`

---

### Flow 8: Manage Inventory

**Route**: `/inventory`

**Steps**:
1. View material list with stock levels
2. Low stock alerts highlighted
3. Actions:
   - Add new material
   - Update stock levels
   - Record consumption
   - View expiry dates
4. Backend via `material_*` commands

**Frontend**: `frontend/src/app/inventory/page.tsx`

**Backend**: `material_list`, `material_create`, `material_update_stock`

---

### Flow 9: Manage Clients

**Routes**: `/clients`, `/clients/new`, `/clients/[id]`

**Steps**:
1. View client list with search
2. Create new client:
   - Name, email, phone
   - Customer type (Individual/Business)
   - Company info (if business)
3. View client details:
   - Contact info
   - Task history
   - Statistics
4. Edit/Delete (Admin/Supervisor only)

**Frontend**: `frontend/src/app/clients/`

**Backend**: `client_crud` command

---

### Flow 10: View Calendar/Schedule

**Route**: `/schedule`

**Steps**:
1. View calendar (day/week/month/agenda views)
2. See tasks scheduled for dates
3. Click task to view details
4. Drag to reschedule (if permission)
5. Conflict detection warnings

**Frontend**: `frontend/src/app/schedule/page.tsx`, `frontend/src/components/calendar/`

**Backend**: `calendar_get_tasks`, `calendar_check_conflicts`

---

## Common UI Patterns

### 1. Data Tables
- Pagination (25, 50, 100 rows)
- Sorting (click header)
- Filtering (search, status, date)
- Row actions (view, edit, delete)
- Bulk actions

**Component**: `frontend/src/components/ui/DataTable.tsx`, `DesktopTable.tsx`

### 2. Modals
- Confirmation: "Are you sure?"
- Form: Quick create
- Detail: View-only

**Component**: `frontend/src/components/ui/dialog.tsx`, `sheet.tsx`

### 3. Toast Notifications
- Success: "Task created successfully"
- Error: "Failed to save"
- Warning: "Low stock alert"

**Component**: `frontend/src/components/ui/toast.tsx`

### 4. Loading States
- Button: Spinner + disabled
- Page: Full-page spinner
- Inline: Skeleton for rows

**Component**: `frontend/src/components/ui/skeleton.tsx`, `loading-spinner.tsx`

---

## Accessibility (a11y)

### Keyboard Navigation
- All interactive elements via Tab
- Enter to submit
- Esc to close modals
- Arrow keys for lists

### Screen Reader Support
- ARIA labels on icons
- ARIA live regions for notifications
- Semantic HTML

### Color Contrast
- WCAG AA compliance (4.5:1)
- Status not by color alone

---

## Mobile Responsiveness

**Desktop-first** (Tauri app), but web frontend is responsive.

**Breakpoints**:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px

**Mobile adaptations**:
- Collapsible sidebar → hamburger menu
- Tables → horizontal scroll or card view
- Forms → stacked inputs

---

## Design System Quick Reference

| Element | Usage | Component |
|---------|-------|-----------|
| Primary Button | Main actions | `<Button variant="default">` |
| Secondary Button | Alternative | `<Button variant="outline">` |
| Danger Button | Destructive | `<Button variant="destructive">` |
| Input Field | Text entry | `<Input>` |
| Select Dropdown | Options | `<Select>` |
| Checkbox | Boolean | `<Checkbox>` |
| Date Picker | Date | `<Calendar>` |
| Modal | Overlay | `<Dialog>` |
| Toast | Notification | `toast.success()` |

**Color Palette**:
- Primary: Blue
- Success: Green
- Warning: Yellow
- Danger: Red
- Neutral: Gray

**Typography**:
- Font: Inter
- Headings: 700 weight
- Body: 400 weight

---

## Next Steps

- **Project overview**: [00_PROJECT_OVERVIEW.md](./00_PROJECT_OVERVIEW.md)
- **Domain model**: [01_DOMAIN_MODEL.md](./01_DOMAIN_MODEL.md)
- **Frontend guide**: [03_FRONTEND_GUIDE.md](./03_FRONTEND_GUIDE.md)
