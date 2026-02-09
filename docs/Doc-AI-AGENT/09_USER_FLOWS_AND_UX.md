# RPMA v2 User Flows and UX

## Main User Flows Overview

RPMA v2 serves four primary user types with distinct workflows:
- **Technicians**: Execute PPF installation workflows and manage their assigned tasks
- **Supervisors**: Oversee team performance, assign tasks, and manage scheduling
- **Admins**: Configure the system, manage users, and handle administrative tasks
- **Viewers**: Monitor reports and view task/intervention data

## 1. Task Management Flow

### 1.1 Create Task (Technician/Supervisor)

#### Entry Routes
- `/tasks/new` - Direct task creation form
- Dashboard "Quick Actions" → "Create Task"
- Client profile → "Create Task" button

#### UI States
1. **Initial Form State**:
   - Client selection (search or create new)
   - Vehicle information form
   - PPF zone selection diagram
   - Priority and scheduling options

2. **Validation State**:
   - Real-time field validation
   - PPF zone validation based on vehicle type
   - Scheduling conflict checking

3. **Submission State**:
   - Loading spinner during creation
   - Success confirmation with task details
   - Option to create intervention immediately

#### Backend Commands Used
```typescript
// Client lookup
await ipcClient.invoke('search_clients', { query: clientSearch });

// Task creation
await ipcClient.invoke('create_task', {
  title: taskTitle,
  clientId: selectedClient.id,
  vehicleInfo: {...},
  ppfZones: selectedZones,
  priority: selectedPriority,
  scheduledDate: scheduleDate
});
```

#### Validations and Error Handling
- Client must exist and be active
- Vehicle information must be complete
- PPF zones must be valid for vehicle type
- Scheduled date cannot be in the past
- Duplicate task prevention for same vehicle/date

### 1.2 Task List and Filtering (All Roles)

#### Entry Routes
- `/tasks` - Main task listing page
- Dashboard task widgets (click to view details)
- Navigation menu "Tasks"

#### UI States
1. **List View**:
   - Sortable columns (title, status, priority, date)
   - Status-based color coding
   - Pagination for large lists

2. **Filter Panel**:
   - Status filter dropdown
   - Priority filter
   - Date range selector
   - Technician filter (Supervisor/Admin only)
   - Search by title or client name

3. **Task Cards**:
   - Status badges
   - Vehicle preview
   - Assigned technician avatar
   - Progress indicators for interventions

#### Backend Commands Used
```typescript
// Initial task load
const tasks = await ipcClient.invoke('list_tasks', {
  filters: initialFilters,
  limit: 50,
  offset: 0
});

// Filtered search
const filteredTasks = await ipcClient.invoke('list_tasks', {
  filters: {
    status: selectedStatuses,
    priority: selectedPriorities,
    dateFrom: dateRange.from,
    dateTo: dateRange.to,
    technicianId: selectedTechnicianId,
    search: searchQuery
  }
});
```

## 2. Intervention Workflow

### 2.1 Start Intervention (Technician)

#### Entry Routes
- Task detail page → "Start Intervention" button
- Dashboard "My Tasks" → task with "Scheduled" status
- Calendar event → task link

#### UI States
1. **Pre-Start Checklist**:
   - Vehicle verification (photo comparison)
   - Environmental condition capture
   - Required material availability check
   - Safety protocol acknowledgment

2. **Setup Confirmation**:
   - GPS location logging
   - Work area photos
   - Material batch recording

3. **Workflow Initiation**:
   - Step sequence loading
   - Timer initialization
   - Progress tracking setup

#### Backend Commands Used
```typescript
// Create intervention from task
const intervention = await ipcClient.invoke('start_intervention', {
  taskId: task.id,
  environmentalConditions: {
    weather: weatherCondition,
    lighting: lightingCondition,
    temperature: temperature,
    humidity: humidity
  },
  location: {
    latitude: currentLocation.lat,
    longitude: currentLocation.lng,
    accuracy: locationAccuracy
  }
});
```

