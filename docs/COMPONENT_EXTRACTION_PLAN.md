# Component Extraction & Refactoring Plan

This document provides a detailed roadmap for consolidating duplicated UI patterns and extracting reusable components in the RPMA v2 frontend.

---

## Priority Matrix

| Priority | Component | Complexity | Impact | Timeline |
|----------|-----------|------------|--------|----------|
| 🔴 P0 | Button consolidation | Medium | Very High | Week 1 |
| 🔴 P0 | Card flattening | High | Very High | Week 2 |
| 🔴 P0 | Duplicate name fixes | Low | High | Week 1 |
| 🟡 P1 | DataTable unification | High | High | Week 3-4 |
| 🟡 P1 | FilterComposer pattern | Medium | High | Week 3 |
| 🟡 P1 | PageShell standardization | Low | Medium | Week 2 |
| 🟢 P2 | Typography components | Medium | Medium | Week 5 |
| 🟢 P2 | Form validation hooks | Medium | Medium | Week 5 |

---

## Phase 1: Critical Consolidations (Week 1-2)

### 1.1 Button Component Consolidation 🔴

**Goal:** Single, comprehensive Button component replacing `Button` and `EnhancedButton`.

**Current State:**
- `ui/button.tsx` - 150+ usages
- `ui/enhanced-button.tsx` - 10+ usages

**New API:**
```tsx
// /frontend/src/components/ui/button.tsx

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 
    | 'default' | 'destructive' | 'outline' 
    | 'secondary' | 'ghost' | 'link'
    | 'primary' | 'success' | 'warning' | 'gradient';
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'icon' | 'touch';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'default',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth,
  children,
  className,
  disabled,
  ...props
}) => {
  // Implementation with CVA
}

// Specialized exports
export const LoadingButton = (props) => <Button loading {...props} />;
export const IconButton = (props) => <Button size="icon" {...props} />;
export const FloatingActionButton = (props) => <Button variant="primary" size="lg" {...props} />;
```

**Migration Strategy:**
1. **Step 1**: Add new props to existing `button.tsx`
2. **Step 2**: Create codemod to migrate `EnhancedButton` → `Button`
   ```bash
   npx jscodeshift -t scripts/codemods/enhanced-button-to-button.ts frontend/src
   ```
3. **Step 3**: Test all button usages
4. **Step 4**: Delete `enhanced-button.tsx`
5. **Step 5**: Update Storybook examples

**Files to Update:**
- `ui/button.tsx` - Enhance with new props
- All files using `EnhancedButton` (10 files)
- Storybook stories

**Testing:**
- [ ] Visual regression tests for all variants
- [ ] Loading state functionality
- [ ] Icon positioning
- [ ] Touch target sizing (44x44px minimum)
- [ ] Keyboard navigation

**Breaking Changes:** None (additive only)

---

### 1.2 Card Component Flattening 🔴

**Goal:** Simplify 4-layer card abstraction to 2 layers.

**Current Layers:**
```
Card (shadcn) → StandardCard → UnifiedCard → AccessibleCard
```

**New Structure:**
```
Card (shadcn) - Base composition component
DomainCard (task/client/stat) - Specialized variants with built-in accessibility
```

**New Components:**

#### Base Card (Keep as-is)
```tsx
// /frontend/src/components/ui/card.tsx
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
```

#### Domain Cards (New)
```tsx
// /frontend/src/components/ui/domain-cards.tsx

interface TaskCardProps {
  task: Task;
  selected?: boolean;
  onClick?: () => void;
  onAction?: (action: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, selected, onClick, onAction }) => {
  return (
    <Card 
      className={cn(
        "transition-all cursor-pointer hover:shadow-md",
        selected && "ring-2 ring-primary",
        "focus-visible:ring-2 focus-visible:ring-ring"
      )}
      onClick={onClick}
      tabIndex={0}
      role="button"
      aria-pressed={selected}
    >
      <CardHeader>
        <CardTitle>{task.title}</CardTitle>
        {/* Task-specific layout */}
      </CardHeader>
      <CardContent>
        {/* Task-specific content */}
      </CardContent>
    </Card>
  );
};

export const ClientCard: React.FC<ClientCardProps> = ({ client, selected, onClick }) => {
  // Similar pattern for clients
};

export const StatCard: React.FC<StatCardProps> = ({ title, value, change, icon }) => {
  // Similar pattern for stats
};
```

**Migration Strategy:**
1. **Step 1**: Create `domain-cards.tsx` with TaskCard, ClientCard, StatCard
2. **Step 2**: Migrate all UnifiedCard usages to new domain cards (20+ files)
3. **Step 3**: Migrate AccessibleCard usages to domain cards (10+ files)
4. **Step 4**: Remove StandardCard, UnifiedCard, AccessibleCard files
5. **Step 5**: Update imports throughout codebase

