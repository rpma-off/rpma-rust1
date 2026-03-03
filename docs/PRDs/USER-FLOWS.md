# USER-FLOWS.md

## RPMA v2 - User Flows & UX Documentation

---

## 1. Application Routes

### 1.1 Route Map

```
/
├── /login                      # User login
├── /signup                     # User registration
├── /bootstrap-admin            # First-time admin setup
├── /dashboard                  # Main dashboard
├── /clients
│   ├── /clients                # Client list
│   ├── /clients/new           # Create client
│   └── /clients/[id]          # Client detail
│       └── /clients/[id]/edit # Edit client
├── /tasks
│   ├── /tasks                 # Task list
│   ├── /tasks/new             # Create task
│   ├── /tasks/[id]           # Task detail
│   │   └── /completed        # Mark completed
│   ├── /tasks/edit/[id]      # Edit task
│   └── /tasks/[id]/workflow/ppf
│       ├── /inspection       # Step 1
│       ├── /preparation      # Step 2
│       ├── /installation     # Step 3
│       └── /finalization     # Step 4
├── /interventions             # Intervention list
├── /inventory
│   ├── /inventory            # Materials list
│   └── /inventory/[id]       # Material detail
├── /quotes
│   ├── /quotes               # Quote list
│   ├── /quotes/new           # Create quote
│   └── /quotes/[id]          # Quote detail
├── /schedule                 # Calendar/schedule
├── /messages                 # Messages
├── /settings                 # User settings
├── /users                    # User management (admin)
├── /audit                    # Audit logs (admin)
├── /admin                    # Admin panel
└── /unauthorized             # Access denied
```

### 1.2 Route Protection

| Route | Access | Requirement |
|-------|--------|-------------|
| `/dashboard` | Authenticated | Valid session |
| `/clients/*` | Authenticated | Any role |
| `/tasks/*` | Authenticated | Any role |
| `/inventory/*` | Authenticated | technician+ |
| `/quotes/*` | Authenticated | technician+ |
| `/users` | Admin only | role = admin |
| `/audit` | Admin only | role = admin |
| `/admin` | Admin only | role = admin |

---

## 2. Authentication Flows

### 2.1 First-Time Setup (Bootstrap)

```
┌─────────────────────────────────────────────────────────────┐
│  /bootstrap-admin                                           │
│  (Only accessible if no admin exists)                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Admin Account Creation Form                          │   │
│  │  ┌─────────────────────────────────────────────┐    │   │
│  │  │ Email:        [________________]            │    │   │
│  │  │ Username:     [________________]            │    │   │
│  │  │ Password:     [________________]            │    │   │
│  │  │ Confirm:     [________________]            │    │   │
│  │  └─────────────────────────────────────────────┘    │   │
│  │                         [Create Admin Account]       │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
              ┌─────────────────────────┐
              │ Account Created         │
              │ Redirect to /login      │
              └─────────────────────────┘
```

### 2.2 Login Flow

```
┌─────────────────────────────────────────────────────────────┐
│  /login                                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  RPMA Logo                                           │   │
│  │  ┌─────────────────────────────────────────────┐    │   │
│  │  │ Email:        [________________]            │    │   │
│  │  │ Password:     [________________]            │    │   │
│  │  └─────────────────────────────────────────────┘    │   │
│  │                         [Log In]                    │   │
│  │                         [Create Account]            │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          │
            ┌─────────────┴─────────────┐
            │                           │
            ▼                           ▼
┌─────────────────────┐     ┌─────────────────────┐
│ Validation Error   │     │ Credentials Valid   │
│ Show inline error │     └─────────────────────┘
│ Stay on login     │               │
└─────────────────────┘               ▼
                           ┌─────────────────────┐
                           │ Session Created     │
                           │ Store Token         │
                           │ Redirect /dashboard │
                           └─────────────────────┘
```

### 2.3 Signup Flow

