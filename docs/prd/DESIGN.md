# Design Documentation - RPMA v2

## Overview

RPMA v2 features a modern, clean design built on **shadcn/ui** (Radix UI primitives) with a custom design system. The application supports light and dark themes, responsive layouts, and comprehensive accessibility features.

**UI Framework:** React 18
**Component Library:** shadcn/ui (Radix UI primitives)
**Styling:** Tailwind CSS 3.4.0
**Animation Library:** Framer Motion 12.23.24
**Icons:** Lucide React 0.552.0

---

## Design System

### Color Palette

The design system uses semantic color tokens defined in CSS variables for easy theming.

```css
:root {
  /* Primary - Teal */
  --primary: 26 208 167;           /* #1ad1ba */
  --primary-foreground: 255 255 255;
  --primary-hover: 22 196 157;
  --primary-active: 18 184 147;

  /* RPMA Green */
  --rpma: 145 224 160;            /* #3cd4a0 */
  --rpma-foreground: 255 255 255;
  --rpma-hover: 125 204 140;
  --rpma-active: 105 184 120;

  /* Secondary - Dark Slate */
  --secondary: 220 14% 96%;
  --secondary-foreground: 220 9% 90%;

  /* Muted - Light Gray */
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;

  /* Accent */
  --accent: 26 208 167;
  --accent-hover: 22 196 157;
  --accent-active: 18 184 147;
  --accent-foreground: 255 255 255;

  /* Destructive - Red */
  --destructive: 0 84% 60.2%;
  --destructive-foreground: 0 0% 98%;

  /* Status Colors */
  --success: 142 76% 36%;
  --warning: 38 92% 50%;
  --error: 0 84% 60.2%;
  --info: 199 89% 48%;

  /* Background */
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;

  /* Card */
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;

  /* Border */
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 26 208 167;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --card: 222.2 84% 4.9%;
  --card-foreground: 210 40% 98%;
  --border: 217.2 32.6% 17.5%;
  --input: 217.2 32.6% 17.5%;
}
```

### Typography Scale

**Font:** Inter (system font stack)

```
┌──────────┬────────────────┬─────────────────┐
│   Size   │   Tailwind     │   Font Size    │
├──────────┼────────────────┼─────────────────┤
│   2xs   │    text-[10px] │      0.625rem  │
│    xs    │    text-xs     │      0.75rem   │
│    sm    │    text-sm     │      0.875rem  │
│   base   │    text-base   │      1.0rem    │
│    lg    │    text-lg     │      1.125rem  │
│    xl    │    text-xl     │      1.25rem   │
│   2xl    │    text-2xl    │      1.5rem    │
│   3xl    │    text-3xl    │      1.875rem  │
│   4xl    │    text-4xl    │      2.25rem   │
│   5xl    │    text-5xl    │      3.0rem    │
│   6xl    │    text-6xl    │      3.75rem   │
└──────────┴────────────────┴─────────────────┘
```

**Font Weight:**
- `font-normal` (400)
- `font-medium` (500)
- `font-semibold` (600)
- `font-bold` (700)

**Line Height:**
- `leading-none` (1.0)
- `leading-tight` (1.25)
- `leading-snug` (1.375)
- `leading-normal` (1.5)
- `leading-relaxed` (1.625)
- `leading-loose` (2.0)

### Spacing System

**Base Unit:** 4px

```
┌─────────┬──────────────────┬─────────────────┐
│  Tailwind│    CSS Value    │   Description   │
├─────────┼──────────────────┼─────────────────┤
│   p-1   │     padding: 4px  │   0.25rem     │
│   p-2   │    padding: 8px  │   0.5rem      │
│   p-3   │   padding: 12px  │   0.75rem     │
│   p-4   │   padding: 16px  │   1.0rem      │
│   p-5   │   padding: 20px  │   1.25rem     │
│   p-6   │   padding: 24px  │   1.5rem      │
│   p-8   │   padding: 32px  │   2.0rem      │
│  p-10   │   padding: 40px  │   2.5rem      │
│  p-12   │   padding: 48px  │   3.0rem      │
│  p-16   │   padding: 64px  │   4.0rem      │
│  p-18   │   padding: 72px  │   4.5rem      │
│  p-20   │   padding: 80px  │   5.0rem      │
└─────────┴──────────────────┴─────────────────┘
```

### Border Radius

