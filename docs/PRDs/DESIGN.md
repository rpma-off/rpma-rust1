# UI Design & Components

This document describes the design system, components, and styling conventions used in the RPMA-Rust frontend.

## Visual Identity

- **Theme**: Dark mode by default, clean and professional for an industrial/automotive context.
- **Styling Engine**: **Tailwind CSS** for utility-first styling.
- **Component Library**: **shadcn/ui**, based on Radix UI primitives for accessibility and consistent behavior.
- **Typography**: Optimized for readability on desktop screens, with clear hierarchy between primary and secondary information.

## Component Architecture

Components are organized into three main categories:

### 1. Atomic UI Components (`frontend/src/components/ui/`)
- Base components from shadcn/ui.
- **Examples**: `Button`, `Input`, `Dialog`, `Table`, `Badge`, `Card`, `Tabs`.
- These are highly reusable, stateless, and theme-compliant.

### 2. Shared Business Components (`frontend/src/components/`)
- Higher-level components shared across domains.
- **Examples**: `AppLayout`, `DataTable`, `FormikWrapper`, `PhotoUploader`, `StatusIndicator`.

### 3. Domain Components (`frontend/src/domains/*/components/`)
- Components specific to a business context.
- **Examples**: `InterventionWorkflowStep`, `MaterialConsumptionForm`, `QuotePreview`, `TaskCalendarItem`.

## Key Interface Patterns

### Navigation
- **Sidebar**: Main application navigation with domain-level links (Dashboard, Tasks, Inventory, etc.).
- **Breadcrumbs**: Clear path indication for deep-linked pages (e.g., *Tasks > #1234 > Intervention*).
- **Command Palette**: (If implemented) Quick access to frequent actions.

### Data Displays
- **Data Tables**: Paginated, sortable tables for lists (Clients, Tasks, Users).
- **Dashboards**: Cards with key metrics (KPIS), charts for inventory levels, and activity feeds.
- **Forms**: Multi-step forms for complex processes like on-boarding or creating an intervention.

### Feedback & Notifications
- **Toasts**: Non-intrusive alerts for success/failure of background actions.
- **Dialogs/Modals**: For focused actions that require immediate attention (e.g., confirming a deletion).
- **Skeletons**: Used in `PageSkeleton.tsx` to provide visual feedback during data loading (TanStack Query integration).

## Design Constraints

- **Responsiveness**: Primarily optimized for desktop (Tauri), but built with responsive Tailwind classes to accommodate different window sizes.
- **Accessibility**: Standard ARIA attributes enforced via Radix UI primitives.
- **Performance**: Heavy use of React's `Suspense` and `loading.tsx` for a "perceived performance" boost during IPC calls.

## Graphical Assets

- **Icons**: (Likely) Lucide React for consistent, lightweight iconography.
- **Images**: Local storage in `frontend/public/images/` for static assets.
- **Dynamic Photos**: Intervention photos are stored on disk and accessed via a custom protocol or local file path provided by the backend.
