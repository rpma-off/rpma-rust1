# 09 — User Flows and UX

## Main User Flows

### 1. Bootstrap / First Admin Setup
- **Route**: `/bootstrap-admin`
- **Trigger**: `has_admins` returns false (public IPC command)
- **Flow**: System detects no admin exists → redirects to bootstrap page → admin fills form → `bootstrap_first_admin` IPC command → redirects to `/login`
- **Frontend**: `domains/bootstrap/api/bootstrapProvider.tsx`, `useAdminBootstrapCheck()` hook
- **Backend**: `domains/auth/ipc/auth.rs` → `AuthService.bootstrap_first_admin()`

### 2. Authentication
- **Routes**: `/login`, `/signup`, `/unauthorized`
- **Login flow**: `LoginForm` → `authIpc.login()` → `safeInvoke('auth_login', credentials)` → session stored in `AuthProvider` context → redirect to `/dashboard`
- **Auth guard**: `useAuthRedirect()` in `AppLayout` redirects unauthenticated users
- **Session check**: `auth_validate_session` called on app load
- **Frontend**: `domains/auth/api/AuthProvider.tsx`, `ipc/auth.ipc.ts`
- **Backend**: `domains/auth/ipc/auth.rs`, `infrastructure/auth/authentication.rs`
- **Key states**: loading (skeleton), authenticated, unauthenticated, unauthorized (RBAC denial)

### 3. Task Planning (Supervisor)
- **Routes**: `/dashboard`, `/tasks`, `/schedule`
- **Flow**: Supervisor opens Tasks → creates task (client + vehicle + scheduled date required) → assigns technician → task appears on `/schedule` calendar
- **IPC commands**: `task_create`, `task_list`, `calendar_schedule_task`, `update_task_status`
- **Frontend**: `domains/tasks/ipc/task.ipc.ts`, `domains/calendar/ipc/calendar.ts`
- **Backend**: `domains/tasks/ipc/task/facade.rs`, `domains/calendar/`
- **Query keys**: `taskKeys.lists()`, `calendarKeys`
- **Validation**: `vehicle_plate` and `scheduled_date` required; Zod schema in `domains/tasks/`

### 4. Quote Creation and Conversion (Supervisor)
- **Route**: `/quotes`
- **Flow**: Create quote (client + items + amounts) → send to client → mark accepted → convert to task
- **IPC commands**: `quote_create`, `quote_update`, `quote_mark_accepted`, `quote_convert_to_task`, `quote_export_pdf`
- **Frontend**: `domains/quotes/ipc/quotes.ipc.ts`, `schema/quote.schema.ts` (Zod)
- **Backend**: `domains/quotes/ipc/quote/`, `infrastructure/quote_validation.rs`
- **Query keys**: `quoteKeys`

### 5. Intervention Execution (Technician)
- **Route**: `/interventions`
- **Flow**: Technician opens assigned task → starts intervention (`intervention_start`) → works through steps in order → uploads photos per step → advances each step → finalizes intervention
- **IPC commands**: `intervention_start`, `intervention_get`, `intervention_advance_step`, `document_store_photo`, `document_get_photos`, `intervention_finalize`
- **Frontend**: `domains/interventions/ipc/interventions.ipc.ts`, `ipc/photos.ipc.ts`, `ipc/ppfWorkflow.ipc.ts`
- **Backend**: `domains/interventions/ipc/intervention/`, `infrastructure/intervention_workflow/`
- **Query keys**: `interventionKeys.byTask(taskId)`, `interventionKeys.ppfWorkflow(taskId)`, `interventionKeys.photos(interventionId)`
- **Domain rules**: Steps must advance in order; mandatory steps require minimum photo count before advance

### 6. Inventory Management (Admin/Supervisor)
- **Route**: `/inventory`
- **Flow**: Add materials → adjust stock levels → view consumption reports; stock deducted automatically on intervention completion (via `InterventionFinalizedHandler` domain event)
- **IPC commands**: `material_create`, `material_list`, `material_update_stock`, `material_record_consumption`
- **Frontend**: `domains/inventory/ipc/material.ipc.ts`, `inventory.ipc.ts`
- **Backend**: `domains/inventory/ipc/material/`, `infrastructure/material/` (8 modules)
- **Query keys**: `inventoryKeys.materials()`, `inventoryKeys.dashboard()`

