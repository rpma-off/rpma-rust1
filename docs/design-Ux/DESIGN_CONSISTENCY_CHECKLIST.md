# Design Consistency Checklist for PR Reviews

This checklist ensures UI/UX consistency across the RPMA v2 frontend. Use it during code reviews and when creating new features.

---

## 🎯 Quick Reference

**Before approving any PR touching frontend code, verify:**
- [ ] All checks in relevant sections below pass
- [ ] No new inconsistencies introduced
- [ ] Existing patterns followed or documented deviations

---

## 1. Layout & Structure

### 1.1 Page Layout
- [ ] **PageShell usage**: Authenticated pages use `PageShell` wrapper
  ```tsx
  import { PageShell } from "@/components/layout/PageShell";
  
  export default function MyPage() {
    return (
      <PageShell>
        {/* Page content */}
      </PageShell>
    );
  }
  ```

- [ ] **Public pages**: Login/signup use standard auth layout pattern
- [ ] **No inline `min-h-screen`**: Use layout components instead of raw divs

### 1.2 Spacing Standards
- [ ] **Main content padding**: `px-4 sm:px-6 lg:px-8 py-5`
- [ ] **Card padding**: Use `p-6` for standard cards
- [ ] **Section spacing**: Use `space-y-6` for main sections
- [ ] **No arbitrary spacing**: Avoid random `pt-3`, `mb-7`, etc.

### 1.3 Component Structure
- [ ] **Proper component hierarchy**: Header → Content → Footer
- [ ] **Loading states**: Use `LoadingState` component or Skeleton UI
- [ ] **Empty states**: Use `EmptyState` component
- [ ] **Error states**: Use `ErrorState` component

---

## 2. shadcn/ui Component Usage

### 2.1 Button Component
- [ ] **Use standard Button**: Import from `@/components/ui/button`
  ```tsx
  import { Button } from "@/components/ui/button";
  ```

- [ ] **Avoid EnhancedButton**: Do NOT use `enhanced-button.tsx` (being deprecated)
- [ ] **Proper variants**: Use `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`
- [ ] **Proper sizes**: Use `default`, `sm`, `lg`, `icon`
- [ ] **Icon pattern**: Use composition or wait for consolidated API
  ```tsx
  <Button>
    <Icon className="mr-2 h-4 w-4" />
    Label
  </Button>
  ```

### 2.2 Card Component
- [ ] **Use shadcn Card**: Import from `@/components/ui/card`
  ```tsx
  import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
  ```

- [ ] **Avoid multi-layer wrappers**: Do NOT use `StandardCard`, `UnifiedCard` unless specifically needed
- [ ] **For domain cards**: Use composition, not complex wrappers
- [ ] **Interactive cards**: Add `hover:shadow-md transition-shadow cursor-pointer`

### 2.3 Dialog/Modal
- [ ] **Consistent naming**: Use `*Dialog` suffix (not `*Modal`)
- [ ] **Use shadcn Dialog**: Import from `@/components/ui/dialog`
- [ ] **For confirmations**: Use `AlertDialog`
- [ ] **Mobile overlay**: Use `Sheet` for mobile drawers

### 2.4 Form Components
- [ ] **Use shadcn Form**: Use `react-hook-form` with `@/components/ui/form`
- [ ] **Consistent labels**: Use `Label` component
- [ ] **Input validation**: Show errors with `FormMessage`
- [ ] **Accessible forms**: Proper `id`, `name`, `aria-*` attributes

---

## 3. Typography

### 3.1 Heading Standards
- [ ] **Page titles**: `text-2xl sm:text-3xl font-bold text-foreground`
  ```tsx
  <h1 className="text-2xl sm:text-3xl font-bold">Page Title</h1>
  ```

- [ ] **Section headers**: `text-xl font-semibold text-foreground`
  ```tsx
  <h2 className="text-xl font-semibold">Section Title</h2>
  ```

- [ ] **Subsection headers**: `text-lg font-medium text-foreground`
  ```tsx
  <h3 className="text-lg font-medium">Subsection Title</h3>
  ```

- [ ] **Card titles**: `text-base font-semibold text-foreground`

### 3.2 Body Text
- [ ] **Body text**: `text-sm text-muted-foreground`
- [ ] **Labels**: `text-xs font-medium text-muted-foreground`
- [ ] **Captions**: `text-xs text-muted-foreground`

