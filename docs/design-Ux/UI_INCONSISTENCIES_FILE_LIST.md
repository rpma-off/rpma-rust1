# UI/UX Inconsistencies - Detailed File List

This document lists all identified inconsistencies with specific file paths for tracking and remediation.

**Generated**: 2026-02-12  
**Total Files Affected**: 400+

---

## 1. Layout & Spacing Issues

### 1.1 Pages Missing PageShell Wrapper
**Issue**: Inconsistent page layout, custom padding/spacing instead of standard wrapper

| File Path | Current Pattern | Fix Needed |
|-----------|-----------------|------------|
| `/frontend/src/app/page.tsx` | `min-h-screen` div | Wrap with PageShell |
| `/frontend/src/app/tasks/page.tsx` | `min-h-screen flex` div | Wrap with PageShell |
| `/frontend/src/app/tasks/[id]/page.tsx` | `min-h-screen bg-[hsl(var(--rpma-surface))]` | Wrap with PageShell |
| `/frontend/src/app/tasks/[id]/completed/page.tsx` | Custom layout | Wrap with PageShell |
| `/frontend/src/app/tasks/[id]/workflow/steps/[step]/page.tsx` | Custom workflow layout | Use custom PPF layout (OK) |
| `/frontend/src/app/reports/page.tsx` | `min-h-screen flex items-center` | Wrap with PageShell |
| `/frontend/src/app/team/page.tsx` | `min-h-screen flex items-center` | Wrap with PageShell |
| `/frontend/src/app/interventions/page.tsx` | `min-h-screen flex items-center` | Wrap with PageShell |
| `/frontend/src/app/schedule/page.tsx` | `min-h-screen flex items-center` | Wrap with PageShell |
| `/frontend/src/app/inventory/page.tsx` | `min-h-screen flex items-center` | Wrap with PageShell |
| `/frontend/src/app/analytics/page.tsx` | `min-h-screen flex items-center` | Wrap with PageShell |

**Total**: 11 pages

### 1.2 Spacing Inconsistencies

| File Path | Issue | Current Value | Should Be |
|-----------|-------|---------------|-----------|
| `/frontend/src/components/layout/AppShell.tsx` | Non-responsive padding | `px-6 py-5` | `px-4 sm:px-6 lg:px-8 py-5` |
| `/frontend/src/app/dashboard/loading.tsx` | Hardcoded bg color | `bg-gray-50` | `bg-[hsl(var(--rpma-surface))]` |
| `/frontend/src/app/login/page.tsx` | Inconsistent padding | `py-8 px-4 sm:px-6 lg:px-8` | Use standard auth layout |
| `/frontend/src/app/signup/page.tsx` | Inconsistent padding | `py-8 px-4 sm:px-6 lg:px-8` | Use standard auth layout |

---

## 2. Button Component Issues

### 2.1 Files Using EnhancedButton (Should Use Button)

| File Path | Component Used | Replace With |
|-----------|----------------|--------------|
| Location not specified (10 files identified) | `EnhancedButton` | `Button` with new props |

**Action**: Run codemod to migrate all EnhancedButton → Button

### 2.2 Inconsistent Button Icon Patterns

**Issue**: Some buttons use composition, others expect props

**Files Affected**: 150+ button usages across codebase

**Recommendation**: Standardize to `leftIcon`/`rightIcon` props

---

## 3. Card Component Issues

### 3.1 Files Using StandardCard

| File Path | Usage | Replace With |
|-----------|-------|--------------|
| `/frontend/src/components/ui/unified-card.tsx` | Wraps StandardCard | Use Card directly |

### 3.2 Files Using UnifiedCard

**Affected Components**: 20+ files use UnifiedCard variants
- Task cards across dashboard
- Client cards in client management
- Stat cards in analytics

**Action**: Migrate to new DomainCard pattern

### 3.3 Files Using AccessibleCard

**Affected Components**: 10+ files
- Task detail pages
- Workflow step cards
- Interactive card lists

**Action**: Merge accessibility features into DomainCard

---

## 4. Typography Issues

### 4.1 Hardcoded Text Colors (Replace with Theme Variables)

