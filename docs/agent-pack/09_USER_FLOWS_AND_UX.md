# User Flows & UX

RPMA v2 is designed for technicians working in workshops with touch-friendly interfaces.

## Main User Flows

### 1. Daily Technician Routine (Interventions)

**Entry Routes**:
- `/dashboard` → Active tasks overview
- `/interventions` → Intervention list
- `/interventions/[id]` → Active intervention workflow

**Key UI States**:
- Today's assigned tasks list
- Intervention detail with step-by-step workflow
- Photo capture/upload interface
- Material consumption logging

**Backend Commands**:
- `intervention_start`
- `intervention_advance_step`
- `intervention_save_step_progress`
- `material_record_consumption`
- `intervention_finalize`
- `document_store_photo`

---

### 2. Administrator & Supervisor Setup

**Entry Routes**:
- `/admin` → Admin panel
- `/settings` → System configuration
- `/users` → User management

**Key UI States**:
- User management (add/remove technicians)
- Role assignment (Admin/Supervisor/Technician/Viewer)
- Inventory configuration
- System metrics and performance

**Backend Commands**:
- `user_crud`, `create_user`, `update_user_status`
- `material_create`, `material_update_stock`
- `get_security_metrics`, `get_performance_stats`

---

### 3. Client & Quote Management

**Entry Routes**:
- `/clients` → Client list
- `/quotes` → Quote list

**Key UI States**:
- Client profile with contact info
- Quote builder with line items
- Quote status tracking (Draft/Sent/Accepted/Rejected)

**Backend Commands**:
- `client_crud`
- `quote_create`, `quote_mark_accepted`, `quote_convert_to_task`

---

### 4. Task Management

**Entry Routes**:
- `/tasks` → Task list
- `/tasks/[id]` → Task detail

**Key UI States**:
- Task list with filters (status, priority, technician)
- Task detail with vehicle info, PPF zones, scheduling
- Status transitions (Draft → Scheduled → InProgress → Completed)

**Backend Commands**:
- `task_crud`, `edit_task`
- `task_transition_status`
- `calendar_schedule_task`

---

### 5. Calendar & Scheduling

**Entry Route**: `/schedule`

**Key UI States**:
- Monthly/Weekly/Daily views
- Drag-and-drop task scheduling

---

### 6. Authentication Flow

**Entry Route**: `/login` (redirects unauthorized users)

**Key UI States**:
- Login form
- First-time admin setup (`/bootstrap-admin`)
- Session expiration handling

---

## Design System Guardrails

### Tailwind CSS
- Configuration: `frontend/tailwind.config.ts`
- Utility-first approach; avoid custom CSS files.

### shadcn/ui Components
- Centralized in `frontend/src/components/ui/`.
- Use `Button`, `Dialog`, `Input`, `Select`, `Table`, `Card`, etc.

### Forms & Validation
- **Library**: `react-hook-form`
- **Validation**: Zod schemas.

### Data Loading
- **Server state**: React Query with automatic loading states.
- **Skeletons**: Use `<PageSkeleton />` for route-level loading.

### Offline Handling
- Changes apply locally to SQLite immediately.
- Sync queue handles background synchronization via `sync_enqueue`.
- UI provides feedback on sync status and connectivity.