```
┌──────────────┬─────────────────┬─────────────────┐
│   Tailwind   │   CSS Value    │   Value (px)   │
├──────────────┼─────────────────┼─────────────────┤
│  rounded-none │     0px       │       0        │
│ rounded-xs   │     4px       │       4        │
│ rounded-sm   │     6px       │       6        │
│    rounded   │     8px       │       8        │
│ rounded-md   │    10px       │      10        │
│ rounded-lg   │    12px       │      12        │
│ rounded-xl   │    16px       │      16        │
│ rounded-2xl  │    24px       │      24        │
│ rounded-full │  9999px       │   Full circle  │
└──────────────┴─────────────────┴─────────────────┘
```

### Shadows

```
┌──────────────┬───────────────────────────────────┐
│   Tailwind   │   Box Shadow                    │
├──────────────┼───────────────────────────────────┤
│ shadow-sm    │   0 1px 2px 0 rgb(0 0 0 / 0.05) │
│ shadow-md    │   0 4px 6px -1px rgb(0 0 0 / 0.1) │
│ shadow-lg    │   0 10px 15px -3px rgb(0 0 0 / 0.1) │
│ shadow-xl    │   0 20px 25px -5px rgb(0 0 0 / 0.1) │
│ shadow-2xl   │   0 25px 50px -12px rgb(0 0 0 / 0.25) │
└──────────────┴───────────────────────────────────┘
```

### Animations

```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { transform: translateY(10px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

@keyframes slideInRight {
  from { transform: translateX(20px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

---

## Components

### UI Components Library (63+ Components)

Located at `frontend/src/components/ui/` and built on **shadcn/ui** (Radix UI primitives).

#### Form Controls

| Component | Description | Props |
|-----------|-------------|--------|
| `Button` | Action button with variants | `variant`, `size`, `disabled` |
| `Input` | Text input field | `type`, `placeholder`, `disabled` |
| `Textarea` | Multi-line text input | `placeholder`, `rows`, `disabled` |
| `Select` | Dropdown select | `options`, `value`, `onChange` |
| `Checkbox` | Checkbox input | `checked`, `onChange`, `label` |
| `Radio` | Radio button group | `options`, `value`, `onChange` |
| `Switch` | Toggle switch | `checked`, `onChange` |
| `Slider` | Range slider | `min`, `max`, `value`, `onChange` |
| `Label` | Form label | `htmlFor`, `children` |

#### Layout

| Component | Description |
|-----------|-------------|
| `Card` | Content card with header, content, footer |
| `Separator` | Horizontal/vertical separator |
| `ScrollArea` | Scrollable container with custom scrollbar |
| `Tabs` | Tab navigation |
| `Accordion` | Collapsible accordion |
| `Collapsible` | Collapsible content |
| `Sheet` | Slide-in panel (drawer) |

#### Feedback

| Component | Description |
|-----------|-------------|
| `Alert` | Informational alert |
| `Badge` | Small status badge |
| `Progress` | Progress bar |
| `Skeleton` | Loading skeleton |
| `Toast` | Toast notifications (via sonner) |
| `EmptyState` | Empty state illustration |

#### Dialogs

| Component | Description |
|-----------|-------------|
| `Dialog` | Modal dialog |
| `AlertDialog` | Alert dialog with actions |
| `ConfirmDialog` | Confirmation dialog |
| `Popover` | Popover content |
| `Tooltip` | Tooltip on hover |

#### Navigation

| Component | Description |
|-----------|-------------|
| `Breadcrumbs` | Breadcrumb navigation |
| `Command` | Command palette (cmdk) |
| `NavigationMenu` | Navigation menu |
| `Pagination` | Pagination controls |

#### Display

| Component | Description |
|-----------|-------------|
| `Avatar` | User avatar |
| `Calendar` | Calendar picker |
| `Kbd` | Keyboard shortcut display |

#### Advanced

| Component | Description |
|-----------|-------------|
| `VirtualizedTable` | Virtual scrolling table |
| `VirtualizedClientList` | Virtual scrolling list |
| `FloatingActionButton` | FAB for mobile |
| `PullToRefresh` | Pull-to-refresh gesture |

### Component Hierarchy

```
┌─────────────────────────────────────────────────────┐
│                    App Layout                      │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────┐    ┌──────────────┐           │
│  │   RPMALayout│────▶│  Topbar      │           │
│  └──────────────┘    │  • Search    │           │
│         │            │  • Notify    │           │
│         │            │  • UserMenu  │           │
│         │            └──────────────┘           │
│         ▼                                        │
│  ┌──────────────┐    ┌──────────────┐           │
│  │ DrawerSidebar│    │  Page Shell  │           │
│  │  • NavLinks │────▶│  • Content   │           │
│  │  • Domain   │    │  • Loading   │           │
│  │    Items    │    │  • Error     │           │
│  └──────────────┘    └──────────────┘           │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Theme Configuration

