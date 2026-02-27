# User Flows Documentation - RPMA v2

## Overview

This document outlines the main user journeys, page routing, navigation patterns, error handling, and business workflows in RPMA v2.

**Total Routes:** 34
**Main User Journeys:** Authentication, Task Management, PPF Intervention, Client Management
**Workflow Steps:** 4-step PPF intervention workflow

---

## Main User Journeys

### 1. Authentication Flow

**Purpose:** User login and session establishment

```
┌──────────────┐
│   Login     │
│   Page      │
└──────┬───────┘
       │
       │ User enters email/password
       ▼
┌──────────────┐
│  Validate   │
│  Form       │
└──────┬───────┘
       │
       │ submit
       ▼
┌──────────────┐
│  IPC Call   │
│  auth_login │
└──────┬───────┘
       │
       │ authenticate
       │ generate JWT
       ▼
┌──────────────┐
│  Store      │
│  Session    │
└──────┬───────┘
       │
       │ load user profile
       ▼
┌──────────────┐
│  Redirect   │
│  to /       │
└──────┬───────┘
       │
       │ role-based redirect
       ▼
┌──────────────┐     ┌──────────────┐
│ /dashboard   │     │   /admin     │
│ (supervisor, │     │   (admin)    │
│  technician, │     │               │
│   viewer)   │     └──────────────┘
└──────────────┘
```

**Steps:**
1. Navigate to `/login`
2. Enter email and password
3. Submit form → IPC `auth_login`
4. Receive JWT token + user data
5. Store session securely
6. Load user profile
7. Redirect based on role:
   - Admin → `/admin`
   - Others → `/dashboard`

**Error Handling:**
- Invalid credentials → Error message + retry
- Network error → "Check your connection"
- Server error → "An error occurred, please try again"

---

### 2. Task Management Journey

**Purpose:** Create, view, assign, and complete tasks

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Dashboard  │────▶│  Tasks List │────▶│  Task Detail│
│  /dashboard │     │   /tasks    │     │  /tasks/[id] │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                     │                     │
       │ view calendar        │ search/filter       │ view details
       │                    │                     │
       ▼                    ▼                     ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Calendar   │     │  Task List  │     │  Task       │
│  View       │     │  (Cards,    │     │  Overview   │
│             │     │   Table,    │     │             │
│  • Events   │     │   Kanban)   │     │  • Info     │
│  • Tasks    │     │             │     │  • Timeline │
│  • Filters  │     │ • Filter    │     │  • Photos   │
│  • Quick    │     │ • Sort      │     │  • Notes    │
│    actions  │     │ • Pagination│     │  • Actions  │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                     │                     │
       │                     │ create new          │ edit task
       │                     │                     │
       ▼                     ▼                     ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Schedule   │     │  Create     │     │  Update     │
│  Task       │     │  Task       │     │  Task       │
│  /tasks/new │     │  /tasks/new │     │  /tasks/edit/│
│             │     │             │     │      [id]    │
│  • Form     │     │  • Form     │     │  • Form     │
│  • Client   │     │  • Client   │     │  • Save     │
│    select  │     │    select  │     │             │
│  • Schedule │     │  • Schedule │     └──────────────┘
└──────────────┘     └──────┬───────┘
                          │
                          │ create
                          ▼
                   ┌──────────────┐
                   │  Success    │
                   │  + Redirect │
                   └──────────────┘
```

**Task Views:**
- **Cards:** Visual card layout
- **Table:** Data table with sorting
- **Kanban:** Column-based drag-and-drop
- **Calendar:** Calendar view

**Task Actions:**
- View details
- Edit task
- Delete task
- Assign to technician
- Start intervention
- Add notes
- Change status

---

### 3. PPF Intervention Workflow

**Purpose:** Execute 4-step PPF intervention with guided workflow

```
┌──────────────┐
│  Task Detail│
│  /tasks/[id] │
└──────┬───────┘
       │
       │ Start Intervention
       ▼
┌─────────────────────────────────────────────────────┐
│          PPF Workflow Entry                    │
│     /tasks/[id]/workflow/ppf                   │
├─────────────────────────────────────────────────────┤
│                                                   │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │Step List │────▶│   Step   │────▶│   Step   │  │
│  │          │    │   Detail  │    │   Form   │  │
│  └──────────┘    └──────────┘    └──────────┘  │
│        │                │                │        │
│        ▼                ▼                ▼        │
│  ┌──────────────────────────────────────┐      │
│  │       4 Sequential Steps         │      │
│  │                                │      │
│  │  1. Inspection  (~12 min)      │      │
│  │  2. Preparation  (~18 min)      │      │
│  │  3. Installation  (~45 min)      │      │
│  │  4. Finalization  (~8 min)      │      │
│  │                                │      │
│  └────────────────────────────────────┘      │
│                                                   │
└───────────────────────────────────────────────────┘
                          │
                          ▼
                   ┌──────────────┐
                   │   Summary    │
                   │ /completed   │
                   └──────────────┘