### 2.2 Step Execution (Technician)

#### Entry Routes
- Intervention detail page → step cards
- Active intervention dashboard
- Push notifications for next steps

#### UI States
1. **Step Selection**:
   - Visual step progress indicator
   - Current step highlighting
   - Step dependency visualization

2. **Step Execution**:
   - Step-specific instructions
   - Required photo capture
   - Quality checkpoints
   - Notes and observations

3. **Completion Validation**:
   - Photo quality scoring
   - Required coverage verification
   - GPS confirmation for location-specific steps

#### Backend Commands Used
```typescript
// Start step
await ipcClient.invoke('start_step', {
  interventionId: intervention.id,
  stepId: step.id,
  location: {
    latitude: stepLocation.lat,
    longitude: stepLocation.lng,
    accuracy: locationAccuracy
  }
});

// Complete step
await ipcClient.invoke('complete_step', {
  interventionId: intervention.id,
  stepId: step.id,
  notes: stepNotes,
  photoIds: uploadedPhotoIds,
  qualityScore: autoCalculatedScore
});

// Upload photos
for (const photo of stepPhotos) {
  await ipcClient.invoke('upload_photo', {
    interventionId: intervention.id,
    stepId: step.id,
    filePath: photo.path,
    classification: photo.classification,
    metadata: {
      gpsCoordinates: photo.location,
      exifData: photo.metadata
    }
  });
}
```

#### Validations and Error Handling
- All required photos must be uploaded
- Quality score must meet minimum threshold
- GPS coordinates within acceptable range
- Steps must be completed in sequence
- Material consumption properly recorded

## 3. Client Management Flow

### 3.1 Client Registration (All Roles)

#### Entry Routes
- `/clients/new` - New client form
- Task creation → "Create New Client" option
- Client import functionality (Admin)

#### UI States
1. **Client Type Selection**:
   - Individual vs Business toggle
   - Form field adaptation based on selection

2. **Information Capture**:
   - Contact information with validation
   - Address with autocomplete
   - Vehicle information (multiple vehicles supported)
   - Communication preferences

3. **Profile Completion**:
   - Profile photo upload
   - Service history initialization
   - Notes and special requirements

#### Backend Commands Used
```typescript
// Create client
const client = await ipcClient.invoke('create_client', {
  clientType: 'individual', // or 'business'
  firstName: formData.firstName,
  lastName: formData.lastName,
  email: formData.email,
  phone: formData.phone,
  address: {
    line1: formData.address1,
    line2: formData.address2,
    city: formData.city,
    state: formData.state,
    zip: formData.zip
  }
});

// Add vehicle to client
await ipcClient.invoke('add_client_vehicle', {
  clientId: client.id,
  vehicleInfo: {
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    vin: vehicle.vin,
    licensePlate: vehicle.licensePlate,
    color: vehicle.color
  }
});
```

### 3.2 Client Dashboard (All Roles)

#### Entry Routes
- `/clients/{id}` - Client profile page
- Task list → client link
- Search results → client card

#### UI States
1. **Client Overview**:
   - Contact information card
   - Active tasks count
   - Service history timeline
   - Outstanding balance (if applicable)

2. **Vehicle Management**:
   - Vehicle grid with photos
   - Service history per vehicle
   - PPF zone application history

3. **Communication Log**:
   - Notes and interactions
   - Photo documentation
   - Quality scores and feedback

#### Backend Commands Used
```typescript
// Get client details
const client = await ipcClient.invoke('get_client', { clientId });

// Get client tasks
const tasks = await ipcClient.invoke('list_tasks', {
  filters: { clientId }
});

// Get client interventions
const interventions = await ipcClient.invoke('list_interventions', {
  filters: { clientId }
});
```

## 4. Calendar and Scheduling Flow

### 4.1 Calendar View (Supervisor/Technician)

#### Entry Routes
- `/calendar` - Main calendar page
- Dashboard calendar widget
- Task scheduling flow

