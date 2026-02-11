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

##  Core User Flows

### Flow 1: Login and Authentication

```
┌─────────────────────────────────────────────┐
│ 1. User opens application                  │
│    - If session exists and valid → Dashboard│
│    - If no session → Login screen           │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│ 2. Login screen (/login)                    │
│    - Enter email                            │
│    - Enter password                         │
│    - Click "Sign In"                        │
└─────────────────┬───────────────────────────┘
                  ↓ IPC: login { email, password }
┌─────────────────────────────────────────────┐
│ 3. Backend validates credentials            │
│    - If valid → Returns session_token       │
│    - If 2FA enabled → Prompt for code       │
│    - If invalid → Show error                │
└─────────────────┬───────────────────────────┘
                  ↓ (Success)
┌─────────────────────────────────────────────┐
│ 4. Frontend stores session_token            │
│    - Save to localStorage/sessionStorage    │
│    - Redirect to /dashboard                 │
└─────────────────────────────────────────────┘
```

**UX Details**:
- Form validation: Email format, password min length (8 chars)
- Error messages: "Invalid credentials" (generic for security)
- Loading state: Disable button, show spinner
- "Remember me" checkbox (optional): Extends session TTL
- "Forgot password" link (TODO: verify implementation)

**Frontend Components**:
- `frontend/src/app/login/page.tsx`
- `frontend/src/components/auth/LoginForm.tsx`

**Backend Commands**:
- `login`
- `validate_session`

---

### Flow 2: Create Task (Supervisor)

```
┌─────────────────────────────────────────────┐
│ 1. Supervisor navigates to /tasks/new       │
│    - Clicks "New Task" button from dashboard│
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│ 2. Create Task form                         │
│    - Fill in task details:                  │
│      • Title*                               │
│      • Description                          │
│      • Client (search/select)               │
│      • Vehicle plate*                       │
│      • Vehicle make/model/year              │
│      • Priority (Low/Medium/High/Urgent)    │
│      • PPF zones (select from checklist)    │
│      • Scheduled date (calendar picker)     │
│    - Click "Create Task"                    │
└─────────────────┬───────────────────────────┘
                  ↓ Client-side validation
┌─────────────────────────────────────────────┐
│ 3. Frontend validates form                  │
│    - Required fields present                │
│    - Valid formats (email, plate, etc.)     │
│    - If errors → Show inline errors         │
└─────────────────┬───────────────────────────┘
                  ↓ (Valid) IPC: task_create
┌─────────────────────────────────────────────┐
│ 4. Backend creates task                     │
│    - Validates business rules               │
│    - Generates task_number (e.g., T-20260211-001)
│    - Stores in database                     │
│    - Returns created task                   │
└─────────────────┬───────────────────────────┘
                  ↓ (Success)
┌─────────────────────────────────────────────┐
│ 5. Frontend shows success                   │
│    - Toast: "Task T-20260211-001 created!"  │
│    - Redirect to /tasks/[id] (task detail)  │
└─────────────────────────────────────────────┘
```

**UX Details**:
- Form autosave: Save draft to localStorage every 30 seconds
- Client autocomplete: Search clients as user types
- PPF zone selection: Visual vehicle diagram with clickable zones
- Validation feedback: Inline errors below each field
- Loading state: Disable submit button, show spinner

**Frontend Components**:
- `frontend/src/app/tasks/new/page.tsx`
- `frontend/src/components/tasks/CreateTaskForm.tsx`
- `frontend/src/components/clients/ClientSearchInput.tsx`

**Backend Commands**:
- `task_create`
- `client_list` (for client search)

---

### Flow 3: Assign Task to Technician (Supervisor)

