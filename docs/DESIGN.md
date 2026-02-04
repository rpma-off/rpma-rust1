# Design Documentation

## Overview

The RPMA v2 application uses a modern component-based design system built on **Radix UI** primitives and styled with **TailwindCSS**. The UI follows a clean, professional aesthetic optimized for desktop usage while maintaining accessibility and responsiveness.

### Design System

**Tech Stack**:
- **Base Components**: Radix UI primitives (headless components)
- **Styling**: TailwindCSS 3.4 (utility-first CSS framework)
- **Icons**: Lucide React (700+ icons)
- **Animations**: Framer Motion (smooth transitions)
- **Forms**: React Hook Form + Zod validation
- **Design Tokens**: Centralized design tokens for consistency

### Design Principles

1. **Clarity**: Information is presented clearly and concisely
2. **Efficiency**: Common tasks require minimal clicks
3. **Accessibility**: WCAG 2.1 AA compliant
4. **Consistency**: Uniform patterns across all screens
5. **Feedback**: Immediate response to all user actions
6. **Professional**: Business-appropriate aesthetic

---

## UI Component Catalog (223 Components)

### 1. shadcn/ui Base Components (39 components)

Located in `frontend/src/ui/`

#### 1.1 Layout Components (8 components)

**Button** (`ui/button.tsx`)
- Primary, secondary, ghost, outline, destructive variants
- Multiple sizes (sm, default, lg, icon)
- Loading states

**Card** (`ui/card.tsx`)
- Container component with header, content, footer
- Subcomponents: CardHeader, CardTitle, CardDescription, CardContent, CardFooter

**Separator** (`ui/separator.tsx`)
- Visual divider (horizontal/vertical)

**Sheet** (`ui/sheet.tsx`)
- Slide-over panel for additional content
- Side variants (left, right, top, bottom)

**Tabs** (`ui/tabs.tsx`)
- Tabbed interface
- Subcomponents: TabsList, TabsTrigger, TabsContent

**Accordion** (`ui/accordion.tsx`)
- Expandable/collapsible content
- Subcomponents: AccordionItem, AccordionTrigger, AccordionContent

**Collapsible** (`ui/collapsible.tsx`)
- Show/hide content with animation

**Dialog** (`ui/dialog.tsx`)
- Modal dialog with overlay
- Subcomponents: DialogTrigger,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter,DialogClose

#### 1.2 Form Components (8 components)

**Input** (`ui/input.tsx`)
- Text input with label support
- Validation states
- Error messages

**Textarea** (`ui/textarea.tsx`)
- Multi-line text input
- Auto-resize option

**Select** (`ui/select.tsx`)
- Dropdown select component
- Searchable option
- Multi-select support

**Checkbox** (`ui/checkbox.tsx`)
- Checkbox with indeterminate state
- Label integration

**RadioGroup** (`ui/radio-group.tsx`)
- Radio button group
- Subcomponents: RadioGroupItem

**Switch** (`ui/switch.tsx`)
- Toggle switch component
- Label integration

**Label** (`ui/label.tsx`)
- Form label with htmlFor support
- Required indicator

**Form** (`ui/form.tsx`)
- React Hook Form integration with Zod validation

#### 1.3 Data Display Components (10 components)

**Table** (`ui/table.tsx`)
- Subcomponents: TableHeader, TableRow, TableCell, TableBody, TableFooter
- Sortable headers
- Selectable rows

**Badge** (`ui/badge.tsx`)
- Status indicator variants
- Color variants

**Avatar** (`ui/avatar.tsx`)
- User avatar with fallback
- Subcomponents: AvatarImage, AvatarFallback

**Skeleton** (`ui/skeleton.tsx`)
- Loading placeholder animation

**Progress** (`ui/progress.tsx`)
- Linear progress bar
- Value indicator

**AlertDialog** (`ui/alert-dialog.tsx`)
- Confirmation dialogs
- Subcomponents: AlertDialogTrigger,AlertDialogContent,AlertDialogHeader,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogCancel,AlertDialogAction

**Toast** (`ui/toast.tsx`)
- Temporary notifications
- Position variants
- Auto-dismiss

**Popover** (`ui/popover.tsx`)
- Floating content on hover/click
- Subcomponents: PopoverTrigger, PopoverContent, PopoverAnchor

**Tooltip** (`ui/tooltip.tsx`)
- Hover tooltip
- Delay options

**ScrollArea** (`ui/scroll-area.tsx`)
- Custom scrollbar styling

#### 1.4 Feedback Components (8 components)