| File Path | Current Color | Should Use |
|-----------|---------------|------------|
| `/frontend/src/app/reports/components/reports/OperationalIntelligenceReport.tsx` | `text-gray-900`, `text-slate-900` | `text-foreground` |
| `/frontend/src/app/reports/components/reports/ClientAnalyticsReport.tsx` | `text-gray-900` | `text-foreground` |
| `/frontend/src/app/reports/components/reports/GeographicReport.tsx` | `text-gray-900` | `text-foreground` |
| `/frontend/src/app/reports/components/reports/MaterialUsageReport.tsx` | `text-gray-900` | `text-foreground` |
| `/frontend/src/app/reports/components/reports/QualityComplianceReport.tsx` | `text-slate-900` | `text-foreground` |
| `/frontend/src/app/reports/components/reports/TaskPerformanceReport.tsx` | `text-gray-900` | `text-foreground` |
| `/frontend/src/app/reports/components/reports/TechnicianPerformanceReport.tsx` | `text-gray-900` | `text-foreground` |
| `/frontend/src/app/configuration/components/BusinessRulesTab.tsx` | `text-gray-900` | `text-foreground` |
| `/frontend/src/app/configuration/components/IntegrationsTab.tsx` | `text-gray-900` | `text-foreground` |
| `/frontend/src/app/configuration/components/MonitoringTab.tsx` | `text-gray-900` | `text-foreground` |
| `/frontend/src/app/configuration/components/PerformanceTab.tsx` | `text-gray-900` | `text-foreground` |
| `/frontend/src/app/configuration/components/SecurityPoliciesTab.tsx` | `text-gray-900` | `text-foreground` |
| `/frontend/src/app/configuration/components/SystemSettingsTab.tsx` | `text-gray-900` | `text-foreground` |

**Total**: 13+ files

### 4.2 Inconsistent Heading Styles

| File Path | Issue | Current | Should Be |
|-----------|-------|---------|-----------|
| Multiple report components | Mixed font weights for H2 | `font-bold` and `font-semibold` | Standardize to `font-semibold` |
| `/frontend/src/components/ui/page-header.tsx` | Non-standard responsive classes | `text-xl sm:text-2xl lg:text-3xl` | Use design-system typography |
| `/frontend/src/components/layout/EmptyState.tsx` | Should use design-system | `text-lg font-semibold` | Use `typography.heading[3]` |

**Files with H1 usage**: 39 files (needs consistency review)
**Files with H2 usage**: 51 files (needs consistency review)

---

## 5. Table & List Component Duplication

### 5.1 Duplicate Component Names

| Component Name | Location 1 | Location 2 | Resolution |
|----------------|------------|------------|------------|
| `TaskList` | `/frontend/src/components/tasks/TaskList.tsx` | `/frontend/src/components/dashboard/TaskList.tsx` | Rename to `TaskTable` and `TaskCardList` |
| `TaskFilters` | `/frontend/src/components/tasks/TaskFilters.tsx` | `/frontend/src/components/dashboard/TaskFilters.tsx` | Rename to `TaskFilterPanel` and `DashboardTaskFilters` |
| `MaterialForm` | `/frontend/src/components/MaterialForm.tsx` | `/frontend/src/components/inventory/MaterialForm.tsx` | **Delete root copy** |

**Also Delete**:
- `/frontend/src/components/MaterialForm.test.tsx` (root copy)

### 5.2 Table Implementations to Consolidate

| File Path | Current Implementation | Target Component |
|-----------|------------------------|------------------|
| `/frontend/src/components/ui/table.tsx` | Base HTML wrapper | Keep as base |
| `/frontend/src/components/ui/DesktopTable.tsx` | Full-featured table | Replace with DataTable |
| `/frontend/src/components/ui/virtualized-table.tsx` | Virtual scrolling | Replace with DataTable |
| `/frontend/src/components/layout/DataTableWrapper.tsx` | Card container | Keep as layout wrapper |

**Files Using DesktopTable**: User lists, client tables, admin tables (~15 files)
**Files Using VirtualizedTable**: Large dataset components (~5 files)

---

## 6. Filter Component Duplication