### 3.3 Typography Rules
- [ ] **No hardcoded colors**: Use theme variables (`text-foreground`, `text-muted-foreground`)
- [ ] **NO `text-gray-900`**: Replace with `text-foreground`
- [ ] **NO `text-slate-900`**: Replace with `text-foreground`
- [ ] **Responsive typography**: Add breakpoints for mobile (`text-sm md:text-base`)
- [ ] **Consistent font weights**: Use `font-medium`, `font-semibold`, `font-bold` (avoid `font-normal`)

---

## 4. Color & Theme

### 4.1 Theme Variables
- [ ] **Use CSS variables**: Always use `var(--foreground)` or Tailwind classes
- [ ] **Background colors**: `bg-background`, `bg-card`, `bg-popover`
- [ ] **Text colors**: `text-foreground`, `text-muted-foreground`
- [ ] **Borders**: `border-border`
- [ ] **No hardcoded hex**: Avoid `#000000`, `#ffffff`, etc.

### 4.2 Status Colors
- [ ] **Success**: `text-green-600 dark:text-green-400`
- [ ] **Error**: `text-destructive`
- [ ] **Warning**: `text-amber-600 dark:text-amber-400`
- [ ] **Info**: `text-blue-600 dark:text-blue-400`

---

## 5. Tables & Lists

### 5.1 Table Components
- [ ] **Use shadcn Table**: Import from `@/components/ui/table`
- [ ] **For complex tables**: Wait for unified DataTable component (in progress)
- [ ] **Avoid DesktopTable**: Being consolidated
- [ ] **For large datasets**: Use virtualization patterns

### 5.2 List Patterns
- [ ] **Clear naming**: Use `*Table` for tables, `*CardList` for card layouts
- [ ] **No duplicate names**: Check for existing `TaskList`, `ClientList`, etc.
- [ ] **Consistent empty states**: Show `EmptyState` when no data

---

## 6. Filters & Search

### 6.1 Filter Components
- [ ] **Use FilterBar**: For chip-based active filters
- [ ] **Consistent naming**: Use `*Filters` suffix
- [ ] **No duplicate implementations**: Check existing filters before creating new ones
- [ ] **Mobile responsive**: Use `Sheet` or `FilterDrawer` for mobile

### 6.2 Search Patterns
- [ ] **Debounced search**: Use `useDebounce` hook (300ms)
- [ ] **Clear button**: Include clear/reset option
- [ ] **Search icon**: Use `Search` icon from lucide-react

---

## 7. Routing & Navigation

### 7.1 Loading States
- [ ] **Add loading.tsx**: For routes with async data
- [ ] **Use Skeleton**: For content placeholders
- [ ] **Global spinner**: Use `LoadingState` for full-page loads

### 7.2 Error Handling
- [ ] **Add error.tsx**: For critical routes
- [ ] **User-friendly messages**: No raw error stack traces
- [ ] **Error recovery**: Provide "Try Again" button

### 7.3 Navigation
- [ ] **Use Next.js Link**: Import from `next/link`
- [ ] **SafeLink for external**: Use `SafeLink` component for external URLs
- [ ] **Breadcrumbs**: Use `Breadcrumbs` component for nested pages

---

## 8. Accessibility

### 8.1 WCAG Compliance
- [ ] **Touch targets**: Minimum 44x44px (use `touch` button size)
- [ ] **Keyboard navigation**: All interactive elements focusable
- [ ] **Focus indicators**: Visible focus ring on interactive elements
- [ ] **Screen reader labels**: Proper `aria-label` for icon buttons
- [ ] **Color contrast**: 4.5:1 minimum for text

### 8.2 Semantic HTML
- [ ] **Proper headings**: Logical hierarchy (h1 → h2 → h3)
- [ ] **Landmark regions**: Use `<nav>`, `<main>`, `<aside>`, `<footer>`
- [ ] **Form labels**: All inputs have associated labels
- [ ] **Button vs Link**: Use `<button>` for actions, `<Link>` for navigation

---

## 9. Performance

### 9.1 Component Loading
- [ ] **Lazy load**: Use `React.lazy()` for large components
- [ ] **Dynamic imports**: For route-level code splitting
- [ ] **Suspense boundaries**: Wrap lazy components

### 9.2 Images
- [ ] **Next.js Image**: Use `next/image` for optimization
- [ ] **Alt text**: Always provide meaningful alt text
- [ ] **Proper sizing**: Set width and height