**Alert** (`ui/alert.tsx`)
- Warning/info/error messages
- Dismissible

**AlertTitle** (`ui/alert-title.tsx`)
- Alert heading

**AlertDescription** (`ui/alert-description.tsx`)
- Alert content

**DropdownMenu** (`ui/dropdown-menu.tsx`)
- Context menu component
- Subcomponents: DropdownMenuTrigger,DropdownMenuContent,DropdownMenuItem,DropdownMenuSeparator,DropdownMenuLabel,DropdownMenuShortcut

**Command** (`ui/command.tsx`)
- Command palette with search

**Menubar** (`ui/menubar.tsx`)
- Application menu bar

**NavigationMenu** (`ui/navigation-menu.tsx`)
- Desktop navigation menus

**Breadcrumb** (`ui/breadcrumb.tsx`)
- Breadcrumb navigation
- Subcomponents: BreadcrumbList, BreadcrumbItem, BreadcrumbSeparator, BreadcrumbPage

**Slider** (`ui/slider.tsx`)
- Range slider control
- Multiple handles

---

### 2. Analytics Components (9 components)

Located in `frontend/src/components/analytics/`

**AnalyticsChart** (`AnalyticsChart.tsx`)
- Recharts integration
- Line, bar, pie, area charts
- Responsive sizing

**AnalyticsDashboard** (`AnalyticsDashboard.tsx`)
- Main analytics dashboard layout
- KPI cards grid

**AnalyticsLayout** (`AnalyticsLayout.tsx`)
- Sidebar + content layout
- Filtering controls

**AnalyticsReports** (`AnalyticsReports.tsx`)
- Report generation interface
- Format selection

**AnalyticsSettings** (`AnalyticsSettings.tsx`)
- Analytics configuration
- Dashboard customization

**AnalyticsTabs** (`AnalyticsTabs.tsx`)
- Tab-based navigation
- Active state management

**KpiCard** (`KpiCard.tsx`)
- Single KPI display
- Trend indicator
- Sparkline chart

**KpiDashboard** (`KpiDashboard.tsx`)
- KPI grid layout
- Drag-and-drop reordering

**TrendAnalysis** (`TrendAnalysis.tsx`)
- Trend line chart
- Period comparison

---

### 3. Animations Components (2 components)

Located in `frontend/src/components/animations/`

**FadeIn** (`FadeIn.tsx`)
- Entrance animation
- Staggered children support

**UILoader** (`UILoader.tsx`)
- Loading spinner
- Full-screen overlay option

---

### 4. Authentication Components (4 components)

Located in `frontend/src/components/auth/`

**LoginForm** (`LoginForm.tsx`)
- Email/password form
- Remember me checkbox
- 2FA integration

**SignupForm** (`SignupForm.tsx`)
- User registration form
- Password strength indicator
- Terms agreement

**PasswordStrength** (`PasswordStrength.tsx`)
- Password strength meter
- Criteria checklist

**PasswordStrengthMeter** (`PasswordStrengthMeter.tsx`)
- Visual strength indicator
- Color-coded levels

---

### 5. Calendar Components (17 components)

Located in `frontend/src/components/calendar/`

**CalendarHeader** (`CalendarHeader.tsx`)
- Calendar toolbar
- View switcher (month/week/day/agenda)
- Navigation controls

**CalendarView** (`CalendarView.tsx`)
- Main calendar display
- React-big-calendar integration

**CalendarControls** (`calendar-controls.tsx`)
- Calendar action buttons
- Filter controls

**MonthView** (`MonthView.tsx`)
- Monthly grid view
- Task indicators

**WeekView** (`WeekView.tsx`)
- Weekly column view
- Time slots

**DayView** (`DayView.tsx`)
- Daily time-based view
- Hourly slots

**AgendaView** (`AgendaView.tsx`)
- List agenda view
- Grouped by date

**CalendarDayColumn** (`calendar-day-column.tsx`)
- Day column in week view
- Task stacking

**CalendarWeekHeader** (`calendar-week-header.tsx`)
- Week day headers
- Date labels

**CalendarHoursColumn** (`calendar-hours-column.tsx`)
- Time slots column
- Hour markers

**DragDropCalendar** (`DragDropCalendar.tsx`)
- Drag-and-drop calendar
- Event reordering

**TaskCard** (`TaskCard.tsx`)
- Task card display
- Status indicators

**EventCard** (`event-card.tsx`)
- Calendar event card
- Time display

**CreateEventDialog** (`create-event-dialog.tsx`)
- Event creation form
- Recurrence options