### 6.1 Filter Components to Consolidate

| File Path | Purpose | Action |
|-----------|---------|--------|
| `/frontend/src/components/tasks/TaskFilters.tsx` | Task filtering | Replace with FilterComposer |
| `/frontend/src/components/dashboard/TaskFilters.tsx` | Dashboard task filters | Replace with FilterComposer |
| `/frontend/src/components/dashboard/DashboardFilters.tsx` | Dashboard filters | Replace with FilterComposer |
| `/frontend/src/components/dashboard/FilterDrawer.tsx` | Mobile filter drawer | Wrap FilterComposer in Sheet |
| `/frontend/src/components/navigation/CalendarFilters.tsx` | Calendar filters | Replace with FilterComposer |
| `/frontend/src/components/navigation/ClientFilters.tsx` | Client filters | Replace with FilterComposer |
| `/frontend/src/components/ui/filter-bar.tsx` | Filter chip display | Keep as foundation |

**Total**: 6 filter components with overlapping functionality

---

## 7. Modal & Dialog Duplication

### 7.1 Duplicate Edit Dialogs

| File Path | Purpose | Action |
|-----------|---------|--------|
| `/frontend/src/components/tasks/TaskActions/EditTaskModal.tsx` | Edit task modal | **Delete** (duplicate) |
| `/frontend/src/components/tasks/EditTaskDialog.tsx` | Edit task dialog | **Keep** as primary |

### 7.2 Task Action Modals

**Files**: (Keep but ensure consistent patterns)
- `/frontend/src/components/tasks/TaskActions/SendMessageModal.tsx`
- `/frontend/src/components/tasks/TaskActions/ReportIssueModal.tsx`
- `/frontend/src/components/tasks/TaskActions/DelayTaskModal.tsx`
- `/frontend/src/components/dashboard/QuickAddDialog.tsx`

**Action**: Ensure all use consistent Dialog component and naming (`*Dialog`)

---

## 8. Empty State Duplication

### 8.1 Duplicate Empty State Components

| File Path | Purpose | Action |
|-----------|---------|--------|
| `/frontend/src/components/ui/empty-state.tsx` | Basic empty state | **Consolidate** |
| `/frontend/src/components/ui/enhanced-empty-state.tsx` | Enhanced with actions | **Consolidate** into single component |

---

## 9. Routing Issues

### 9.1 Missing loading.tsx Files

**Routes Without Loading States**:
- `/frontend/src/app/tasks/loading.tsx` - **Missing**
- `/frontend/src/app/clients/loading.tsx` - **Missing**
- `/frontend/src/app/admin/loading.tsx` - **Missing**
- `/frontend/src/app/users/loading.tsx` - **Missing**
- `/frontend/src/app/reports/loading.tsx` - **Missing**
- `/frontend/src/app/team/loading.tsx` - **Missing**
- `/frontend/src/app/interventions/loading.tsx` - **Missing**
- `/frontend/src/app/schedule/loading.tsx` - **Missing**
- `/frontend/src/app/inventory/loading.tsx` - **Missing**
- `/frontend/src/app/analytics/loading.tsx` - **Missing**
- `/frontend/src/app/configuration/loading.tsx` - **Missing**
- `/frontend/src/app/audit/loading.tsx` - **Missing**
- `/frontend/src/app/technicians/loading.tsx` - **Missing**

**Total**: 13 routes missing loading states

### 9.2 Missing error.tsx Files

**Routes Without Error Boundaries**:
- `/frontend/src/app/tasks/error.tsx` - **Missing**
- `/frontend/src/app/clients/error.tsx` - **Missing**
- `/frontend/src/app/admin/error.tsx` - **Missing**
- `/frontend/src/app/users/error.tsx` - **Missing**
- `/frontend/src/app/reports/error.tsx` - **Missing**

**Total**: 5+ critical routes missing error boundaries

### 9.3 Missing Middleware

| File Path | Status | Purpose |
|-----------|--------|---------|
| `/frontend/src/middleware.ts` | **Missing** | Server-side route protection |

**Current**: Only client-side protection in `RootClientLayout.tsx`

