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

**Route**: `/login`

**Steps**:
1. User opens application
   - If session exists → Dashboard
   - If no session → Login screen
2. Enter email + password
3. Click "Sign In"
4. Backend validates via `auth_login`
   - If 2FA enabled → Prompt for code
   - If invalid → Show error
5. Frontend stores session_token
6. Redirect to `/dashboard`

**UX Details**:
- Form validation: Email format, password min 8 chars
- Error messages: Generic for security
- Loading state: Disable button, show spinner

**Frontend**: `frontend/src/app/login/page.tsx`, `frontend/src/components/auth/LoginForm.tsx`

**Backend**: `auth_login` command

---

### Flow 2: Create Task (Supervisor)

**Route**: `/tasks/new`

**Steps**:
1. Navigate to `/tasks/new` from dashboard
2. Fill in form:
   - Title* (required)
   - Description
   - Client (search/select)
   - Vehicle plate* (required)
   - Vehicle make/model/year
   - Priority (Low/Medium/High/Urgent)
   - PPF zones (visual diagram)
   - Scheduled date (calendar)
3. Client-side validation
4. Submit via `task_crud { Create }`
5. Backend generates task_number
6. Success: Toast + redirect to `/tasks/[id]`

**UX Details**:
- Autosave draft to localStorage
- Client autocomplete search
- PPF zone visual selection
- Inline validation errors

**Frontend**: `frontend/src/app/tasks/new/page.tsx`

**Backend**: `task_crud` command with `TaskAction::Create`

---

### Flow 3: Assign Task to Technician (Supervisor)

**Route**: `/tasks/[id]`

**Steps**:
1. View task detail (status: "Draft")
2. Click "Assign Technician"
3. Modal opens:
   - Select technician (dropdown)
   - Select scheduled date
   - Optional note
4. Submit via `task_assign` or update
5. Backend:
   - Updates technician_id
   - Changes status to "Assigned"
   - Creates notification
6. UI: Toast + updated status

**UX Details**:
- Technician filter by role
- Calendar shows conflicts
- Warning for double-booking

**Frontend**: `frontend/src/components/tasks/AssignTaskModal.tsx`

**Backend**: Task update with assignment

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

**Route**: `/tasks/[id]/workflow/ppf/steps/[step]`

**Steps**:
1. Show current step (e.g., "Step 1/5: Vehicle Preparation")
2. Display instructions
3. Technician:
   - Adds notes
   - Takes photo (camera/upload)
   - Records materials (optional)
4. Click "Complete Step"
5. Backend via `intervention_advance_step`:
   - Saves photo
   - Records consumption
   - Marks step completed
6. Advance to next step
7. Repeat until all steps done

**UX Details**:
- Progress bar at top
- Photo preview thumbnail
- Material autocomplete
- Required steps cannot be skipped
- Offline mode: Cache photos

**Frontend**: `frontend/src/components/workflow/ppf/`

**Backend**: `intervention_advance_step` command

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