```
┌─────────────────────────────────────────────────────────────┐
│  /signup                                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Account Creation Form                               │   │
│  │  ┌─────────────────────────────────────────────┐    │   │
│  │  │ Email:        [________________]            │    │   │
│  │  │ First Name:  [________________]            │    │   │
│  │  │ Last Name:   [________________]            │    │   │
│  │  │ Password:    [________________]            │    │   │
│  │  │ Confirm:     [________________]            │    │   │
│  │  └─────────────────────────────────────────────┘    │   │
│  │                         [Create Account]            │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
              ┌─────────────────────────┐
              │ Account Created         │
              │ Auto-login              │
              │ Redirect /dashboard     │
              └─────────────────────────┘
```

---

## 3. Client Management Flows

### 3.1 Client List Flow

```
┌─────────────────────────────────────────────────────────────┐
│  /clients                                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [+ New Client]  [Search: ________]  [Filter ▼]      │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ # │ Name        │ Type     │ Phone    │ Tasks │     │   │
│  │───│─────────────│──────────│──────────│───────│     │   │
│  │ 1 │ John Doe    │ Individ. │ 555-1234 │ 3     │     │   │
│  │ 2 │ Acme Corp   │ Business │ 555-5678 │ 12    │     │   │
│  │...│             │          │          │       │     │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  < Page 1 of 5 >  [Rows: 25 ▼]                       │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
            │
            │ Click row
            ▼
    ┌───────────────┐
    │ /clients/[id] │
    │ Client Detail │
    └───────────────┘
```

### 3.2 Create Client Flow

```
┌─────────────────────────────────────────────────────────────┐
│  /clients/new                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Client Information                                   │   │
│  │ ┌─────────────────────────────────────────────┐      │   │
│  │ │ Name:       [________________] *             │      │   │
│  │ │ Email:      [________________]              │      │   │
│  │ │ Phone:      [________________]              │      │   │
│  │ │ Type:       (•) Individual ( ) Business      │      │   │
│  │ └─────────────────────────────────────────────┘      │   │
│  │                                                       │   │
│  │ Address (Optional)                                    │   │
│  │ ┌─────────────────────────────────────────────┐      │   │
│  │ │ Street:    [________________]                │      │   │
│  │ │ City:      [________________]                │      │   │
│  │ │ ZIP:       [________________]                │      │   │
│  │ └─────────────────────────────────────────────┘      │   │
│  │                                                       │   │
│  │        [Cancel]              [Save Client]          │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
            │
            ▼
    ┌───────────────┐
    │ Validation    │
    │ Check         │
    └───────────────┘
        │           │
        ▼           ▼
┌───────────┐ ┌─────────────────┐
│ Error     │ │ Success        │
│ Show msg  │ │ Redirect       │
│ Stay on   │ │ /clients/[id]  │
│ form      │ │ Show success   │
└───────────┘ └─────────────────┘
```

---

## 4. Task Management Flows

### 4.1 Task List Flow

```
┌─────────────────────────────────────────────────────────────┐
│  /tasks                                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [+ New Task]  [Search]  [Status ▼] [Priority ▼]     │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Task Card View                                        │   │
│  │ ┌─────────────────────────────────────────────────┐ │   │
│  │ │ [Status] Task Title            [Priority]      │ │   │
│  │ │ Client: Name                    Due: Date      │ │   │
│  │ │ Assigned To: Technician          📅 Schedule   │ │   │
│  │ └─────────────────────────────────────────────────┘ │   │
│  │ ┌─────────────────────────────────────────────────┐ │   │
│  │ │ ... more tasks ...                               │ │   │
│  │ └─────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
            │
            │ Click task
            ▼
    ┌───────────────┐
    │ /tasks/[id]   │
    │ Task Detail   │
    └───────────────┘
```

### 4.2 PPF Intervention Workflow Flow