```

---

## PPF Workflow Steps

### Step 1: Inspection (~12 min)

**Purpose:** Document pre-existing conditions and verify environment

**URL:** `/tasks/[id]/workflow/ppf/steps/inspection`

**Required Elements:**

1. **Checklist (6 items):**
   - [ ] Vehicle clean and dry
   - [ ] Temperature confirmed 18-25°C
   - [ ] Humidity 40-60% verified
   - [ ] Pre-existing defects logged
   - [ ] PPF film selected and available
   - [ ] Client informed of post-installation instructions

2. **Environment Monitoring:**
   - Temperature (manual + sensor reading)
   - Humidity reading

3. **Defect Documentation:**
   - Interactive vehicle diagram
   - Mark defects with severity:
     - scratch
     - dent
     - chip
     - paint_issue
     - crack
   - Severity levels: low, medium, high

4. **Photos:**
   - **Minimum:** 4 photos required
   - Required zones:
     - Face
     - Capot
     - Ailes
     - Pare-choc

**Validation:**
- All 6 checklist items must be completed
- At least 4 photos uploaded
- Temperature and humidity recorded
- Defects documented (optional)

**Auto-save:** Every 800ms (offline-first)

---

### Step 2: Preparation (~18 min)

**Purpose:** Surface preparation and material readiness

**URL:** `/tasks/[id]/workflow/ppf/steps/preparation`

**Required Elements:**

1. **Surface Checklist (6 items):**
   - [ ] Complete vehicle wash
   - [ ] Decontamination (clay bar)
   - [ ] Degreasing PPF zones
   - [ ] Masking sensitive areas
   - [ ] Complete drying
   - [ ] Final surface check

2. **Film Pre-cut (6 zones):**

| Zone | Area | Thickness | Required |
|------|-------|-----------|----------|
| Capot | 2.4 m² | 200µ | ✅ |
| Left fender | 1.2 m² | 150µ | ✅ |
| Right fender | 1.2 m² | 150µ | ✅ |
| Bumper | 0.9 m² | 150µ | ✅ |
| Mirrors | 0.3 m² | 100µ | ✅ |
| Sills | 1.0 m² | 150µ | ✅ |

3. **Materials Checklist (8 items):**
   - [ ] PPF films (all zones)
   - [ ] Application solution
   - [ ] Squeegee
   - [ ] Heat gun
   - [ ] Precision knife
   - [ ] Microfiber towels
   - [ ] Masking tape
   - [ ] Spray bottle

**Validation:**
- All 6 surface checklist items completed
- Film pre-cut completed for all zones
- All materials verified

---

### Step 3: Installation (~45 min)

**Purpose:** Zone-by-zone film application

**URL:** `/tasks/[id]/workflow/ppf/steps/installation`

**Required Elements:**

1. **Zone Tracker (6 zones):**
   - Visual progress tracker
   - Zone status: pending → in_progress → completed
   - Quality score per zone (0-10)

2. **Per-Zone Checklist (5 items):**
   - [ ] Surface degreased and dry
   - [ ] Film pre-cut and verified
   - [ ] Installation solution applied
   - [ ] Film positioned correctly (no bubbles/wrinkles)
   - [ ] Edges sealed + final squeegee

3. **Quality Scoring:**
   - Slider from 0-10 per zone
   - Average score calculated across all zones
   - Minimum average: 7/10

4. **Photos:**
   - **Minimum:** 1 photo per zone (up to 6)
   - "After pose" photos for each completed zone

**Zone Sequence:**
1. Capot
2. Left fender
3. Right fender
4. Bumper
5. Mirrors
6. Sills

**Validation:**
- All 6 zones completed
- All per-zone checklists completed
- Quality score ≥ 7/10
- At least 6 photos (1 per zone)

---

### Step 4: Finalization (~8 min)

**Purpose:** Final quality check and client handoff

**URL:** `/tasks/[id]/workflow/ppf/steps/finalization`

**Required Elements:**

1. **Final Checklist (6 items):**
   - [ ] Edges sealed
   - [ ] No bubbles
   - [ ] Smooth surface
   - [ ] Correct alignment
   - [ ] Clean finish
   - [ ] Client briefed (maintenance, drying time)

2. **Notes:**
   - Final observations
   - Recommendations

3. **Photos:**
   - **Minimum:** 3 photos required
   - Required views:
     - Vue avant
     - Latérales
     - Arrière

**Validation:**
- All 6 checklist items completed
- At least 3 photos uploaded
- Notes optional

---

### Workflow Completion

**After completing all 4 steps:**

1. **Auto-calculate:**
   - Total duration
   - Quality score (average of all steps)
   - Material consumption

2. **Generate:**
   - Intervention summary
   - Completion timestamp
   - Quality report

3. **Redirect:**
   - To `/tasks/[id]/completed`

4. **Actions available:**
   - View intervention report
   - Generate PDF report
   - Share with client
   - Close task

---

## Client Management Flow

**Purpose:** Create, view, and manage clients

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Dashboard  │────▶│  Client    │────▶│  Client    │
│  /dashboard │     │   List      │     │   Detail   │
└──────────────┘     └──────┬───────┘     └──────┬───────┘
                           │                     │
                           │ search/filter        │ view profile,
                           │                     │ history
                           ▼                     ▼
                    ┌──────────────┐     ┌──────────────┐
                    │  Client     │     │  Client     │
                    │  List View  │     │  Detail     │
                    │             │     │             │
                    │  • Cards    │     │  • Info     │
                    │  • Table    │     │  • Tasks    │
                    │  • Search   │     │  • Quotes   │
                    └──────┬───────┘     └──────┬───────┘
                           │                     │
                           │ create new          │ edit client
                           │                     │
                           ▼                     ▼
                    ┌──────────────┐     ┌──────────────┐
                    │  Create     │     │  Edit       │
                    │  Client    │     │  Client    │
                    │  /clients/  │     │  /clients/  │
                    │     new     │     │    [id]/    │
                    │             │     │      edit    │
                    │  • Form     │     │  • Form     │
                    │  • Save     │     │  • Save     │
                    └──────────────┘     └──────────────┘
```