```
┌─────────────────────────────────────────────┐
│ 1. Supervisor views task detail (/tasks/[id])│
│    - Task status: "Draft"                   │
│    - Clicks "Assign Technician" button      │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│ 2. Assignment modal opens                   │
│    - Select technician (dropdown)           │
│    - Select scheduled date (calendar)       │
│    - Optionally add assignment note         │
│    - Click "Assign"                         │
└─────────────────┬───────────────────────────┘
                  ↓ IPC: task_assign
┌─────────────────────────────────────────────┐
│ 3. Backend assigns task                     │
│    - Updates task.technician_id             │
│    - Updates task.scheduled_date            │
│    - Changes task.status = "Assigned"       │
│    - Creates notification for technician    │
└─────────────────┬───────────────────────────┘
                  ↓ (Success)
┌─────────────────────────────────────────────┐
│ 4. UI updates                               │
│    - Toast: "Task assigned to Thomas"       │
│    - Task detail page shows updated status  │
│    - Technician receives notification       │
└─────────────────────────────────────────────┘
```

**UX Details**:
- Technician dropdown: Filter by role (only show Technicians)
- Calendar view: Show technician's existing appointments (conflict detection)
- Conflict warning: "Thomas is already booked at this time"

**Frontend Components**:
- `frontend/src/components/tasks/AssignTaskModal.tsx`
- `frontend/src/components/calendar/TechnicianSchedule.tsx`

**Backend Commands**:
- `task_assign`
- `calendar_schedule_task`
- `notification_create`

---

### Flow 4: Start Intervention (Technician)

```
┌─────────────────────────────────────────────┐
│ 1. Technician views assigned tasks          │
│    - Navigates to /dashboard                │
│    - Sees "My Tasks" list                   │
│    - Clicks on task T-20260211-001          │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│ 2. Task detail page                         │
│    - Status: "Assigned"                     │
│    - Vehicle: BMW 3 Series (Plate: AB-123-CD)│
│    - Clicks "Start Intervention" button     │
└─────────────────┬───────────────────────────┘
                  ↓ IPC: intervention_start
┌─────────────────────────────────────────────┐
│ 3. Backend starts intervention              │
│    - Creates intervention record            │
│    - Generates workflow steps (from template)│
│    - Updates task.status = "In Progress"    │
│    - Returns intervention with steps        │
└─────────────────┬───────────────────────────┘
                  ↓ (Success)
┌─────────────────────────────────────────────┐
│ 4. Redirect to intervention execution       │
│    - Navigate to /interventions/[id]/execute│
│    - Show workflow step interface           │
└─────────────────────────────────────────────┘
```

**UX Details**:
- Confirmation modal: "Starting intervention will lock this task. Continue?"
- GPS capture: Request location permission (for photo geotagging)
- Offline support: Intervention can start offline, syncs when online

**Frontend Components**:
- `frontend/src/app/interventions/[id]/execute/page.tsx`
- `frontend/src/components/workflow/InterventionStepExecutor.tsx`

**Backend Commands**:
- `intervention_start`

---

### Flow 5: Execute Intervention Steps (Technician)

```
┌─────────────────────────────────────────────┐
│ 1. Intervention execution screen            │
│    - Shows current step (e.g., "Step 1/5: Vehicle Preparation")
│    - Step instructions displayed            │
│    - Fields: Notes, Photo upload, Material consumption
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│ 2. Technician completes step                │
│    - Adds notes: "Cleaned with isopropanol" │
│    - Takes photo (camera or file upload)    │
│    - Records materials used (optional)      │
│    - Clicks "Complete Step"                 │
└─────────────────┬───────────────────────────┘
                  ↓ IPC: intervention_advance_step
┌─────────────────────────────────────────────┐
│ 3. Backend processes step completion        │
│    - Saves photo to disk                    │
│    - Records material consumption           │
│    - Marks step as "Completed"              │
│    - Advances to next step (if available)   │
└─────────────────┬───────────────────────────┘
                  ↓ (Success)
┌─────────────────────────────────────────────┐
│ 4. UI updates to next step                  │
│    - Progress bar: 20% → 40%                │
│    - Show "Step 2/5: Film Application"      │
│    - Repeat until all steps completed       │
└─────────────────────────────────────────────┘
```