**SchedulePopover** (`schedule-popover.tsx`)
- Quick schedule popover
- Date/time picker

**CurrentTimeIndicator** (`current-time-indicator.tsx`)
- Current time line marker
- Animated

---

### 6. Dashboard Components (15 components)

Located in `frontend/src/components/dashboard/`

**Dashboard** (`Dashboard.tsx`)
- Main dashboard container
- Responsive grid layout

**DashboardSection** (`DashboardSection.tsx`)
- Dashboard section container
- Title and actions

**DashboardWidget** (`DashboardWidget.tsx`)
- Reusable widget container
- Header/body/footer

**CalendarDashboard** (`CalendarDashboard.tsx`)
- Calendar widget
- Mini calendar view

**DashboardFilters** (`DashboardFilters.tsx`)
- Filter controls
- Date range picker

**FilterDrawer** (`FilterDrawer.tsx`)
- Slide-out filter panel
- Multi-filter support

**QuickActionCard** (`QuickActionCard.tsx`)
- Quick action button
- Icon + label

**InterventionWidget** (`InterventionWidget.tsx`)
- Active interventions widget
- Progress indicators

**PerformanceMetrics** (`PerformanceMetrics.tsx`)
- Performance KPIs
- Trend charts

**PhotoDocumentationDashboard** (`PhotoDocumentationDashboard.tsx`)
- Photo stats widget
- Recent photos grid

**QualityAssuranceDashboard** (`QualityAssuranceDashboard.tsx`)
- QC metrics widget
- Quality score display

**EventDetailPopover** (`EventDetailPopover.tsx`)
- Event detail popover
- Participant list

**DesktopDashboard** (`DesktopDashboard.tsx`)
- Desktop-specific layout
- Window management

---

### 7. Task Components (15+ components)

Located in `frontend/src/components/tasks/`

**TaskList** - Task list with filters
**TaskCard** - Individual task display
**TaskForm** - Task creation/edit form
**TaskFilters** - Filter control panel
**TaskStatusBadge** - Status indicator badge
**TaskPriorityBadge** - Priority indicator
**TaskDetailView** - Full task detail view
**TaskAssignment** - Technician assignment selector
**TaskWorkflow** - Workflow progress display
**TaskTimeline** - Task timeline view
**TaskComments** - Comment section
**TaskDocuments** - Document attachments
**TaskActions** - Action buttons menu
**TaskBulkActions** - Bulk operation controls
**TaskSearch** - Search input with suggestions

---

### 8. Intervention Components (12+ components)

Located in `frontend/src/components/interventions/`

**InterventionWorkflow** - Main workflow interface
**WorkflowProgress** - Step progress bar
**StepCard** - Individual step display
**StepStatus** - Step status indicator
**PhotoUploadStep** - Photo upload interface
**QualityChecklist** - QC items checklist
**EnvironmentLogger** - Conditions logging form
**PPFZoneSelector** - Zone selection UI
**FilmSelector** - Film type/brand selector
**FinalizationForm** - Completion data form
**SignatureCapture** - Customer signature component
**ObservationNotes** - Notes/observations textarea

---

### 9. Client Components (8+ components)

Located in `frontend/src/components/clients/`

**ClientList** - Client list view
**ClientCard** - Client summary card
**ClientSearch** - Search with filters
**ClientForm** - Client create/edit form
**ClientDetailView** - Full client detail view
**ClientTasks** - Client's task history
**ClientStats** - Statistics display
**ClientContact** - Contact actions (call, email)

---

### 10. Inventory Components (8 components)

Located in `frontend/src/components/inventory/`

**InventoryList** - Material inventory list
**MaterialCard** - Material display card
**StockLevelIndicator** - Visual stock level
**LowStockAlert** - Low stock warning
**MaterialForm** - Material create/edit form
**SupplierList** - Supplier management
**ConsumptionReport** - Usage report view
**StockAdjustment** - Stock adjustment dialog

---

### 11. Report Components (10+ components)

Located in `frontend/src/components/reports/`

**ReportList** - Available reports
**ReportBuilder** - Custom report builder
**ReportFilters** - Filter configuration
**ReportPreview** - Preview pane
**ExportDialog** - Export options
**ReportScheduler** - Schedule reports
**PDFViewer** - In-app PDF viewer
**ChartRenderer** - Chart display component
**ReportDashboard** - Reports overview
**ReportTemplates** - Template management

---

### 12. Forms & Input Components (20+ components)

Located in `frontend/src/components/forms/`