### 7. Client Management (Supervisor)
- **Route**: `/clients`
- **Flow**: Create/search clients → view client statistics (task history, spending) → link to tasks/quotes
- **IPC commands**: `client_create`, `client_get`, `client_list`, `client_search`, `client_get_stats`
- **Frontend**: `domains/clients/ipc/client.ipc.ts`
- **Backend**: `domains/clients/ipc/`, `infrastructure/client_statistics.rs`
- **Query keys**: `clientKeys`
- **Stats**: denormalized via SQLite triggers (automatically maintained)

### 8. Calendar / Scheduling (Supervisor)
- **Route**: `/schedule`
- **Flow**: View technician availability → drag tasks to dates → check conflicts → confirm assignments
- **IPC commands**: `get_events`, `create_event`, `calendar_schedule_task`, `calendar_check_conflicts`
- **Frontend**: `domains/calendar/stores/calendarStore.ts` (Zustand + persist), `lib/ipc/calendar.ts`
- **Backend**: `domains/calendar/calendar_handler/`, `infrastructure/calendar_repository.rs`
- **State**: Calendar view (`day/week/month`), selected date, filters, and preferences persisted to localStorage and synced to backend on 800ms debounce

### 9. Notifications (All roles)
- **Panel**: global `NotificationPanel` component (in root providers)
- **Flow**: Backend emits `DomainEvent` → `AuditLogHandler` or notification service writes notification → frontend polls/subscribes → panel shows unread count
- **IPC commands**: `get_notifications`, `message_send`
- **Frontend**: `domains/notifications/stores/notificationStore.ts` (Zustand), `ipc/notifications.ipc.ts`

### 10. Settings and Configuration (Admin)
- **Routes**: `/settings`, `/configuration`, `/admin`
- **Flow**: Admin updates business hours, security policies, organization settings; all persisted to SQLite `app_settings` table (since migration 035, replacing in-memory Mutex statics)
- **IPC commands**: `get_app_settings`, `update_business_hours`, `update_security_policies`
- **Frontend**: `domains/settings/ipc/settings.ipc.ts`, `domains/admin/ipc/`
- **Backend**: `domains/settings/application/system_config_service.rs`, `infrastructure/app_settings.rs`

### 11. Trash / Recycle Bin (Admin)
- **Route**: `/trash`
- **Flow**: Lists soft-deleted entities → restore to active state or permanently delete
- **IPC commands**: `list_trash`, `restore_entity`, `hard_delete_entity`, `empty_trash`
- **Frontend**: `domains/trash/ipc/trash.ipc.ts`

## UX and Design System

- **Framework**: Tailwind CSS (^3.4.0) + shadcn/ui components
- **Language**: French (UI text, error messages, metadata title: "RPMA V2 - Gestion Professionnelle de Film de Protection")
- **Theme**: Light/dark auto-detect via `ThemeProvider` (`RootClientLayout.tsx`)

### Styling Rules
- Prefer utility classes for layout and spacing
- Use semantic color tokens from `tailwind.config.ts`: `bg-primary`, `text-muted-foreground`, `border`, `destructive`, etc.
- Do not introduce custom CSS files unless absolutely necessary
- Components live in `frontend/src/components/` (shadcn/ui primitives) or in domain `components/`

### Interaction Patterns
| Pattern | Implementation |
|---------|---------------|
| Optimistic updates | TanStack Query `optimisticUpdate` in mutation config |
| Loading states | Skeleton components during IPC calls; `loading.tsx` for route transitions |
| Toast notifications | Sonner (`<Toaster position="top-right" richColors closeButton />`) |
| Form validation | Zod schemas before IPC call; errors shown inline |
| Error boundary | `error.tsx` (route-level), `global-error.tsx` (top-level) |
| Offline feedback | Local SQLite always writable; UI remains functional offline |

### RBAC UI Guards
Use `createPermissionChecker` from `lib/rbac.ts` to conditionally render or disable controls:
```typescript
const { can } = createPermissionChecker(currentUser);
<Button disabled={!can('task:write')}>Create Task</Button>
```
Backend is always authoritative — frontend guards are defense-in-depth only.