**UX Details**:
- Progress indicator: Visual progress bar at top
- Photo preview: Show thumbnail after upload
- Material search: Autocomplete for material selection
- Validation: Required steps cannot be skipped
- Offline mode: Cache photos and sync later

**Frontend Components**:
- `frontend/src/components/workflow/StepExecutionCard.tsx`
- `frontend/src/components/photo/PhotoCapture.tsx`
- `frontend/src/components/materials/MaterialConsumptionForm.tsx`

**Backend Commands**:
- `intervention_advance_step`
- `material_record_consumption`

---

### Flow 6: Finalize Intervention (Technician)

```
┌─────────────────────────────────────────────┐
│ 1. All steps completed                      │
│    - Progress: 100%                         │
│    - All required steps marked as completed │
│    - "Finalize Intervention" button enabled │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│ 2. Finalization form                        │
│    - Quality score (1-100 slider)           │
│    - Final notes (optional)                 │
│    - Customer signature (canvas signature)  │
│    - Click "Finalize"                       │
└─────────────────┬───────────────────────────┘
                  ↓ IPC: intervention_finalize
┌─────────────────────────────────────────────┐
│ 3. Backend finalizes intervention           │
│    - Updates intervention.status = "Completed"
│    - Updates task.status = "Completed"      │
│    - Calculates total duration              │
│    - Stores quality score                   │
│    - Triggers completion notifications      │
└─────────────────┬───────────────────────────┘
                  ↓ (Success)
┌─────────────────────────────────────────────┐
│ 4. Success screen                           │
│    - Confetti animation 🎉                  │
│    - Summary: Duration, materials used, photos taken
│    - "View Task" or "Return to Dashboard"   │
└─────────────────────────────────────────────┘
```

**UX Details**:
- Signature canvas: Touch/mouse drawing for customer signature
- Summary preview: Show intervention highlights before finalizing
- Final photo: Option to take "finished product" photo
- Celebration: Positive reinforcement for completion

**Frontend Components**:
- `frontend/src/components/workflow/FinalizeInterventionForm.tsx`
- `frontend/src/components/signature/SignatureCanvas.tsx`

**Backend Commands**:
- `intervention_finalize`
- `notification_create`

---

### Flow 7: View Reports (Supervisor)

```
┌─────────────────────────────────────────────┐
│ 1. Supervisor navigates to /reports         │
│    - Sees report types:                     │
│      • Task Completion Report               │
│      • Material Usage Report                │
│      • Technician Performance Report        │
│      • Client Activity Report               │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│ 2. Selects report type                      │
│    - Example: "Task Completion Report"      │
│    - Set filters:                           │
│      • Date range (last 30 days)            │
│      • Technician (All or specific)         │
│      • Status (Completed, Cancelled)        │
│    - Click "Generate Report"                │
└─────────────────┬───────────────────────────┘
                  ↓ IPC: get_task_completion_report
┌─────────────────────────────────────────────┐
│ 3. Backend generates report                 │
│    - Queries database with filters          │
│    - Aggregates statistics                  │
│    - Returns report data (JSON)             │
└─────────────────┬───────────────────────────┘
                  ↓ (Success)
┌─────────────────────────────────────────────┐
│ 4. Display report                           │
│    - Table: Task list with details          │
│    - Charts: Pie (by status), Bar (by tech) │
│    - KPIs: Total tasks, avg duration, completion rate
│    - Export options: PDF, Excel, CSV        │
└─────────────────────────────────────────────┘
```

**UX Details**:
- Date range picker: Presets (Last 7 days, Last 30 days, This Month, Custom)
- Live preview: Chart updates as filters change
- Export: Generate PDF with company logo and branding