```
┌─────────────────────────────────────────────────────────────┐
│  /tasks/[id]/workflow/ppf                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Task: Vehicle PPF Installation                       │   │
│  │ Client: John Doe   Vehicle: Tesla Model 3           │   │
│  │ ─────────────────────────────────────────────────   │   │
│  │                                                       │   │
│  │ Progress: ████████░░░░ 50%                           │   │
│  │ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐        │   │
│  │ │  ✓     │ │   ✓    │ │   ◐    │ │   ○    │        │   │
│  │ │Inspect │ │Prepar. │ │Install │ │Finalize│        │   │
│  │ └────────┘ └────────┘ └────────┘ └────────┘        │   │
│  │   Done     Done     In Prog   Pending            │   │
│  │                                                       │   │
│  │ [+ Add Photos] [Add Note] [View History]            │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
            │
            │ Click current step
            ▼
┌─────────────────────────────────────────────────────────────┐
│  /tasks/[id]/workflow/ppf/steps/installation                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Step: Installation                                   │   │
│  │ ─────────────────────────────────────────────────   │   │
│  │ Vehicle Area: [Full Front ___]                       │   │
│  │ Film Type:   [________________]                      │   │
│  │ Film Brand:  [________________]                      │   │
│  │                                                       │   │
│  │ Photos:                                              │   │
│  │ ┌──────┐ ┌──────┐ ┌──────┐ ┌ [+ Add Photo]       │   │
│  │ │ img  │ │ img  │ │ img  │ │                      │   │
│  │ └──────┘ └──────┘ └──────┘ │                      │   │
│  │                                                       │   │
│  │ Notes: [________________________]                    │   │
│  │                                                       │   │
│  │       [Save Draft]        [Complete Step →]          │   │
│  └─────────────────────────────────────────────────────┘   │
```

---

## 5. Inventory Flows

### 5.1 Inventory Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│  /inventory                                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [+ Add Material]  [Search]  [Category ▼]             │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│  │ Total Items  │ │ Low Stock    │ │ Expiring     │       │
│  │    156       │ │     12 ⚠️    │ │      3 ⚠️    │       │
│  └──────────────┘ └──────────────┘ └──────────────┘       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Materials Table                                      │   │
│  │ SKU │ Name        │ Stock │ Min │ Unit │ Status    │   │
│  │─────│─────────────│───────│─────│──────│───────────│   │
│  │ M001│ PPF Film   │   45  │ 10  │ m²   │ ✓ OK      │   │
│  │ M002│ Primer     │    3  │ 10  │ L    │ ⚠️ Low    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Quote Flows

### 6.1 Quote Creation

```
┌─────────────────────────────────────────────────────────────┐
│  /quotes/new                                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Client: [Select Client ▼]  Vehicle: [Select ▼]      │   │
│  │ Valid Until: [Date Picker]                          │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Line Items                                           │   │
│  │ ┌─────────────────────────────────────────────────┐ │   │
│  │ │ Kind │ Description    │ Qty │ Unit Price │ Total│ │   │
│  │ ├──────┼────────────────┼─────┼────────────┼──────┤ │   │
│  │ │Labor │ Full Front PPF │  1  │  1200.00  │1200.00│ │   │
│  │ │Mat.  │ XPEL Film      │  2  │   450.00  │ 900.00│ │   │
│  │ └─────────────────────────────────────────────────┘ │   │
│  │ [+ Add Item]                                        │   │
│  │ ─────────────────────────────────────────────────  │   │
│  │                              Subtotal: 2100.00     │   │
│  │                              Tax (20%):  420.00    │   │
│  │                              TOTAL:    2520.00     │   │
│  └─────────────────────────────────────────────────────┘   │
│        [Save Draft]    [Export PDF]    [Send to Client]   │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Calendar/Schedule Flows

### 7.1 Schedule View

```
┌─────────────────────────────────────────────────────────────┐
│  /schedule                                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  < January 2026 >  [Today] [Week] [Month]          │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌───┬───┬───┬───┬───┬───┬───┐                          │
│  │Mon│Tue│Wed│Thu│Fri│Sat│Sun│                          │
│  ├───┼───┼───┼───┼───┼───┼───┤                          │
│  │   │ T1│   │ T2│ T3│   │   │  T1 = Task 1            │
│  │   │ 45│   │ 45│ 45│   │   │  T2 = Task 2            │
│  │   │   │   │   │   │   │   │  T3 = Task 3            │
│  └───┴───┴───┴───┴───┴───┴───┘                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Technicians: [All ▼] [Filter conflicts ☑️]          │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. Error Handling Flows