**Client List Views:**
- Cards: Visual card layout with key info
- Table: Data table with sorting
- Search: Full-text search (name, email, phone)

**Client Detail:**
- Profile information
- Associated tasks (history)
- Associated quotes
- Statistics (total, active, completed tasks)

---

## Quote Management Flow

**Purpose:** Create quotes and convert to tasks

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Quotes     │────▶│  Quote      │────▶│  Quote      │
│  /quotes    │     │   List      │     │   Detail    │
└──────────────┘     └──────┬───────┘     └──────┬───────┘
                           │                     │
                           │ filter/status        │ view details,
                           │                     │ line items
                           ▼                     ▼
                    ┌──────────────┐     ┌──────────────┐
                    │  Create     │     │  Quote      │
                    │  Quote     │     │  Actions    │
                    │  /quotes/   │     │             │
                    │    new      │     │  • Edit     │
                    │             │     │  • Delete   │
                    │  • Form     │     │  • Mark     │
                    │  • Items    │     │    Sent     │
                    │  • Calculate│     │  • Export   │
                    └──────┬───────┘     │  • Convert  │
                           │             └──────┬───────┘
                           │                    │
                           │ create              │ convert
                           ▼                    ▼
                    ┌──────────────┐     ┌──────────────┐
                    │  Quote     │     │  Task       │
                    │  Saved     │     │  Created    │
                    └──────────────┘     └──────────────┘