**Frontend Components**:
- `frontend/src/app/reports/page.tsx`
- `frontend/src/components/reports/TaskCompletionReport.tsx`
- `frontend/src/components/charts/BarChart.tsx`

**Backend Commands**:
- `get_task_completion_report`
- `get_material_usage_report`

---

##  Common UI Patterns

### 1. Data Tables

**Used for**: Task lists, client lists, material inventory

**Features**:
- Pagination (25, 50, 100 rows)
- Sorting (click column header)
- Filtering (search, status, date range)
- Row actions (view, edit, delete)
- Bulk actions (select multiple, archive)

**Component**: `frontend/src/components/ui/DataTable.tsx`

---

### 2. Modals

**Used for**: Confirmations, quick forms, details

**Types**:
- Confirmation modal: "Are you sure you want to delete?"
- Form modal: Quick create (client, material)
- Detail modal: View-only information

**Component**: `frontend/src/components/ui/Dialog.tsx` (shadcn/ui)

---

### 3. Toast Notifications

**Used for**: Success, error, info messages

**Examples**:
- Success: "Task created successfully"
- Error: "Failed to save changes"
- Info: "Syncing data..."
- Warning: "Low stock alert: PPF Film"

**Component**: `frontend/src/components/ui/Toast.tsx`

---

### 4. Loading States

**Patterns**:
- Button loading: Spinner + disabled state
- Page loading: Full-page spinner or skeleton
- Inline loading: Skeleton for table rows
- Lazy loading: Load more on scroll

**Component**: `frontend/src/components/ui/Spinner.tsx`, `Skeleton.tsx`

---

## Accessibility (a11y) Considerations

### Keyboard Navigation

- ✅ All interactive elements accessible via Tab
- ✅ Enter to submit forms
- ✅ Esc to close modals
- ✅ Arrow keys for navigation in lists

### Screen Reader Support

- ✅ ARIA labels on icons
- ✅ ARIA live regions for notifications
- ✅ Semantic HTML (headings, landmarks)

### Color Contrast

- ✅ WCAG AA compliance (4.5:1 for text)
- ✅ Don't rely on color alone for status indication

---

## Mobile Responsiveness

**RPMA v2 is desktop-first** (Tauri desktop app), but the web frontend is responsive.

**Breakpoints**:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px

**Mobile-specific UX**:
- Navigation: Collapsible sidebar → hamburger menu
- Tables: Horizontal scroll or card view
- Forms: Stack inputs vertically

---

##  Design System Quick Reference

| Element | Usage | Component |
|---------|-------|-----------|
| Primary Button | Main actions (Submit, Create) | `<Button variant="default">` |
| Secondary Button | Alternative actions (Cancel, Back) | `<Button variant="outline">` |
| Danger Button | Destructive actions (Delete) | `<Button variant="destructive">` |
| Input Field | Text entry | `<Input type="text">` |
| Select Dropdown | Choose from options | `<Select>` |
| Checkbox | Boolean selection | `<Checkbox>` |
| Radio Buttons | Exclusive selection | `<Radio>` |
| Date Picker | Date selection | `<DatePicker>` |
| Modal | Overlay dialog | `<Dialog>` |
| Toast | Notification | `toast.success()` |

**Color Palette**:
- Primary: Blue (#3B82F6)
- Success: Green (#10B981)
- Warning: Yellow (#F59E0B)
- Danger: Red (#EF4444)
- Neutral: Gray (#6B7280)

**Typography**:
- Font family: Inter (from Google Fonts)
- Headings: 700 weight
- Body: 400 weight
- Code: JetBrains Mono

---

## Next Steps

- **Project overview**: [00_PROJECT_OVERVIEW.md](./00_PROJECT_OVERVIEW.md)
- **Domain model**: [01_DOMAIN_MODEL.md](./01_DOMAIN_MODEL.md)
- **Frontend guide**: [03_FRONTEND_GUIDE.md](./03_FRONTEND_GUIDE.md)