### 8.1 Form Validation Error

```
┌─────────────────────────────────────────────────────────────┐
│  Form Field with Error                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Email:                                               │   │
│  │ [________________________]                           │   │
│  │ ┌─────────────────────────────────────────────────┐ │   │
│  │ │ ✗ Please enter a valid email address            │ │   │
│  │ └─────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────┘   │
```

### 8.2 API Error Banner

```
┌─────────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ⚠️ Error: Failed to save client                     │   │
│  │    Please try again or contact support.    [Dismiss]│   │
│  └─────────────────────────────────────────────────────┘   │
│  │                                                     │   │
│  │   (Form content remains visible with data)         │   │
│  └─────────────────────────────────────────────────────┘   │
```

### 8.3 404 Not Found

```
┌─────────────────────────────────────────────────────────────┐
│  /404                                                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                       │   │
│  │              🔍  Page Not Found                      │   │
│  │                                                       │   │
│  │   The page you're looking for doesn't exist.        │   │
│  │                                                       │   │
│  │         [Go to Dashboard]  [Go Back]                 │   │
│  └─────────────────────────────────────────────────────┘   │
```

### 8.4 Access Denied

```
┌─────────────────────────────────────────────────────────────┐
│  /unauthorized                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                       │   │
│  │              🚫  Access Denied                       │   │
│  │                                                       │   │
│  │   You don't have permission to access this page.    │   │
│  │                                                       │   │
│  │         [Go to Dashboard]                            │   │
│  └─────────────────────────────────────────────────────┘   │
```

---

## 9. Navigation Flows

### 9.1 Main Navigation

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo]  RPMA          Search...      [🔔] [⚙️] [👤]      │
├────────┬────────────────────────────────────────────────────┤
│        │                                                    │
│ 📊 Dash│  Page Content Area                                │
│ ────── │                                                    │
│ 📋 Task│                                                    │
│ ────── │                                                    │
│ 👥 Client│                                                   │
│ ────── │                                                    │
│ 🔧 Inv.  │                                                   │
│ ────── │                                                    │
│ 📝 Quote │                                                    │
│ ────── │                                                    │
│ 📅 Sched│                                                    │
│ ────── │                                                    │
│ 💬 Msg  │                                                    │
│ ────── │                                                    │
│ ⚙️ Set  │                                                    │
│ ────── │                                                    │
│ 🔒 Admin│  (Only visible to admin role)                    │
└────────┴────────────────────────────────────────────────────┘
```

---

## 10. User Roles & Permissions

### 10.1 Role Matrix

| Feature | Admin | Supervisor | Technician | Viewer |
|---------|:-----:|:---------:|:----------:|:------:|
| View Dashboard | ✓ | ✓ | ✓ | ✓ |
| View Tasks | ✓ | ✓ | ✓ | ✓ |
| Create Tasks | ✓ | ✓ | ✓ | ✗ |
| Edit Tasks | ✓ | ✓ | ✓ | ✗ |
| Delete Tasks | ✓ | ✓ | ✗ | ✗ |
| Manage Clients | ✓ | ✓ | ✓ | ✗ |
| View Inventory | ✓ | ✓ | ✓ | ✓ |
| Manage Inventory | ✓ | ✓ | ✓ | ✗ |
| Create Quotes | ✓ | ✓ | ✓ | ✗ |
| Manage Users | ✓ | ✓ | ✗ | ✗ |
| View Audit Log | ✓ | ✓ | ✗ | ✗ |
| System Settings | ✓ | ✗ | ✗ | ✗ |

---

## 11. Data Refresh Patterns

### 11.1 Auto-Refresh

- Dashboard stats: Refresh on focus
- Task list: Refresh every 30 seconds when visible
- Inventory alerts: Check every 5 minutes

### 11.2 Manual Refresh

- All lists have refresh button
- Pull-to-refresh on supported views

### 11.3 Optimistic Updates

- Status changes: Update UI immediately, rollback on failure
- Form submissions: Show loading state, redirect on success