**Files to Delete:**
- `ui/standard-card.tsx`
- `ui/unified-card.tsx`
- `ui/AccessibleCard.tsx`

**Files to Create:**
- `ui/domain-cards.tsx`

**Files to Update:** ~100+ files using various card components

**Testing:**
- [ ] Visual regression for all card variants
- [ ] Keyboard navigation (Tab, Enter, Space)
- [ ] Screen reader testing
- [ ] Hover/focus states
- [ ] Mobile touch interactions

---

### 1.3 Fix Duplicate Component Names 🔴

**Goal:** Eliminate naming conflicts causing import confusion.

**Duplicates Found:**

| Name | Location 1 | Location 2 | Resolution |
|------|------------|------------|------------|
| `TaskList` | `tasks/TaskList.tsx` | `dashboard/TaskList.tsx` | → `TaskTable` and `TaskCardList` |
| `TaskFilters` | `tasks/TaskFilters.tsx` | `dashboard/TaskFilters.tsx` | → `TaskFilterPanel` and `DashboardTaskFilters` |
| `MaterialForm` | Root `MaterialForm.tsx` | `inventory/MaterialForm.tsx` | Delete root copy |

**Actions:**

#### A. TaskList Renaming
```bash
# Rename files
mv frontend/src/components/tasks/TaskList.tsx frontend/src/components/tasks/TaskTable.tsx
mv frontend/src/components/dashboard/TaskList.tsx frontend/src/components/dashboard/TaskCardList.tsx

# Update exports and imports
```

#### B. TaskFilters Renaming
```bash
# Rename files
mv frontend/src/components/tasks/TaskFilters.tsx frontend/src/components/tasks/TaskFilterPanel.tsx
mv frontend/src/components/dashboard/TaskFilters.tsx frontend/src/components/dashboard/DashboardTaskFilters.tsx
```

#### C. MaterialForm Cleanup
```bash
# Delete duplicate
rm frontend/src/components/MaterialForm.tsx
rm frontend/src/components/MaterialForm.test.tsx

# Keep only inventory version
# Update all imports to point to inventory/MaterialForm
```

**Migration:**
1. Rename files
2. Update all imports (use Find & Replace)
3. Update tests
4. Update barrel exports (`index.ts` files)

**Testing:**
- [ ] All imports resolve correctly
- [ ] No broken imports
- [ ] Tests pass
- [ ] Build succeeds

---

## Phase 2: High-Priority Unifications (Week 3-4)

### 2.1 DataTable Unification 🟡

**Goal:** Single, feature-rich DataTable component replacing multiple table implementations.

**Current Implementations:**
- `ui/table.tsx` - Base wrapper
- `ui/DesktopTable.tsx` - Full-featured table
- `ui/virtualized-table.tsx` - Performance-optimized
- `layout/DataTableWrapper.tsx` - Card container (keep as layout wrapper)

**New Component:**

```tsx
// /frontend/src/components/ui/data-table.tsx

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  features?: {
    sorting?: boolean | SortingConfig;
    filtering?: boolean | FilteringConfig;
    pagination?: boolean | PaginationConfig;
    selection?: boolean | SelectionConfig;
    virtualization?: boolean | VirtualizationConfig;
  };
  onRowClick?: (row: T) => void;
  className?: string;
}

export function DataTable<T>({ 
  data, 
  columns, 
  features = {}, 
  onRowClick,
  className 
}: DataTableProps<T>) {
  const {
    sorting = false,
    filtering = false,
    pagination = true,
    selection = false,
    virtualization = data.length > 1000
  } = features;

  // Use @tanstack/react-table for table logic
  // Conditionally apply virtualization if needed
  
  return (
    <div className={cn("rounded-md border", className)}>
      {filtering && <DataTableToolbar />}
      <div className="relative">
        {virtualization ? (
          <VirtualizedTableCore {...props} />
        ) : (
          <StandardTableCore {...props} />
        )}
      </div>
      {pagination && <DataTablePagination />}
    </div>
  );
}
```

**Dependencies:**
```bash
npm install @tanstack/react-table
npm install @tanstack/react-virtual # for virtualization
```

**Sub-components:**
- `DataTableToolbar` - Filtering, search, actions
- `DataTablePagination` - Page controls
- `DataTableColumnHeader` - Sortable column headers
- `DataTableRowActions` - Row-level actions menu

