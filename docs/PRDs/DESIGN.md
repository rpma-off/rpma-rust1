# DESIGN.md

## RPMA v2 - Design & UI Documentation

---

## 1. UI/UX Overview

### 1.1 Design Philosophy

RPMA v2 follows a **modern, professional business application** aesthetic:

- **Clean & Functional**: Focus on usability and efficiency
- **Dark/Light Mode**: Full theme support via CSS variables
- **Responsive**: Adapts to desktop window sizes (min 800x600)
- **Accessible**: WCAG-compliant components from Radix UI

### 1.2 Technology Stack

| Category | Technology |
|----------|-----------|
| **Framework** | Next.js 14 (App Router) |
| **Components** | Radix UI primitives + shadcn/ui |
| **Styling** | Tailwind CSS 3.4 |
| **Icons** | Lucide React |
| **Animations** | Framer Motion |
| **Forms** | React Hook Form + Zod |
| **State** | Zustand, TanStack Query |

---

## 2. Design System

### 2.1 Color Palette

The design system uses **CSS variables** for theming:

#### Light Theme

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  --primary-hover: 221.2 83.2% 48.3%;
  --secondary: 210 40% 96.1%;
  --accent: 210 40% 96.1%;
  --destructive: 0 84.2% 60.2%;
  --success: 142 76% 36%;
  --warning: 38 92% 50%;
  --error: 0 84.2% 60.2%;
  --info: 199 89% 48%;
}
```

#### Dark Theme

```css
.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --primary: 217.2 91.2% 59.8%;
  --primary-hover: 217.2 91.2% 65%;
  --secondary: 217.2 32.6% 17.5%;
  --destructive: 0 62.8% 30.6%;
}
```

#### Brand Colors (RPMA)

| Color | Hex | Usage |
|-------|-----|-------|
| RPMA Primary | Blue (#3B82F6) | Primary actions, links |
| RPMA Hover | Darker blue | Hover states |
| RPMA Active | Active state | Active/pressed |
| RPMA Foreground | White/dark | Text on brand |

#### Status Colors

| Status | Hex | Usage |
|--------|-----|-------|
| Success | Green (#22C55E) | Completed, positive |
| Warning | Amber (#F59E0B) | Pending, attention |
| Error | Red (#EF4444) | Failed, destructive |
| Info | Blue (#0EA5E9) | Informational |

#### Priority Colors

| Priority | Hex | Badge Style |
|----------|-----|-------------|
| Low | #3B82F6 | Blue |
| Medium | #F59E0B | Amber |
| High | #F97316 | Orange |
| Urgent | #EF4444 | Red |

### 2.2 Typography

| Element | Font | Size | Weight |
|---------|------|------|--------|
| **Headings** | Inter | 24-36px | 600-700 |
| **Body** | Inter | 14-16px | 400 |
| **Labels** | Inter | 12-14px | 500 |
| **Code** | JetBrains Mono | 13px | 400 |

**Font Stack:**
```css
font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
```

### 2.3 Spacing System

Based on **Tailwind CSS** spacing scale:

| Token | Value | Usage |
|-------|-------|-------|
| `xs` | 4px | Tight spacing |
| `sm` | 8px | Compact elements |
| `md` | 16px | Default spacing |
| `lg` | 24px | Section spacing |
| `xl` | 32px | Large gaps |
| `2xl` | 48px | Page margins |

### 2.4 Border Radius

| Component | Radius |
|-----------|--------|
| Buttons | 6px (rounded-md) |
| Cards | 8px (rounded-lg) |
| Inputs | 6px (rounded-md) |
| Modals | 12px (rounded-xl) |
| Avatars | Full (rounded-full) |

---

## 3. UI Components

### 3.1 Base Components (shadcn/ui)

The project uses **shadcn/ui** component library built on Radix UI primitives:

| Component | File | Description |
|-----------|------|-------------|
| Button | `button.tsx` | Primary, secondary, ghost, destructive variants |
| Input | `input.tsx` | Text input with error states |
| Select | `select.tsx` | Dropdown selection |
| Checkbox | `checkbox.tsx` | Boolean selection |
| Radio | `radio-group.tsx` | Single selection |
| Switch | `switch.tsx` | Toggle switch |
| Tabs | `tabs.tsx` | Content organization |
| Dialog | `dialog.tsx` | Modal dialogs |
| Sheet | `sheet.tsx` | Side drawer |
| Dropdown Menu | `dropdown-menu.tsx` | Context menus |
| Popover | `popover.tsx` | Floating content |
| Tooltip | `tooltip.tsx` | Hover hints |
| Table | `table.tsx` | Data tables |
| Card | `card.tsx` | Content containers |
| Badge | `badge.tsx` | Status/tags |
| Avatar | `avatar.tsx` | User images |
| Progress | `progress.tsx` | Progress bars |
| Alert | `alert.tsx` | Notifications |
| Form | `form.tsx` | Form wrapper |

### 3.2 Custom Components

| Component | Description |
|-----------|-------------|
| `StatusBadge` | Task/intervention status indicator |
| `PageHeader` | Page title + actions |
| `DesktopTable` | Virtualized table for large datasets |
| `VirtualizedTable` | Virtual scrolling table |
| `ConfirmDialog` | Confirmation modal |
| `RouteLoading` | Route transition loading |
| `EmptyState` | No data placeholder |
| `ErrorFallback` | Error boundary UI |
| `LoadingSpinner` | Loading indicator |
| `ProgressIndicator` | Step progress |

### 3.3 Domain-Specific Components

Located in `frontend/src/domains/*/components/`:

| Domain | Components |
|--------|-----------|
| `clients` | ClientForm, ClientCard, ClientList |
| `tasks` | TaskCard, TaskForm, TaskTimeline |
| `interventions` | StepProgress, InterventionCard |
| `inventory` | MaterialForm, StockIndicator |
| `quotes` | QuoteForm, QuoteLineItem |
| `calendar` | CalendarView, EventCard |

---

## 4. Layout Structure

### 4.1 App Shell

```
┌─────────────────────────────────────────────────────────────┐
│  Header (Navigation Bar)                                     │
│  ┌─────────────┐  ┌──────────────────────────────────────┐  │
│  │ Logo        │  │  Search  │  Notifications │  User  │  │
│  └─────────────┘  └──────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│ Sidebar │                                                   │
│ ┌──────┐│                                                   │
│ │ Nav   ││              Main Content Area                   │
│ │ Items ││                                                   │
│ │       ││                                                   │
│ │ Tasks ││                                                   │
│ │ Clients│ │                                                  │
│ │ etc.  ││                                                   │
│ └──────┘│                                                   │
├─────────┴───────────────────────────────────────────────────┤
│  Status Bar (optional)                                       │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Navigation

**Sidebar Navigation Items:**
- Dashboard
- Tasks
- Interventions
- Clients
- Inventory
- Quotes
- Calendar
- Messages
- Reports (future)
- Settings
- Admin (role-restricted)

### 4.3 Page Layouts

| Page Type | Structure |
|-----------|-----------|
| List Page | Header → Filters → Table/Grid → Pagination |
| Detail Page | Header → Tabs → Content Sections |
| Form Page | Header → Form Fields → Actions |
| Dashboard | Stats Cards → Charts → Recent Items |

---

## 5. Forms

### 5.1 Form Library

- **React Hook Form** - Form state management
- **Zod** - Schema validation
- **@hookform/resolvers** - Zod integration

### 5.2 Form Components

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(2, 'Name required'),
  email: z.string().email('Invalid email'),
});

function ClientForm() {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
  });
  
  // ... form implementation
}
```

### 5.2 Validation Patterns

| Field Type | Validation |
|------------|-----------|
| Email | Valid email format, max 255 chars |
| Phone | Optional, valid phone format |
| Required | Non-empty string |
| Numeric | Positive integer |
| Date | Valid date, future/past constraints |
| UUID | Valid UUID format |

---

## 6. Data Display

### 6.1 Tables

- **DesktopTable**: Full-featured table with sorting, filtering
- **VirtualizedTable**: For large datasets (1000+ rows)
- Features: Column resizing, row selection, inline actions

### 6.2 Cards

Used for dashboard stats, quick views:
- Icon + metric + label
- Trend indicator (up/down)
- Click to detail

### 6.3 Charts

Using **Recharts** library:

| Chart Type | Usage |
|------------|-------|
| Bar Chart | Task distribution, inventory levels |
| Line Chart | Trends over time |
| Pie/Donut | Status distribution |
| Area Chart | Cumulative metrics |

---

## 7. Responsive Design

### 7.1 Breakpoints

```ts
const breakpoints = {
  sm: '640px',
  md: '768px', 
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};
```

### 7.2 Minimum Requirements

| Dimension | Minimum |
|-----------|---------|
| Width | 800px |
| Height | 600px |

### 7.3 Desktop Optimizations

- Fixed sidebar navigation
- Multi-column layouts
- Keyboard shortcuts
- Right-click context menus

---

## 8. Animations

### 8.1 Animation Library

**Framer Motion** for complex animations:
```tsx
import { motion } from 'framer-motion';

<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
>
  Content
</motion.div>
```

### 8.2 Animation Presets

| Animation | Usage |
|-----------|-------|
| Fade In | Page transitions |
| Slide In | Modals, sheets |
| Scale | Button clicks |
| Stagger | List items |

---

## 9. Icons

### 9.1 Icon Library

**Lucide React** - Clean, consistent icons:

```tsx
import { 
  Plus, 
  Search, 
  Settings, 
  User, 
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';
```

### 9.2 Icon Categories

| Category | Icons |
|----------|-------|
| Navigation | Home, Menu, ChevronRight, ArrowLeft |
| Actions | Plus, Edit, Trash, Save, Search |
| Status | Check, X, AlertCircle, Info |
| Users | User, Users, UserCog |
| Files | File, Folder, Download, Upload |

---

## 10. Accessibility

### 10.1 WCAG Compliance

- **Keyboard Navigation**: All interactive elements focusable
- **Screen Readers**: Proper ARIA labels
- **Color Contrast**: Minimum 4.5:1 for text
- **Focus Indicators**: Visible focus rings

### 10.2 Radix UI Features

All components inherit accessibility:
- Proper ARIA attributes
- Focus management
- Keyboard navigation
- Screen reader announcements

---

## 11. Theme Switching

### 11.1 Dark/Light Mode

Using **next-themes** for theme management:

```tsx
import { ThemeProvider } from 'next-themes';

<ThemeProvider attribute="class" defaultTheme="system">
  {children}
</ThemeProvider>
```

### 11.2 Theme Toggle

User can switch between:
- Light
- Dark
- System (auto)

---

## 12. Loading States

### 12.1 Loading Indicators

| Type | Usage |
|------|-------|
| Spinner | Small inline loading |
| Skeleton | Content placeholders |
| Progress | Upload/download progress |
| Route Loading | Page transitions |

### 12.2 Error States

| Type | Display |
|------|---------|
| Form Error | Inline below field |
| API Error | Alert banner |
| 404 | Custom not-found page |
| Boundary Error | ErrorFallback component |

---

## 13. Assets

### 13.1 Application Icons

Located in `src-tauri/icons/`:
- 32x32.png
- 128x128.png
- 128x128@2x.png
- icon.icns (macOS)
- icon.ico (Windows)

### 13.2 Images

- Vehicle placeholder images
- Empty state illustrations (future)
- Brand assets in public folder

---

## 14. Best Practices

### 14.1 Component Guidelines

1. **Composition**: Prefer composition over inheritance
2. **Reusability**: Extract shared components
3. **Types**: Always use TypeScript types
4. **Testing**: Unit test complex components

### 14.2 Styling Guidelines

1. **Tailwind**: Use utility classes first
2. **CSS Variables**: Use for theming
3. **Responsive**: Mobile-first approach
4. **Dark Mode**: Test both themes

### 14.3 Performance

1. **Code Splitting**: Route-based splitting
2. **Images**: Optimize and lazy load
3. **Lists**: Virtualize large lists
4. **Caching**: TanStack Query for API data