**BaseForm** - Reusable form container
**FormField** - Labeled input wrapper
**FormValidation** - Error display
**DateTimePicker** - Date/time selection
**MultiSelect** - Multi-value select
**AutoComplete** - Autocomplete input
**TagInput** - Tag creation input
**PhoneInput** - Phone number formatter
**EmailInput** - Email validation
**NumberInput** - Number with controls
**CurrencyInput** - Currency formatting
**RichTextEditor** - WYSIWYG editor
**FileUploader** - File upload component
**ImageCropper** - Image cropping tool
**SearchInput** - Search with suggestions
**ToggleSwitch** - On/off toggle
**RangeSlider** - Range input
**ColorPicker** - Color selection
**Rating** - Star rating input

---

### 13. Navigation Components (6+ components)

Located in `frontend/src/components/navigation/`

**Sidebar** - Main navigation sidebar
**SidebarItem** - Navigation menu item
**Breadcrumbs** - Breadcrumb navigation
**TabBar** - Tab navigation
**ProgressBar** - Multi-step progress
**BackButton** - Back navigation button

---

### 14. Photo Components (5 components)

Located in `frontend/src/components/PhotoUpload/`

**PhotoUpload** - Main upload component
**PhotoPreview** - Preview grid
**PhotoEditor** - Basic editing tools
**PhotoGallery** - Gallery view
**PhotoMetadata** - Metadata display

---

### 15. Quality Control Components (4+ components)

Located in `frontend/src/components/QualityControl/`

**QCChecklist** - Checklist items
**QCScoring** - Score input
**QCNotes** - Observation notes
**QCApproval** - Supervisor approval

---

### 16. Signature Components (2 components)

Located in `frontend/src/components/SignatureCapture/`

**SignaturePad** - Drawing canvas
**SignatureDisplay** - Rendered signature

---

### 17. GPS Components (2 components)

Located in `frontend/src/components/GPS/`

**LocationPicker** - Map-based selection
**GPSStatus** - Location status indicator

---

### 18. Messaging Components (5+ components)

Located in `frontend/src/components/messaging/`

**MessageList** - Message inbox
**MessageComposer** - Compose form
**MessageThread** - Conversation view
**MessagePreview** - Message snippet
**NotificationBadge** - Unread count badge

---

### 19. Settings Components (20+ components)

Located in `frontend/src/components/settings/`

**SettingsLayout** - Settings page layout
**SettingsSection** - Section container
**SettingsGroup** - Grouped settings
**ProfileSettings** - Profile configuration
**SecuritySettings** - Security options
**NotificationSettings** - Notification preferences
**AppearanceSettings** - Theme and display
**AccessibilitySettings** - Accessibility options
**PerformanceSettings** - Performance tuning
**SyncSettings** - Synchronization options
**LanguageSelector** - Language selection
**ThemeSelector** - Theme switcher
**PrivacySettings** - Privacy controls
**DataExport** - Data export interface
**AccountManagement** - Account controls
**SessionManagement** - Active sessions
**APIKeys** - API key management

---

### 20. Charts Components (1 component)

Located in `frontend/src/components/Charts/`

**StatisticsCharts** - Statistical charts
- Bar charts
- Line charts
- Pie charts
- Area charts

---

### 21. User/Admin Components (10+ components)

Located in `frontend/src/components/users/` and `frontend/src/app/admin/`

**UserList** - User table
**UserForm** - User create/edit
**RoleBadge** - Role indicator
**UserActions** - Action menu
**ChangeRoleDialog** - Role change modal
**AdminDashboard** - Admin overview
**SystemConfiguration** - System settings
**AuditLogViewer** - Audit log display
**SecurityDashboard** - Security metrics

---

### 22. Error & Loading Components (8+ components)

Located in `frontend/src/components/error-boundaries/`

**ErrorBoundary** - Error catch wrapper
**ErrorDisplay** - Error message display
**NotFoundPage** - 404 page
**LoadingSpinner** - Loading indicator
**FullPageLoader** - Full-screen loader
**RetryButton** - Retry action
**ProgressSteps** - Multi-step progress

---

### 23. Utility Components (15+ components)

Located in various `components/` directories

**CopyButton** - Copy to clipboard
**Tooltip** - Hover tooltip
**HelpText** - Contextual help
**InfoIcon** - Info display
**WarningBanner** - Warning message
**ConfirmDialog** - Confirmation modal
**EmptyState** - Empty state display
**NoData** - No data indicator
**Pagination** - Page navigation
**PerPageSelector** - Items per page
**SortIndicator** - Sort direction
**FilterChips** - Active filter chips
**SearchClearButton** - Clear search
**StatusIcon** - Status icon
**IconWrapper** - Icon container

