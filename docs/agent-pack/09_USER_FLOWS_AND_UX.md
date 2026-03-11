# User Flows & UX

RPMA v2 is designed for technicians working in workshops with touch-friendly interfaces.

## Main User Flows

### 1. Daily Technician Routine (Interventions)

**Entry Routes**:
- `/dashboard` → Active tasks overview
- `/interventions` → Intervention list
- `/tasks/[id]/workflow/ppf` → Active intervention workflow

**Key UI States**:
- Today's assigned tasks list
- Intervention detail with step-by-step workflow
- Photo capture/upload interface
- Material consumption logging
- Progress indicators and completion percentage

**Backend Commands**:
- `intervention_start`
- `intervention_advance_step`
- `intervention_save_step_progress`
- `material_record_consumption`
- `intervention_finalize`
- `document_store_photo`

**Validations**:
- Cannot start intervention without assigned task
- Step prerequisites must be completed
- Photo requirements per step (if configured)
- Material availability check before consumption

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
- Security monitoring and alerts

**Backend Commands**:
- `user_crud`, `create_user`, `update_user_status`
- `material_create`, `material_update_stock`
- `get_security_metrics`, `get_performance_stats`
- `get_security_alerts`, `resolve_security_alert`

---

### 3. Client & Quote Management

**Entry Routes**:
- `/clients` → Client list
- `/clients/[id]` → Client detail
- `/clients/new` → Create client
- `/quotes` → Quote list

**Key UI States**:
- Client profile with contact info
- Quote builder with line items
- Quote status tracking (Draft/Sent/Accepted/Rejected/Expired)
- Client statistics (total tasks, active tasks)

**Backend Commands**:
- `client_crud`
- `quote_create`, `quote_mark_sent`, `quote_mark_accepted`, `quote_mark_rejected`
- `quote_convert_to_task`
- `quote_item_add`, `quote_item_update`, `quote_item_delete`

---

### 4. Task Management

**Entry Routes**:
- `/tasks` → Task list
- `/tasks/[id]` → Task detail
- `/tasks/new` → Create task
- `/tasks/edit/[id]` → Edit task

**Key UI States**:
- Task list with filters (status, priority, technician)
- Task detail with vehicle info, PPF zones, scheduling
- Status transitions (Draft → Scheduled → InProgress → Completed)
- Task notes and messaging

**Backend Commands**:
- `task_crud`, `edit_task`
- `task_transition_status`
- `calendar_schedule_task`
- `add_task_note`, `send_task_message`
- `delay_task`, `report_task_issue`

---

### 5. Calendar & Scheduling

**Entry Route**: `/schedule`

**Key UI States**:
- Monthly/Weekly/Daily views
- Drag-and-drop task scheduling
- Conflict detection
- Technician availability

**Backend Commands**:
- `calendar_get_tasks`
- `calendar_schedule_task`
- `calendar_check_conflicts`
- `get_events_for_technician`

---

### 6. Authentication Flow

**Entry Route**: `/login` (redirects unauthorized users)

**Key UI States**:
- Login form with validation
- First-time admin setup (`/bootstrap-admin`)
- Session expiration handling
- Auto-redirect for protected routes

**Backend Commands**:
- `auth_login`
- `auth_validate_session`
- `auth_logout`
- `has_admins`, `bootstrap_first_admin`

---

### 7. Inventory Management

**Entry Route**: `/inventory`

**Key UI States**:
- Material list with stock levels
- Low stock alerts
- Expiration tracking
- Consumption history
- Stock adjustment forms

**Backend Commands**:
- `material_list`, `material_get`
- `material_update_stock`, `material_adjust_stock`
- `material_record_consumption`
- `material_get_low_stock`, `material_get_expired`
- `inventory_get_stats`

---

### 8. Messaging

**Entry Route**: `/messages`

**Key UI States**:
- Task-scoped messages
- Message list with read/unread status
- Message templates

**Backend Commands**:
- `message_send`
- `message_get_list`
- `message_mark_read`
- `message_get_templates`
- `message_get_preferences`

---

### 9. Reports & Documents

**Entry Routes**:
- Task/intervention reports
- Intervention report export

**Key UI States**:
- Report generation interface
- PDF export
- Photo report generation

**Backend Commands**:
- `report_generate`
- `report_get`, `report_list`
- `export_intervention_report`
- `save_intervention_report`

---

## Design System Guardrails

### Tailwind CSS
- Configuration: `frontend/tailwind.config.ts`
- Utility-first approach; avoid custom CSS files
- Responsive breakpoints for mobile/tablet/desktop

### shadcn/ui Components
Centralized in `frontend/src/components/ui/`:
- **Layout**: Card, Dialog, Sheet, Tabs, Accordion
- **Forms**: Button, Input, Select, Checkbox, RadioGroup, Textarea, Form, Label
- **Feedback**: Alert, Badge, Toast, Progress, Skeleton, Loading
- **Data Display**: Table, Avatar, EmptyState
- **Navigation**: DropdownMenu, Command, Popover
- **Overlays**: AlertDialog, ConfirmDialog, Tooltip
- **Error Handling**: ErrorBoundary, ErrorFallback

### Forms & Validation
- **Library**: `react-hook-form`
- **Validation**: Zod schemas
- **Feedback**: Form-level and field-level error messages

### Data Loading
- **Server state**: React Query with automatic loading states
- **Skeletons**: Use `<PageSkeleton />` for route-level loading
- **Empty States**: Use `<EmptyState />` for empty lists/collections

### Offline Handling
- Changes apply locally to SQLite immediately
- Sync queue handles background synchronization via `sync_enqueue`
- UI provides feedback on sync status and connectivity
- Offline indicator when network unavailable

### Touch-Friendly Design
- Large touch targets (min 44px)
- Swipe gestures where appropriate
- Clear visual feedback on interactions
- Keyboard shortcuts for desktop users