### Theme Provider

```typescript
// frontend/src/app/providers.tsx
import { ThemeProvider } from "next-themes";

export default function Providers({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}
```

### Theme Toggle

```typescript
// frontend/src/components/theme-toggle.tsx
"use client";

import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      {theme === "dark" ? <Sun /> : <Moon />}
    </Button>
  );
}
```

### Dark Mode

Dark mode is implemented via CSS variables and class-based toggling:

```css
.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --card: 222.2 84% 4.9%;
  --card-foreground: 210 40% 98%;
  /* ... more variables */
}
```

---

## Responsive Design

### Breakpoints

```
┌──────────────┬─────────────┬─────────────────┐
│   Breakpoint│   Media Q  │   Min Width    │
├──────────────┼─────────────┼─────────────────┤
│     sm      │  (min-w: 640px) │     640px      │
│     md      │ (min-w: 768px) │     768px      │
│     lg      │ (min-w: 1024px) │    1024px      │
│     xl      │ (min-w: 1280px) │    1280px      │
│   2xl      │ (min-w: 1536px) │    1536px      │
└──────────────┴─────────────┴─────────────────┘
```

### Responsive Patterns

**Desktop (≥ 1024px):**
- Full sidebar
- Topbar with all features
- Multi-column layouts

**Tablet (768px - 1023px):**
- Collapsible sidebar
- Stacked layouts

**Mobile (< 768px):**
- Bottom navigation or drawer
- Single column layouts
- Optimized touch targets

---

## Accessibility

### Features

- **Skip Links:** Skip to main content
- **Focus Management:** Visible focus indicators
- **ARIA Labels:** Screen reader support
- **Keyboard Navigation:** Full keyboard support
- **Color Contrast:** WCAG AA compliant
- **Screen Reader:** Tested with NVDA, VoiceOver

### Accessibility Settings

User-configurable accessibility options (via `user_settings`):

```typescript
interface AccessibilitySettings {
  high_contrast: boolean;        // High contrast mode
  large_text: boolean;          // Larger font sizes
  reduce_motion: boolean;       // Reduce animations
  screen_reader: boolean;       // Screen reader optimizations
}
```

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Open command palette |
| `Ctrl/Cmd + /` | Search |
| `Ctrl/Cmd + S` | Save |
| `Ctrl/Cmd + N` | New task |
| `Escape` | Close modal/drawer |

---

## Layout Patterns

### Page Shell

```typescript
// frontend/src/components/layout/page-shell.tsx
export function PageShell({
  children,
  title,
  loading,
  error,
}: PageShellProps) {
  return (
    <div className="rpma-shell">
      <h1>{title}</h1>

      {loading && <LoadingState />}
      {error && <ErrorState error={error} />}
      {!loading && !error && children}

      {!loading && !error && isEmpty(children) && <EmptyState />}
    </div>
  );
}
```

### Loading States

```typescript
// frontend/src/components/ui/layout/loading-state.tsx
export function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <Spinner className="h-8 w-8" />
      <p className="ml-3 text-muted-foreground">Loading...</p>
    </div>
  );
}
```

### Error States

```typescript
// frontend/src/components/ui/layout/error-state.tsx
export function ErrorState({ error }: { error: Error }) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>{error.message}</AlertDescription>
      <Button onClick={() => window.location.reload()} variant="outline">
        Retry
      </Button>
    </Alert>
  );
}
```

### Empty States

```typescript
// frontend/src/components/ui/layout/empty-state.tsx
export function EmptyState({ message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Inbox className="h-12 w-12 text-muted-foreground" />
      <p className="mt-4 text-muted-foreground">{message}</p>
      {action && <Button onClick={action.onClick} className="mt-4">{action.label}</Button>}
    </div>
  );
}
```

---

## Mobile Components

### Floating Action Button (FAB)