#### UI States
1. **Calendar Views**:
   - Month/Week/Day view toggles
   - Color-coded task status
   - Technician filtering (Supervisor)

2. **Task Scheduling**:
   - Drag-and-drop task assignment
   - Duration estimation
   - Conflict detection and resolution
   - Resource availability checking

3. **Rescheduling Interface**:
   - Conflict notification
   - Affected parties notification
   - Reason for change capture

#### Backend Commands Used
```typescript
// Get calendar events
const events = await ipcClient.invoke('get_calendar_events', {
  startDate: calendarStart,
  endDate: calendarEnd,
  technicianIds: selectedTechnicians
});

// Assign task to date
await ipcClient.invoke('assign_task_date', {
  taskId: task.id,
  scheduledDate: newDate,
  technicianId: selectedTechnician,
  estimatedDuration: duration
});

// Check scheduling conflicts
const conflicts = await ipcClient.invoke('check_scheduling_conflicts', {
  technicianId: selectedTechnician,
  startDate: startTime,
  endDate: endTime,
  excludeTaskId: currentTaskId
});
```

## 5. Inventory Management Flow

### 5.1 Material Inventory (Supervisor/Admin)

#### Entry Routes
- `/inventory` - Main inventory page
- Task execution → material consumption
- Material low stock alerts

#### UI States
1. **Inventory Dashboard**:
   - Stock level indicators
   - Category-based organization
   - Low stock warnings
   - Expiry date tracking

2. **Material Details**:
   - Batch information
   - Consumption history
   - Supplier information
   - Storage location

3. **Adjustment Interface**:
   - Stock adjustment reasons
   - Quality inspection results
   - Transfer authorization
   - Disposal documentation

#### Backend Commands Used
```typescript
// Get inventory levels
const inventory = await ipcClient.invoke('list_materials', {
  categoryId: selectedCategory,
  includeOutOfStock: true
});

// Record consumption
await ipcClient.invoke('consume_material', {
  materialId: material.id,
  quantity: consumedAmount,
  interventionId: intervention.id,
  notes: 'Used for hood installation'
});

// Adjust inventory
await ipcClient.invoke('adjust_inventory', {
  materialId: material.id,
  newQuantity: adjustedAmount,
  reason: 'Physical count',
  notes: adjustmentNotes
});
```

## 6. Reports and Analytics Flow

### 6.1 Performance Dashboard (Supervisor/Admin)

#### Entry Routes
- `/reports` - Reports main page
- Dashboard performance widgets
- Scheduled email reports

#### UI States
1. **Report Selection**:
   - Report type selector
   - Date range picker
   - Filter options
   - Export format selection

2. **Data Visualization**:
   - Performance charts
   - Trend analysis
   - Comparison metrics
   - KPI indicators

3. **Export Interface**:
   - Format selection (PDF/Excel)
   - Email scheduling
   - Report templates
   - Share permissions

#### Backend Commands Used
```typescript
// Generate completion report
const report = await ipcClient.invoke('generate_completion_report', {
  dateFrom: reportRange.start,
  dateTo: reportRange.end,
  technicianId: selectedTechnician,
  format: 'pdf'
});

// Get performance metrics
const metrics = await ipcClient.invoke('get_performance_metrics', {
  period: selectedPeriod,
  technicianId: selectedTechnician,
  includeComparison: true
});
```

## 7. Authentication Flow

### 7.1 Login and Session Management (All Roles)

#### Entry Routes
- `/login` - Login page
- Application startup → login required
- Session timeout → forced logout

#### UI States
1. **Login Form**:
   - Email/password input
   - Remember me option
   - Forgot password link
   - 2FA prompt if enabled

2. **Two-Factor Authentication**:
   - TOTP code input
   - Backup code option
   - Device trust option

3. **Session Management**:
   - Active session indicator
   - Logout confirmation
   - Multi-session management