**Migration Strategy:**
1. **Step 1**: Install dependencies
2. **Step 2**: Build DataTable component with @tanstack/react-table
3. **Step 3**: Create migration guide
4. **Step 4**: Migrate one usage at a time:
   - User management table
   - Client list table
   - Task list table
5. **Step 5**: Delete old implementations

**Timeline:** 2 weeks (complex component)

**Testing:**
- [ ] Sorting (ascending, descending, multi-column)
- [ ] Filtering (text, select, date range)
- [ ] Pagination (page size, navigation)
- [ ] Selection (single, multi, all)
- [ ] Virtualization (large datasets 10k+ rows)
- [ ] Keyboard navigation
- [ ] Screen reader compatibility

---

### 2.2 FilterComposer Pattern 🟡

**Goal:** Generic, composable filter system replacing scattered filter implementations.

**Current Problems:**
- 7+ filter components with overlapping functionality
- Hard-coded filter options
- No consistent API

**New Pattern:**

```tsx
// /frontend/src/components/ui/filter-composer.tsx

interface FilterComposerProps {
  onFilterChange: (filters: Record<string, any>) => void;
  children: React.ReactNode;
}

export const FilterComposer: React.FC<FilterComposerProps> & {
  Search: typeof FilterSearch;
  Select: typeof FilterSelect;
  MultiSelect: typeof FilterMultiSelect;
  DateRange: typeof FilterDateRange;
  Checkbox: typeof FilterCheckbox;
} = ({ onFilterChange, children }) => {
  const [filters, setFilters] = useState({});
  
  // Provide context to child filter components
  return (
    <FilterContext.Provider value={{ filters, setFilters }}>
      <div className="flex flex-wrap gap-4">
        {children}
      </div>
    </FilterContext.Provider>
  );
};

// Sub-components
FilterComposer.Search = FilterSearch;
FilterComposer.Select = FilterSelect;
FilterComposer.MultiSelect = FilterMultiSelect;
FilterComposer.DateRange = FilterDateRange;
FilterComposer.Checkbox = FilterCheckbox;
```

**Usage Example:**
```tsx
<FilterComposer onFilterChange={handleFilters}>
  <FilterComposer.Search 
    name="search" 
    placeholder="Search tasks..." 
  />
  <FilterComposer.Select 
    name="status" 
    label="Status"
    options={statusOptions} 
  />
  <FilterComposer.MultiSelect 
    name="technicians" 
    label="Technicians"
    options={technicianOptions} 
  />
  <FilterComposer.DateRange 
    name="dateRange" 
    label="Date Range" 
  />
</FilterComposer>
```

**Migration Targets:**
- `tasks/TaskFilters.tsx` → Use FilterComposer
- `dashboard/DashboardFilters.tsx` → Use FilterComposer
- `dashboard/FilterDrawer.tsx` → Wrap FilterComposer in Sheet
- `navigation/CalendarFilters.tsx` → Use FilterComposer
- `navigation/ClientFilters.tsx` → Use FilterComposer

**Timeline:** 1 week

**Testing:**
- [ ] Filter state management
- [ ] Multiple filters combined
- [ ] Clear/reset functionality
- [ ] URL persistence (query params)
- [ ] Mobile responsive (drawer mode)

---

### 2.3 PageShell Standardization 🟡

**Goal:** All authenticated pages use consistent PageShell wrapper.

**Current State:**
- 9 pages using PageShell ✅
- 13+ pages with custom wrappers ❌

**Target Pages to Fix:**
- `/app/page.tsx` (home)
- `/app/tasks/page.tsx`
- `/app/tasks/[id]/page.tsx`
- `/app/reports/page.tsx`
- `/app/team/page.tsx`
- `/app/interventions/page.tsx`
- `/app/schedule/page.tsx`
- `/app/inventory/page.tsx`
- `/app/analytics/page.tsx`
- Task workflow pages

**Migration Pattern:**

```tsx
// Before
export default function TasksPage() {
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        {/* content */}
      </div>
    </div>
  );
}

// After
import { PageShell } from "@/components/layout/PageShell";

export default function TasksPage() {
  return (
    <PageShell>
      {/* content */}
    </PageShell>
  );
}
```

**Also Fix:**
- Update `components/layout/AppShell.tsx` padding: `px-6 py-5` → `px-4 sm:px-6 lg:px-8 py-5`

**Timeline:** 2-3 days

**Testing:**
- [ ] Visual consistency across all pages
- [ ] Responsive behavior (mobile, tablet, desktop)
- [ ] No layout shift
- [ ] Proper scrolling

---

## Phase 3: Medium Priority (Week 5+)

### 3.1 Typography Component System 🟢