---

## 10. Component Files to Create

### 10.1 New Components Needed

| File Path | Purpose |
|-----------|---------|
| `/frontend/src/components/ui/domain-cards.tsx` | Consolidated TaskCard, ClientCard, StatCard |
| `/frontend/src/components/ui/data-table.tsx` | Unified DataTable component |
| `/frontend/src/components/ui/filter-composer.tsx` | Generic filter composition system |
| `/frontend/src/components/ui/typography.tsx` | Typography component system |

### 10.2 New Hooks Needed

| File Path | Purpose |
|-----------|---------|
| `/frontend/src/hooks/useFormValidation.ts` | Shared form validation logic |
| `/frontend/src/hooks/useDataTable.ts` | DataTable state management |
| `/frontend/src/hooks/useFilters.ts` | Filter state management |

---

## 11. Files to Delete

### 11.1 Deprecated Components

| File Path | Reason |
|-----------|--------|
| `/frontend/src/components/ui/enhanced-button.tsx` | Consolidate into Button |
| `/frontend/src/components/ui/standard-card.tsx` | Flatten card abstraction |
| `/frontend/src/components/ui/unified-card.tsx` | Flatten card abstraction |
| `/frontend/src/components/ui/AccessibleCard.tsx` | Merge into DomainCard |
| `/frontend/src/components/MaterialForm.tsx` | Duplicate (keep inventory version) |
| `/frontend/src/components/MaterialForm.test.tsx` | Goes with above |
| `/frontend/src/components/ui/enhanced-empty-state.tsx` | Consolidate with empty-state.tsx |
| `/frontend/src/components/ui/DesktopTable.tsx` | Replace with DataTable |
| `/frontend/src/components/ui/virtualized-table.tsx` | Replace with DataTable |
| `/frontend/src/components/tasks/TaskActions/EditTaskModal.tsx` | Duplicate of EditTaskDialog |

**Total**: 10 files to delete

---

## 12. Codemod Scripts Needed

### 12.1 Migration Scripts to Create

| Script Path | Purpose |
|-------------|---------|
| `/frontend/scripts/codemods/enhanced-button-to-button.ts` | Migrate EnhancedButton → Button |
| `/frontend/scripts/codemods/card-consolidation.ts` | Migrate card abstractions → DomainCard |
| `/frontend/scripts/codemods/typography-colors.ts` | Replace hardcoded colors with theme vars |
| `/frontend/scripts/codemods/rename-task-list.ts` | Rename duplicate TaskList components |

---

## Summary Statistics

| Category | Files Affected | Priority |
|----------|----------------|----------|
| **Layout Issues** | 15 files | 🟡 High |
| **Button Duplication** | 160+ files | 🔴 Critical |
| **Card Duplication** | 100+ files | 🔴 Critical |
| **Typography Issues** | 100+ files | 🟡 High |
| **Table Duplication** | 50+ files | 🟡 High |
| **Filter Duplication** | 20+ files | 🟡 High |
| **Modal Duplication** | 10 files | 🟡 High |
| **Routing Issues** | 30+ routes | 🟢 Medium |
| **Files to Delete** | 10 files | 🔴 Critical |

**Total Unique Files**: ~400+  
**Overlapping Issues**: Many files have multiple issues

---

## Tracking Checklist

Use this checklist to track remediation progress:

### Phase 1: Critical (Week 1-2)
- [ ] Delete duplicate MaterialForm
- [ ] Rename TaskList components
- [ ] Rename TaskFilters components
- [ ] Consolidate Button component
- [ ] Flatten Card abstraction
- [ ] Delete deprecated components

### Phase 2: High Priority (Week 3-4)
- [ ] Create DataTable component
- [ ] Create FilterComposer pattern
- [ ] Standardize PageShell usage
- [ ] Fix typography colors

### Phase 3: Medium Priority (Week 5+)
- [ ] Add missing loading.tsx files
- [ ] Add missing error.tsx files
- [ ] Create typography components
- [ ] Add middleware.ts

---

**Last Updated**: 2026-02-12  
**Status**: Tracking document for remediation
**Next Review**: Weekly during remediation phase