```typescript
// frontend/src/components/ui/mobile-components.tsx
export function FloatingActionButton({ icon, onClick }: FABProps) {
  return (
    <Button
      className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg md:hidden"
      size="icon"
      onClick={onClick}
    >
      <Icon className="h-6 w-6" />
    </Button>
  );
}
```

### Pull to Refresh

```typescript
export function PullToRefresh({ onRefresh }: PullToRefreshProps) {
  const [isPulling, setIsPulling] = useState(false);

  return (
    <div
      className="pull-to-refresh"
      onTouchStart={() => setIsPulling(true)}
      onTouchEnd={() => setIsPulling(false)}
      onPointerUp={onRefresh}
    >
      {isPulling && <RefreshCw className="animate-spin" />}
    </div>
  );
}
```

---

## Icons

**Icon Library:** Lucide React 0.552.0

**Common Icons:**

| Icon | Usage |
|------|--------|
| `CheckCircle` | Success |
| `AlertCircle` | Error/Warning |
| `Info` | Information |
| `Loader2` | Loading spinner |
| `Search` | Search |
| `Plus` | Add new |
| `Edit` | Edit |
| `Trash2` | Delete |
| `Menu` | Hamburger menu |
| `X` | Close |
| `ChevronRight` | Navigation |
| `ChevronDown` | Dropdown |

### Icon Component

```typescript
// frontend/src/components/icons.tsx
export { CheckCircle, AlertCircle, Info, Loader2, Search, Plus, Edit, Trash2, Menu, X, ChevronRight, ChevronDown } from 'lucide-react';
```

---

## Assets

### Images

**Location:** `frontend/public/`

- `icons/` - App icons (32x32, 128x128, 128x128@2x)
- `images/` - Application images
- `fonts/` - Custom fonts (if any)

### Fonts

**Font Stack:**
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
  'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
  sans-serif;
```

---

## Forms

### Form Component

```typescript
// frontend/src/components/forms/form-field.tsx
export function FormField({
  label,
  error,
  required,
  children,
}: FormFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={label}>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
```

### Validation

Using **react-hook-form** and **Zod**:

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
});

export function TaskForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(taskSchema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FormField label="Title" error={errors.title?.message} required>
        <Input {...register('title')} />
      </FormField>
      <FormField label="Priority" error={errors.priority?.message}>
        <Select {...register('priority')}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </Select>
      </FormField>
      <Button type="submit">Create Task</Button>
    </form>
  );
}
```

---

## Notifications

### Toast Notifications

Using **Sonner**:

```typescript
import { toast } from 'sonner';

// Success toast
toast.success('Task created successfully');

// Error toast
toast.error('Failed to create task', {
  description: 'Please try again later',
});

// Info toast
toast.info('New notification received');

// Promise toast
toast.promise(createTask(data), {
  loading: 'Creating task...',
  success: 'Task created successfully',
  error: 'Failed to create task',
});
```

### Toaster Configuration

```typescript
// frontend/src/app/providers.tsx
export default function Providers({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
        <Toaster
          position="top-right"
          richColors
          closeButton
        />
      </AuthProvider>
    </QueryClientProvider>
  );
}
```

---

## Charts

Using **Recharts** 3.3.0:

### Line Chart

```typescript
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export function PerformanceChart({ data }: ChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="performance" stroke="#3cd4a0" />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

### Bar Chart

```typescript
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export function TaskCompletionChart({ data }: ChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <XAxis dataKey="technician" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="completed" fill="#1ad1ba" />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

---

## Summary

**Design Principles:**

1. **Modern & Clean** - Minimalist design with ample whitespace
2. **Consistent** - Unified design system across all components
3. **Accessible** - WCAG AA compliant, screen reader support
4. **Responsive** - Mobile-first, desktop-optimized
5. **Themeable** - Light/dark mode support
6. **Performant** - Optimized animations and rendering

**Component Library:**
- **Total Components:** 63+
- **Categories:** Forms, Layout, Feedback, Dialogs, Navigation, Display, Advanced
- **Based On:** shadcn/ui (Radix UI primitives)

**Design Tokens:**
- **Colors:** Semantic color system with CSS variables
- **Typography:** 12 sizes (2xs to 6xl)
- **Spacing:** 4px base unit (1 to 20)
- **Border Radius:** 6 levels (0 to full)
- **Shadows:** 5 elevation levels

---

*Document Version: 1.0*
*Last Updated: Based on codebase analysis*
