---
title: "User Flows and UX"
summary: "Standard user journeys, design system rules, and interaction patterns."
read_when:
  - "Designing new UI screens"
  - "Implementing complex workflows"
  - "Reviewing UX consistency"
---

# 09. USER FLOWS AND UX

This guide defines how users interact with RPMA v2 and the standards for UI/UX.

## Primary User Flows

### 1. Authentication Flow
| Step | Route | Commands |
|------|-------|----------|
| Login | `/login` | `auth_login` |
| Session validate | — | `auth_validate_session` |
| Logout | — | `auth_logout` |

### 2. Client Management Flow
| Step | Route | Commands |
|------|-------|----------|
| List clients | `/clients` | `client_crud` (list) |
| View client | `/clients/[id]` | `client_crud` (get) |
| Create client | `/clients/new` | `client_crud` (create) |
| Edit client | `/clients/[id]/edit` | `client_crud` (update) |
| Soft delete | — | `client_crud` (delete) |

### 3. Task & Scheduling Flow
| Step | Route | Commands |
|------|-------|----------|
| List tasks | `/schedule`, `/` | `task_crud` (list) |
| Create task | `/tasks/new` | `task_crud` (create) |
| View task | `/tasks/[id]` | `task_crud` (get) |
| Edit task | `/tasks/[id]/edit` | `edit_task` |
| Delay task | — | `delay_task` |
| Change status | — | `task_transition_status` |

### 4. Quote to Task Flow
| Step | Route | Commands |
|------|-------|----------|
| Create quote | `/quotes` | `quote_create` |
| Add items | — | `quote_item_add` |
| Accept quote | — | `quote_mark_accepted` |
| Convert to task | — | Auto on accept |
| Export PDF | — | `quote_export_pdf` |

### 5. Intervention Execution Flow
| Step | Route | Commands |
|------|-------|----------|
| View assigned | `/interventions` | Intervention list |
| Start intervention | — | `intervention_start` |
| Progress steps | — | Step advancement |
| Record materials | — | Material consumption |
| Finalize | — | `intervention_complete` |

### 6. Inventory Management Flow
| Step | Route | Commands |
|------|-------|----------|
| List materials | `/inventory` | `material_list` |
| Create material | — | `material_create` |
| Update stock | — | `material_update_stock` |
| Dashboard data | — | `inventory_get_dashboard_data` |

### 7. Administration Flow
| Step | Route | Commands |
|------|-------|----------|
| User management | `/users`, `/admin` | `user_crud` |
| Settings | `/settings` | Settings commands |
| Trash | `/trash` | `entity_restore`, `entity_hard_delete` |

## Design System Rules

### Typography & Colors
- **Typography**: `shadcn/ui` hierarchy
- **Colors**: Tailwind theme variables:
  - `primary` — Main actions
  - `secondary` — Secondary actions
  - `destructive` — Destructive actions
  - `muted` — Disabled/inactive
  - `accent` — Highlights

### Feedback Patterns
| State | Implementation |
|-------|---------------|
| Loading | Skeleton or Spinner component |
| Success | Toast notification |
| Error | Toast with error message from `ApiResponse.error` |
| Validation | Real-time via Zod schemas + hook-form |

### Component Patterns
| Pattern | Use Case |
|---------|----------|
| Modal | Focused creation/editing (e.g., "Add Client") |
| Sheet | Context-aware details (e.g., "Task Details" from calendar) |
| Form | `shadcn/ui` Form + react-hook-form + Zod |
| Table | TanStack Table for data grids |

## Navigation Structure

### Sidebar
Main navigation via sidebar for primary domains:
- Dashboard `/`
- Schedule `/schedule`
- Clients `/clients`
- Tasks `/tasks`
- Quotes `/quotes`
- Interventions `/interventions`
- Inventory `/inventory`

### Breadcrumbs
Nested views include breadcrumbs for context.

### Deep Linking
Supported via Next.js App Router.

## Mobile Considerations

While RPMA is a desktop app, the **Intervention Execution** flow must be usable on tablet devices:
- Touch-friendly buttons (minimum44px tap targets)
- Clear progress indicators
- Large form inputs

## Accessibility (A11y)

| Requirement | Implementation |
|-------------|---------------|
| Hover/focus states | Clear visual indicators |
| Keyboard navigation | Tab order, Enter/Escape support |
| Contrast | WCAG AA minimum |
| Screen readers | ARIA labels on interactive elements |

## Key Routes

| Route | Purpose | Auth Required |
|-------|---------|---------------|
| `/` | Calendar Dashboard | Yes |
| `/login` | Authentication | No |
| `/signup` | Account creation | No |
| `/onboarding` | First-time setup | No |
| `/admin` | Admin panel | Admin |
| `/bootstrap-admin` | Initial admin setup | No |
| `/unauthorized` | Access denied | — |

## Error Handling

| Error Type | User Experience |
|------------|-----------------|
| Validation | Inline form errors via Zod |
| Auth failure | Redirect to `/login` |
| Authorization | Redirect to `/unauthorized` |
| Network/IPC | Toast with sanitized error message |
| Not found | Empty state component |

## State Management Patterns

| Data Type | Approach |
|-----------|----------|
| Server state | TanStack Query with mutation counters |
| Global UI state | Zustand (e.g., notification panel, calendar view) |
| Form state | react-hook-form + Zod validation |
| Local component state | `useState` for toggles |

## Key UI Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `Button` | `components/ui/button` | Actions |
| `Form` | `components/ui/form` | Form handling |
| `DataTable` | Domain components | Tabular data |
| `Toast` | `components/ui/toast` | Notifications |
| `Dialog/Sheet` | `components/ui/dialog` | Modals |
| `Skeleton` | `components/ui/skeleton` | Loading states |