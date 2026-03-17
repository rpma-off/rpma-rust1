---
name: design-ux
description: Design/UX guidelines for RPMA frontend - components, tokens, patterns, accessibility, and conventions
---

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Component Library**: shadcn/ui
- **Styling**: Tailwind CSS
- **State Management**: React Query (server state) + Zustand (client state)
- **Type Safety**: TypeScript with auto-generated types from Rust via ts-rs
- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React

---

## Design Tokens (globals.css)

### Primary Colors

```css
--primary: 174 72% 78%;           /* #1ad1ba - Teal */
--rpma-primary: 147 71% 52%;      /* #3cd4a0 - RPMA Green */
```

### Semantic Colors

```css
--success: 142 76% 45%;           /* #22c55e */
--warning: 38 92% 50%;            /* #F59E0B */
--error: 0 72% 51%;               /* #EF4444 */
--info: 221 83% 53%;              /* #3B82F6 */
```

### Priority Colors (direct hex values)

```css
--priority-low: #3B82F6;       /* Blue */
--priority-medium: #F59E0B;    /* Amber */
--priority-high: #F97316;       /* Deep Orange */
--priority-urgent: #EF4444;     /* Red */
```

### Workflow Status Colors

```css
--workflow-draft: #6B7280;       /* Gray */
--workflow-scheduled: #3B82F6;   /* Blue */
--workflow-inProgress: #F59E0B; /* Amber */
--workflow-completed: #10B981;  /* Green */
--workflow-cancelled: #EF4444;  /* Red */
```

### Typography Scale

| Token | Size | Usage |
|-------|------|-------|
| 2xs | 10px | Tiny labels, captions |
| xs | 12px | Small text, captions |
| sm | 14px | Body small, labels |
| base | 16px | Body text |
| lg | 18px | Body large |
| xl | 20px | H4 headings |
| 2xl | 24px | H3 headings |
| 3xl | 30px | H2 headings |
| 4xl | 36px | H1 headings |
| 5xl | 48px | Display headings |

### Spacing (4px base unit)

| Token | Size |
|-------|------|
| space-1 | 4px |
| space-2 | 8px |
| space-3 | 12px |
| space-4 | 16px |
| space-5 | 20px |
| space-6 | 24px |
| space-8 | 32px |
| space-10 | 40px |
| space-12 | 48px |
| space-16 | 64px |

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Tags, badges, small elements |
| default/md | 8px | Buttons, inputs, default cards |
| lg | 10px | Larger cards |
| xl | 2xl | Modal dialogs (12px/16px) |
| full | 9999px | Pills, avatars, circular elements |

### Shadow System

```css
--shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.08);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.06);
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05);
--shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04);
--shadow-2xl: 0 25px 50px rgba(0, 0, 0, 0.25);
```

---

## Component Patterns

### Layout Components

| Component | File | Key Props/Behavior |
|-----------|------|-------------------|
| AppShell | `components/layout/AppShell.tsx` | Sidebar toggle persisted in localStorage |
| Topbar | `components/layout/Topbar.tsx` | Fixed 62px header with nav, search, notifications |
| DrawerSidebar | `components/layout/DrawerSidebar.tsx` | 280px collapsible sidebar |
| RPMALayout | `components/layout/RPMALayout.tsx` | Thin wrapper around AppShell |

### Button Variants (shadcn/ui)

```tsx
variant: {
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
  destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  outline: "border border-input bg-background hover:bg-accent",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  ghost: "hover:bg-accent hover:text-accent-foreground",
  link: "text-primary underline-offset-4 hover:underline",
}
size: {
  default: "h-10 px-4 py-2",
  sm: "h-9 rounded-md px-3",
  lg: "h-11 rounded-md px-8",
  xl: "h-12 rounded-md px-10 text-base",
  icon: "h-10 w-10",
  touch: "min-h-[44px] px-4 py-3",  // Touch-friendly
}
```

### StatusBadge Pattern

```tsx
// Components use predefined status configs:
const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-gray-100 text-gray-800', icon: Clock },
  in_progress: { label: 'In Progress', color: 'bg-amber-100 text-amber-800', icon: AlertCircle },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: XCircle },
};

// Usage:
<StatusBadge status="in_progress" size="md" showIcon />
```

### EmptyState Pattern

```tsx
<EmptyState
  icon={<Inbox className="h-12 w-12 text-muted-foreground" />}
  title="No tasks found"
  description="Get started by creating your first task"
  action={{ label: "Create Task", onClick: () => setIsCreateOpen(true) }}
  tips={[{ title: "Pro tip", description: "You can create tasks from calendar" }]}
/>
```

### DesktopForm Pattern (Ctrl+Enter submit)

```tsx
<DesktopForm
  schema={taskSchema}
  onSubmit={handleSubmit}
  submitLabel="Create Task"
>
  {(form) => (
    <>
      <FormField name="title" control={form.control} />
      <FormField name="priority" control={form.control} />
    </>
  )}
</DesktopForm>
```

### DesktopTable Pattern

```tsx
<DesktopTable
  data={tasks}
  columns={columns}
  enableSorting={true}
  enableFiltering={true}
  enableKeyboardNavigation={true}
  pagination={{ pageSize: 10, pageSizeOptions: [10, 25, 50, 100] }}
  emptyState={<EmptyState title="No tasks" />}
/>
```

---

## Domain Structure

Every domain follows this structure:

