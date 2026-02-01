# Design & UI Documentation

## Table of Contents
1. [Overview](#overview)
2. [Design System](#design-system)
3. [Component Library](#component-library)
4. [Page Structure](#page-structure)
5. [Styling Approach](#styling-approach)
6. [Theming](#theming)
7. [Responsive Design](#responsive-design)
8. [Accessibility](#accessibility)
9. [Design Patterns](#design-patterns)
10. [Assets & Resources](#assets--resources)

## Overview

RPMA v2 uses a modern, component-based UI architecture built with **Next.js 14** (App Router), **React 18**, **TailwindCSS**, and **Radix UI primitives** via the **shadcn/ui** component system.

### Design Philosophy
- **Professional & Clean**: Business-oriented interface for PPF technicians
- **Offline-First**: Clear visual feedback for sync status
- **Dark/Light Modes**: User-selectable themes
- **Accessibility First**: WCAG 2.1 AA compliance target
- **Responsive**: Desktop-optimized (primary use case)

## Design System

### Color Palette

**Defined in:** `frontend/tailwind.config.ts`

The application uses CSS variables for dynamic theming:

```css
/* Light Mode */
--background: 0 0% 100%;
--foreground: 222.2 84% 4.9%;
--primary: 221.2 83.2% 53.3%;
--primary-foreground: 210 40% 98%;
--secondary: 210 40% 96.1%;
--accent: 210 40% 96.1%;
--destructive: 0 84.2% 60.2%;
--muted: 210 40% 96.1%;
--border: 214.3 31.8% 91.4%;
--input: 214.3 31.8% 91.4%;
--ring: 221.2 83.2% 53.3%;

/* Dark Mode */
--background: 222.2 84% 4.9%;
--foreground: 210 40% 98%;
--primary: 217.2 91.2% 59.8%;
--primary-foreground: 222.2 47.4% 11.2%;
/* ... */
```

### Typography

**Font Families:**
```css
font-family: 
  'Inter', 
  -apple-system, 
  BlinkMacSystemFont, 
  'Segoe UI', 
  'Roboto', 
  sans-serif
```

**Font Sizes (Tailwind):**
- `text-xs`: 0.75rem (12px)
- `text-sm`: 0.875rem (14px)
- `text-base`: 1rem (16px)
- `text-lg`: 1.125rem (18px)
- `text-xl`: 1.25rem (20px)
- `text-2xl`: 1.5rem (24px)
- `text-3xl`: 1.875rem (30px)
- `text-4xl`: 2.25rem (36px)

### Spacing

Following Tailwind's default spacing scale (0.25rem increments):
- `p-1`: 0.25rem (4px)
- `p-2`: 0.5rem (8px)
- `p-4`: 1rem (16px)
- `p-6`: 1.5rem (24px)
- `p-8`: 2rem (32px)

### Border Radius

```css
--radius: 0.5rem; /* 8px - default */
border-radius: calc(var(--radius) - 2px); /* Nested elements */
```

### Shadows

```css
sm: 0 1px 2px 0 rgb(0 0 0 / 0.05)
md: 0 4px 6px -1px rgb(0 0 0 / 0.1)
lg: 0 10px 15px -3px rgb(0 0 0 / 0.1)
xl: 0 20px 25px -5px rgb(0 0 0 / 0.1)
```

## Component Library

### UI Primitives (shadcn/ui)

**Location:** `frontend/src/ui/*`

Core components based on Radix UI:

| Component | File | Purpose |
|-----------|------|---------|
| Button | `button.tsx` | Primary action buttons |
| Dialog | `dialog.tsx` | Modal windows |
| Dropdown Menu | `dropdown-menu.tsx` | Contextual menus |
| Form | `form.tsx` | Form wrapper with validation |
| Input | `input.tsx` | Text inputs |
| Select | `select.tsx` | Dropdown selectors |
| Table | `table.tsx` | Data tables |
| Tabs | `tabs.tsx` | Tab navigation |
| Toast | `toast.tsx` | Notifications |
| Tooltip | `tooltip.tsx` | Hover tooltips |
| Card | `card.tsx` | Container cards |
| Badge | `badge.tsx` | Status badges |
| Progress | `progress.tsx` | Progress bars |
| Checkbox | `checkbox.tsx` | Checkboxes |
| Radio Group | `radio-group.tsx` | Radio buttons |
| Label | `label.tsx` | Form labels |
| Separator | `separator.tsx` | Visual separators |
| Scroll Area | `scroll-area.tsx` | Custom scrollbars |
| Alert Dialog | `alert-dialog.tsx` | Confirmation dialogs |
| Popover | `popover.tsx` | Popover menus |
| Accordion | `accordion.tsx` | Collapsible sections |
| Avatar | `avatar.tsx` | User avatars |
| Collapsible | `collapsible.tsx` | Toggle sections |

**40+ UI primitives** available in `frontend/src/ui/`

### Domain Components

**Location:** `frontend/src/components/*`

#### Task Management
- `TaskForm/` - Multi-step task creation
- `TaskCard` - Task display card
- `TaskList` - Task listing with filters
- `TaskDetails` - Detailed task view

#### Client Management
- `ClientForm` - Client creation/editing
- `ClientCard` - Client display
- `ClientSelector` - Client picker

#### Intervention Workflow
- `InterventionWizard` - Step-by-step workflow
- `StepIndicator` - Progress visualization
- `PhotoUpload/` - Image upload with preview
- `SignatureCapture/` - Digital signature
- `QualityControl/` - Quality checklist

#### Dashboard
- `DashboardCard` - Metric cards
- `Charts/` - Recharts-based visualizations
- `RecentActivity` - Activity feed

#### Maps & GPS
- `GPS/` - Location tracking
- `MapView` - Leaflet integration
- `LocationPicker` - Address selection

#### Common
- `Sidebar` - Navigation sidebar
- `Header` - Page header
- `Breadcrumbs` - Navigation breadcrumbs
- `DataTable` - Advanced tables with sorting/filtering
- `SearchBar` - Global search
- `StatusBadge` - Status indicators
- `LoadingSpinner` - Loading states
- `EmptyState` - No data states
- `ErrorBoundary` - Error handling

## Page Structure

### App Router Layout

**Root Layout:** `frontend/src/app/layout.tsx`
```tsx
<html>
  <body>
    <RootClientLayout>
      {children}
    </RootClientLayout>
  </body>
</html>
```

**RootClientLayout:** `frontend/src/app/RootClientLayout.tsx`
- Theme provider (next-themes)
- TanStack Query provider
- Toast notifications (Sonner)
- Error boundary
- Global state initialization

### Page Hierarchy

```
/                         → Landing/Dashboard
├── /login                → Authentication
├── /signup               → Registration
├── /bootstrap-admin      → First admin setup
├── /dashboard            → Main dashboard
├── /tasks                → Task management
│   ├── /new              → Create task
│   ├── /[id]            → View task
│   └── /[id]/edit       → Edit task
├── /clients              → Client management
│   ├── /new
│   └── /[id]
├── /interventions        → Intervention workflows
│   └── /[id]
├── /schedule             → Calendar view
├── /inventory            → Material inventory
├── /messages             → Messaging
├── /reports              → Reporting
│   ├── /overview
│   ├── /tasks
│   ├── /technicians
│   ├── /clients
│   ├── /quality
│   ├── /materials
│   └── /geographic
├── /analytics            → Analytics dashboard
├── /team                 → Team management
├── /settings             → User settings
├── /configuration        → System configuration
├── /admin                → Admin panel
├── /audit                → Audit logs
└── /data-explorer        → Database explorer
```

### Common Layout Pattern

```tsx
// Standard page structure
export default function Page() {
  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Page Title</h1>
        <Button>Primary Action</Button>
      </div>

      {/* Content */}
      <Card className="p-6">
        {/* Page content */}
      </Card>
    </div>
  );
}
```

## Styling Approach

### TailwindCSS Utility-First

**Primary Approach:** Utility classes in JSX

```tsx
<div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent">
  <h3 className="text-lg font-semibold">Title</h3>
  <Badge variant="success">Active</Badge>
</div>
```

### Component Variants (CVA)

Using `class-variance-authority` for variant management:

```tsx
// button.tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent",
        ghost: "hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
```

### CSS Modules (Rare)

Used sparingly for complex animations or page-specific styles.

**Example:** `frontend/src/app/globals.css`
```css
@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}

@layer utilities {
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
}
```

## Theming

### Theme Switching

**Provider:** `next-themes`

```tsx
// RootClientLayout.tsx
<ThemeProvider
  attribute="class"
  defaultTheme="system"
  enableSystem
  disableTransitionOnChange
>
  {children}
</ThemeProvider>
```

**Usage:**
```tsx
import { useTheme } from 'next-themes';

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  
  return (
    <Button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      Toggle Theme
    </Button>
  );
}
```

### Theme Configuration

**Defined in:** `tailwind.config.ts`

```ts
theme: {
  extend: {
    colors: {
      border: "hsl(var(--border))",
      input: "hsl(var(--input))",
      ring: "hsl(var(--ring))",
      background: "hsl(var(--background))",
      foreground: "hsl(var(--foreground))",
      primary: {
        DEFAULT: "hsl(var(--primary))",
        foreground: "hsl(var(--primary-foreground))",
      },
      // ... more semantic colors
    },
  },
}
```

## Responsive Design

### Breakpoints

```css
sm: 640px   /* Small devices */
md: 768px   /* Tablets */
lg: 1024px  /* Laptops */
xl: 1280px  /* Desktops */
2xl: 1536px /* Large screens */
```

### Responsive Utilities

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* 1 column on mobile, 2 on tablet, 3 on desktop */}
</div>

<aside className="hidden lg:block">
  {/* Sidebar visible only on large screens */}
</aside>
```

### Desktop-First Approach

Since this is a desktop application, the primary design targets:
- **Minimum Window Size:** 800x600 (from tauri.conf.json)
- **Default Window Size:** 1280x800
- **Optimal Resolution:** 1920x1080+

## Accessibility

### WCAG Compliance

**Target:** WCAG 2.1 Level AA

**Implemented Features:**
1. **Keyboard Navigation**: All interactive elements accessible via keyboard
2. **Focus Indicators**: Visible focus rings
3. **ARIA Labels**: Screen reader support
4. **Color Contrast**: Minimum 4.5:1 ratio
5. **Alt Text**: Images include descriptive alt text
6. **Semantic HTML**: Proper heading hierarchy

### Accessibility Settings

**User Settings:** `frontend/src/app/settings/`

Available options:
- High contrast mode
- Large text mode
- Reduced motion (respects `prefers-reduced-motion`)
- Screen reader support
- Focus indicators
- Keyboard navigation
- Text-to-speech
- Speech rate control
- Font size adjustment
- Color blind modes

### Implementation Example

```tsx
// Button with accessibility
<button
  aria-label="Delete task"
  aria-describedby="delete-description"
  className="focus:ring-2 focus:ring-primary focus:outline-none"
>
  <TrashIcon aria-hidden="true" />
</button>
<span id="delete-description" className="sr-only">
  This action is irreversible
</span>
```

## Design Patterns

### Form Patterns

**Using react-hook-form + Zod:**

```tsx
const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
});

function TaskForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    await createTask(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}
```

### Loading States

```tsx
{isLoading ? (
  <div className="flex items-center justify-center p-8">
    <Spinner className="h-8 w-8 animate-spin" />
  </div>
) : data ? (
  <DataDisplay data={data} />
) : (
  <EmptyState />
)}
```

### Error Handling

```tsx
// Error Boundary
<ErrorBoundary fallback={<ErrorFallback />}>
  <Component />
</ErrorBoundary>

// Inline errors
{error && (
  <Alert variant="destructive">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>Error</AlertTitle>
    <AlertDescription>{error.message}</AlertDescription>
  </Alert>
)}
```

### Toast Notifications

**Using Sonner:**

```tsx
import { toast } from 'sonner';

// Success
toast.success("Task created successfully!");

// Error
toast.error("Failed to save task");

// With action
toast.message("New message", {
  action: {
    label: "View",
    onClick: () => navigateToMessage(),
  },
});
```

### Modal Dialogs

```tsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Confirm Action</DialogTitle>
      <DialogDescription>
        Are you sure you want to proceed?
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline" onClick={() => setIsOpen(false)}>
        Cancel
      </Button>
      <Button onClick={handleConfirm}>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

## Assets & Resources

### Icon System

**Primary:** `lucide-react`

```tsx
import { Check, X, AlertCircle, Info, Settings } from 'lucide-react';

<Check className="h-4 w-4 text-green-500" />
```

**Icon Sizes:**
- `h-3 w-3` (12px) - Small, inline
- `h-4 w-4` (16px) - Default
- `h-5 w-5` (20px) - Medium
- `h-6 w-6` (24px) - Large

### Images & Graphics

**Location:** `frontend/public/`

**Application Icons:**
- `src-tauri/icons/32x32.png`
- `src-tauri/icons/128x128.png`
- `src-tauri/icons/icon.ico` (Windows)
- `src-tauri/icons/icon.icns` (macOS)

**Favicon:** `frontend/src/app/favicon.ico`

### Fonts

**Primary Font:** Inter (loaded via Next.js)

```tsx
// app/layout.tsx
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });
```

### Status Colors

```tsx
// Task status colors
const statusColors = {
  draft: "bg-gray-100 text-gray-800",
  scheduled: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  on_hold: "bg-orange-100 text-orange-800",
};

<Badge className={statusColors[status]}>
  {status}
</Badge>
```

### Animation & Motion

**Using Framer Motion:**

```tsx
import { motion } from 'framer-motion';

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ duration: 0.2 }}
>
  Content
</motion.div>
```

**Respects User Preferences:**
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Design Checklist

When creating new components:

- [ ] Uses semantic HTML elements
- [ ] Includes ARIA labels where needed
- [ ] Supports keyboard navigation
- [ ] Has visible focus states
- [ ] Works in both light/dark themes
- [ ] Responsive (if applicable)
- [ ] Loading states handled
- [ ] Error states handled
- [ ] Empty states handled
- [ ] Accessible to screen readers
- [ ] Color contrast meets WCAG AA
- [ ] Uses design system tokens
- [ ] Follows established patterns

---

**Document Version**: 1.0  
**Last Updated**: 2026-02-01  
**Maintained By**: RPMA Team