**Goal:** Enforce consistent typography through components instead of utility classes.

**New Components:**

```tsx
// /frontend/src/components/ui/typography.tsx

export const PageTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
    {children}
  </h1>
);

export const SectionHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="text-xl font-semibold text-foreground">
    {children}
  </h2>
);

export const SubsectionHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-lg font-medium text-foreground">
    {children}
  </h3>
);

export const CardTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h4 className="text-base font-semibold text-foreground">
    {children}
  </h4>
);

export const BodyText: React.FC<{ children: React.ReactNode; size?: 'sm' | 'base' | 'lg' }> = ({ 
  children, 
  size = 'base' 
}) => (
  <p className={cn(
    "text-muted-foreground",
    size === 'sm' && "text-sm",
    size === 'base' && "text-base",
    size === 'lg' && "text-lg"
  )}>
    {children}
  </p>
);

export const Caption: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-xs text-muted-foreground">
    {children}
  </p>
);
```

**ESLint Rule:**
Create custom ESLint rule to enforce typography components:
```js
// .eslintrc.js
rules: {
  'rpma/prefer-typography-components': ['warn', {
    'h1': 'Use <PageTitle> instead',
    'h2': 'Use <SectionHeader> instead',
    'h3': 'Use <SubsectionHeader> instead',
  }]
}
```

**Timeline:** 1 week (phased rollout)

---

### 3.2 Form Validation Hooks 🟢

**Goal:** Shared validation logic across all forms.

**New Hooks:**

```tsx
// /frontend/src/hooks/useFormValidation.ts

export function useTaskFormValidation() {
  return {
    validate: (data: TaskFormData) => {
      const errors: Record<string, string> = {};
      
      if (!data.clientId) {
        errors.clientId = "Client is required";
      }
      if (!data.vehicleId) {
        errors.vehicleId = "Vehicle is required";
      }
      // ... more validation
      
      return errors;
    }
  };
}

export function useClientFormValidation() {
  // Similar pattern
}

export function useUserFormValidation() {
  // Similar pattern
}
```

**Timeline:** 1 week

---

## Additional Recommendations

### 4.1 Add Loading States
Create `loading.tsx` for:
- `/app/tasks/loading.tsx`
- `/app/clients/loading.tsx`
- `/app/admin/loading.tsx`
- `/app/users/loading.tsx`
- `/app/reports/loading.tsx`

**Template:**
```tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
```

---

### 4.2 Add Error Boundaries
Create `error.tsx` for:
- `/app/tasks/error.tsx`
- `/app/clients/error.tsx`
- `/app/admin/error.tsx`

**Template:**
```tsx
'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h2 className="text-2xl font-bold">Something went wrong!</h2>
      <Button onClick={() => reset()} className="mt-4">
        Try again
      </Button>
    </div>
  );
}
```

---

### 4.3 Server-Side Middleware
Add `/frontend/middleware.ts` for route protection:

```tsx
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('session_token');
  const { pathname } = request.nextUrl;

  // Public routes
  if (['/login', '/signup', '/unauthorized'].includes(pathname)) {
    return NextResponse.next();
  }

  // Protected routes
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

---

## Rollout Strategy

### Week 1: Quick Wins
- [ ] Fix duplicate names (TaskList, TaskFilters, MaterialForm)
- [ ] Remove MaterialForm.tsx from root
- [ ] Update all imports

### Week 2: Button & Card
- [ ] Consolidate Button component
- [ ] Migrate all EnhancedButton usages
- [ ] Flatten Card abstraction
- [ ] Standardize PageShell usage

### Week 3-4: Tables & Filters
- [ ] Build DataTable component
- [ ] Build FilterComposer pattern
- [ ] Migrate one table at a time
- [ ] Migrate filter components

### Week 5+: Polish
- [ ] Typography components
- [ ] Form validation hooks
- [ ] Loading states
- [ ] Error boundaries
- [ ] Middleware

---

## Success Metrics

- **Code Reduction**: Target 30% reduction in component code
- **Bundle Size**: Target 15% reduction in bundle size
- **Developer Experience**: Reduce component creation time by 50%
- **Consistency Score**: 90%+ pages using standard patterns
- **Accessibility**: 100% WCAG 2.1 AA compliance

---

## Maintenance

After rollout:
- [ ] Update Storybook with all new components
- [ ] Create component usage documentation
- [ ] Add ESLint rules to prevent regressions
- [ ] Set up visual regression testing
- [ ] Conduct design review sessions monthly

---

**Last Updated**: 2026-02-12  
**Status**: Draft  
**Next Review**: 2026-02-19