```
domains/[domain]/
├── api/
│   └── queries.ts          # React Query hooks (useQuery, useMutation)
├── components/
│   ├── [Domain]Card.tsx    # List item card
│   ├── [Domain]Detail.tsx  # Detail view
│   ├── [Domain]Form.tsx    # Create/edit form
│   ├── [Domain]List.tsx    # List view
│   └── index.ts            # Barrel export
├── hooks/
│   └── use[Domain].ts      # Domain-specific hooks
├── ipc/
│   └── [domain]Ipc.ts      # Tauri IPC wrappers
├── services/
│   └── [domain]Service.ts  # Frontend business logic
└── stores/
    └── [domain]Store.ts    # Zustand stores (optional)
```

---

## Form Validation (Zod)

```tsx
// Common validation patterns
const requiredString = z.string().min(1, "Required");
const emailSchema = z.string().email("Invalid email");
const phoneSchema = z.string().regex(/^(\+33|0)[1-9](\d{2}){4}$/, "Invalid phone");
const uuidSchema = z.string().uuid("Invalid ID");
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date");
const positiveNumber = z.number().positive("Must be positive");

const statusSchema = z.enum(['draft', 'scheduled', 'in_progress', 'completed', 'cancelled']);
```

---

## Animation System

| Keyframe | Duration | Usage |
|----------|----------|-------|
| fadeIn | 300ms ease-out | General appear |
| fadeOut | 200ms ease-in | General disappear |
| slideUp | 300ms ease-out | Cards, modals |
| slideDown | 300ms ease-out | Dropdowns |
| slideInRight | 300ms ease-out | Sidebars, drawers |
| pulse | 1500ms ease-in-out | Loading states |
| spin | 800ms linear | Spinner rotation |

```tsx
// Common animation utilities:
// animate-fadeIn, animate-slideUp, animate-slideInRight, animate-pulse, animate-spin
```

---

## Accessibility Requirements

### Focus Management

```css
:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}
```

### Skip Link

```tsx
<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md">
  Skip to main content
</a>
```

### Touch Targets

```css
/* Minimum 44px touch target */
.touch-target { min-height: 44px; min-width: 44px; }
```

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Icon Usage (Lucide React)

```tsx
import { Plus, Edit, Trash2, Search, Filter, MoreVertical,
  Calendar, Clock, User, Building2, CheckCircle, XCircle,
  AlertTriangle, Info, Loader2 } from 'lucide-react';

// Standard sizing:
<Icon className="h-4 w-4" />  // sm
<Icon className="h-5 w-5" />  // md
<Icon className="h-6 w-6" />  // lg
<Icon className="h-8 w-8" />  // xl

// Loading spinner:
<Loader2 className="h-4 w-4 animate-spin" />
```

---

## Responsive Breakpoints

```css
sm: 640px   /* Small devices */
md: 768px   /* Medium devices (tablets) */
lg: 1024px  /* Large devices (laptops) */
xl: 1280px  /* Extra large devices */
2xl: 1536px /* 2XL devices */
```

### Mobile-First Pattern

```tsx
// Grid responsive
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// Sidebar responsive
<aside className={cn(
  "fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-200",
  "lg:translate-x-0",
  isOpen ? "translate-x-0" : "-translate-x-full"
)}>
```

---

## Loading States

### Skeleton Pattern

```tsx
// List skeleton
<div className="space-y-4">
  {[...Array(5)].map((_, i) => (
    <div key={i} className="flex items-center space-x-4">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-[250px]" />
        <Skeleton className="h-4 w-[200px]" />
      </div>
    </div>
  ))}
</div>
```

### LoadingState Component

```tsx
<LoadingState message="Loading tasks..." />
```

---

## Error Boundary

```tsx
<ErrorBoundary FallbackComponent={ErrorFallback}>
  <AppLayout>{children}</AppLayout>
</ErrorBoundary>

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <AlertCircle className="h-12 w-12 text-destructive" />
      <h2 className="text-lg font-semibold mt-4">Something went wrong</h2>
      <Button onClick={resetErrorBoundary} className="mt-4">Try again</Button>
    </div>
  );
}
```

---

## Theme Configuration

```tsx
// providers.tsx
<ThemeProvider
  attribute="class"
  defaultTheme="system"
  enableSystem
  disableTransitionOnChange
>
  {children}
</ThemeProvider>

// Usage in components
const { theme, setTheme } = useTheme();
```

---

## Key Domain Components Reference

| Domain | Key Components |
|--------|----------------|
| tasks | `WorkflowProgressCard`, `TaskTimeline`, `TasksPageContent`, `TaskCard` |
| calendar | `CalendarDashboard`, `DayView`, `WeekView`, `MonthView`, `AgendaView` |
| clients | `ClientCard`, `ClientDetail`, `ClientForm`, `ClientSelector`, `ClientList` |
| quotes | `QuoteTotals`, `QuoteItemsTable`, `QuoteDocumentsManager`, `QuoteWorkflowPanel` |
| inventory | `InventoryManager`, `MaterialCatalog`, `MaterialForm`, `StockLevelIndicator` |
| admin | `AdminOverviewTab`, `SystemSettingsTab`, `SecurityPoliciesTab` |
| auth | `LoginForm`, `SignupForm`, `PasswordStrengthMeter` |
| reports | `ReportPreviewPanel`, `InterventionReportSection` |

---

## Best Practices

1. **Use shadcn/ui components** - Don't create new base components; extend existing ones
2. **Follow domain structure** - All domain code lives in `domains/[domain]/`
3. **Mobile-first** - Start with mobile styles, add `md:` and `lg:` breakpoints
4. **Type safety** - Import types from `@/types/` (auto-generated from Rust)
5. **Query keys** - Use centralized query keys from `lib/queryKeys.ts`
6. **IPC calls** - Always go through `domains/[domain]/ipc/` wrappers
7. **Error states** - Every data view needs EmptyState and ErrorBoundary
8. **Loading states** - Use Skeleton for lists, LoadingState for pages