#### Backend Commands Used
```typescript
// Initial login
const loginResult = await ipcClient.invoke('login', {
  email: loginForm.email,
  password: loginForm.password,
  rememberMe: loginForm.rememberMe
});

// 2FA completion
const sessionResult = await ipcClient.invoke('login_with_2fa', {
  sessionToken: loginResult.tempToken,
  code: totpCode
});

// Logout
await ipcClient.invoke('logout', {
  sessionToken: currentSessionToken
});
```

## 8. Administration Flow

### 8.1 User Management (Admin)

#### Entry Routes
- `/admin/users` - User management page
- Settings → User Management
- System administration menu

#### UI States
1. **User Directory**:
   - User list with role indicators
   - Search and filtering
   - Status management
   - Bulk operations

2. **User Creation/Editing**:
   - Role assignment
   - Permission configuration
   - Team assignment
   - Account activation

3. **Security Settings**:
   - Password policy enforcement
   - 2FA requirement settings
   - Session configuration
   - Access log review

#### Backend Commands Used
```typescript
// Create user
const user = await ipcClient.invoke('create_user', {
  username: newUser.username,
  email: newUser.email,
  role: newUser.role,
  teamId: newUser.teamId,
  requireTwoFactor: newUser.require2FA
});

// Update user permissions
await ipcClient.invoke('update_user_role', {
  userId: user.id,
  newRole: newRole,
  updatedBy: currentUser.id
});
```

## Design System Guardrails

### Tailwind Color Tokens
```css
/* Design tokens from design system */
--background: hsl(var(--background));
--foreground: hsl(var(--foreground));
--primary: hsl(var(--primary));
--primary-foreground: hsl(var(--primary-foreground));
--secondary: hsl(var(--secondary));
--muted: hsl(var(--muted));
--border: hsl(var(--border));
```

### Component Patterns

#### 1. Cards and Lists
```typescript
// Consistent card component usage
<Card className="w-full">
  <CardHeader>
    <CardTitle>Task Title</CardTitle>
    <CardDescription>Vehicle Information</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

#### 2. Forms and Validation
```typescript
// Form with consistent validation
<Form {...form}>
  <FormField
    control={form.control}
    name="title"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Title</FormLabel>
        <FormControl>
          <Input placeholder="Enter title" {...field} />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
</Form>
```

#### 3. Buttons and Actions
```typescript
// Consistent button patterns
<Button variant="default">Primary Action</Button>
<Button variant="outline">Secondary Action</Button>
<Button variant="ghost">Tertiary Action</Button>
<Button variant="destructive">Danger Action</Button>
```

### Responsive Design Rules

#### Mobile-First Approach
```typescript
// Use responsive classes consistently
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Responsive grid */}
</div>

// Hide elements appropriately
<div className="hidden md:block">
  {/* Desktop-only content */}
</div>
```

#### Touch-Friendly Interactions
```typescript
// Ensure adequate touch targets
<Button size="lg" className="md:size-default">
  {/* Larger on mobile */}
</Button>
```

### Accessibility Standards

#### Semantic HTML
```typescript
// Use proper semantic elements
<main role="main" aria-label="Task Management">
  <section aria-labelledby="task-list-heading">
    <h2 id="task-list-heading" className="sr-only">Task List</h2>
    {/* Task list */}
  </section>
</main>
```

#### Focus Management
```typescript
// Manage focus in interactive components
<Dialog>
  <DialogContent onOpenAutoFocus={(event) => event.preventDefault()}>
    {/* Dialog content */}
  </DialogContent>
</Dialog>
```

## User Experience Patterns

### Loading States
- Skeleton loaders for content areas
- Progress indicators for operations
- Spinners for button actions
- Status bars for long-running processes

### Error Handling
- Inline validation feedback
- Toast notifications for errors
- Error boundaries for component failures
- Network error retry options

### Success Feedback
- Confirmation messages
- Progress animations
- Success screens
- Summary receipts

### Empty States
- Helpful illustrations
- Action prompts
- Quick start guides
- Sample data options

This comprehensive flow documentation ensures consistent user experience across all major application features while providing clear guidance for implementation of new features and maintaining design system consistency.