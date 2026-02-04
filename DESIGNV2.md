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

## Color System

### Primary Colors

```typescript
{
  // Brand Colors
  primary: {
    50: '#e6f9f7',
    100: '#b3efe8',
    200: '#80e5d9',
    300: '#4ddbc9',
    400: '#1ad1ba',    // Main brand color (teal/turquoise)
    500: '#17bca9',
    600: '#14a797',
    700: '#119286',
    800: '#0e7d74',
    900: '#0b6862',
  },
  
  // Neutral Colors
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },
  
  // Semantic Colors
  success: '#22c55e',     // Green
  warning: '#f59e0b',     // Orange
  danger: '#ef4444',      // Red
  info: '#3b82f6',        // Blue
}
```

### Color Usage

- **Primary (Teal #1ad1ba)**: 
  - Top navigation bar
  - Primary action buttons
  - Active states and selected items
  - Progress indicators in workflow
  - Clock in/out buttons
  - Add/create action buttons

- **Status Colors**:
  - **Blue (#3b82f6)**: Scheduled status
  - **Yellow (#f59e0b)**: In Progress status
  - **Green (#22c55e)**: Completed status, success messages
  - **Red (#ef4444)**: Canceled/deleted items, error messages

- **Background Colors**:
  - **White (#ffffff)**: Main content areas, cards
  - **Light Gray (#f5f5f5)**: Page backgrounds
  - **Neutral Gray (#e5e5e5)**: Borders, dividers, inactive states

---

## Typography

### Font Stack

```css
/* Primary Font Family */
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 
             'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 
             'Helvetica Neue', sans-serif;
```

### Type Scale

```typescript
{
  fontSize: {
    xs: '0.75rem',      // 12px - Fine print, labels
    sm: '0.875rem',     // 14px - Secondary text, metadata
    base: '1rem',       // 16px - Body text
    lg: '1.125rem',     // 18px - Emphasized text
    xl: '1.25rem',      // 20px - Section headers
    '2xl': '1.5rem',    // 24px - Page titles
    '3xl': '1.875rem',  // 30px - Major headings
    '4xl': '2.25rem',   // 36px - Hero text
  },
  
  fontWeight: {
    normal: 400,        // Body text
    medium: 500,        // Emphasized text
    semibold: 600,      // Headings, buttons
    bold: 700,          // Major headings
  },
  
  lineHeight: {
    tight: 1.25,        // Headings
    normal: 1.5,        // Body text
    relaxed: 1.75,      // Long-form content
  },
}
```

### Typography Usage

- **Page Titles**: 2xl, semibold (Jobs, Inventory, Analytics)
- **Card Headers**: xl, semibold
- **Button Text**: sm, medium
- **Body Text**: base, normal
- **Labels**: sm, medium
- **Metadata**: xs, normal (timestamps, counts)

---

## Spacing System

### Base Unit: 4px

```typescript
{
  space: {
    '0': '0',
    '0.5': '0.125rem',  // 2px
    '1': '0.25rem',     // 4px
    '2': '0.5rem',      // 8px
    '3': '0.75rem',     // 12px
    '4': '1rem',        // 16px
    '5': '1.25rem',     // 20px
    '6': '1.5rem',      // 24px
    '8': '2rem',        // 32px
    '10': '2.5rem',     // 40px
    '12': '3rem',       // 48px
    '16': '4rem',       // 64px
    '20': '5rem',       // 80px
  },
}
```

### Spacing Application

- **Card Padding**: 6 (24px)
- **Section Spacing**: 8 (32px)
- **Button Padding**: Horizontal 4 (16px), Vertical 2 (8px)
- **Input Padding**: 3 (12px)
- **Grid Gap**: 4-6 (16-24px)
- **Page Margins**: 6-8 (24-32px)

---

## Layout Components

### Navigation Bar

**Specifications**:
- **Height**: 60px
- **Background**: Primary teal (#1ad1ba)
- **Position**: Fixed top
- **Content**: Logo, main navigation items, user actions
- **Shadow**: 0 2px 4px rgba(0,0,0,0.1)

**Navigation Items**:
- Calendar (icon: calendar)
- Jobs (icon: wrench)
- Proposals (icon: file-text)
- Customers (icon: users)
- Orders (icon: shopping-cart)
- Payments (icon: credit-card)
- Subscriptions (icon: repeat)

### Sidebar

**Specifications**:
- **Width**: 280px (desktop), collapsible on mobile
- **Background**: White
- **Border**: Right border 1px solid neutral-200
- **Shadow**: None (integrated design)

**Sidebar Sections**:
1. Business/Employee selector
2. Clock in/out controls
3. Message Center button
4. Main navigation menu
5. Settings link (bottom)

**Sidebar Items**:
- Employees/Resources
- Products/Services  
- Inventory
- Virtual Shop
- UrPerks
- Integrations
- Preferences
- Workflows
- Activity
- Analytics
- Trash
- Settings

### Content Area

**Specifications**:
- **Width**: calc(100% - 280px) on desktop
- **Padding**: 24px-32px
- **Background**: Light gray (#f5f5f5)
- **Min Height**: calc(100vh - 60px)

---

## UI Component Patterns

### Cards

**Base Card**:
```css
background: white;
border-radius: 8px;
padding: 24px;
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
border: 1px solid #e5e5e5;
```

**Card with Header**:
- Header with title (xl, semibold)
- Optional subtitle (sm, neutral-600)
- Optional actions (right-aligned)
- Divider between header and content

### Buttons

**Primary Button**:
```css
background: #1ad1ba;
color: white;
padding: 8px 16px;
border-radius: 6px;
font-size: 14px;
font-weight: 500;
transition: all 0.2s;

&:hover {
  background: #17bca9;
  box-shadow: 0 2px 8px rgba(26, 209, 186, 0.3);
}
```

**Secondary Button**:
```css
background: white;
color: #1ad1ba;
border: 1px solid #1ad1ba;
padding: 8px 16px;
border-radius: 6px;
font-size: 14px;
font-weight: 500;

&:hover {
  background: #e6f9f7;
}
```

**Icon Button**:
```css
width: 36px;
height: 36px;
border-radius: 6px;
display: flex;
align-items: center;
justify-content: center;
background: transparent;

&:hover {
  background: #f5f5f5;
}
```

### Status Badges

**Badge Styles**:
```typescript
const statusStyles = {
  scheduled: {
    background: '#3b82f6',
    color: 'white',
    text: 'Scheduled'
  },
  inProgress: {
    background: '#f59e0b',
    color: 'white',
    text: 'In Progress'
  },
  completed: {
    background: '#22c55e',
    color: 'white',
    text: 'Completed'
  },
  canceled: {
    background: '#ef4444',
    color: 'white',
    text: 'Canceled'
  }
}
```

**Badge Component**:
```css
padding: 4px 12px;
border-radius: 12px;
font-size: 12px;
font-weight: 500;
display: inline-flex;
align-items: center;
gap: 4px;
```

### Form Inputs

**Text Input**:
```css
width: 100%;
padding: 12px;
border: 1px solid #e5e5e5;
border-radius: 6px;
font-size: 14px;
transition: border-color 0.2s;

&:focus {
  outline: none;
  border-color: #1ad1ba;
  box-shadow: 0 0 0 3px rgba(26, 209, 186, 0.1);
}

&::placeholder {
  color: #a3a3a3;
}
```

**Select Dropdown**:
```css
width: 100%;
padding: 12px;
border: 1px solid #e5e5e5;
border-radius: 6px;
font-size: 14px;
background: white;
cursor: pointer;
appearance: none;
background-image: url("chevron-down-icon");
background-repeat: no-repeat;
background-position: right 12px center;
```

**Checkbox/Toggle**:
```css
.checkbox {
  width: 20px;
  height: 20px;
  border: 2px solid #e5e5e5;
  border-radius: 4px;
  
  &:checked {
    background: #1ad1ba;
    border-color: #1ad1ba;
  }
}

.toggle {
  width: 44px;
  height: 24px;
  border-radius: 12px;
  background: #e5e5e5;
  
  &:checked {
    background: #1ad1ba;
  }
}
```

---

## Page Layouts

### Calendar View

**Layout Structure**:
1. **Header Bar**:
   - Month/Year selector (dropdown)
   - View toggles (Agenda, Month, Week, Day, Map)
   - TODAY button
   - Assignment filter
   - View type toggles (Overall, Line Items)
   - FILTER button (top-right)

2. **Calendar Grid**:
   - 7-column layout (Sun-Sat)
   - Day cells with date numbers
   - Event cards within cells
   - Color-coded by status
   - Drag-and-drop enabled

3. **Action Button**:
   - Floating "+ ADD" button (bottom-center)
   - Primary teal background
   - Fixed position

**Calendar Event Card**:
```css
background: status-color;
color: white;
padding: 4px 8px;
border-radius: 4px;
font-size: 12px;
margin-bottom: 2px;
cursor: pointer;
transition: transform 0.2s;

&:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}
```

### Jobs List View

**Layout Structure**:
1. **Header**:
   - Page title "Jobs"
   - SHOW PROGRESS toggle
   - FILTER button
   - EXPORT button

2. **Status Tabs**:
   - ALL (with count)
   - QUOTES (with count)
   - SCHEDULED (with count)
   - IN PROGRESS (with count)
   - COMPLETED (with count)
   - CANCELED (with count)
   - ARCHIVED (with count)
   - Refresh icon (right)

3. **List View**:
   - Table columns: Created, Job # - Title, Status
   - Row hover state
   - Click to open details

4. **Action Button**:
   - Floating "+ ADD" button (bottom-center)

**Job List Item**:
```css
padding: 16px;
border-bottom: 1px solid #e5e5e5;
cursor: pointer;
transition: background 0.2s;

&:hover {
  background: #fafafa;
}

.job-date {
  font-size: 12px;
  color: #737373;
  margin-bottom: 4px;
}

.job-title {
  font-size: 14px;
  font-weight: 500;
  color: #171717;
  margin-bottom: 4px;
}

.job-customer {
  font-size: 12px;
  color: #22c55e;
}

.job-amount {
  font-size: 12px;
  color: #737373;
}
```

### Job Detail View

**Layout Structure**:
1. **Top Bar**:
   - Back arrow
   - Job number and title
   - Message icon
   - More options menu

2. **Tab Navigation**:
   - OVERVIEW (active state: teal underline)
   - PAYMENTS
   - APPROVALS
   - INSPECTIONS
   - DOCUMENTS
   - REMINDERS
   - WORKFLOW
   - METADATA

3. **Workflow Progress**:
   - 4-stage progress bar (Quote → Scheduled → In Progress → Completed)
   - Current stage highlighted
   - Completion timestamp

4. **Content Sections** (cards):
   - Customer (with avatar, name, edit button)
   - Line Items (expandable, with checklist/consumables buttons)
   - Schedule (drop-off, start, end times, color picker, assigned tech)
   - Custom Data
   - Notes

**Workflow Progress Bar**:
```css
.workflow-progress {
  display: flex;
  margin-bottom: 24px;
  
  .stage {
    flex: 1;
    height: 8px;
    background: #e5e5e5;
    position: relative;
    
    &.active {
      background: status-color;
    }
    
    &.quote { background: #9ca3af; }
    &.scheduled { background: #3b82f6; }
    &.in-progress { background: #f59e0b; }
    &.completed { background: #22c55e; }
  }
}
```

### Message Center

**Layout Structure**:
1. **Header**:
   - Close button
   - Title "Message Center"
   - Customer/Employee toggle tabs
   - SELECT CUSTOMER button

2. **Sidebar** (left, 300px):
   - SMS/Email toggle buttons
   - NEW MESSAGE button (primary teal)
   - Navigation sections:
     - Inbox
     - Campaigns
     - Queued
     - Undelivered
     - Add Sender Address
   - ALL (EMAIL) dropdown filter

3. **Main Area**:
   - Empty state:
     - Search icon with X
     - "No results found"
     - "+ CREATE A MESSAGE" button

**Message Center Styling**:
```css
.message-center {
  position: fixed;
  top: 60px;
  left: 0;
  right: 0;
  bottom: 0;
  background: white;
  z-index: 100;
  
  .sidebar {
    width: 300px;
    border-right: 1px solid #e5e5e5;
    padding: 24px;
  }
  
  .nav-item {
    padding: 12px 16px;
    border-radius: 6px;
    margin-bottom: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 12px;
    
    &:hover {
      background: #f5f5f5;
    }
    
    &.active {
      background: #e6f9f7;
      color: #1ad1ba;
    }
  }
}
```

### Inventory View

**Layout Structure**:
1. **Header**:
   - Back arrow
   - Title "Inventory"
   - Search icon

2. **Filters**:
   - Sort By dropdown
   - Projected Date Range picker (date range)
   - Navigation arrows

3. **Empty State**:
   - Search icon with X
   - "No results found"
   - "+ ADD A PRODUCT" button

4. **New Product Modal**:
   - Drag handle icon
   - Close button
   - Checkmark (save) button
   - Form sections:
     - Info (Category, Name, Description)
     - Prices (with SALE toggle, + ADD button)
     - Additional fields scrollable

**Inventory Form Styling**:
```css
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid #e5e5e5;
  
  .modal-title {
    font-size: 20px;
    font-weight: 600;
  }
}

.form-section {
  padding: 24px;
  
  .section-title {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 16px;
  }
  
  .form-group {
    margin-bottom: 16px;
    
    label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 8px;
      color: #404040;
    }
  }
}
```

### Employees/Resources View

**Layout Structure**:
1. **Top Tabs**:
   - EMPLOYEES (active)
   - RESOURCES

2. **Filter Toggle**:
   - Enabled / Disabled toggle buttons

3. **Employee List**:
   - Grouped by role (Admin, Level 3, Level 2, Level 1)
   - Employee card with:
     - Avatar (letter initial with online indicator)
     - Name
     - Email
     - Chevron right arrow

**Employee Card Styling**:
```css
.employee-card {
  display: flex;
  align-items: center;
  padding: 16px;
  background: white;
  border-bottom: 1px solid #e5e5e5;
  cursor: pointer;
  
  &:hover {
    background: #fafafa;
  }
  
  .avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #22c55e;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    margin-right: 12px;
    position: relative;
    
    .status-indicator {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 12px;
      height: 12px;
      background: #22c55e;
      border: 2px solid white;
      border-radius: 50%;
    }
  }
  
  .employee-info {
    flex: 1;
    
    .name {
      font-weight: 500;
      color: #171717;
    }
    
    .email {
      font-size: 12px;
      color: #737373;
    }
  }
}
```

### Analytics Dashboard

**Layout Structure**:
1. **Top Tabs**:
   - JOBS, PROPOSALS, CUSTOMERS, ORDERS, PAYMENTS, PRODUCTS/SERVICES, EMPLOYEES/RESOURCES, IMPORTS

2. **Filter Controls** (right side):
   - Type dropdown ("All")
   - View dropdown ("Days")
   - Date Range picker
   - Navigation arrows

3. **Chart Sections**:
   - Customers Created (line chart + donut chart)
   - Amount Spent (Top 10) table
   - Proposals Converted (dual line chart)
   - Proposals Pipeline (bar chart)

**Chart Styling**:
```css
.chart-container {
  background: white;
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  
  .chart-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
    
    .chart-title {
      font-size: 18px;
      font-weight: 600;
    }
    
    .chart-controls {
      display: flex;
      gap: 8px;
    }
  }
  
  .chart-legend {
    display: flex;
    gap: 16px;
    margin-bottom: 16px;
    
    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      
      .color-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
      }
    }
  }
}
```

### Notifications Panel

**Layout Structure**:
1. **Header**:
   - Title "Notifications"
   - Filter icon
   - Close button

2. **Notification Item**:
   - Title "Job scheduled"
   - Description text
   - Timestamp "28 minutes ago"

**Notification Styling**:
```css
.notification-panel {
  position: fixed;
  top: 60px;
  right: 0;
  width: 400px;
  height: calc(100vh - 60px);
  background: white;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
  z-index: 100;
  
  .notification-item {
    padding: 16px;
    border-bottom: 1px solid #e5e5e5;
    cursor: pointer;
    
    &:hover {
      background: #fafafa;
    }
    
    .notification-title {
      font-weight: 600;
      margin-bottom: 4px;
    }
    
    .notification-text {
      font-size: 14px;
      color: #404040;
      margin-bottom: 8px;
    }
    
    .notification-time {
      font-size: 12px;
      color: #737373;
    }
  }
}
```

### Trash View

**Layout Structure**:
1. **Title**: "Trash"
2. **FILTER button** (top-right)
3. **Tabs**:
   - ALL, JOBS, INSPECTIONS, PROPOSALS, CUSTOMERS, VEHICLES, EVENTS, ORDERS, PRODUCTS/SERVICES
4. **Table Headers**: Date, Deleted
5. **Empty State**:
   - Search icon with X
   - "No results found"

---

## Modal Dialogs

### Standard Modal

```css
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid #e5e5e5;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-body {
  padding: 24px;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid #e5e5e5;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}
```

### Context Menu Modal

**Example: "What are these and how are they different?"**

```css
.context-modal {
  max-width: 480px;
  
  .option-item {
    padding: 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;
    border-radius: 6px;
    
    &:hover {
      background: #f5f5f5;
    }
    
    .option-icon {
      width: 24px;
      height: 24px;
      color: #1ad1ba;
    }
    
    .option-label {
      font-size: 16px;
      font-weight: 500;
    }
  }
  
  .cancel-button {
    width: 100%;
    padding: 16px;
    text-align: center;
    font-weight: 500;
    border-top: 1px solid #e5e5e5;
    margin-top: 8px;
  }
}
```

---

## Interactive Elements

### Drag and Drop

**Visual Feedback**:
```css
.draggable {
  cursor: grab;
  
  &:active {
    cursor: grabbing;
  }
  
  &.dragging {
    opacity: 0.5;
    transform: scale(1.02);
  }
}

.drop-zone {
  border: 2px dashed #1ad1ba;
  background: rgba(26, 209, 186, 0.05);
  
  &.drag-over {
    background: rgba(26, 209, 186, 0.1);
    border-color: #17bca9;
  }
}
```

### Loading States

**Spinner**:
```css
.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e5e5e5;
  border-top-color: #1ad1ba;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

**Skeleton Loading**:
```css
.skeleton {
  background: linear-gradient(
    90deg,
    #f5f5f5 25%,
    #e5e5e5 50%,
    #f5f5f5 75%
  );
  background-size: 200% 100%;
  animation: loading 1.5s ease-in-out infinite;
  border-radius: 4px;
}

@keyframes loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

### Hover Effects

```css
/* Card Hover */
.card {
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
}

/* Button Hover */
.button {
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(26, 209, 186, 0.3);
  }
  
  &:active {
    transform: translateY(0);
  }
}

/* Link Hover */
.link {
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 0;
    width: 0;
    height: 2px;
    background: #1ad1ba;
    transition: width 0.3s ease;
  }
  
  &:hover::after {
    width: 100%;
  }
}
```

### Focus States

```css
/* Keyboard Focus Indicator */
*:focus-visible {
  outline: 2px solid #1ad1ba;
  outline-offset: 2px;
  border-radius: 4px;
}

/* Input Focus */
input:focus,
textarea:focus,
select:focus {
  outline: none;
  border-color: #1ad1ba;
  box-shadow: 0 0 0 3px rgba(26, 209, 186, 0.1);
}

/* Button Focus */
button:focus-visible {
  outline: 2px solid #1ad1ba;
  outline-offset: 2px;
}
```

---

## Responsive Breakpoints

```typescript
{
  screens: {
    sm: '640px',      // Mobile landscape
    md: '768px',      // Tablet portrait
    lg: '1024px',     // Tablet landscape / small desktop
    xl: '1280px',     // Desktop
    '2xl': '1536px',  // Large desktop
  },
}
```

### Mobile Adaptations (< 768px)

1. **Navigation**:
   - Hamburger menu instead of full navbar
   - Bottom navigation bar for primary actions
   - Collapsible sidebar

2. **Layout**:
   - Single column layout
   - Stacked cards
   - Full-width modals

3. **Calendar**:
   - Week view as default
   - Swipe gestures for navigation
   - Simplified event cards

4. **Tables**:
   - Card-based layout instead of table
   - Show/hide columns functionality
   - Horizontal scroll for wide tables

---

## Animations & Transitions

### Page Transitions

```css
/* Fade In */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-in {
  animation: fadeIn 0.3s ease-out;
}

/* Slide In */
@keyframes slideIn {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(0);
  }
}

.slide-in {
  animation: slideIn 0.3s ease-out;
}
```

### Micro-interactions

```css
/* Button Click */
.button {
  &:active {
    transform: scale(0.98);
  }
}

/* Checkbox Check */
.checkbox {
  &:checked {
    animation: checkmark 0.2s ease-in-out;
  }
}

@keyframes checkmark {
  0%, 50% {
    transform: scale(1);
  }
  25% {
    transform: scale(1.1);
  }
}

/* Toast Notification */
@keyframes slideInFromRight {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

.toast {
  animation: slideInFromRight 0.3s ease-out;
}
```

---

## Accessibility

### WCAG 2.1 AA Compliance

**Color Contrast**:
- Normal text: Minimum 4.5:1 contrast ratio
- Large text (18pt+): Minimum 3:1 contrast ratio
- Interactive elements: Minimum 3:1 against background

**Keyboard Navigation**:
- All interactive elements accessible via Tab key
- Visible focus indicators
- Logical tab order
- Escape key closes modals
- Arrow keys navigate lists and menus

**Screen Reader Support**:
- Semantic HTML elements
- ARIA labels for icons and custom controls
- ARIA live regions for dynamic content
- Alt text for images
- Skip navigation links

**Motion & Animation**:
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Icons

### Icon Library: Lucide React

**Commonly Used Icons**:
- **Navigation**: Menu, X, ChevronLeft, ChevronRight, ChevronDown
- **Actions**: Plus, Edit, Trash2, Download, Upload, Send, Save
- **Status**: Check, X, AlertTriangle, Info, CheckCircle
- **Content**: Calendar, Clock, User, Users, Mail, Phone
- **Media**: Image, File, FileText, Folder
- **Interface**: Search, Filter, Settings, MoreVertical, MoreHorizontal

**Icon Sizing**:
```typescript
{
  iconSize: {
    sm: 16,    // Small icons in text
    md: 20,    // Standard icons
    lg: 24,    // Large icons in headers
    xl: 32,    // Extra large for empty states
  }
}
```

**Icon Usage**:
```tsx
import { Calendar, User, Settings } from 'lucide-react';

<Icon 
  icon={Calendar} 
  size={20} 
  color="#1ad1ba" 
  strokeWidth={2}
/>
```

---

## Data Visualization

### Charts (Recharts)

**Line Chart**:
```tsx
<LineChart>
  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
  <XAxis dataKey="date" stroke="#737373" />
  <YAxis stroke="#737373" />
  <Tooltip />
  <Line 
    type="monotone" 
    dataKey="value" 
    stroke="#1ad1ba" 
    strokeWidth={2}
    dot={{ fill: '#1ad1ba', r: 4 }}
  />
</LineChart>
```

**Bar Chart**:
```tsx
<BarChart>
  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
  <XAxis dataKey="category" stroke="#737373" />
  <YAxis stroke="#737373" />
  <Tooltip />
  <Bar dataKey="value" fill="#1ad1ba" radius={[4, 4, 0, 0]} />
</BarChart>
```

**Donut Chart**:
```tsx
<PieChart>
  <Pie
    data={data}
    innerRadius={60}
    outerRadius={80}
    paddingAngle={2}
    dataKey="value"
  >
    {data.map((entry, index) => (
      <Cell key={`cell-${index}`} fill={COLORS[index]} />
    ))}
  </Pie>
  <Tooltip />
</PieChart>
```

---

## Best Practices

### Performance

1. **Code Splitting**:
   - Lazy load routes
   - Dynamic imports for heavy components
   - Separate vendor bundles

2. **Image Optimization**:
   - Use WebP format where supported
   - Implement lazy loading
   - Responsive images with srcset

3. **Caching**:
   - Service worker for offline support
   - API response caching
   - Static asset caching

### Code Organization

```
src/
├── components/
│   ├── ui/              # Base UI components
│   ├── calendar/        # Calendar-specific components
│   ├── jobs/            # Job-related components
│   ├── forms/           # Form components
│   └── layouts/         # Layout components
├── lib/
│   ├── design-tokens.ts # Design system tokens
│   ├── utils.ts         # Utility functions
│   └── hooks/           # Custom React hooks
├── styles/
│   ├── globals.css      # Global styles
│   └── animations.css   # Animation keyframes
└── pages/               # Next.js pages
```

### Component Structure

```tsx
import React from 'react';
import { cn } from '@/lib/utils';

interface ComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export const Component: React.FC<ComponentProps> = ({ 
  className,
  children 
}) => {
  return (
    <div className={cn(
      'base-styles',
      'modifier-styles',
      className
    )}>
      {children}
    </div>
  );
};
```

### Naming Conventions

- **Components**: PascalCase (e.g., `TaskCard`, `UserProfile`)
- **Files**: Match component name (e.g., `TaskCard.tsx`)
- **CSS Classes**: kebab-case (e.g., `task-card`, `user-profile`)
- **Functions**: camelCase (e.g., `handleSubmit`, `fetchData`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_URL`, `MAX_ITEMS`)

---

## Design System Maintenance

### Version Control

- Document all design token changes
- Maintain changelog for component updates
- Use semantic versioning for major changes

### Component Audits

- Quarterly review of component usage
- Identify and remove unused components
- Consolidate duplicate patterns

### Documentation

- Keep design documentation in sync with code
- Include usage examples for all components
- Document accessibility considerations
- Maintain Storybook for component playground

---

## Future Enhancements

### Planned Features

1. **Dark Mode**:
   - Complete dark color palette
   - Toggle in user preferences
   - System preference detection

2. **Customization**:
   - User-selectable color themes
   - Adjustable density (compact/comfortable/spacious)
   - Custom dashboard layouts

3. **Advanced Interactions**:
   - Keyboard shortcuts overlay
   - Command palette (Cmd+K)
   - Undo/redo functionality

4. **Enhanced Accessibility**:
   - High contrast mode
   - Font size adjustment
   - Screen reader improvements

---

**Document Version**: 1.0  
**Last Updated**: 2026-02-03  
**Maintained By**: RPMA Development Team