---

## Design Tokens

Located in `frontend/src/lib/design-tokens.ts`

### Color Palette

```typescript
{
  primary: '#3b82f6',      // Blue
  secondary: '#64748b',    // Slate
  success: '#22c55e',      // Green
  warning: '#f59e0b',      // Orange
  danger: '#ef4444',       // Red
  background: '#ffffff',
  foreground: '#0f172a',
  border: '#e2e8f0',
  muted: '#64748b',
  accent: '#f43f5e',
}
```

### Typography

```typescript
{
  fontSize: {
    xs: '0.75rem',      // 12px
    sm: '0.875rem',     // 14px
    base: '1rem',       // 16px
    lg: '1.125rem',     // 18px
    xl: '1.25rem',      // 20px
    '2xl': '1.5rem',    // 24px
    '3xl': '1.875rem',  // 30px
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
}
```

### Spacing

```typescript
{
  space: {
    '1': '0.25rem',  // 4px
    '2': '0.5rem',   // 8px
    '3': '0.75rem',  // 12px
    '4': '1rem',     // 16px
    '5': '1.25rem',  // 20px
    '6': '1.5rem',   // 24px
    '8': '2rem',     // 32px
    '10': '2.5rem',  // 40px
    '12': '3rem',    // 48px
    '16': '4rem',    // 64px
  },
}
```

### Border Radius

```typescript
{
  borderRadius: {
    none: '0',
    sm: '0.25rem',   // 4px
    base: '0.375rem', // 6px
    md: '0.5rem',    // 8px
    lg: '0.75rem',   // 12px
    xl: '1rem',      // 16px
    '2xl': '1.5rem',  // 24px
    full: '9999px',
  },
}
```

### Shadows

```typescript
{
  boxShadow: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  },
}
```

---

## Responsive Breakpoints

```typescript
{
  screens: {
    sm: '640px',   // Small devices
    md: '768px',   // Tablets
    lg: '1024px',  // Laptops
    xl: '1280px',  // Desktop
    '2xl': '1536px', // Large screens
  },
}
```

---

## Accessibility Features

- **Keyboard Navigation**: Full keyboard support
- **Screen Reader**: ARIA labels and roles
- **High Contrast**: High contrast theme
- **Large Text**: Scalable font sizes
- **Focus Indicators**: Visible focus states
- **Color Blind Friendly**: Color + icon indicators
- **Reduced Motion**: Respect prefers-reduced-motion

---

## Component Usage Patterns

### Form Pattern

```
<Form>
  <FormField name="fieldName">
    <FormLabel>Label</FormLabel>
    <FormControl>
      <Input />
    </FormControl>
    <FormMessage />
  </FormField>
  <Button type="submit">Submit</Button>
</Form>
```

### Dialog Pattern

```
<Dialog>
  <DialogTrigger>Open</DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
      <DialogDescription>Description</DialogDescription>
    </DialogHeader>
    <Content />
    <DialogFooter>
      <Button>Cancel</Button>
      <Button>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### List Pattern

```
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Column</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map(item => (
          <TableRow key={item.id}>
            <TableCell>{item.value}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </CardContent>
</Card>
```

---

## Summary

| Category | Components | Count |
|----------|------------|-------|
| shadcn/ui Base | 39 components | 39 |
| Analytics | 9 components | 9 |
| Animations | 2 components | 2 |
| Authentication | 4 components | 4 |
| Calendar | 17 components | 17 |
| Dashboard | 15 components | 15 |
| Tasks | 15+ components | 15+ |
| Interventions | 12+ components | 12+ |
| Clients | 8+ components | 8+ |
| Inventory | 8 components | 8 |
| Reports | 10+ components | 10+ |
| Forms | 20+ components | 20+ |
| Navigation | 6+ components | 6+ |
| Photos | 5 components | 5 |
| Quality Control | 4+ components | 4+ |
| Signatures | 2 components | 2 |
| GPS | 2 components | 2 |
| Messaging | 5+ components | 5+ |
| Settings | 20+ components | 20+ |
| Users/Admin | 10+ components | 10+ |
| Errors/Loading | 8+ components | 8+ |
| Utilities | 15+ components | 15+ |
| Charts | 1 component | 1 |
| **TOTAL** | **223 components** | **223** |

---

**Document Version**: 1.0
**Last Updated**: 2026-02-03
**Maintained By**: RPMA Team
