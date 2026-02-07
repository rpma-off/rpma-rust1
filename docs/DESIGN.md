# RPMA v2 - Design Documentation

## Table of Contents

- [Introduction](#introduction)
- [Design System](#design-system)
- [Color Palette](#color-palette)
- [Typography](#typography)
- [Spacing](#spacing)
- [Shadows](#shadows)
- [Borders & Radii](#borders--radii)
- [UI Components](#ui-components)
- [Component Patterns](#component-patterns)
- [Accessibility](#accessibility)
- [Responsive Design](#responsive-design)

## Introduction

RPMA v2 uses a **modern, component-based design system** built on **Tailwind CSS** and **shadcn/ui**. The design prioritizes usability, accessibility, and consistency while maintaining a professional appearance suitable for PPF installation business operations.

### Design Principles

1. **Clarity**: Clear visual hierarchy and information architecture
2. **Efficiency**: Common tasks accessible with minimal clicks
3. **Consistency**: Uniform patterns across all features
4. **Accessibility**: WCAG 2.1 AA compliance
5. **Performance**: Fast loading and smooth interactions

### Design Tools

| Tool | Purpose |
|------|---------|
| **Tailwind CSS** | Utility-first CSS framework |
| **shadcn/ui** | Component library (Radix UI) |
| **Framer Motion** | Animations and transitions |
| **Lucide React** | Icon library (140+ icons) |
| **Recharts** | Data visualization |
| **React Day Picker** | Calendar component |
| **Leaflet** | Maps and geolocation |

## Design System

### Design Tokens

Design tokens are defined in `frontend/tailwind.config.ts`:

```typescript
const config = {
  theme: {
    extend: {
      colors: {
        // Custom color palette
        primary: {
          DEFAULT: 'hsl(162 76% 45%)',
          hover: 'hsl(162 76% 40%)',
          active: 'hsl(162 76% 35%)',
        },
        // ... more colors
      },
      fontFamily: {
        // Custom fonts
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        // Custom radii
        DEFAULT: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
      },
      boxShadow: {
        // Custom shadows
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
        xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
        '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
      },
    },
  },
};
```

## Color Palette

### Primary Colors

| Color | Value | Usage |
|-------|-------|-------|
| `--primary` | `hsl(162 76% 45%)` | Primary actions, links, active states |
| `--primary-hover` | `hsl(162 76% 40%)` | Primary hover state |
| `--primary-active` | `hsl(162 76% 35%)` | Primary active/pressed state |
| `--rpma-primary` | `hsl(158 72% 50%)` | RPMA brand green |
| `--rpma-teal` | `hsl(162 72% 45%)` | RPMA brand teal |

### Status Colors

| Color | Value | Usage |
|-------|-------|-------|
| `--success` | `hsl(142 76% 36%)` | Success states, completed tasks |
| `--warning` | `hsl(38 92% 50%)` | Warnings, pending states |
| `--error` | `hsl(0 84% 60%)` | Error states, failed operations |
| `--info` | `hsl(217 91% 60%)` | Informational messages |

### Priority Colors

| Priority | Color | Value |
|----------|-------|-------|
| Low | `--priority-low` | `hsl(217 91% 60%)` |
| Medium | `--priority-medium` | `hsl(38 92% 50%)` |
| High | `--priority-high` | `hsl(25 95% 53%)` |
| Urgent | `--priority-urgent` | `hsl(0 84% 60%)` |

### Workflow Status Colors

| Status | Color | Value |
|--------|-------|-------|
| Draft | `--workflow-draft` | `hsl(220 13% 91%)` |
| Scheduled | `--workflow-scheduled` | `hsl(217 91% 60%)` |
| In Progress | `--workflow-in-progress` | `hsl(38 92% 50%)` |
| Completed | `--workflow-completed` | `hsl(142 76% 36%)` |
| Cancelled | `--workflow-cancelled` | `hsl(0 84% 60%)` |

### Semantic Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--background` | `hsl(0 0% 100%)` | Page background |
| `--foreground` | `hsl(222.2 84% 4.9%)` | Primary text |
| `--card` | `hsl(0 0% 100%)` | Card background |
| `--card-foreground` | `hsl(222.2 84% 4.9%)` | Card text |
| `--popover` | `hsl(0 0% 100%)` | Popover background |
| `--popover-foreground` | `hsl(222.2 84% 4.9%)` | Popover text |
| `--primary` | `hsl(222.2 47.4% 11.2%)` | Primary text on dark |
| `--secondary` | `hsl(210 40% 96.1%)` | Secondary text |
| `--muted` | `hsl(210 40% 96.1%)` | Muted text |
| `--accent` | `hsl(210 40% 96.1%)` | Accent elements |
| `--destructive` | `hsl(0 84.2% 60.2%)` | Destructive actions |
| `--border` | `hsl(214.3 31.8% 91.4%)` | Borders |
| `--input` | `hsl(214.3 31.8% 91.4%)` | Input backgrounds |
| `--ring` | `hsl(222.2 84% 4.9%)` | Focus ring |

### Dark Mode Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--background` | `hsl(222.2 84% 4.9%)` | Dark background |
| `--foreground` | `hsl(210 40% 98%)` | Primary text on dark |
| `--card` | `hsl(217.2 32.6% 17.5%)` | Card background on dark |
| `--card-foreground` | `hsl(210 40% 98%)` | Card text on dark |
| `--popover` | `hsl(222.2 84% 4.9%)` | Popover on dark |
| `--popover-foreground` | `hsl(210 40% 98%)` | Popover text on dark |
| `--primary` | `hsl(210 40% 98%)` | Primary text on dark |
| `--secondary` | `hsl(217.2 32.6% 17.5%)` | Secondary text on dark |
| `--muted` | `hsl(217.2 32.6% 17.5%)` | Muted text on dark |
| `--accent` | `hsl(217.2 32.6% 17.5%)` | Accent on dark |
| `--destructive` | `hsl(0 62.8% 30.6%)` | Destructive on dark |
| `--border` | `hsl(217.2 32.6% 17.5%)` | Borders on dark |
| `--input` | `hsl(217.2 32.6% 17.5%)` | Inputs on dark |
| `--ring` | `hsl(212.7 26.8% 83.9%)` | Focus ring on dark |

## Typography

### Type Scale

| Token | Value | Size | Line Height | Usage |
|-------|-------|------|-------------|-------|
| `--text-2xs` | 0.625rem | 10px | 1.5 | Micro text |
| `--text-xs` | 0.75rem | 12px | 1.5 | Captions, labels |
| `--text-sm` | 0.875rem | 14px | 1.5 | Body small |
| `--text-base` | 1rem | 16px | 1.6 | Body default |
| `--text-lg` | 1.125rem | 18px | 1.6 | Body large |
| `--text-xl` | 1.25rem | 20px | 1.5 | Headings 4 |
| `--text-2xl` | 1.5rem | 24px | 1.4 | Headings 3 |
| `--text-3xl` | 1.875rem | 30px | 1.3 | Headings 2 |
| `--text-4xl` | 2.25rem | 36px | 1.2 | Headings 1 |
| `--text-5xl` | 3rem | 48px | 1.1 | Hero titles |
| `--text-6xl` | 4rem | 64px | 1.0 | Display |

### Font Weights

| Weight | Value | Usage |
|--------|-------|-------|
| Light | 300 | Subtle text |
| Normal | 400 | Body text |
| Medium | 500 | Emphasis |
| Semibold | 600 | Headings |
| Bold | 700 | Strong headings |

### Font Families

```css
--font-sans: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
```

**Usage**:
- `font-sans`: All body text and UI elements
- `font-mono`: Code snippets, technical data

### Typography Examples

```tsx
// Page title
<h1 className="text-4xl font-bold tracking-tight">
  PPF Intervention Management
</h1>

// Section heading
<h2 className="text-2xl font-semibold">
  Task List
</h2>

// Body text
<p className="text-base leading-relaxed">
  View and manage all PPF installation tasks.
</p>

// Caption
<span className="text-xs text-muted-foreground">
  Last updated 2 hours ago
</span>
```

## Spacing

### Spacing Scale

Based on 4px base unit:

| Token | Value | CSS | Usage |
|-------|-------|-----|-------|
| `--spacing-0` | 0 | 0px | No spacing |
| `--spacing-px` | 1px | 1px | Hairline |
| `--spacing-1` | 0.25rem | 4px | Micro |
| `--spacing-2` | 0.5rem | 8px | Small |
| `--spacing-3` | 0.75rem | 12px | Medium |
| `--spacing-4` | 1rem | 16px | Default |
| `--spacing-5` | 1.25rem | 20px | Large |
| `--spacing-6` | 1.5rem | 24px | Extra large |
| `--spacing-8` | 2rem | 32px | 2x large |
| `--spacing-10` | 2.5rem | 40px | 2.5x large |
| `--spacing-12` | 3rem | 48px | 3x large |
| `--spacing-16` | 4rem | 64px | 4x large |

### Spacing Patterns

```tsx
// Compact spacing
<div className="p-2 gap-2">

// Default spacing
<div className="p-4 gap-4">

// Comfortable spacing
<div className="p-6 gap-6">

// Generous spacing
<div className="p-8 gap-8">
```

## Shadows

### Shadow Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px 0 rgb(0 0 0 / 0.05)` | Subtle elevation |
| `--shadow-md` | `0 4px 6px -1px rgb(0 0 0 / 0.1)` | Default elevation |
| `--shadow-lg` | `0 10px 15px -3px rgb(0 0 0 / 0.1)` | Raised elements |
| `--shadow-xl` | `0 20px 25px -5px rgb(0 0 0 / 0.1)` | Popovers, modals |
| `--shadow-2xl` | `0 25px 50px -12px rgb(0 0 0 / 0.25)` | Highest elevation |

### Shadow Usage

```tsx
// No shadow
<div className="shadow-none">

// Subtle
<div className="shadow-sm">

// Default
<div className="shadow-md">

// Card
<div className="shadow-lg">

// Modal
<div className="shadow-xl">

// Dropdown
<div className="shadow-2xl">
```

## Borders & Radii

### Border Radius Scale

| Token | Value | CSS | Usage |
|-------|-------|-----|-------|
| `--radius-none` | 0 | 0px | Sharp corners |
| `--radius-xs` | 0.125rem | 2px | Small elements |
| `--radius-sm` | 0.25rem | 4px | Tags, chips |
| `--radius-base` | 0.5rem | 8px | Default |
| `--radius-lg` | 0.75rem | 12px | Cards |
| `--radius-xl` | 1rem | 16px | Large cards |
| `--radius-2xl` | 1.5rem | 24px | Hero elements |
| `--radius-full` | 9999px | Pill shapes |

### Border Widths

| Token | Value | Usage |
|-------|-------|-------|
| `--border-0` | 0px | No border |
| `--border` | 1px | Default |
| `--border-2` | 2px | Emphasis |
| `--border-4` | 4px | Strong emphasis |

### Border Colors

```css
--border: hsl(214.3 31.8% 91.4%);           /* Light mode */
--border: hsl(217.2 32.6% 17.5%);           /* Dark mode */
--border-input: hsl(214.3 31.8% 91.4%);       /* Input borders */
--border-primary: hsl(222.2 47.4% 11.2%);    /* Primary elements */
```

## UI Components

### Component Hierarchy

```
shadcn/ui Components (65 files)
├── Atomic Components
│   ├── Button
│   ├── Input
│   ├── Select
│   ├── Checkbox
│   ├── Radio
│   ├── Switch
│   ├── Slider
│   └── ...
│
├── Composite Components
│   ├── Dialog
│   ├── Dropdown Menu
│   ├── Popover
│   ├── Tooltip
│   ├── Sheet
│   ├── Tabs
│   └── ...
│
├── Data Display
│   ├── Table
│   ├── Card
│   ├── Badge
│   ├── Avatar
│   └── ...
│
└── Form Components
    ├── Form
    ├── Label
    ├── Calendar
    ├── Date Picker
    └── ...

Feature Components (120+ files)
├── Layout Components
│   ├── AppShell
│   ├── Header
│   ├── Sidebar
│   ├── Topbar
│   └── ...
│
├── Dashboard Components (30+)
│   ├── StatsCard
│   ├── StatCard
│   ├── TaskList
│   ├── QuickActions
│   └── ...
│
├── Task Components (40+)
│   ├── TaskCard
│   ├── TaskManager
│   ├── TaskDetails
│   ├── TaskActions
│   └── ...
│
├── Calendar Components (15+)
│   ├── CalendarView
│   ├── MonthView
│   ├── WeekView
│   └── ...
│
└── Workflow Components (20+)
    ├── PPFWorkflowHeader
    ├── PPFStepProgress
    ├── VehicleDiagram
    └── ...
```

### shadcn/ui Components (65 files)

#### Core Components

| Component | Description | Props |
|------------|-------------|--------|
| **Button** | Primary action buttons | variant, size, disabled |
| **Input** | Text input fields | placeholder, disabled, type |
| **Select** | Dropdown selection | options, defaultValue, disabled |
| **Checkbox** | Toggle checkbox | checked, onCheckedChange, disabled |
| **RadioGroup** | Radio button group | value, onValueChange, options |
| **Switch** | Toggle switch | checked, onCheckedChange, disabled |
| **Slider** | Range slider | value, onValueChange, min, max, step |
| **Textarea** | Multi-line input | placeholder, disabled, rows |

#### Navigation Components

| Component | Description | Props |
|------------|-------------|--------|
| **DropdownMenu** | Dropdown menus | trigger, content, align |
| **ContextMenu** | Right-click menus | trigger, content |
| **Menubar** | Top menu bar | children |
| **NavigationMenu** | Navigation menu | trigger, content |
| **Tabs** | Tabbed navigation | value, onValueChange, tabs |
| **Breadcrumbs** | Navigation breadcrumbs | items |

#### Feedback Components

| Component | Description | Props |
|------------|-------------|--------|
| **Alert** | Alert banners | variant, title, description |
| **AlertDialog** | Confirmation dialogs | open, onOpenChange, title, description |
| **Toast** | Notification toasts | title, description, variant |
| **Progress** | Progress bars | value, max |
| **Skeleton** | Loading placeholders | className |
| **LoadingSpinner** | Animated spinner | size |

#### Data Display Components

| Component | Description | Props |
|------------|-------------|--------|
| **Card** | Card container | className, children |
| **Badge** | Status badges | variant |
| **Avatar** | User avatars | src, alt, fallback |
| **Table** | Data tables | columns, data |
| **Separator** | Visual dividers | orientation |
| **Accordion** | Expandable sections | items |

#### Form Components

| Component | Description | Props |
|------------|-------------|--------|
| **Form** | Form container | defaultValues, onSubmit |
| **Label** | Form labels | htmlFor, children |
| **Calendar** | Calendar picker | mode, selected, onSelect |
| **DatePicker** | Date selection | value, onChange |
| **TimePicker** | Time selection | value, onChange |

#### Overlay Components

| Component | Description | Props |
|------------|-------------|--------|
| **Dialog** | Modal dialogs | open, onOpenChange, title, description |
| **Sheet** | Side sheets | open, onOpenChange, side |
| **Popover** | Popover overlays | open, onOpenChange, content |
| **Tooltip** | Tooltips | content, side |
| **HoverCard** | Hover cards | trigger, content |

#### Utility Components

| Component | Description | Props |
|------------|-------------|--------|
| **ScrollArea** | Scrollable areas | className |
| **Resizable** | Resizable handles | defaultSize |
| **Command** | Command palette | children |
| **Collapsible** | Collapsible sections | open, onOpenChange |

### Feature Components

#### Layout Components (5)

| Component | File | Description |
|------------|------|-------------|
| **AppShell** | AppShell.tsx | Main application wrapper |
| **Header** | Header.tsx | Top navigation header |
| **Sidebar** | Sidebar.tsx | Main sidebar navigation |
| **Topbar** | Topbar.tsx | Desktop top bar |
| **DrawerSidebar** | DrawerSidebar.tsx | Collapsible sidebar |

#### Dashboard Components (10)

| Component | File | Description |
|------------|------|-------------|
| **Dashboard** | Dashboard.tsx | Main dashboard widget |
| **CalendarDashboard** | CalendarDashboard.tsx | Calendar view widget |
| **StatsGrid** | StatsGrid.tsx | Statistics grid |
| **StatCard** | StatCard.tsx | Single stat card |
| **TaskList** | TaskList.tsx | Task list widget |
| **TaskCard** | TaskCard.tsx | Task display card |
| **QuickActions** | QuickActions.tsx | Quick action buttons |
| **RecentActivityAlerts** | RecentActivityAlerts.tsx | Activity alerts |
| **FilterDrawer** | FilterDrawer.tsx | Mobile filter drawer |
| **PerformanceMetrics** | PerformanceMetrics.tsx | Performance widget |

#### Task Components (12)

| Component | File | Description |
|------------|------|-------------|
| **TaskManager** | TaskManager.tsx | Task management main component |
| **TaskDetails** | TaskDetails.tsx | Task details view |
| **TaskCard** | TaskCard.tsx | Task display card |
| **KanbanBoard** | KanbanBoard.tsx | Kanban board view |
| **TaskActions** | TaskActions/ | Task action modals |
| **DelayTaskModal** | TaskActions/DelayTaskModal.tsx | Delay task dialog |
| **EditTaskModal** | TaskActions/EditTaskModal.tsx | Edit task dialog |
| **ReportIssueModal** | TaskActions/ReportIssueModal.tsx | Report issue dialog |
| **TaskOverview** | TaskOverview/ | Task detail sections |
| **WorkflowProgressCard** | TaskDetail/WorkflowProgressCard.tsx | Workflow progress |
| **PoseDetail** | TaskDetail/PoseDetail.tsx | PPF pose details |

#### Calendar Components (6)

| Component | File | Description |
|------------|------|-------------|
| **CalendarView** | CalendarView.tsx | Calendar main component |
| **MonthView** | MonthView.tsx | Month view |
| **WeekView** | WeekView.tsx | Week view |
| **DayView** | DayView.tsx | Day view |
| **create-event-dialog** | create-event-dialog.tsx | Event creation |
| **event-sheet** | event-sheet.tsx | Event details sheet |

#### Workflow Components (5)

| Component | File | Description |
|------------|------|-------------|
| **PPFWorkflowHeader** | workflow/ppf/PPFWorkflowHeader.tsx | Workflow header |
| **PPFStepProgress** | workflow/ppf/PPFStepProgress.tsx | Step progress |
| **VehicleDiagram** | workflow/ppf/VehicleDiagram.tsx | Vehicle zones diagram |
| **StepCard** | workflow/ppf/StepCard.tsx | Step display card |
| **PhotoUpload** | workflow/ppf/PhotoUpload.tsx | Photo upload zone |

#### Analytics Components (8)

| Component | Description |
|------------|-------------|
| **AnalyticsDashboard** | Analytics main dashboard |
| **KpiDashboard** | KPI cards display |
| **TrendAnalysis** | Trend chart component |
| **TaskCompletionChart** | Task completion visualization |
| **TechnicianPerformanceChart** | Performance comparison |
| **GeographicMap** | Geographic distribution map |
| **MaterialUsageChart** | Material consumption chart |
| **QualityScoreChart** | Quality score visualization |

#### Inventory Components (6)

| Component | Description |
|------------|-------------|
| **InventoryDashboard** | Inventory main view |
| **MaterialCatalog** | Material list/catalog |
| **MaterialForm** | Material creation/edit form |
| **StockLevelCard** | Stock status card |
| **SupplierManagement** | Supplier management view |
| **InventoryTabs** | Inventory tabs (materials, suppliers) |

#### Settings Components (6)

| Component | Description |
|------------|-------------|
| **ProfileSettingsTab** | User profile settings |
| **PreferencesTab** | User preferences |
| **SecurityTab** | Security settings (password, 2FA) |
| **NotificationsTab** | Notification preferences |
| **AccessibilityTab** | Accessibility options |
| **PerformanceTab** | Performance settings |

## Component Patterns

### Button Patterns

```tsx
// Primary button
<Button>
  Submit
</Button>

// Secondary button
<Button variant="secondary">
  Cancel
</Button>

// Destructive button
<Button variant="destructive">
  Delete
</Button>

// Loading button
<Button disabled={loading}>
  {loading ? <LoadingSpinner /> : 'Submit'}
</Button>

// Icon button
<Button variant="ghost" size="icon">
  <Icon name="settings" />
</Button>
```

### Form Patterns

```tsx
// Form with validation
<Form {...form}>
  <FormField
    control={form.control}
    name="email"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Email</FormLabel>
        <FormControl>
          <Input placeholder="user@example.com" {...field} />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
  <Button type="submit">Submit</Button>
</Form>
```

### Card Patterns

```tsx
// Basic card
<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Card content */}
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

### Modal Patterns

```tsx
// Dialog modal
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Modal Title</DialogTitle>
      <DialogDescription>Modal description</DialogDescription>
    </DialogHeader>
    {/* Modal content */}
    <DialogFooter>
      <Button variant="outline" onClick={setOpen.bind(null, false)}>
        Cancel
      </Button>
      <Button>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

## Accessibility

### WCAG 2.1 AA Compliance

#### Color Contrast

| Element | Contrast Ratio | Status |
|---------|--------------|--------|
| Normal text (4.5:1) | ≥ 4.5:1 | ✅ Pass |
| Large text (3:1) | ≥ 3:1 | ✅ Pass |
| UI components (3:1) | ≥ 3:1 | ✅ Pass |

#### Keyboard Navigation

**Supported Keyboard Shortcuts**:
- `Tab` / `Shift+Tab`: Navigate focusable elements
- `Enter` / `Space`: Activate buttons and links
- `Escape`: Close modals and dropdowns
- `Arrow keys`: Navigate lists and grids
- `Ctrl/Cmd + K`: Command palette
- `Ctrl/Cmd + /`: Keyboard shortcuts help

#### Screen Reader Support

**ARIA Labels**:
```tsx
// Icon buttons
<button aria-label="Delete task">
  <TrashIcon aria-hidden="true" />
</button>

// Status badges
<Badge aria-label="Task status: In progress">
  In progress
</Badge>

// Progress indicators
<ProgressBar
  value={progress}
  aria-label="Task progress"
  aria-valuemin="0"
  aria-valuemax="100"
  aria-valuenow={progress}
/>
```

#### Focus Management

**Focus Indicators**:
```css
.focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
```

**Skip Links**:
```tsx
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4"
>
  Skip to main content
</a>
```

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### High Contrast Mode

```css
@media (prefers-contrast: high) {
  :root {
    --background: #000000;
    --foreground: #ffffff;
    --border: #ffffff;
  }
}
```

## Responsive Design

### Breakpoints

| Breakpoint | Value | Usage |
|------------|-------|-------|
| `xs` | 0px | Mobile phones |
| `sm` | 640px | Mobile phones (large) |
| `md` | 768px | Tablets |
| `lg` | 1024px | Desktops (small) |
| `xl` | 1280px | Desktops (default) |
| `2xl` | 1536px | Desktops (large) |

### Responsive Patterns

```tsx
// Sidebar: Hidden on mobile, visible on desktop
<Sidebar className="hidden md:block" />

// Grid: Responsive columns
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// Card: Full width on mobile, fixed on desktop
<Card className="w-full md:w-auto">

// Text: Smaller on mobile
<h1 className="text-2xl md:text-4xl">
  Responsive Heading
</h1>
```

### Mobile-First Approach

```css
/* Base styles (mobile first */
.component {
  padding: 1rem;
  font-size: 1rem;
}

/* Tablet */
@media (min-width: 768px) {
  .component {
    padding: 1.5rem;
    font-size: 1.125rem;
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .component {
    padding: 2rem;
    font-size: 1.25rem;
  }
}
```

## Additional UI Components

### Layout Components (10)

| Component | File | Description |
|------------|------|-------------|
| **AppShell** | layout/AppShell.tsx | Main application shell with sidebar and header |
| **Header** | layout/Header.tsx | Application header with navigation and user menu |
| **Sidebar** | layout/Sidebar.tsx | Collapsible sidebar navigation |
| **SidebarItem** | layout/SidebarItem.tsx | Individual sidebar navigation item |
| **Breadcrumb** | layout/Breadcrumb.tsx | Navigation breadcrumb trail |
| **PageHeader** | layout/PageHeader.tsx | Page title and actions header |
| **MobileMenu** | layout/MobileMenu.tsx | Mobile navigation menu |
| **TabNavigation** | layout/TabNavigation.tsx | Tab-based navigation |
| **ContextualSidebar** | layout/ContextualSidebar.tsx | Contextual sidebar for details |
| **StatusBar** | layout/StatusBar.tsx | Application status bar |

### Photo Management Components (5)

| Component | File | Description |
|------------|------|-------------|
| **PhotoGallery** | photos/PhotoGallery.tsx | Gallery view for intervention photos |
| **PhotoViewer** | photos/PhotoViewer.tsx | Full-screen photo viewer with zoom |
| **PhotoUploadZone** | photos/PhotoUploadZone.tsx | Drag-and-drop photo upload area |
| **PhotoMetadata** | photos/PhotoMetadata.tsx | Photo metadata display panel |
| **PhotoComparison** | photos/PhotoComparison.tsx | Before/after photo comparison |

### Message Components (5)

| Component | File | Description |
|------------|------|-------------|
| **MessageList** | messages/MessageList.tsx | List of messages with unread indicators |
| **MessageItem** | messages/MessageItem.tsx | Individual message with actions |
| **MessageComposer** | messages/MessageComposer.tsx | Rich text message composer |
| **MessageThread** | messages/MessageThread.tsx | Message conversation thread |
| **MessageTemplates** | messages/MessageTemplates.tsx | Template selection and management |

### Reporting Components (8)

| Component | File | Description |
|------------|------|-------------|
| **ReportBuilder** | reports/ReportBuilder.tsx | Dynamic report configuration |
| **ReportViewer** | reports/ReportViewer.tsx | Report display with export options |
| **DatePicker** | reports/DatePicker.tsx | Date range picker for reports |
| **FilterPanel** | reports/FilterPanel.tsx | Multi-criteria filter panel |
| **ReportPreview** | reports/ReportPreview.tsx | Live report preview |
| **ExportDialog** | reports/ExportDialog.tsx | Export format and options |
| **ChartContainer** | reports/ChartContainer.tsx | Responsive chart wrapper |
| **DataTable** | reports/DataTable.tsx | Paginated data table with sorting |

### Auth Components (4)

| Component | File | Description |
|------------|------|-------------|
| **LoginForm** | auth/LoginForm.tsx | Login form with validation |
| **TwoFactorSetup** | auth/TwoFactorSetup.tsx | 2FA setup wizard |
| **TwoFactorVerify** | auth/TwoFactorVerify.tsx | 2FA verification input |
| **PasswordReset** | auth/PasswordReset.tsx | Password reset flow |

### Notification Components (5)

| Component | File | Description |
|------------|------|-------------|
| **NotificationCenter** | notifications/NotificationCenter.tsx | Notification center dropdown |
| **ToastContainer** | notifications/ToastContainer.tsx | Toast notification container |
| **NotificationItem** | notifications/NotificationItem.tsx | Individual notification display |
| **NotificationSettings** | notifications/NotificationSettings.tsx | Notification preferences |
| **AlertBanner** | notifications/AlertBanner.tsx | System alert banner |

### Utility Components (15)

| Component | File | Description |
|------------|------|-------------|
| **DataTable** | ui/DataTable.tsx | Sortable, paginated data table |
| **FileUpload** | ui/FileUpload.tsx | File upload with progress |
| **ImageCropper** | ui/ImageCropper.tsx | Image cropping tool |
| **ColorPicker** | ui/ColorPicker.tsx | Color selection palette |
| **SearchInput** | ui/SearchInput.tsx | Search with suggestions |
| **VirtualList** | ui/VirtualList.tsx | Virtualized list for large datasets |
| **DatePicker** | ui/DatePicker.tsx | Date picker with range selection |
| **TimePicker** | ui/TimePicker.tsx | Time input component |
| **RichTextEditor** | ui/RichTextEditor.tsx | WYSIWYG text editor |
| **SignaturePad** | ui/SignaturePad.tsx | Digital signature capture |
| **ProgressBar** | ui/ProgressBar.tsx | Progress bar with stages |
| **SkeletonLoader** | ui/SkeletonLoader.tsx | Skeleton loading states |
| **EmptyState** | ui/EmptyState.tsx | Empty state illustration |
| **ErrorBoundary** | ui/ErrorBoundary.tsx | React error boundary |
| **ConfirmDialog** | ui/ConfirmDialog.tsx | Confirmation dialog |

## Component Variations

### Button Variants

```tsx
// Ghost button for secondary actions
<Button variant="ghost" size="sm">
  Secondary Action
</Button>

// Loading state
<Button disabled={loading} className="relative">
  {loading && <LoadingSpinner className="absolute right-2" />}
  {loading ? 'Processing...' : 'Submit'}
</Button>

// Icon button
<Button variant="outline" size="icon">
  <Icon name="plus" />
</Button>

// Group of buttons
<div className="flex gap-2">
  <Button variant="outline">Cancel</Button>
  <Button>Save</Button>
</div>
```

### Input Variants

```tsx
// Text input with validation
<FormField
  control={form.control}
  name="email"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Email</FormLabel>
      <FormControl>
        <Input 
          type="email" 
          placeholder="user@example.com"
          className={cn(field.error && "border-red-500")}
          {...field}
        />
      </FormControl>
      {field.error && (
        <FormMessage>{field.error.message}</FormMessage>
      )}
    </FormItem>
  )}
/>
```

## Theme System Implementation

### Theme Provider

```tsx
// frontend/src/providers/ThemeProvider.tsx
import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('system');
  
  useEffect(() => {
    // Apply theme to document
    const root = document.documentElement;
    
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }
    
    // Store preference
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
```

### Custom Hooks

```tsx
// frontend/src/hooks/useTheme.ts
import { useTheme } from '@/providers/ThemeProvider';

export const useTheme = () => {
  const { theme, setTheme } = useTheme();
  
  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };
  
  return {
    theme,
    setTheme,
    toggleTheme,
    isDark: theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  };
};
```

---

**Document Version**: 2.0
**Last Updated**: Based on comprehensive codebase analysis
