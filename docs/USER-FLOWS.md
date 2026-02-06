# RPMA v2 - User Flows Documentation

## Table of Contents

- [Introduction](#introduction)
- [User Flow Overview](#user-flow-overview)
- [User Flow 1: Task Creation](#user-flow-1-task-creation)
- [User Flow 2: Task Execution](#user-flow-2-task-execution)
- [User Flow 3: Intervention Workflow](#user-flow-3-intervention-workflow)
- [User Flow 4: Calendar & Scheduling](#user-flow-4-calendar--scheduling)
- [User Flow 5: Client Management](#user-flow-5-client-management)
- [User Flow 6: Authentication](#user-flow-6-authentication)
- [User Flow 7: Settings](#user-flow-7-settings)
- [User Flow 8: Admin](#user-flow-8-admin)
- [User Flow 9: Reporting](#user-flow-9-reporting)
- [User Flow 10: Messaging](#user-flow-10-messaging)
- [Error Handling](#error-handling)

## Introduction

This document describes the **user flows** in RPMA v2. A user flow is a sequence of steps a user takes to accomplish a specific goal within the application. Each flow includes:

- **User journey**: The path from start to completion
- **Interface states**: The UI states at each step
- **Error handling**: How errors are handled throughout the flow
- **Business rules**: The logic and constraints that guide the flow

### User Personas

| Persona | Role | Goals |
|---------|------|-------|
| **Admin** | System Administrator | Manage users, configure system, view all reports |
| **Supervisor** | Team Supervisor | Manage tasks, review quality, manage team |
| **Technician** | Field Technician | Execute interventions, upload photos, update progress |
| **Viewer** | Stakeholder | View reports, monitor progress (read-only) |

## User Flow Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     User Flow Map                           │
├─────────────────────────────────────────────────────────────────┤
│                                                               │
│  Authentication ──┐                                          │
│                   │                                          │
│                   ▼                                          │
│               Dashboard                                     │
│                   │                                          │
│        ┌──────────┼──────────┐                               │
│        │          │          │                               │
│        ▼          ▼          ▼                               │
│   Tasks     Clients   Calendar                              │
│        │          │          │                               │
│        │          │          ▼                               │
│        │          │    Interventions                          │
│        │          │          │                               │
│        │          ▼          ▼                               │
│        │      Reports     Settings                            │
│        │          │          │                               │
│        └──────────┴──────────┘                               │
│                     │                                      │
│                     ▼                                      │
│                Logout                                       │
│                                                               │
└─────────────────────────────────────────────────────────────────┘
```

## User Flow 1: Task Creation

**User**: Administrator or Supervisor
**Goal**: Create a new PPF installation task

### Journey

```
1. Navigate to /tasks
2. Click "Create Task" button
3. Fill out task information
   - Step 1: Customer information
   - Step 2: Vehicle details
   - Step 3: PPF configuration
   - Step 4: Schedule
4. Review and submit
5. Task created, redirected to task details
```

### Interface States

#### State 1: Task List
**Location**: `/tasks`

**UI Elements**:
- Page header: "Tasks"
- "Create Task" button (top right)
- Task list table with filters
- Search bar
- Filter dropdowns (status, priority, technician, client)

**Actions Available**:
- View existing tasks
- Filter tasks
- Create new task
- Export tasks

---

#### State 2: Create Task (Wizard)
**Location**: `/tasks/new`

**UI Elements**:
- Page header: "New Task"
- Step progress indicator (1/4, 2/4, 3/4, 4/4)
- Back/Next buttons
- Cancel button
- Auto-save indicator

**Step 1: Customer Information**
- Existing customer dropdown
- "Add new client" link
- Customer details form (if new):
  - Name (required)
  - Email
  - Phone
  - Type (Individual/Business)

**Step 2: Vehicle Details**
- Vehicle form:
  - Plate (required)
  - Make (required)
  - Model (required)
  - Year (required)
  - VIN
  - Color

**Step 3: PPF Configuration**
- PPF zones diagram (interactive)
- Film type dropdown
- Film brand dropdown
- Film model dropdown
- Custom zones input

**Step 4: Schedule**
- Date picker (required)
- Time picker (required)
- Technician dropdown
- Estimated duration (hours)

**Actions Available**:
- Back to previous step
- Next step
- Cancel (return to task list)
- Submit (final step only)

---

#### State 3: Task Created Success
**Location**: `/tasks/{id}`

**UI Elements**:
- Success toast: "Task created successfully"
- Task details page
- "Start Intervention" button

**Actions Available**:
- View task details
- Edit task
- Start intervention

### Validation & Error Handling

**Validation Errors**:
- **Required fields missing**: Red border on field, error message below
- **Invalid email**: "Please enter a valid email address"
- **Invalid VIN**: "Invalid VIN format"
- **Past date**: "Scheduled date must be in the future"

**Business Rule Errors**:
- **Client not found**: "Selected client does not exist"
- **Technician unavailable**: "Selected technician is not available at scheduled time"
- **Scheduling conflict**: "Conflicting task exists at this time"

**Recovery**:
- User corrects validation errors and resubmits
- Business rule errors: User selects alternative date/technician

### Success Criteria

- ✅ Task saved to database
- ✅ Task assigned unique number
- ✅ Client statistics updated
- ✅ Notification sent to assigned technician

---

## User Flow 2: Task Execution

**User**: Technician
**Goal**: Execute assigned PPF installation task

### Journey

```
1. Login to application
2. Navigate to dashboard or /tasks
3. Find assigned task
4. Click task to view details
5. Click "Start Intervention"
6. Execute intervention workflow
7. Finalize with customer sign-off
8. Task marked as completed
```

### Interface States

#### State 1: Task Details
**Location**: `/tasks/{id}`

**UI Elements**:
- Task header (title, status, priority)
- Vehicle information card
- Client information card
- "Start Intervention" button (if task not started)
- "Continue Intervention" button (if intervention in progress)
- Task actions:
  - Edit task
  - Delay task
  - Report issue
  - Send message

**Actions Available**:
- View task details
- Start/resume intervention
- Modify task (if authorized)
- Report issues

---

#### State 2: Intervention Active
**Location**: `/tasks/{id}/workflow/ppf`

**UI Elements**:
- PPF workflow header:
  - Task title
  - Vehicle diagram with PPF zones
  - Progress bar
  - Current step indicator
- Step content:
  - Step instructions
  - Required photos indicator
  - Photo upload zone
  - Next step button (when requirements met)
  - GPS location indicator (optional)

**Actions Available**:
- Complete step requirements
- Upload photos
- Advance to next step
- Pause intervention

---

#### State 3: Step Completion
**UI Elements**:
- Step completion animation
- Success message
- "Next Step" button

**Actions Available**:
- Proceed to next step
- Review step details

---

#### State 4: Intervention Finalization
**Location**: `/tasks/{id}/completed`

**UI Elements**:
- Finalization form:
  - Customer satisfaction rating (1-10 stars)
  - Quality score (auto-calculated)
  - Final observations
  - Customer signature capture
  - Customer comments
- "Complete Intervention" button

**Actions Available**:
- Rate satisfaction
- Add observations
- Capture signature
- Complete intervention

---

#### State 5: Task Completed
**UI Elements**:
- Success toast: "Intervention completed successfully"
- Completion summary card
- "View Report" button
- "Return to Dashboard" button

**Actions Available**:
- View intervention report
- Download report
- Return to dashboard

### Validation & Error Handling

**Validation Errors**:
- **Missing photos**: "Please upload required photos before proceeding"
- **Invalid signature**: "Please provide customer signature"
- **Incomplete steps**: "All mandatory steps must be completed"

**Business Rule Errors**:
- **Intervention already active**: "Task already has an active intervention"
- **Step out of order**: "Cannot skip mandatory step"
- **Missing supervisor approval**: "This step requires supervisor approval"

**Recovery**:
- User completes missing requirements
- User contacts supervisor for approval

### Success Criteria

- ✅ All workflow steps completed
- ✅ Required photos uploaded
- ✅ Customer signature captured
- ✅ Task status updated to "completed"
- ✅ Intervention closed
- ✅ Notification sent to client

---

## User Flow 3: Intervention Workflow

**User**: Technician
**Goal**: Follow step-by-step PPF installation workflow

### Journey

```
1. Access intervention from task or dashboard
2. View current step
3. Review step instructions
4. Execute step actions
   - Capture photos
   - Record measurements
   - Complete checkpoints
5. Mark step as complete
6. Repeat for all steps
7. Finalize intervention
```

### Interface States

#### State 1: Step Preparation
**UI Elements**:
- Step header: "Step 1: Preparation"
- Instructions list
- Photo requirements: "Minimum 2 photos"
- Photo upload zone
- "Complete Step" button (disabled until photos uploaded)

**Actions Available**:
- Upload photos
- View step instructions
- Complete step

---

#### State 2: Step Inspection
**UI Elements**:
- Step header: "Step 2: Inspection"
- Inspection checklist:
  - Vehicle condition
  - Surface cleanliness
  - Damage detection
- Photo requirements: "Minimum 3 photos (before)"
- "Complete Step" button

**Actions Available**:
- Complete checklist
- Upload photos
- Complete step

---

#### State 3: Step Installation
**UI Elements**:
- Step header: "Step 3: Installation"
- Film configuration display
- Material usage tracker
- Photo requirements: "Minimum 5 photos (during)"
- "Record Material Usage" button
- "Complete Step" button

**Actions Available**:
- Record material usage
- Upload photos
- Complete step

---

#### State 4: Step Finalization
**UI Elements**:
- Step header: "Step 4: Finalization"
- Finalization checklist:
  - Remove bubbles/debris
  - Final inspection
  - Quality check
- Photo requirements: "Minimum 3 photos (after)"
- Customer signature capture
- "Complete Step" button

**Actions Available**:
- Complete checklist
- Upload photos
- Capture signature
- Complete step

### Workflow Rules

**Step Advancement Rules**:
1. Cannot advance until current step is completed
2. Cannot skip mandatory steps
3. Optional steps can be skipped
4. Supervisor approval required for certain steps

**Photo Requirements**:
| Step | Min Photos | Max Photos | Categories |
|------|-------------|-------------|------------|
| Preparation | 2 | 10 | workspace, tools |
| Inspection | 3 | 15 | vehicle_condition, damage |
| Installation | 5 | 20 | progress, technique |
| Finalization | 3 | 15 | final_result, signature |

### Validation & Error Handling

**Validation Errors**:
- **Insufficient photos**: `error: "Please upload at least {min} photos"`
- **Invalid GPS**: `error: "GPS location accuracy too high"`
- **Invalid signature**: `error: "Please provide customer signature"`

**Business Rule Errors**:
- **Step not completed**: `error: "Current step must be completed"`
- **Missing approval**: `error: "This step requires supervisor approval"`

### Success Criteria

- ✅ All steps completed in order
- ✅ Photo requirements met
- ✅ Quality checkpoints passed
- ✅ Customer signature captured
- ✅ Intervention progress = 100%

---

## User Flow 4: Calendar & Scheduling

**User**: Administrator or Supervisor
**Goal**: Schedule tasks using calendar interface

### Journey

```
1. Navigate to /schedule
2. Select calendar view (month/week/day)
3. View scheduled tasks
4. Drag tasks to reschedule
5. Create new tasks via quick add
6. Resolve scheduling conflicts
```

### Interface States

#### State 1: Calendar View
**Location**: `/schedule`

**UI Elements**:
- View switcher: Month | Week | Day | Agenda
- Date navigation: Previous | Today | Next
- Date picker
- Calendar grid with tasks
- Filter panel (slide-out)
- Quick add button (+)

**Calendar Views**:

**Month View**:
- 7-column grid (Sun-Sat)
- Task cards displayed on days
- Task color-coded by priority
- More indicators for overflow

**Week View**:
- 7 columns (Sun-Sat)
- Time rows (30-minute increments)
- Task cards with start/end times
- Drag to resize duration
- Drag to move between days/times

**Day View**:
- Single day view
- Time rows (15-minute increments)
- Detailed task cards
- Full-day event strip

**Agenda View**:
- List of events sorted by time
- Date headers
- Task details

**Actions Available**:
- Navigate dates
- Change view
- Drag tasks to reschedule
- Click task to view details
- Create new task
- Filter by technician, status, priority

---

#### State 2: Task Details (from calendar)
**Location**: `/tasks/{id}` (opened from calendar)

**UI Elements**:
- Task details (same as Task Execution flow)
- "Reschedule" button

**Actions Available**:
- View task details
- Reschedule task
- Start intervention

---

#### State 3: Create Task (Quick Add)
**Location**: Quick add dialog

**UI Elements**:
- Dialog with minimal task form:
  - Title (required)
  - Date (required)
  - Time (required)
  - Duration (required)
  - Technician (optional)
- "Create" button
- "Advanced Options" link (opens full task form)

**Actions Available**:
- Fill basic task information
- Create task
- Open advanced form

### Conflict Detection

**Conflict Dialog** (when drag-resizing task)

```
┌─────────────────────────────────────┐
│ Scheduling Conflict                 │
├─────────────────────────────────────┤
│ This task conflicts with:          │
│                                    │
│ • Task: PPF Installation - ABC-123  │
│   Time: 09:00 - 11:00            │
│                                    │
│ Options:                            │
│ [ ] Override conflict                │
│ [ ] Adjust time to avoid conflict   │
│ [ ] Cancel                          │
│                                    │
│        [Save]    [Cancel]          │
└─────────────────────────────────────┘
```

### Validation & Error Handling

**Validation Errors**:
- **Past date**: `error: "Cannot schedule tasks in the past"`
- **Invalid time**: `error: "Invalid time format"`

**Business Rule Errors**:
- **Conflict detected**: Display conflict dialog with resolution options
- **Technician unavailable**: "Selected technician is already booked at this time"
- **Maximum tasks per day**: "Technician cannot exceed 8 tasks per day"

### Success Criteria

- ✅ Task scheduled at specified time
- ✅ No conflicts (or conflicts resolved)
- ✅ Notification sent to assigned technician
- ✅ Calendar updated visually

---

## User Flow 5: Client Management

**User**: Administrator or Supervisor
**Goal**: Manage client information and history

### Journey

```
1. Navigate to /clients
2. Search for existing client or create new
3. View client details
4. View client task history
5. Update client information (if needed)
```

### Interface States

#### State 1: Client List
**Location**: `/clients`

**UI Elements**:
- Page header: "Clients"
- Search bar
- Filter dropdowns:
  - Type (Individual/Business)
  - Status (Active/Inactive)
- Client table:
  - Name
  - Email
  - Phone
  - Type
  - Total tasks
  - Last task date
- "Create Client" button

**Actions Available**:
- Search clients
- Filter clients
- Create new client
- View client details
- Export client list

---

#### State 2: Client Details
**Location**: `/clients/{id}`

**UI Elements**:
- Client information card:
  - Name
  - Type
  - Contact information
  - Address
  - Business details (if applicable)
- Client statistics:
  - Total tasks
  - Active tasks
  - Completed tasks
  - Last task date
- Task history list:
  - Task cards sorted by date (newest first)
  - Each card shows: task title, status, scheduled date
- "Edit Client" button
- "New Task for Client" button

**Actions Available**:
- View client information
- View client statistics
- View task history
- Edit client
- Create new task for client

---

#### State 3: Create/Edit Client
**Location**: `/clients/new` or `/clients/{id}/edit`

**UI Elements**:
- Form fields:
  - Name (required)
  - Type (Individual/Business, required)
  - Email
  - Phone
  - Address fields
  - Business fields (if Business type)
- "Save" button
- "Cancel" button

**Actions Available**:
- Fill client information
- Save client
- Cancel

---

#### State 4: Client Task History
**UI Elements**:
- Task timeline view
- Filter by status (optional)
- Task detail links

**Actions Available**:
- View task details
- Filter tasks by status

### Validation & Error Handling

**Validation Errors**:
- **Required fields**: `error: "Name is required"`
- **Invalid email**: `error: "Please enter a valid email address"`
- **Invalid phone**: `error: "Invalid phone format"`

**Business Rule Errors**:
- **Duplicate client**: `error: "Client with this email already exists"`

### Success Criteria

- ✅ Client saved to database
- ✅ Client statistics updated
- ✅ Task history linked correctly

---

## User Flow 6: Authentication

**User**: Any user
**Goal**: Log in to application

### Journey

```
1. Navigate to /login (if not authenticated)
2. Enter email and password
3. (Optional) Enter 2FA code if enabled
4. Login successful
5. Redirect to dashboard
```

### Interface States

#### State 1: Login Form
**Location**: `/login`

**UI Elements**:
- Logo and branding
- Login form:
  - Email field (required)
  - Password field (required)
  - "Remember me" checkbox
  - "Forgot password?" link
- "Sign In" button
- "Create account" link (if no admin exists)
- Language selector (optional)

**Actions Available**:
- Enter credentials
- Sign in
- Create account (if available)
- Reset password

---

#### State 2: 2FA Verification
**Location**: `/login` (modal)

**UI Elements**:
- 2FA code input (6 digits)
- QR code (for setup)
- "Verify" button
- "Use backup code" link
- Resend code link

**Actions Available**:
- Enter 2FA code
- Use backup code
- Verify

---

#### State 3: Login Success
**UI Elements**:
- Success animation
- Redirect to dashboard

---

#### State 4: Login Failed
**UI Elements**:
- Error message: "Invalid email or password"
- Highlighted error field
- "Forgot password?" link
- Retry option

**Actions Available**:
- Correct credentials
- Reset password

---

#### State 5: Create Account (First-time setup)
**Location**: `/signup` or `/bootstrap-admin`

**UI Elements**:
- Registration form:
  - Email (required)
  - First name (required)
  - Last name (required)
  - Password (required)
  - Confirm password (required)
  - Role (optional)
- Password strength indicator
- "Create Account" button

**Actions Available**:
- Fill registration form
- Create account

### Validation & Error Handling

**Validation Errors**:
- **Invalid email**: `error: "Invalid email format"`
- **Weak password**: `error: "Password must be at least 8 characters with 3 of 4 character types"`
- **Password mismatch**: `error: "Passwords do not match"`
- **Invalid 2FA code**: `error: "Invalid verification code"`

**Business Rule Errors**:
- **Account already exists**: `error: "User with this email already exists"`
- **Account locked**: `error: "Account locked due to too many failed attempts. Please reset password."`
- **No admin exists**: `error: "No admin exists. Please create the first admin account."`

**Security Features**:
- Account lockout after 5 failed attempts
- Rate limiting (10 attempts per minute)
- Session timeout (configurable, default 8 hours)

### Success Criteria

- ✅ User authenticated
- ✅ Session token issued
- ✅ Redirected to dashboard
- ✅ Last login timestamp updated

---

## User Flow 7: Settings

**User**: Any user
**Goal**: Configure user preferences and application settings

### Journey

```
1. Navigate to /settings
2. Select settings tab
3. Modify settings
4. Save changes
```

### Interface States

#### State 1: Settings Main
**Location**: `/settings`

**UI Elements**:
- Settings tabs:
  - Profile
  - Preferences
  - Security
  - Accessibility
  - Notifications
  - Performance
- Active tab content

**Tabs**:

**Profile Tab**:
- Avatar upload
- Full name
- Email (read-only)
- Phone
- "Save" button

**Preferences Tab**:
- Theme (Light/Dark)
- Language
- Date format
- Time format
- "Save" button

**Security Tab**:
- Current password
- New password
- Confirm new password
- 2FA toggle:
  - Enable 2FA button (if disabled)
  - Disable 2FA button (if enabled)
  - Regenerate backup codes
- "Update Password" button

**Accessibility Tab**:
- High contrast toggle
- Reduced motion toggle
- Font size slider
- "Save" button

**Notifications Tab**:
- Email notifications toggle
- SMS notifications toggle
- In-app notifications toggle
- Notification types checkboxes:
  - Task assigned
  - Task updated
  - Task completed
  - Task overdue
  - System alerts
- Quiet hours:
  - Enable toggle
  - Start time
  - End time
- Email digest:
  - Frequency (Immediate/Daily/Weekly)
  - Digest time
- "Save" button

**Performance Tab**:
- Cache settings:
  - Clear cache button
  - Cache statistics
- "Apply" button

**Actions Available**:
- Modify settings
- Save settings
- Discard changes

### Validation & Error Handling

**Validation Errors**:
- **Invalid password**: `error: "Current password is incorrect"`
- **Weak new password**: `error: "Password too weak"`
- **Password mismatch**: `error: "Passwords do not match"`

**Business Rule Errors**:
- **Invalid 2FA password**: `error: "Invalid password to disable 2FA"`

### Success Criteria

- ✅ Settings saved to database
- ✅ Changes applied immediately
- ✅ Audit log updated
- ✅ Notification preferences updated

---

## User Flow 8: Admin

**User**: Administrator
**Goal**: Manage users, configuration, and system

### Journey

```
1. Navigate to /admin
2. Select admin function
3. Execute admin operation
4. Review results
```

### Interface States

#### State 1: Admin Dashboard
**Location**: `/admin`

**UI Elements**:
- Admin navigation:
  - Dashboard
  - Users
  - Configuration
  - Security Policies
  - Performance
  - Audit Logs
- Active section content

**Sections**:

**Users Section**:
- User list table:
  - Name
  - Email
  - Role
  - Status (Active/Inactive)
  - Last login
- "Create User" button
- User actions (per user):
  - Edit
  - Activate/Deactivate
  - Change role
  - Delete

**Configuration Section**:
- Configuration categories:
  - General settings
  - Business rules
  - Integrations
  - Performance settings
- Settings forms
- "Save" button

**Security Policies Section**:
- Security settings:
  - Password requirements
  - Session timeout
  - 2FA requirement
  - Account lockout policy
- "Save" button

**Performance Section**:
- Performance metrics:
  - Average response time
  - Database query time
  - Cache hit rate
- Performance charts
- Optimization recommendations

**Audit Logs Section**:
- Audit log filters:
  - User
  - Date range
  - Action type
- Audit log table:
  - Timestamp
  - User
  - Action
  - Resource
  - Result
- Export button

### Actions Available**:
- Create users
- Edit users
- Modify configuration
- View audit logs
- Export reports

### Validation & Error Handling

**Business Rule Errors**:
- **Cannot delete self**: `error: "You cannot delete your own account"`
- **Last admin**: `error: "Cannot delete last admin"`
- **Duplicate user**: `error: "User with this email already exists"`

### Success Criteria

- ✅ User operations completed
- ✅ Configuration saved
- ✅ Audit log updated
- ✅ Changes applied

---

## User Flow 9: Reporting

**User**: Administrator, Supervisor, or Viewer
**Goal**: Generate and view reports

### Journey

```
1. Navigate to /reports or /analytics
2. Select report type
3. Set filters and date range
4. Generate report
5. View results
6. Export report (optional)
```

### Interface States

#### State 1: Reports Dashboard
**Location**: `/reports`

**UI Elements**:
- Report type selector:
  - Task Completion
  - Technician Performance
  - Client Analytics
  - Quality Compliance
  - Material Usage
  - Geographic
  - Overview
- Report filters panel:
  - Date range (Start date, End date)
  - Technician (for applicable reports)
  - Client (for applicable reports)
  - Status (for applicable reports)
- "Generate Report" button
- Report results area

**Report Types**:

**Task Completion Report**:
- Total tasks completed
- Completion rate
- Average completion time
- Tasks by status (pie chart)
- Tasks by technician (bar chart)
- Trend over time (line chart)

**Technician Performance Report**:
- List of technicians
- Tasks completed
- Average task duration
- Quality scores
- Customer satisfaction ratings
- On-time completion rate

**Client Analytics Report**:
- Total clients
- New clients (in period)
- Top clients by revenue/tasks
- Client retention rate
- Geographic distribution

**Quality Compliance Report**:
- Quality score distribution
- Pass/fail rates per checkpoint
- Rework rate
- Quality trends

**Material Usage Report**:
- Material consumption by type
- Cost analysis
- Waste percentage
- Usage trends

**Geographic Report**:
- Map visualization
- Tasks by location
- Distance analysis
- Service area coverage

**Overview Report**:
- Summary dashboard
- Key metrics
- Trending data

**Actions Available**:
- Select report type
- Set filters
- Generate report
- Export report (PDF, CSV, Excel)

---

#### State 2: Report Results
**UI Elements**:
- Report title
- Filters summary
- Report visualizations:
  - Charts
  - Tables
  - Metrics cards
- Export buttons:
  - Download PDF
  - Download CSV
  - Download Excel
- "Generate New Report" button

**Actions Available**:
- View report data
- Export report
- Generate new report

### Validation & Error Handling

**Validation Errors**:
- **Invalid date range**: `error: "End date must be after start date"`
- **Date range too large**: `error: "Date range cannot exceed 1 year"`

### Success Criteria

- ✅ Report generated successfully
- ✅ Data accurate and complete
- ✅ Visualizations rendered correctly
- ✅ Export files generated

---

## User Flow 10: Messaging

**User**: Any user
**Goal**: Send and view messages

### Journey

```
1. Navigate to /messages
2. View message inbox
3. Read messages
4. Compose new message
5. Configure notification preferences
```

### Interface States

#### State 1: Message Inbox
**Location**: `/messages`

**UI Elements**:
- Message list:
  - Sender
  - Subject
  - Preview
  - Timestamp
  - Status (Read/Unread)
  - Priority indicator
- Message detail view (when message selected)
- "Compose" button
- Filter options:
  - All messages
  - Unread only
  - From specific user
- Search bar

**Actions Available**:
- View messages
- Read messages
- Mark as read
- Compose new message
- Filter messages

---

#### State 2: Compose Message
**Location**: `/messages/new`

**UI Elements**:
- Compose form:
  - To (recipient selection or email/phone input)
  - Subject
  - Message body
  - Template selector (optional)
- Send options:
  - Send now
  - Schedule send
  - Save as draft
- "Send" button
- "Cancel" button

**Actions Available**:
- Compose message
- Select template
- Schedule send
- Send message

---

#### State 3: Notification Preferences
**Location**: `/messages/preferences`

**UI Elements**:
- Notification settings:
  - Email enabled
  - SMS enabled
  - In-app enabled
- Notification types:
  - Task assigned
  - Task updated
  - Task completed
  - Task overdue
  - Client created
  - Client updated
  - System alerts
  - Maintenance notifications
- Quiet hours settings
- Email digest settings

**Actions Available**:
- Enable/disable notifications
- Configure notification types
- Set quiet hours

### Validation & Error Handling

**Validation Errors**:
- **No recipient**: `error: "Please select a recipient"`
- **Empty message**: `error: "Message body is required"`
- **Invalid phone**: `error: "Invalid phone format"`

### Success Criteria

- ✅ Message sent successfully
- ✅ Notification status updated
- ✅ Preferences saved
- ✅ Message marked as read

---

## Error Handling

### Global Error Handling

#### Error Boundary

```
┌─────────────────────────────────────┐
│     Error Boundary                │
├─────────────────────────────────────┤
│                                   │
│  Something went wrong             │
│                                   │
│  [Report Issue]  [Refresh]       │
│                                   │
│  Error: {error message}           │
│  Stack: {optional stack trace}     │
│                                   │
└─────────────────────────────────────┘
```

**Components with Error Boundaries**:
- All route pages
- Key components (TaskForm, InterventionWorkflow)
- IPC client

#### Error Types

| Error Type | UI Response | Recovery |
|------------|-------------|----------|
| **Network Error** | "Unable to connect. Check your internet connection." | Retry button |
| **Validation Error** | Inline error messages on form fields | User corrects input |
| **Auth Error** | Redirect to login page | User re-authenticates |
| **Permission Error** | "You don't have permission to access this." | User contacts admin |
| **Server Error** | "Something went wrong on our end. Please try again." | Retry button |
| **Not Found** | "The requested resource was not found." | Redirect to appropriate page |

### Toast Notifications

**Success Toasts**:
```
✓ Task created successfully
✓ Changes saved
✓ Intervention completed
```

**Error Toasts**:
```
✗ Failed to create task
✗ Unable to save changes
✗ Connection error
```

**Warning Toasts**:
```
⚠ Unsaved changes will be lost
⚠ Conflicting schedule detected
```

### Loading States

**Skeleton Screens**:

```tsx
// Task list skeleton
<div className="space-y-4">
  {[1, 2, 3].map(i => (
    <div key={i} className="flex items-center space-x-4">
      <Skeleton className="h-12 w-12 rounded" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-[250px]" />
        <Skeleton className="h-4 w-[200px]" />
      </div>
    </div>
  ))}
</div>
```

**Loading Spinners**:

```tsx
// Button with loading state
<Button disabled={loading}>
  {loading ? <LoadingSpinner size="sm" /> : 'Submit'}
</Button>
```

**Route Loading**:

```tsx
// Route loading component
export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <LoadingSpinner size="lg" />
    </div>
  );
}
```

---

**Document Version**: 1.0
**Last Updated**: Based on codebase analysis