```

**Quote Line Items:**
- Labor
- Material
- Service
- Discount

**Quote Actions:**
- Mark as sent
- Mark as accepted
- Mark as rejected
- Export to PDF
- Convert to task

---

## Page Routing

### Route Structure

```
/
├── /                           # Home - redirects to/dashboard
│
├── /login                       # Public - authentication
├── /signup                      # Public - registration
├── /unauthorized                # Public - access denied
├── /bootstrap-admin            # Public - initial admin setup
│
├── /dashboard                   # Protected - main calendar view
├── /tasks                      # Protected - task list
│   ├── /new                   # Create new task
│   ├── /[id]                  # Task detail
│   │   ├── /workflow/ppf     # PPF workflow entry
│   │   │   └── /steps/     # Workflow steps
│   │   │       ├── inspection
│   │   │       ├── preparation
│   │   │       ├── installation
│   │   │       └── finalization
│   │   └── /completed        # Task completion summary
│   ├── /edit/[id]            # Edit task
│   └── /[id]                # Alternate detail route
│
├── /clients                    # Protected - client list
│   ├── /new                   # Create new client
│   ├── /[id]                  # Client detail
│   └── /[id]/edit            # Edit client
│
├── /interventions             # Protected - intervention history
├── /quotes                    # Protected - quote management
│   ├── /new                   # Create quote
│   └── /[id]                  # Quote detail
│
├── /schedule                  # Protected - scheduling view
├── /inventory                 # Protected - inventory tracking
├── /reports                   # Protected - reporting
├── /analytics                 # Protected - analytics dashboard
├── /settings                  # Protected - user settings
├── /users                     # Protected - user management (admin only)
├── /admin                     # Protected - admin panel
├── /audit                     # Protected - audit logs
└── /messages                  # Protected - messaging center
```

**Total Routes:** 34

---

## Navigation Patterns

### Desktop Navigation

```
┌──────────────────────────────────────────────────────────┐
│                       Topbar                         │
├──────────────────────────────────────────────────────────┤
│  Logo  │  Search  │  Notify  │  User     │
└──────────────────────────────────────────────────────────┘
│                                                          │
│  ┌──────────────────────────────────────────────┐          │
│  │            Drawer Sidebar               │          │
│  ├────────────────────────────────────────────┤          │
│  │  • Dashboard                                │          │
│  │  • Tasks                                    │          │
│  │  • Clients                                  │          │
│  │  • Interventions                           │          │
│  │  • Quotes                                   │          │
│  │  • Schedule                                 │          │
│  │  • Inventory                                │          │
│  │  • Reports                                  │          │
│  │  • Analytics                                │          │
│  │  • Settings                                 │          │
│  │  • Users (admin)                            │          │
│  └────────────────────────────────────────────┘          │
│                                                          │
│  ┌──────────────────────────────────────────────┐          │
│  │           Page Content                 │          │
│  │                                             │          │
│  │                                             │          │
│  └────────────────────────────────────────────┘          │
└──────────────────────────────────────────────────────────┘
```

### Mobile Navigation

```
┌──────────────────────────────────────────────────────────┐
│                    Mobile Topbar                     │
├──────────────────────────────────────────────────────────┤
│  Logo  │  Menu  │  Title                    │
└──────────────────────────────────────────────────────────┘
│                                                          │
│  ┌──────────────────────────────────────────────┐          │
│  │           Page Content                 │          │
│  │                                             │          │
│  │                                             │          │
│  │                                             │          │
│  └────────────────────────────────────────────┘          │
│                                                          │
│  ┌──────────────────────────────────────────────┐          │
│  │         Bottom Navigation Tab Bar       │          │
│  ├────────────────────────────────────────────┤          │
│  │  🏠  📋  👥  📅  ⚙️           │          │
│  │ Home Tasks Schedule Settings            │          │
│  └────────────────────────────────────────────┘          │
└──────────────────────────────────────────────────────────┘
```

---

## Error Handling

### Error Pages

**404 - Not Found:**
- Path: `/not-found`
- Content: "Page not found" with home button

**Error Boundary:**
- Path: Global error boundary
- Content: User-friendly error message
- Actions: Retry, "Back to Dashboard"
- Development: Stack trace displayed

**Unauthorized:**
- Path: `/unauthorized`
- Content: "Access denied - permissions insufficient"
- Actions: Login, Home

### Error States

**Loading States:**
- Skeleton screens during data fetch
- Spinners for async operations
- Progress bars for long-running tasks

**Error States:**
- Alert components for inline errors
- Toast notifications for ephemeral alerts
- Error boundaries for catastrophic errors

**Empty States:**
- Empty state illustrations
- Clear messaging
- Call-to-action buttons

---

## Business Workflows

### Task Lifecycle

```
draft → scheduled → assigned → in_progress → completed/cancelled/archived
   ↓         ↓          ↓         ↓
 on_hold   paused    overdue
```

**Status Transitions:**
- **draft → scheduled:** Schedule task
- **scheduled → assigned:** Assign to technician
- **assigned → in_progress:** Start work
- **in_progress → completed:** Finish task
- **in_progress → cancelled:** Cancel task
- **in_progress → on_hold:** Pause task
- **in_progress → paused:** Pause workflow

### Intervention Lifecycle

```
pending → in_progress → paused → completed/cancelled
```

**Status Transitions:**
- **pending → in_progress:** Start intervention
- **in_progress → paused:** Pause workflow
- **paused → in_progress:** Resume workflow
- **in_progress → completed:** Finalize intervention
- **in_progress → cancelled:** Cancel intervention

### Quote Lifecycle

```
draft → sent → accepted/rejected/expired
```

**Status Transitions:**
- **draft → sent:** Send quote to client
- **sent → accepted:** Client accepts
- **sent → rejected:** Client rejects
- **sent → expired:** Validity period passed

---

## Summary

**User Journey Statistics:**
- **Total Routes:** 34
- **Public Routes:** 4 (login, signup, unauthorized, bootstrap-admin)
- **Protected Routes:** 30
- **Main Workflows:** Authentication, Tasks, PPF Intervention, Clients, Quotes

**Key Features:**
- **Offline-First:** Auto-save every 800ms
- **Guided Workflow:** 4-step PPF intervention
- **Responsive:** Mobile and desktop layouts
- **Accessible:** Keyboard navigation, screen reader support
- **Error Resilient:** Multiple error handling strategies

**Workflow Completion:**
- **Total Estimated Time:** ~83 minutes
  - Inspection: 12 min
  - Preparation: 18 min
  - Installation: 45 min
  - Finalization: 8 min

---

*Document Version: 1.0*
*Last Updated: Based on codebase analysis*