### 9.3 Data Fetching
- [ ] **Server Components**: Use for data fetching when possible
- [ ] **Streaming**: Use `loading.tsx` for incremental rendering
- [ ] **Caching**: Leverage Next.js caching strategies

---

## 10. Mobile Responsiveness

### 10.1 Layout
- [ ] **Mobile-first**: Start with mobile layout, enhance for desktop
- [ ] **Breakpoints**: Use Tailwind breakpoints (`sm:`, `md:`, `lg:`, `xl:`)
- [ ] **Touch-friendly**: Larger buttons and spacing on mobile
- [ ] **No horizontal scroll**: Test on 320px width

### 10.2 Navigation
- [ ] **Mobile menu**: Use `Sheet` for mobile navigation
- [ ] **Drawer pattern**: Use for filters and secondary navigation

---

## 11. Testing

### 11.1 Component Tests
- [ ] **Render tests**: Component renders without errors
- [ ] **Interaction tests**: User interactions work correctly
- [ ] **Accessibility tests**: Use `jest-axe` or similar

### 11.2 Visual Regression
- [ ] **Screenshot tests**: For critical UI components
- [ ] **Cross-browser**: Test in Chrome, Firefox, Safari
- [ ] **Mobile testing**: Test on actual devices

---

## 12. Documentation

### 12.1 Component Documentation
- [ ] **JSDoc comments**: For exported components
- [ ] **Props documentation**: Clear prop descriptions
- [ ] **Usage examples**: Include code examples

### 12.2 Code Comments
- [ ] **Complex logic**: Explain non-obvious code
- [ ] **TODOs**: Use proper format: `// TODO(username): Description`
- [ ] **Warnings**: Document known issues or limitations

---

## PR Review Template

Copy this into your PR review:

```markdown
## Design Consistency Review

### Layout ✅/❌
- [ ] PageShell usage correct
- [ ] Spacing standards followed
- [ ] Component hierarchy proper

### Components ✅/❌
- [ ] shadcn/ui components used correctly
- [ ] No deprecated components (EnhancedButton, StandardCard)
- [ ] Consistent naming conventions

### Typography ✅/❌
- [ ] Heading hierarchy correct
- [ ] Theme variables used (no hardcoded colors)
- [ ] Responsive typography applied

### Accessibility ✅/❌
- [ ] Touch targets meet 44x44px minimum
- [ ] Keyboard navigation works
- [ ] Screen reader labels present

### Mobile ✅/❌
- [ ] Mobile-first responsive design
- [ ] No horizontal scroll on mobile
- [ ] Touch-friendly interface

### Testing ✅/❌
- [ ] Component tests added/updated
- [ ] Manual testing completed
- [ ] Accessibility tested

### Notes
<!-- Add any additional comments or deviations -->
```

---

## Red Flags 🚩

**Immediately reject PRs with:**
- ❌ New `EnhancedButton` usage
- ❌ New multi-layer card abstractions
- ❌ Hardcoded colors (`text-gray-900`, hex codes)
- ❌ Duplicate component names
- ❌ Missing loading/error states on new routes
- ❌ No TypeScript types
- ❌ Accessibility violations

---

## Resources

- **Design System**: `/frontend/src/lib/design-system.ts`
- **UI Components**: `/frontend/src/components/ui/`
- **Layout Components**: `/frontend/src/components/layout/`
- **Tailwind Config**: `/frontend/tailwind.config.ts`
- **Full Audit Report**: `/docs/UI_UX_CONSISTENCY_AUDIT.md`
- **shadcn/ui Docs**: https://ui.shadcn.com

---

## Quick Fixes

### Replace hardcoded colors:
```tsx
// ❌ Bad
<h2 className="text-gray-900">Title</h2>

// ✅ Good
<h2 className="text-foreground">Title</h2>
```

### Use PageShell:
```tsx
// ❌ Bad
export default function Page() {
  return <div className="min-h-screen p-4">{/* content */}</div>
}

// ✅ Good
import { PageShell } from "@/components/layout/PageShell";

export default function Page() {
  return <PageShell>{/* content */}</PageShell>
}
```

### Fix button usage:
```tsx
// ❌ Bad
import { EnhancedButton } from "@/components/ui/enhanced-button";

// ✅ Good
import { Button } from "@/components/ui/button";
```

---

**Last Updated**: 2026-02-12  
**Maintainer**: Engineering Team  
**Status**: Active
